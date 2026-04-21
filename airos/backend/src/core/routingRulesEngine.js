const { listEnabledRoutingRules } = require('../db/queries/routingRules');
const { assignConversation } = require('../db/queries/conversations');
const { queryAdmin } = require('../db/pool');

async function execute(client, sql, params) {
  return client ? client.query(sql, params) : queryAdmin(sql, params);
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'undefined' || value === null || value === '') return [];
  return [value];
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function containsAnyKeyword(content, keywords) {
  const text = normalizeText(content);
  if (!text) return false;
  return asArray(keywords).some((keyword) => {
    const normalized = normalizeText(keyword);
    return normalized && text.includes(normalized);
  });
}

function hasAnyTag(customer = {}, tags) {
  const expected = asArray(tags).map(normalizeText).filter(Boolean);
  if (!expected.length) return true;
  const actual = asArray(customer.tags).map(normalizeText);
  return expected.some((tag) => actual.includes(tag));
}

function getCustomerCountry(customer = {}) {
  return normalizeText(customer.country || customer.preferences?.country);
}

function matchesRule(rule, context = {}) {
  const conditions = rule.conditions || {};
  const conversation = context.conversation || {};
  const customer = context.customer || {};
  const message = context.message || {};
  const ticket = context.ticket || {};

  const channels = asArray(conditions.channel || conditions.channels).map(normalizeText).filter(Boolean);
  if (channels.length && !channels.includes(normalizeText(conversation.channel || ticket.channel))) return false;

  const keywords = conditions.keywords || conditions.keyword || conditions.message_contains;
  if (asArray(keywords).length && !containsAnyKeyword(message.content, keywords)) return false;

  const countries = asArray(conditions.country || conditions.countries).map(normalizeText).filter(Boolean);
  if (countries.length && !countries.includes(getCustomerCountry(customer))) return false;

  if (!hasAnyTag(customer, conditions.tag || conditions.tags)) return false;

  const priorities = asArray(conditions.ticket_priority || conditions.priority).map(normalizeText).filter(Boolean);
  if (priorities.length && !priorities.includes(normalizeText(ticket.priority))) return false;

  return true;
}

function getActionUserId(action = {}) {
  return action.assign_to_user
    || action.assignToUser
    || action.user_id
    || action.userId
    || action.assignee_id
    || action.assigneeId
    || null;
}

async function validateTenantUser(tenantId, userId, client) {
  if (!userId) return null;
  const result = await execute(client, `
    SELECT id
    FROM users
    WHERE tenant_id = $1
      AND id = $2
      AND role IN ('owner', 'admin', 'agent')
    LIMIT 1
  `, [tenantId, userId]);

  return result.rows[0]?.id || null;
}

async function applyRuleAction(tenantId, rule, context = {}, client) {
  const action = rule.action || {};
  const userId = await validateTenantUser(tenantId, getActionUserId(action), client);
  if (!userId) {
    return {
      matched: true,
      applied: false,
      rule,
      reason: action.assign_to_team || action.assignToTeam ? 'team assignment is not implemented' : 'no valid assignee',
    };
  }

  const result = {
    matched: true,
    applied: false,
    rule,
    assignee_id: userId,
  };

  if (context.conversation?.id) {
    result.conversation = await assignConversation(tenantId, context.conversation.id, userId, client);
    result.applied = Boolean(result.conversation);
  }

  if (context.ticket?.id) {
    const ticketUpdate = await execute(client, `
      UPDATE tickets
      SET assignee_id = $3,
          updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2
        AND deleted_at IS NULL
      RETURNING id, assignee_id
    `, [tenantId, context.ticket.id, userId]);
    result.ticket = ticketUpdate.rows[0] || null;
    result.applied = result.applied || Boolean(result.ticket);
  }

  return result;
}

async function evaluateRoutingRules(tenantId, context = {}, client) {
  const rules = await listEnabledRoutingRules(tenantId, client);
  const matchedRule = rules.find((rule) => matchesRule(rule, context));
  return matchedRule || null;
}

async function applyRoutingRules(tenantId, context = {}, client) {
  const rule = await evaluateRoutingRules(tenantId, context, client);
  if (!rule) return { matched: false, applied: false };
  return applyRuleAction(tenantId, rule, context, client);
}

async function resolveRoutingAssigneeId(tenantId, context = {}, client) {
  const rule = await evaluateRoutingRules(tenantId, context, client);
  if (!rule) return { matched: false, assignee_id: null };

  const assigneeId = await validateTenantUser(tenantId, getActionUserId(rule.action), client);
  return {
    matched: true,
    rule,
    assignee_id: assigneeId,
    reason: assigneeId ? null : 'no valid assignee',
  };
}

module.exports = {
  applyRoutingRules,
  evaluateRoutingRules,
  matchesRule,
  resolveRoutingAssigneeId,
};
