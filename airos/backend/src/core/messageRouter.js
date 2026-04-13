const { getTenantByWhatsAppPhoneId, getTenantByPageId, getOrCreateCustomer } = require('./tenantManager');
const { getOrCreateConversation, assignConversation } = require('../db/queries/conversations');
const { saveMessage } = require('../db/queries/messages');
const { getOrCreateDeal } = require('../db/queries/deals');
const { query } = require('../db/pool');
const { normalizeWhatsApp } = require('../channels/whatsapp/normalizer');
const { normalizeInstagram } = require('../channels/instagram/normalizer');
const { normalizeMessenger } = require('../channels/messenger/normalizer');
const { normalizeLiveChat } = require('../channels/livechat/normalizer');
const { getIO } = require('../channels/livechat/socket');
const {
  normalizeTenantSettings,
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

  tenantRow = await query(
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

  // ── 4. Get or create deal ────────────────────────────────────────────────
  const deal = await getOrCreateDeal(tenantId, conversation.id, customer.id);
  unified.meta.deal_id = deal.id;

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
    });

    if (assigneeId) {
      assignedConversation = await assignConversation(tenantId, conversation.id, assigneeId) || conversation;
    }
  }

  // ── 6. Emit to dashboard via Socket.io ───────────────────────────────────
  try {
    const io = getIO();
    io.to(`tenant:${tenantId}`).emit('message:new', {
      message: savedMessage,
      conversation: assignedConversation,
      customer,
      deal,
      unified,
      moderation,
    });
  } catch {
    // Socket not yet init in test environments — safe to ignore
  }

  return {
    unified,
    savedMessage,
    conversation: assignedConversation,
    customer,
    deal,
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
    await query(
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
  const users = await query(
    `SELECT id, name, role, created_at
     FROM users
     WHERE tenant_id = $1 AND role IN ('owner', 'admin', 'agent')
     ORDER BY created_at ASC`,
    [tenantId]
  ).then((result) => result.rows);

  if (users.length === 0) return null;

  if (!isWithinWorkingHours(settings.global) && settings.global?.assignBot) {
    return null;
  }

  const routedAssignee = await resolveRoutedAssignee(tenantId, settings, users, context);
  if (routedAssignee !== undefined) return routedAssignee;

  const mode = settings.visitorRouting?.mode || 'round_robin';
  if (mode === 'least_active') {
    const counts = await query(
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

  const seed = `${context.conversation.id}:${context.customer.id}:${context.conversation.channel}`;
  return users[stableIndex(seed, users.length)]?.id || null;
}

async function resolveRoutedAssignee(tenantId, settings, users, context) {
  if (!Array.isArray(settings.routing) || settings.routing.length === 0) return undefined;

  const activeRules = settings.routing
    .filter((rule) => rule?.active !== false)
    .sort((left, right) => Number(left.priority || 999) - Number(right.priority || 999));

  for (const rule of activeRules) {
    if (!matchesRoutingRule(rule, context)) continue;

    const assignee = resolveAssigneeLabel(rule.assignTo, settings, users);
    if (assignee !== undefined) return assignee;
  }

  return undefined;
}

function matchesRoutingRule(rule, context) {
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

function resolveAssigneeLabel(label, settings, users) {
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

module.exports = { routeMessage };
