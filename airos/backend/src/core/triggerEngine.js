const { queryAdmin } = require('../db/pool');
const { updateTenantSettings } = require('../db/queries/tenants');
const { normalizeTenantSettings } = require('./tenantSettings');
const { saveMessage } = require('../db/queries/messages');
const { assignConversation } = require('../db/queries/conversations');
const { sendEmail } = require('./emailService');
const { sendText } = require('../channels/whatsapp/sender');
const { getIO } = require('../channels/livechat/socket');

function includesNormalized(source, target) {
  return String(source || '').toLowerCase().includes(String(target || '').toLowerCase());
}

function buildEvents(context) {
  const events = new Set(['message_received']);
  if (context.isConversationStart) events.add('conversation_started');
  if (context.analysis) events.add('score_updated');
  if (context.analysis?.intent) events.add('intent_detected');
  if (context.analysis?.intent === 'ready_to_buy') events.add('ready_to_buy');
  if (context.ticket) events.add('ticket_created');
  if (
    context.deal?.id
    && context.previousDeal?.id
    && context.deal.stage
    && context.previousDeal.stage
    && context.deal.stage !== context.previousDeal.stage
  ) {
    events.add('deal_stage_changed');
  }
  return events;
}

function matchStructuredCondition(field, op, value, context) {
  const strValue = String(value ?? '').toLowerCase().trim();
  switch (String(field).toLowerCase()) {
    case 'score': {
      const actual = Number(context.analysis?.lead_score || 0);
      const expected = Number(value);
      if (op === '>=') return actual >= expected;
      if (op === '<=') return actual <= expected;
      if (op === '>') return actual > expected;
      if (op === '<') return actual < expected;
      if (op === '!=') return actual !== expected;
      return actual === expected;
    }
    case 'intent': {
      const actual = String(context.analysis?.intent || '').toLowerCase();
      if (op === '!=') return actual !== strValue;
      if (op === 'contains') return actual.includes(strValue);
      return actual === strValue;
    }
    case 'channel': {
      const actual = String(context.conversation?.channel || '').toLowerCase();
      if (op === '!=') return actual !== strValue;
      return actual === strValue;
    }
    case 'language': {
      const actual = String(context.analysis?.language || '').toLowerCase();
      if (op === '!=') return actual !== strValue;
      return actual === strValue;
    }
    case 'tag': {
      const tags = Array.isArray(context.customer?.tags)
        ? context.customer.tags.map((t) => String(t).toLowerCase())
        : [];
      return op === '!=' ? !tags.includes(strValue) : tags.includes(strValue);
    }
    case 'message_count': {
      const actual = Number(context.historyLength || 0);
      const expected = Number(value);
      if (op === '>=') return actual >= expected;
      if (op === '<=') return actual <= expected;
      if (op === '>') return actual > expected;
      if (op === '<') return actual < expected;
      return actual === expected;
    }
    case 'wait_time': {
      const actual = Number(context.analysis?.wait_seconds ?? context.waitSeconds ?? 0);
      const expected = Number(value);
      if (op === '>=') return actual >= expected;
      if (op === '<=') return actual <= expected;
      return actual === expected;
    }
    case 'keyword':
    case 'message_contains': {
      const content = String(context.message?.content || '').toLowerCase();
      return content.includes(strValue);
    }
    default:
      return false;
  }
}

function matchCondition(conditionOrTrigger, context) {
  // Support being called with the full trigger object (new API)
  if (conditionOrTrigger && typeof conditionOrTrigger === 'object') {
    const trigger = conditionOrTrigger;
    // Structured format from UI: conditionField + conditionOp + conditionValue
    if (trigger.conditionField && trigger.conditionOp && trigger.conditionValue !== undefined && trigger.conditionValue !== '') {
      return matchStructuredCondition(trigger.conditionField, trigger.conditionOp, trigger.conditionValue, context);
    }
    // Fall through to legacy string condition
    return matchCondition(trigger.condition, context);
  }

  // Legacy: condition is a string
  const normalized = String(conditionOrTrigger || '').trim().toLowerCase();
  if (!normalized) return true;

  const scoreMatch = normalized.match(/score\s*(>=|<=|=|>|<)\s*(-?\d+)/);
  if (scoreMatch) {
    const [, operator, rawValue] = scoreMatch;
    const expected = Number(rawValue);
    const actual = Number(context.analysis?.lead_score || 0);
    if (operator === '>=') return actual >= expected;
    if (operator === '<=') return actual <= expected;
    if (operator === '>') return actual > expected;
    if (operator === '<') return actual < expected;
    return actual === expected;
  }

  const intentMatch = normalized.match(/intent\s*[=:]+\s*([a-z_]+)/);
  if (intentMatch) {
    return String(context.analysis?.intent || '').toLowerCase() === intentMatch[1];
  }

  const channelMatch = normalized.match(/channel\s*[=:]+\s*([a-z_]+)/);
  if (channelMatch) {
    return String(context.conversation?.channel || '').toLowerCase() === channelMatch[1];
  }

  const tagMatch = normalized.match(/tag\s*[=:]+\s*([a-z0-9 _-]+)/);
  if (tagMatch) {
    return Array.isArray(context.customer?.tags)
      && context.customer.tags.some((tag) => String(tag).toLowerCase() === tagMatch[1].trim());
  }

  const contentMatch = normalized.match(/message contains\s+(.+)/);
  if (contentMatch) {
    return includesNormalized(context.message?.content || '', contentMatch[1]);
  }

  return false;
}

async function addCustomerTag(tenantId, customer, tag) {
  if (!customer?.id) return { type: 'tag', action: 'add', status: 'skipped', reason: 'No customer context', tag };
  const nextTags = [...new Set([...(customer.tags || []), tag])];
  await queryAdmin(`
    UPDATE customers
    SET tags = $1
    WHERE id = $2 AND tenant_id = $3
  `, [JSON.stringify(nextTags), customer.id, tenantId]);
  customer.tags = nextTags;
  return { type: 'tag', action: 'add', tag };
}

async function removeCustomerTag(tenantId, customer, tag) {
  if (!customer?.id) return { type: 'tag', action: 'remove', status: 'skipped', reason: 'No customer context', tag };
  const normalized = String(tag || '').toLowerCase().trim();
  const nextTags = (customer.tags || []).filter((t) => String(t).toLowerCase().trim() !== normalized);
  await queryAdmin(`
    UPDATE customers
    SET tags = $1
    WHERE id = $2 AND tenant_id = $3
  `, [JSON.stringify(nextTags), customer.id, tenantId]);
  customer.tags = nextTags;
  return { type: 'tag', action: 'remove', tag };
}

async function closeConversation(tenantId, conversationId) {
  await queryAdmin(
    `UPDATE conversations SET status = 'closed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
    [conversationId, tenantId],
  );
  return { type: 'close', status: 'closed' };
}

async function notifyTeam({ tenantId, tenant, settings, trigger, context }) {
  const operators = Array.isArray(settings.operators) ? settings.operators : [];
  let recipients = operators
    .filter((operator) => operator.email)
    .filter((operator) => {
      if (includesNormalized(trigger.action, 'sales')) return includesNormalized(operator.dept, 'sales');
      return ['owner', 'admin'].includes(String(operator.role || '').toLowerCase());
    })
    .map((operator) => operator.email);

  if (recipients.length === 0) {
    recipients = await queryAdmin(`
      SELECT email
      FROM users
      WHERE tenant_id = $1 AND role IN ('owner', 'admin')
      ORDER BY created_at ASC
      LIMIT 5
    `, [tenantId]).then((result) => result.rows.map((row) => row.email));
  }

  if (recipients.length === 0) {
    return { type: 'notify', status: 'skipped', reason: 'No operator emails configured' };
  }

  const customNote = String(trigger.actionValue || '').trim();
  await sendEmail({
    to: recipients,
    subject: `${tenant?.name || 'ChatOrAI'} · Trigger fired: ${trigger.name || trigger.event}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2 style="margin-bottom:8px">Automation Trigger Fired</h2>
        <p><strong>Trigger:</strong> ${trigger.name || trigger.event}</p>
        <p><strong>Customer:</strong> ${context.customer?.name || context.customer?.phone || 'Unknown'}</p>
        <p><strong>Channel:</strong> ${context.conversation?.channel || 'unknown'}</p>
        <p><strong>Intent:</strong> ${context.analysis?.intent || 'unknown'}</p>
        <p><strong>Message:</strong> ${context.message?.content || ''}</p>
        ${customNote ? `<p><strong>Notification:</strong> ${customNote}</p>` : ''}
      </div>
    `,
    text: `Trigger ${trigger.name || trigger.event} fired for ${context.customer?.name || context.customer?.phone || 'Unknown'}${customNote ? `\n${customNote}` : ''}`,
  });

  return { type: 'notify', status: 'sent', recipients };
}

function getAutomatedReply(action, context) {
  const normalized = String(action || '').toLowerCase();
  if (normalized.includes('discount')) {
    return 'We can help with pricing. Reply with the quantity you want and we will share the best available offer.';
  }
  if (normalized.includes('follow-up')) {
    return 'Just checking in on your request. Reply anytime and we can continue from where we left off.';
  }
  if (normalized.includes('welcome')) {
    return context.settings?.waSettings?.welcome_msg
      || 'Thanks for reaching out. We are here to help with your order.';
  }
  return null;
}

async function sendMetaText(channel, credentials, customer, text) {
  if (!text) return { type: 'message', status: 'skipped', reason: 'No message text resolved' };

  if (channel === 'livechat') {
    if (!customer?.channel_customer_id) {
      return { type: 'message', status: 'skipped', reason: 'Missing live chat session' };
    }
    const { sendText: sendLivechatText } = require('../channels/livechat/sender');
    sendLivechatText(customer.channel_customer_id, text, 'ai');
    return { type: 'message', status: 'sent', externalId: null, text };
  }

  if (channel === 'whatsapp') {
    if (!credentials?.phone_number_id || !credentials?.access_token || !customer?.phone) {
      return { type: 'message', status: 'skipped', reason: 'Missing WhatsApp credentials or phone' };
    }

    const response = await sendText(
      credentials.phone_number_id,
      credentials.access_token,
      customer.phone,
      text,
    );

    return {
      type: 'message',
      status: 'sent',
      externalId: response?.messages?.[0]?.id || null,
      text,
    };
  }

  if (channel === 'instagram') {
    const { sendText: sendInstagramText, resolveSenderId } = require('../channels/instagram/sender');
    const senderId = resolveSenderId(credentials);
    if (!senderId || !credentials?.access_token || !customer?.channel_customer_id) {
      return { type: 'message', status: 'skipped', reason: 'Missing Instagram credentials or recipient' };
    }
    const response = await sendInstagramText(senderId, credentials.access_token, customer.channel_customer_id, text);
    return {
      type: 'message',
      status: 'sent',
      externalId: response?.message_id || null,
      text,
    };
  }

  if (channel === 'messenger') {
    if (!credentials?.page_id || !credentials?.access_token || !customer?.channel_customer_id) {
      return { type: 'message', status: 'skipped', reason: 'Missing Messenger credentials or recipient' };
    }
    const { sendText: sendMessengerText } = require('../channels/messenger/sender');
    const response = await sendMessengerText(credentials.page_id, credentials.access_token, customer.channel_customer_id, text);
    return {
      type: 'message',
      status: 'sent',
      externalId: response?.message_id || null,
      text,
    };
  }

  return { type: 'message', status: 'skipped', reason: `Channel ${channel} is not supported for automated sends` };
}

/**
 * Extracts the intended assignee name from a trigger action string.
 * e.g. "assign to Ahmed" → "ahmed"
 *      "assign conversation to Sara from sales" → "sara"
 *      "assign" → null
 */
function extractAssigneeName(action) {
  const normalized = String(action || '').toLowerCase();
  // Match "assign to <name>", "assign <name>", "assign conversation to <name>"
  const match = normalized.match(/assign(?:\s+(?:conversation|chat|ticket))?\s+to\s+([a-z][a-z0-9 _'-]*)/);
  if (match?.[1]) return match[1].trim();
  // Match "assign <single-word-name>" where name != 'conversation'/'chat'
  const bare = normalized.match(/assign\s+([a-z][a-z0-9'-]+)/);
  if (bare?.[1] && !['conversation', 'chat', 'ticket', 'to'].includes(bare[1])) return bare[1].trim();
  return null;
}

async function maybeAssignConversation({ tenantId, trigger, settings, conversation }) {
  if (!conversation?.id) return { type: 'assign', status: 'skipped', reason: 'No conversation context' };

  const normalized = String(trigger.action || '').toLowerCase();
  if (!normalized.includes('assign')) return null;

  let assignee = null;

  // Step 1 — extract intended name from action text
  const intentName = extractAssigneeName(trigger.action);

  if (intentName) {
    // Step 2 — try exact name match in real users table (case-insensitive)
    const exact = await queryAdmin(
      `SELECT id, name FROM users
       WHERE tenant_id = $1 AND LOWER(name) = $2
       LIMIT 1`,
      [tenantId, intentName],
    ).then((r) => r.rows[0] || null);

    if (exact) {
      assignee = exact;
    } else {
      // Step 3 — fuzzy: any user whose name contains the extracted token
      const fuzzy = await queryAdmin(
        `SELECT id, name FROM users
         WHERE tenant_id = $1 AND LOWER(name) LIKE $2
         ORDER BY role ASC, created_at ASC
         LIMIT 1`,
        [tenantId, `%${intentName}%`],
      ).then((r) => r.rows[0] || null);
      if (fuzzy) assignee = fuzzy;
    }
  }

  // Step 4 — legacy settings.operators check (usually empty)
  if (!assignee) {
    const operators = Array.isArray(settings.operators) ? settings.operators : [];
    assignee = operators.find((op) => op.id && includesNormalized(normalized, op.name)) || null;
  }

  // Step 5 — role-based fallback: first owner/admin in the tenant
  if (!assignee) {
    const fallback = await queryAdmin(
      `SELECT id, name FROM users
       WHERE tenant_id = $1 AND role IN ('owner','admin')
       ORDER BY created_at ASC LIMIT 1`,
      [tenantId],
    ).then((r) => r.rows[0] || null);
    if (fallback) assignee = fallback;
  }

  if (!assignee?.id) {
    return { type: 'assign', status: 'skipped', reason: 'No assignee found' };
  }

  await assignConversation(tenantId, conversation.id, assignee.id);
  return { type: 'assign', status: 'assigned', assignee: assignee.name };
}

async function assignConversationFromValue({ tenantId, actionValue, settings, conversation }) {
  if (!conversation?.id) return { type: 'assign', status: 'skipped', reason: 'No conversation context' };

  const value = String(actionValue || '').trim();
  if (value.startsWith('agent:')) {
    const userId = value.replace('agent:', '').trim();
    if (!userId) return { type: 'assign', status: 'skipped', reason: 'No agent selected' };
    const assigned = await assignConversation(tenantId, conversation.id, userId);
    return assigned
      ? { type: 'assign', status: 'assigned', userId }
      : { type: 'assign', status: 'skipped', reason: 'Agent not found in tenant' };
  }

  if (value.startsWith('dept:')) {
    const deptValue = value.replace('dept:', '').trim();
    const department = Array.isArray(settings.depts)
      ? settings.depts.find((dept) => [dept?.id, dept?.name].map(String).includes(deptValue))
      : null;
    const allowedLabels = new Set([deptValue]);
    if (department?.name) allowedLabels.add(String(department.name));
    if (department?.id) allowedLabels.add(String(department.id));

    const assignee = await queryAdmin(
      `SELECT id, name
       FROM users
       WHERE tenant_id = $1
         AND department = ANY($2::text[])
       ORDER BY role ASC, created_at ASC
       LIMIT 1`,
      [tenantId, Array.from(allowedLabels)],
    ).then((result) => result.rows[0] || null);

    if (!assignee?.id) return { type: 'assign', status: 'skipped', reason: 'No department operator found' };
    await assignConversation(tenantId, conversation.id, assignee.id);
    return { type: 'assign', status: 'assigned', userId: assignee.id, assignee: assignee.name, department: department?.name || deptValue };
  }

  return { type: 'assign', status: 'skipped', reason: 'Unsupported assignment target' };
}

async function adjustDealScore({ tenantId, deal, actionValue }) {
  if (!deal?.id) return { type: 'score_update', status: 'skipped', reason: 'No deal context' };
  const delta = Number(String(actionValue).replace(/[^0-9.-]/g, '')) || 0;
  const result = await queryAdmin(
    `UPDATE deals
     SET lead_score = LEAST(100, GREATEST(0, COALESCE(lead_score, 0) + $1)),
         updated_at = NOW()
     WHERE tenant_id = $2 AND id = $3
     RETURNING lead_score`,
    [delta, tenantId, deal.id],
  );
  const row = result.rows[0];
  return row
    ? { type: 'score_update', delta, status: 'updated', leadScore: row.lead_score }
    : { type: 'score_update', delta, status: 'skipped', reason: 'Deal not found' };
}

async function persistOutboundAutomationMessage({
  tenantId,
  conversation,
  customer,
  channel,
  trigger,
  messageResult,
}) {
  if (messageResult?.status !== 'sent') return null;
  if (!conversation?.id) return null;

  const saved = await saveMessage(tenantId, conversation.id, {
    direction: 'outbound',
    type: 'text',
    content: messageResult.text,
    sent_by: 'ai',
    metadata: {
      trigger_id: trigger.id,
      trigger_name: trigger.name,
      external_id: messageResult.externalId || null,
    },
  });

  try {
    const io = getIO();
    io.to(`tenant:${tenantId}:conversations`).emit('message:new', {
      message: saved,
      conversation,
      customer,
      automation: true,
    });
  } catch {
    // Socket server is optional in tests and background workers.
  }

  return saved;
}

async function executeTriggers({
  tenant,
  tenantId,
  settings,
  conversation,
  customer,
  savedMessage,
  analysis,
  credentials,
  suggestion,
  deal,
  previousDeal,
  ticket,
  historyLength = 0,
}) {
  const normalizedSettings = normalizeTenantSettings(settings || tenant?.settings);
  const activeTriggers = normalizedSettings.triggers.filter((trigger) => trigger?.active !== false);
  if (activeTriggers.length === 0) return [];

  const context = {
    tenant,
    settings: normalizedSettings,
    conversation,
    customer,
    message: savedMessage,
    analysis,
    suggestion,
    deal,
    previousDeal,
    ticket,
    historyLength,
    waitSeconds: savedMessage?.created_at && conversation?.created_at
      ? Math.max(0, Math.round((new Date(savedMessage.created_at).getTime() - new Date(conversation.created_at).getTime()) / 1000))
      : 0,
    isConversationStart: historyLength <= 1,
  };
  const events = buildEvents(context);
  const logs = [];

  for (const trigger of activeTriggers) {
    if (!events.has(String(trigger.event || '').toLowerCase())) continue;
    // Pass full trigger object so matchCondition can use structured or legacy format
    if (!matchCondition(trigger, context)) continue;

    const actions = [];

    // ── Structured action dispatch (from UI-built triggers) ──────────────
    if (trigger.actionType) {
      const actionType = String(trigger.actionType);
      const actionValue = trigger.actionValue ?? '';

      if (actionType === 'add_tag') {
        const tag = String(actionValue).trim();
        if (tag) actions.push(await addCustomerTag(tenantId, customer, tag));

      } else if (actionType === 'remove_tag') {
        const tag = String(actionValue).trim();
        if (tag) actions.push(await removeCustomerTag(tenantId, customer, tag));

      } else if (actionType === 'assign_to') {
        actions.push(await assignConversationFromValue({
          tenantId,
          actionValue,
          settings: normalizedSettings,
          conversation,
        }));

      } else if (actionType === 'send_message') {
        const text = String(actionValue).trim();
        if (text) {
          const messageResult = conversation?.channel
            ? await sendMetaText(conversation.channel, credentials, customer, text)
            : { type: 'message', status: 'skipped', reason: 'No conversation channel' };
          actions.push(messageResult);
          await persistOutboundAutomationMessage({ tenantId, conversation, customer, channel: conversation?.channel, trigger, messageResult });
        }

      } else if (actionType === 'notify_agent') {
        actions.push(await notifyTeam({ tenantId, tenant, settings: normalizedSettings, trigger, context }));

      } else if (actionType === 'close_conversation') {
        actions.push(conversation?.id
          ? await closeConversation(tenantId, conversation.id)
          : { type: 'close', status: 'skipped', reason: 'No conversation context' });

      } else if (actionType === 'update_score') {
        actions.push(await adjustDealScore({ tenantId, deal, actionValue }));
      }

    } else {
      // ── Legacy text-based action dispatch ────────────────────────────
      const normalizedAction = String(trigger.action || '').toLowerCase();

      if (includesNormalized(normalizedAction, 'add vip tag') || includesNormalized(normalizedAction, 'add tag')) {
        const tagMatch = normalizedAction.match(/add\s+([a-z0-9 _-]+)\s+tag/);
        const tag = tagMatch?.[1]?.trim() || 'vip';
        actions.push(await addCustomerTag(tenantId, customer, tag));
      }

      if (includesNormalized(normalizedAction, 'notify')) {
        actions.push(await notifyTeam({ tenantId, tenant, settings: normalizedSettings, trigger, context }));
      }

      if (includesNormalized(normalizedAction, 'close')) {
        actions.push(conversation?.id
          ? await closeConversation(tenantId, conversation.id)
          : { type: 'close', status: 'skipped', reason: 'No conversation context' });
      }

      const autoReply = getAutomatedReply(trigger.action, context);
      if (autoReply) {
        const messageResult = conversation?.channel
          ? await sendMetaText(conversation.channel, credentials, customer, autoReply)
          : { type: 'message', status: 'skipped', reason: 'No conversation channel' };
        actions.push(messageResult);
        await persistOutboundAutomationMessage({ tenantId, conversation, customer, channel: conversation?.channel, trigger, messageResult });
      }

      const assignmentResult = await maybeAssignConversation({
        tenantId, trigger, settings: normalizedSettings, conversation,
      });
      if (assignmentResult) actions.push(assignmentResult);
    }

    logs.push({
      id: `trlog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      triggerId: trigger.id,
      triggerName: trigger.name,
      event: trigger.event,
      condition: trigger.condition || `${trigger.conditionField} ${trigger.conditionOp} ${trigger.conditionValue}`,
      action: trigger.actionType || trigger.action,
      status: actions.some((a) => a?.status === 'failed') ? 'failed' : 'completed',
      actions,
      conversationId: conversation?.id || null,
      customerId: customer?.id || null,
      ticketId: ticket?.id || null,
      dealId: deal?.id || null,
      createdAt: new Date().toISOString(),
    });
  }

  if (logs.length > 0) {
    normalizedSettings.triggerLogs = [...logs, ...normalizedSettings.triggerLogs].slice(0, 50);
    await updateTenantSettings(tenantId, normalizedSettings);
  }

  return logs;
}

module.exports = { executeTriggers };
