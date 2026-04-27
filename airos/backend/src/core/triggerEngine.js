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
      const actual = Number(context.analysis?.wait_seconds || 0);
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
      </div>
    `,
    text: `Trigger ${trigger.name || trigger.event} fired for ${context.customer?.name || context.customer?.phone || 'Unknown'}`,
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

  if (channel === 'instagram' || channel === 'messenger') {
    if (!credentials?.page_id || !credentials?.access_token || !customer?.channel_customer_id) {
      return { type: 'message', status: 'skipped', reason: 'Missing Meta page credentials or recipient' };
    }

    const response = await fetch(`https://graph.facebook.com/v19.0/${credentials.page_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${credentials.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: customer.channel_customer_id },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      throw new Error(data?.error?.message || `Meta send failed for ${channel}`);
    }

    return {
      type: 'message',
      status: 'sent',
      externalId: data?.message_id || null,
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

async function persistOutboundAutomationMessage({
  tenantId,
  conversation,
  customer,
  channel,
  trigger,
  messageResult,
}) {
  if (messageResult?.status !== 'sent') return null;

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
        if (String(actionValue).startsWith('agent:')) {
          const userId = String(actionValue).replace('agent:', '').trim();
          if (userId) {
            await assignConversation(tenantId, conversation.id, userId);
            actions.push({ type: 'assign', status: 'assigned', userId });
          }
        } else {
          const assignResult = await maybeAssignConversation({
            tenantId,
            trigger: { action: `assign to ${actionValue}` },
            settings: normalizedSettings,
            conversation,
          });
          if (assignResult) actions.push(assignResult);
        }

      } else if (actionType === 'send_message') {
        const text = String(actionValue).trim();
        if (text) {
          const messageResult = await sendMetaText(conversation.channel, credentials, customer, text);
          actions.push(messageResult);
          await persistOutboundAutomationMessage({ tenantId, conversation, customer, channel: conversation.channel, trigger, messageResult });
        }

      } else if (actionType === 'notify_agent') {
        actions.push(await notifyTeam({ tenantId, tenant, settings: normalizedSettings, trigger, context }));

      } else if (actionType === 'close_conversation') {
        actions.push(await closeConversation(tenantId, conversation.id));

      } else if (actionType === 'update_score') {
        // Score adjustment is informational — the AI scorer handles actual score
        const delta = Number(String(actionValue).replace(/[^0-9.-]/g, '')) || 0;
        actions.push({ type: 'score_update', delta, status: 'recorded' });
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
        actions.push(await closeConversation(tenantId, conversation.id));
      }

      const autoReply = getAutomatedReply(trigger.action, context);
      if (autoReply) {
        const messageResult = await sendMetaText(conversation.channel, credentials, customer, autoReply);
        actions.push(messageResult);
        await persistOutboundAutomationMessage({ tenantId, conversation, customer, channel: conversation.channel, trigger, messageResult });
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
      conversationId: conversation.id,
      customerId: customer.id,
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
