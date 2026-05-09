const { getTenantByWhatsAppPhoneId, getTenantByPageId, getOrCreateCustomer } = require('./tenantManager');
const { getOrCreateConversation, assignConversation, updateConversationAiMode } = require('../db/queries/conversations');
const { saveMessage } = require('../db/queries/messages');
const { getOrCreateDeal } = require('../db/queries/deals');
const { queryAdmin } = require('../db/pool');
const { normalizeWhatsApp } = require('../channels/whatsapp/normalizer');
const { normalizeInstagram } = require('../channels/instagram/normalizer');
const { normalizeMessenger } = require('../channels/messenger/normalizer');
const { normalizeLiveChat } = require('../channels/livechat/normalizer');
const { getIO } = require('../channels/livechat/socket');
const { resolveRoutingAssigneeId } = require('./routingRulesEngine');
const {
  normalizeTenantSettings,
  getChannelGreetingText,
  containsProfanity,
  isBlockedSpammer,
  isWithinWorkingHours,
} = require('./tenantSettings');

/**
 * Central routing logic — called by the BullMQ worker.
 * Takes raw queue job data, resolves tenant, normalizes,
 * persists, and emits real-time event to agents.
 *
 * Returns the saved message record.
 */
async function routeMessage(jobData) {
  const { channel } = jobData;

  let unified;
  let tenantId;
  let credentials;
  let tenantRow;

  // ── 1. Resolve tenant + normalize ───────────────────────────────────────
  switch (channel) {
    case 'whatsapp': {
      const tenant = await getTenantByWhatsAppPhoneId(jobData.phone_number_id);
      if (!tenant) { console.warn('[Router] Unknown WA phone_number_id:', jobData.phone_number_id); return; }
      tenantId = tenant.tenant_id;
      credentials = tenant.credentials;
      unified = normalizeWhatsApp(tenantId, jobData.raw, jobData.contacts);
      break;
    }

    case 'instagram': {
      const tenant = await getTenantByPageId(jobData.page_id, 'instagram');
      if (!tenant) { console.warn('[Router] Unknown IG page_id:', jobData.page_id); return; }
      tenantId = tenant.tenant_id;
      credentials = tenant.credentials;
      unified = normalizeInstagram(tenantId, jobData.raw);
      break;
    }

    case 'messenger': {
      const tenant = await getTenantByPageId(jobData.page_id, 'messenger');
      if (!tenant) { console.warn('[Router] Unknown Messenger page_id:', jobData.page_id); return; }
      tenantId = tenant.tenant_id;
      credentials = tenant.credentials;
      unified = normalizeMessenger(tenantId, jobData.raw);
      break;
    }

    case 'livechat': {
      tenantId = jobData.tenant_id;
      unified = normalizeLiveChat(tenantId, jobData.raw, jobData.session_id);
      break;
    }

    default:
      console.warn('[Router] Unknown channel:', channel);
      return;
  }

  tenantRow = await queryAdmin(
    'SELECT id, name, email, settings, knowledge_base FROM tenants WHERE id = $1',
    [tenantId]
  ).then((result) => result.rows[0] || null);
  const tenantSettings = normalizeTenantSettings(tenantRow?.settings);

  // ── 2. Get or create customer ────────────────────────────────────────────
  const customer = await getOrCreateCustomer(tenantId, {
    channel: unified.channel,
    channelCustomerId: unified.customer.id,
    name: unified.customer.name,
    phone: unified.customer.phone,
    avatar: unified.customer.avatar,
  });

  const moderation = await applyModerationFlags({
    tenantId,
    settings: tenantSettings,
    customer,
    message: unified.message,
  });

  // ── 3. Get or create conversation ───────────────────────────────────────
  const conversation = await getOrCreateConversation(tenantId, customer.id, unified.channel);
  unified.meta.conversation_id = conversation.id;

  if (moderation.flaggedForReview) {
    try { await updateConversationAiMode(tenantId, conversation.id, 'manual'); } catch {}
  }

  // ── 3.5. Livechat greeting on first interaction ──────────────────────────
  // Send welcome/away message before the customer's first message is persisted
  // so greeting appears first in the conversation timeline.
  const jobSessionId = channel === 'livechat' ? jobData.session_id : null;
  if (jobSessionId && !conversation.last_message_preview) {
    try {
      await maybeSendLivechatGreeting(tenantId, conversation.id, jobSessionId, tenantSettings);
    } catch (err) {
      console.warn('[Router] Greeting failed (non-fatal):', err.message);
    }
  }

  // ── 4. Get or create deal — gated by global.autoCreateLead (default: true) ─
  let deal = null;
  if (tenantSettings?.global?.autoCreateLead !== false) {
    deal = await getOrCreateDeal(tenantId, conversation.id, customer.id);
    unified.meta.deal_id = deal?.id;
  }

  const ticket = await queryAdmin(
    `SELECT id, priority, channel, assignee_id
     FROM tickets
     WHERE tenant_id = $1
       AND conversation_id = $2
       AND deleted_at IS NULL
     LIMIT 1`,
    [tenantId, conversation.id]
  ).then((result) => result.rows[0] || null);

  // ── 5. Persist message ───────────────────────────────────────────────────
  const savedMessage = await saveMessage(tenantId, conversation.id, {
    direction: 'inbound',
    type: unified.message.type,
    content: unified.message.content,
    media_url: unified.message.media_url,
    sent_by: 'customer',
    metadata: {
      raw_id: unified.raw?.id,
      channel_customer_id: unified.customer.id,
      moderation,
    },
  });

  let assignedConversation = conversation;
  if (!moderation.blocked && !conversation.assigned_to) {
    const assigneeId = await determineAssignee(tenantId, tenantSettings, {
      conversation,
      customer,
      message: unified.message,
      ticket,
      deal,
    });

    if (assigneeId) {
      assignedConversation = await assignConversation(tenantId, conversation.id, assigneeId) || conversation;
    }
  }

  if (!moderation.blocked && !assignedConversation.assigned_to) {
    scheduleVisitorRoutingFallback({
      tenantId,
      settings: tenantSettings,
      conversation: assignedConversation,
      customer,
      savedMessage,
      credentials,
    });
  }

  // ── 6. Emit to dashboard via Socket.io ───────────────────────────────────
  try {
    const io = getIO();
    io.to(`tenant:${tenantId}:conversations`).emit('message:new', {
      message: savedMessage,
      conversation: assignedConversation,
      customer,
      deal,
      ticket,
      unified,
      moderation,
    });
  } catch {
    // Socket not yet init in test environments — safe to ignore
  }

  // ── 7. SLA breach detection — proactive, fires after target window ───────
  const channelSlaCfg = tenantSettings?.channels?.[channel];
  const slaTargetMinutes = Number(channelSlaCfg?.slaTargetMinutes || 0);
  if (slaTargetMinutes > 0 && savedMessage?.id) {
    setTimeout(() => {
      checkSLABreach(tenantId, assignedConversation.id, channel, savedMessage.id, slaTargetMinutes)
        .catch(() => {});
    }, slaTargetMinutes * 60 * 1000);
  }

  return {
    unified,
    savedMessage,
    conversation: assignedConversation,
    customer,
    deal,
    ticket,
    credentials,
    moderation,
    blocked: moderation.blocked,
    tenant: tenantRow,
  };
}

async function applyModerationFlags({ tenantId, settings, customer, message }) {
  const blocked = isBlockedSpammer({
    phone: customer.phone,
    channelCustomerId: customer.channel_customer_id,
    name: customer.name,
    id: customer.id,
  }, settings.spammers);

  const profanityDetected = containsProfanity(message?.content, settings.profanity);
  let profanityCount = Number(customer.preferences?.profanity_count || 0);

  if (profanityDetected) {
    profanityCount += 1;
    await queryAdmin(
      'UPDATE customers SET preferences = $1 WHERE id = $2 AND tenant_id = $3',
      [JSON.stringify({ ...(customer.preferences || {}), profanity_count: profanityCount }), customer.id, tenantId]
    );
  }

  const autoBlockedByProfanity =
    profanityDetected &&
    settings.profanityControls?.autoBlockAfterThree &&
    profanityCount >= 3;

  return {
    blocked: blocked || autoBlockedByProfanity,
    blockedBySpammer: blocked,
    profanityDetected,
    profanityCount,
    autoBlockedByProfanity,
    flaggedForReview: profanityDetected && settings.profanityControls?.flagForReview !== false,
  };
}

async function determineAssignee(tenantId, settings, context) {
  const routingContext = await maybeEnrichRoutingContext(tenantId, settings, context);
  const users = await queryAdmin(
    `SELECT id, name, role, department, created_at
     FROM users
     WHERE tenant_id = $1 AND role IN ('owner', 'admin', 'agent')
     ORDER BY created_at ASC`,
    [tenantId]
  ).then((result) => result.rows);

  if (users.length === 0) return null;

  if (!isWithinWorkingHours(settings.global) && settings.global?.assignBot) {
    return null;
  }

  // If auto-assignment to human agents is disabled, leave unassigned
  if (settings.global?.autoAssign === false) {
    return null;
  }

  const ruleAssignee = await resolveRoutingAssigneeId(tenantId, routingContext);
  if (ruleAssignee.matched) return ruleAssignee.assignee_id;

  const routedAssignee = await resolveRoutedAssignee(tenantId, settings, users, routingContext);
  if (routedAssignee !== undefined) return routedAssignee;

  // Per-channel default operator — preferred over global routing mode
  const channelDefaultCfg = settings.channels?.[routingContext.conversation?.channel];
  if (channelDefaultCfg?.defaultOperatorId) {
    const defaultOp = users.find((u) => String(u.id) === String(channelDefaultCfg.defaultOperatorId));
    if (defaultOp) return defaultOp.id;
  }
  if (channelDefaultCfg?.departmentId) {
    const departmentId = String(channelDefaultCfg.departmentId);
    const department = Array.isArray(settings.depts)
      ? settings.depts.find((dept) => String(dept?.id || dept?.name || '') === departmentId)
      : null;
    const allowedLabels = new Set([departmentId]);
    if (department?.name) allowedLabels.add(String(department.name));
    const deptUser = users.find((user) => allowedLabels.has(String(user.department || '')));
    if (deptUser) return deptUser.id;
  }

  const mode = settings.visitorRouting?.mode || 'round_robin';
  if (mode === 'least_active' || mode === 'least_busy') {
    const counts = await queryAdmin(
      `SELECT assigned_to, COUNT(*)::int AS total
       FROM conversations
       WHERE tenant_id = $1 AND status = 'open' AND assigned_to IS NOT NULL
       GROUP BY assigned_to`,
      [tenantId]
    ).then((result) => Object.fromEntries(result.rows.map((row) => [row.assigned_to, row.total])));

    return users
      .slice()
      .sort((left, right) => {
        const leftCount = counts[left.id] || 0;
        const rightCount = counts[right.id] || 0;
        if (leftCount !== rightCount) return leftCount - rightCount;
        return left.created_at < right.created_at ? -1 : 1;
      })[0]?.id || null;
  }

  if (mode === 'manual') {
    return resolveAssigneeLabel(settings.visitorRouting?.fallback, settings, users) ?? null;
  }

  if (mode === 'random') {
    return users[Math.floor(Math.random() * users.length)]?.id || null;
  }

  const seed = `${routingContext.conversation.id}:${routingContext.customer.id}:${routingContext.conversation.channel}`;
  return users[stableIndex(seed, users.length)]?.id || null;
}

function activeChatRoutingRules(settings) {
  return Array.isArray(settings?.routing)
    ? settings.routing.filter((rule) => rule?.active !== false)
    : [];
}

function needsGeneratedRoutingAnalysis(settings, context) {
  return activeChatRoutingRules(settings).some((rule) => {
    if (!rule?.conditionField) return false;
    const field = String(rule.conditionField).trim();
    if (!['intent', 'language', 'score'].includes(field)) return false;
    const existing = getStructuredConditionValue(context, field);
    return existing === undefined || existing === null || existing === '';
  });
}

async function maybeEnrichRoutingContext(tenantId, settings, context = {}) {
  if (context.analysis || !needsGeneratedRoutingAnalysis(settings, context)) return context;

  try {
    const { detectIntent } = require('../ai/intentDetector');
    const analysis = await detectIntent({
      tenantId,
      message: context.message?.content || '',
      customer: context.customer || {},
      history: [],
      products: [],
      offers: [],
    });
    return { ...context, analysis };
  } catch (err) {
    console.warn('[Router] Chat routing analysis failed (non-fatal):', err.message);
    return context;
  }
}

function normalizeVisitorFallback(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'queue') return 'queue';
  if (normalized === 'offline') return 'offline';
  return 'ai_bot';
}

function getVisitorRoutingThresholdSeconds(settings) {
  const parsed = Number(settings?.visitorRouting?.threshold);
  if (!Number.isInteger(parsed) || parsed < 5 || parsed > 3600) return null;
  return parsed;
}

function scheduleVisitorRoutingFallback({ tenantId, settings, conversation, customer, savedMessage, credentials }) {
  const thresholdSeconds = getVisitorRoutingThresholdSeconds(settings);
  if (!thresholdSeconds || !conversation?.id || !savedMessage?.id || !customer?.id) return null;

  const timer = setTimeout(() => {
    applyVisitorRoutingFallback({
      tenantId,
      settings,
      conversationId: conversation.id,
      customer,
      savedMessageId: savedMessage.id,
      credentials,
    }).catch((err) => {
      console.warn('[Router] Visitor routing fallback failed (non-fatal):', err.message);
    });
  }, thresholdSeconds * 1000);

  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}

async function hasOutboundAfterMessage(tenantId, conversationId, messageId) {
  const result = await queryAdmin(
    `SELECT 1
     FROM messages
     WHERE tenant_id = $1
       AND conversation_id = $2
       AND direction = 'outbound'
       AND created_at > (
         SELECT created_at FROM messages WHERE tenant_id = $1 AND id = $3 LIMIT 1
       )
     LIMIT 1`,
    [tenantId, conversationId, messageId],
  );
  return result.rows.length > 0;
}

function getOfflineFallbackText(settings, channel) {
  const channelCfg = settings?.channels?.[channel] || {};
  return String(
    channelCfg.awayMessage
    || channelCfg.fallbackReply
    || 'Thanks for your message. Our team is currently offline and will reply as soon as possible.',
  ).trim();
}

async function sendVisitorFallbackTextToChannel({ channel, credentials, customer, text }) {
  if (channel === 'whatsapp') {
    const { sendText } = require('../channels/whatsapp/sender');
    if (!credentials?.phone_number_id || !credentials?.access_token || !customer?.phone) {
      return { status: 'skipped', reason: 'missing_whatsapp_send_context' };
    }
    const response = await sendText(credentials.phone_number_id, credentials.access_token, customer.phone, text);
    return { status: 'sent', externalId: response?.messages?.[0]?.id || null };
  }

  if (channel === 'messenger') {
    const { sendText } = require('../channels/messenger/sender');
    if (!credentials?.page_id || !credentials?.access_token || !customer?.channel_customer_id) {
      return { status: 'skipped', reason: 'missing_messenger_send_context' };
    }
    const response = await sendText(credentials.page_id, credentials.access_token, customer.channel_customer_id, text);
    return { status: 'sent', externalId: response?.message_id || null };
  }

  if (channel === 'instagram') {
    const { sendText, resolveSenderId } = require('../channels/instagram/sender');
    const senderId = resolveSenderId(credentials);
    if (!senderId || !credentials?.access_token || !customer?.channel_customer_id) {
      return { status: 'skipped', reason: 'missing_instagram_send_context' };
    }
    const response = await sendText(senderId, credentials.access_token, customer.channel_customer_id, text);
    return { status: 'sent', externalId: response?.message_id || null };
  }

  if (channel === 'livechat') {
    const { sendText } = require('../channels/livechat/sender');
    if (customer?.channel_customer_id) sendText(customer.channel_customer_id, text, 'ai');
    return { status: 'sent', externalId: null };
  }

  return { status: 'skipped', reason: `unsupported_channel_${channel || 'unknown'}` };
}

async function emitVisitorFallbackUpdate(tenantId, message, conversation, customer) {
  try {
    const io = getIO();
    io.to(`tenant:${tenantId}:conversations`).emit('message:new', {
      message,
      conversation,
      customer,
      visitor_routing_fallback: true,
    });
  } catch {
    // Socket server is optional in tests and background workers.
  }
}

async function applyVisitorRoutingFallback({ tenantId, settings, conversationId, customer, savedMessageId, credentials }) {
  const conversation = await queryAdmin(
    'SELECT * FROM conversations WHERE tenant_id = $1 AND id = $2 LIMIT 1',
    [tenantId, conversationId],
  ).then((result) => result.rows[0] || null);

  if (!conversation || conversation.status !== 'open' || conversation.assigned_to) {
    return { applied: false, reason: 'conversation_not_waiting' };
  }
  if (await hasOutboundAfterMessage(tenantId, conversationId, savedMessageId)) {
    return { applied: false, reason: 'already_answered' };
  }

  const fallback = normalizeVisitorFallback(settings?.visitorRouting?.fallback);
  if (fallback === 'queue') {
    if (conversation.ai_mode !== 'manual') {
      await updateConversationAiMode(tenantId, conversationId, 'manual');
    }
    return { applied: true, fallback, reason: 'left_in_unassigned_queue' };
  }

  if (fallback === 'ai_bot') {
    await updateConversationAiMode(tenantId, conversationId, 'auto');
    const { addToQueue } = require('../workers/messageProcessor');
    await addToQueue({
      already_saved: true,
      tenant_id: tenantId,
      conversation_id: conversationId,
      customer_id: customer.id,
      message_id: savedMessageId,
      credentials,
    });
    return { applied: true, fallback, reason: 'ai_mode_enabled' };
  }

  const text = getOfflineFallbackText(settings, conversation.channel);
  const sendResult = await sendVisitorFallbackTextToChannel({
    channel: conversation.channel,
    credentials,
    customer,
    text,
  });
  const message = await saveMessage(tenantId, conversationId, {
    direction: 'outbound',
    type: 'text',
    content: text,
    sent_by: 'ai',
    metadata: {
      visitor_routing_fallback: true,
      fallback,
      send_status: sendResult.status,
      send_error: sendResult.status === 'sent' ? null : sendResult.reason,
      external_id: sendResult.externalId || null,
    },
  });
  await updateConversationAiMode(tenantId, conversationId, 'manual');
  await emitVisitorFallbackUpdate(tenantId, message, conversation, customer);
  return { applied: sendResult.status === 'sent', fallback, sendResult, message };
}

async function resolveRoutedAssignee(tenantId, settings, users, context) {
  if (!Array.isArray(settings.routing) || settings.routing.length === 0) return undefined;

  const activeRules = settings.routing
    .filter((rule) => rule?.active !== false)
    .sort((left, right) => Number(left.priority || 999) - Number(right.priority || 999));

  for (const rule of activeRules) {
    if (!matchesRoutingRule(rule, context)) continue;

    const target = normalizeRoutingTarget(rule.assignTo);
    if (target.type === 'ai_bot') {
      if (context.conversation?.id) {
        await updateConversationAiMode(tenantId, context.conversation.id, 'auto');
      }
      return null;
    }
    if (target.type === 'queue') {
      if (context.conversation?.id) {
        await updateConversationAiMode(tenantId, context.conversation.id, 'manual');
      }
      return null;
    }

    const assignee = resolveAssigneeLabel(rule.assignTo, settings, users);
    if (assignee !== undefined) return assignee;
  }

  return undefined;
}

function getStructuredConditionValue(context, field) {
  const conversation = context.conversation || {};
  const customer = context.customer || {};
  const message = context.message || {};
  const ticket = context.ticket || {};
  const analysis = context.analysis || {};
  const deal = context.deal || {};

  if (field === 'channel') return conversation.channel || ticket.channel;
  if (field === 'language') return analysis.language || customer.preferences?.language;
  if (field === 'intent') return analysis.intent || ticket.intent;
  if (field === 'score') return analysis.lead_score ?? deal.lead_score ?? ticket.lead_score;
  if (field === 'keyword') return message.content;
  if (field === 'country') return customer.country || customer.preferences?.country;
  if (field === 'tag') return Array.isArray(customer.tags) ? customer.tags : [];
  return undefined;
}

function normalizeRouteText(value) {
  return String(value || '').trim().toLowerCase();
}

function matchesStructuredRoutingCondition(actualValue, op, expectedValue, field) {
  if (field === 'score') {
    const actual = Number(actualValue || 0);
    const expected = Number(expectedValue);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    if (op === '>=') return actual >= expected;
    if (op === '<=') return actual <= expected;
    if (op === '>') return actual > expected;
    if (op === '<') return actual < expected;
    if (op === '!=') return actual !== expected;
    return actual === expected;
  }

  const actualValues = Array.isArray(actualValue) ? actualValue.map(normalizeRouteText) : [normalizeRouteText(actualValue)];
  const expected = normalizeRouteText(expectedValue);
  if (!expected) return false;
  if (op === '!=') return actualValues.every((value) => value !== expected);
  if (op === 'contains' || field === 'keyword') return actualValues.some((value) => value.includes(expected));
  return actualValues.some((value) => value === expected);
}

function matchesRoutingRule(rule, context) {
  if (rule?.conditionField && rule?.conditionOp && rule.conditionValue !== undefined && rule.conditionValue !== '') {
    const field = String(rule.conditionField).trim();
    const op = String(rule.conditionOp || '=').trim();
    return matchesStructuredRoutingCondition(
      getStructuredConditionValue(context, field),
      op,
      rule.conditionValue,
      field,
    );
  }

  const condition = String(rule?.condition || '').toLowerCase();
  if (!condition) return false;

  if (condition.includes('channel = whatsapp')) return context.conversation.channel === 'whatsapp';
  if (condition.includes('channel = instagram')) return context.conversation.channel === 'instagram';
  if (condition.includes('channel = messenger')) return context.conversation.channel === 'messenger';
  if (condition.includes('tag = vip')) {
    return Array.isArray(context.customer.tags)
      && context.customer.tags.some((tag) => String(tag).toLowerCase() === 'vip');
  }
  if (condition.includes('time outside 9-18')) return !isWithinWorkingHours({
    workingHours: true,
    workStart: '09:00',
    workEnd: '18:00',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  });

  return false;
}

function normalizeRoutingTarget(label) {
  const raw = String(label || '').trim();
  const normalized = raw.toLowerCase();
  if (normalized === 'ai_bot' || normalized === 'ai bot') return { type: 'ai_bot' };
  if (normalized === 'queue') return { type: 'queue' };
  if (normalized.startsWith('agent:')) return { type: 'agent', value: raw.slice('agent:'.length).trim() };
  if (normalized.startsWith('dept:')) return { type: 'department', value: raw.slice('dept:'.length).trim() };
  return { type: 'label', value: raw };
}

function resolveAssigneeLabel(label, settings, users) {
  const target = normalizeRoutingTarget(label);
  if (target.type === 'ai_bot' || target.type === 'queue') return null;
  if (target.type === 'agent') {
    const direct = users.find((user) => String(user.id) === String(target.value));
    return direct?.id;
  }
  if (target.type === 'department') {
    const departmentValue = String(target.value || '').trim();
    const department = Array.isArray(settings.depts)
      ? settings.depts.find((dept) => [dept?.id, dept?.name].some((value) => String(value || '') === departmentValue))
      : null;
    const labels = new Set([departmentValue]);
    if (department?.id) labels.add(String(department.id));
    if (department?.name) labels.add(String(department.name));
    const byDepartmentColumn = users.find((user) => labels.has(String(user.department || '')));
    if (byDepartmentColumn) return byDepartmentColumn.id;
    if (Array.isArray(department?.operators)) {
      const operator = users.find((user) => department.operators.includes(user.id));
      if (operator) return operator.id;
    }
    return undefined;
  }

  const normalized = String(label || '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'ai bot') return null;

  const directUser = users.find((user) => user.name?.trim().toLowerCase() === normalized);
  if (directUser) return directUser.id;

  const department = Array.isArray(settings.depts)
    ? settings.depts.find((dept) => normalized.includes(String(dept.name || '').trim().toLowerCase()))
    : null;
  if (!department || !Array.isArray(department.operators)) return undefined;

  const deptUser = users.find((user) => department.operators.includes(user.id));
  return deptUser ? deptUser.id : undefined;
}

function stableIndex(seed, size) {
  let hash = 0;
  for (const char of String(seed)) {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash) % size;
}

/**
 * Send configured welcome (in-hours) or away (out-of-hours) message to a new
 * livechat session. Saves to DB first so it appears in conversation history,
 * then emits to both the visitor widget and the agent dashboard.
 */
async function maybeSendLivechatGreeting(tenantId, conversationId, sessionId, tenantSettings) {
  const { text: greetingText } = getChannelGreetingText(tenantSettings, 'livechat');

  if (!greetingText) return;

  const greeting = await saveMessage(tenantId, conversationId, {
    direction: 'outbound',
    type: 'text',
    content: greetingText,
    sent_by: 'ai',
    metadata: { is_greeting: true, auto_sent: true },
  });

  try {
    const io = getIO();
    io.to(`session:${sessionId}`).emit('agent:message', {
      type: 'text',
      content: greetingText,
      sent_by: 'ai',
      direction: 'outbound',
      timestamp: greeting.created_at,
    });
    io.to(`tenant:${tenantId}:conversations`).emit('message:new', {
      message: greeting,
      conversation: { id: conversationId, tenant_id: tenantId },
      customer: null,
    });
  } catch {}
}

/**
 * Fires after slaTargetMinutes have elapsed since an inbound message.
 * Checks if an outbound reply was sent in that window; emits sla:breach
 * to the agent dashboard if the conversation is still unanswered.
 */
async function checkSLABreach(tenantId, conversationId, channel, inboundMessageId, slaTargetMinutes) {
  const [repliedResult, convResult] = await Promise.all([
    queryAdmin(
      `SELECT 1 FROM messages
       WHERE tenant_id = $1
         AND conversation_id = $2
         AND direction = 'outbound'
         AND created_at > (
           SELECT created_at FROM messages WHERE tenant_id = $1 AND id = $3 LIMIT 1
         )
       LIMIT 1`,
      [tenantId, conversationId, inboundMessageId]
    ),
    queryAdmin(
      'SELECT status, assigned_to FROM conversations WHERE tenant_id = $1 AND id = $2 LIMIT 1',
      [tenantId, conversationId]
    ),
  ]);

  const replied = repliedResult.rows.length > 0;
  const conv = convResult.rows[0] || null;

  if (replied || !conv || conv.status !== 'open') return;

  try {
    const io = getIO();
    io.to(`tenant:${tenantId}:conversations`).emit('sla:breach', {
      conversationId,
      channel,
      assignedTo: conv.assigned_to,
      slaTargetMinutes,
      timestamp: new Date().toISOString(),
    });
  } catch {}
}

module.exports = {
  routeMessage,
  determineAssignee,
  checkSLABreach,
  applyVisitorRoutingFallback,
  scheduleVisitorRoutingFallback,
};
