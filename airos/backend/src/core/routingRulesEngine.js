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

function conditionValue(spec) {
  if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
    return spec.values ?? spec.value;
  }
  return spec;
}

function conditionOp(spec, fallback = '=') {
  if (spec && typeof spec === 'object' && !Array.isArray(spec) && spec.op) {
    return String(spec.op).trim();
  }
  return fallback;
}

function getCondition(conditions = {}, ...keys) {
  for (const key of keys) {
    if (typeof conditions[key] !== 'undefined') return conditions[key];
  }
  return undefined;
}

function matchesTextCondition(actualValue, spec, fallbackOp = '=') {
  const actual = normalizeText(actualValue);
  const values = asArray(conditionValue(spec)).map(normalizeText).filter(Boolean);
  if (!values.length) return true;
  const op = conditionOp(spec, fallbackOp);

  if (op === '!=') return values.every((value) => actual !== value);
  if (op === 'contains') return values.some((value) => actual.includes(value));
  return values.some((value) => actual === value);
}

function matchesNumberCondition(actualValue, spec) {
  const actual = Number(actualValue || 0);
  const expected = Number(asArray(conditionValue(spec))[0]);
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  const op = conditionOp(spec, '=');

  if (op === '>=') return actual >= expected;
  if (op === '<=') return actual <= expected;
  if (op === '>') return actual > expected;
  if (op === '<') return actual < expected;
  if (op === '!=') return actual !== expected;
  return actual === expected;
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
  const expected = asArray(conditionValue(tags)).map(normalizeText).filter(Boolean);
  if (!expected.length) return true;
  const actual = asArray(customer.tags).map(normalizeText);
  const op = conditionOp(tags, '=');
  if (op === '!=') return expected.every((tag) => !actual.includes(tag));
  if (op === 'contains') return expected.some((tag) => actual.some((item) => item.includes(tag)));
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

  const channelCondition = getCondition(conditions, 'channel', 'channels');
  if (typeof channelCondition !== 'undefined' && !matchesTextCondition(conversation.channel || ticket.channel, channelCondition)) return false;

  const keywords = getCondition(conditions, 'keywords', 'keyword', 'message_contains');
  if (asArray(conditionValue(keywords)).length) {
    const op = conditionOp(keywords, 'contains');
    const keywordMatched = containsAnyKeyword(message.content, conditionValue(keywords));
    if (op === '!=' ? keywordMatched : !keywordMatched) return false;
  }

  const countryCondition = getCondition(conditions, 'country', 'countries');
  if (typeof countryCondition !== 'undefined' && !matchesTextCondition(getCustomerCountry(customer), countryCondition)) return false;

  if (!hasAnyTag(customer, conditions.tag || conditions.tags)) return false;

  const priorityCondition = getCondition(conditions, 'ticket_priority', 'priority');
  if (typeof priorityCondition !== 'undefined' && !matchesTextCondition(ticket.priority, priorityCondition)) return false;

  const intentCondition = getCondition(conditions, 'intent');
  if (typeof intentCondition !== 'undefined' && !matchesTextCondition(context.analysis?.intent || ticket.intent, intentCondition)) return false;

  const languageCondition = getCondition(conditions, 'language');
  if (typeof languageCondition !== 'undefined' && !matchesTextCondition(context.analysis?.language || customer.preferences?.language, languageCondition)) return false;

  const scoreCondition = getCondition(conditions, 'score', 'lead_score');
  if (typeof scoreCondition !== 'undefined') {
    const score = context.analysis?.lead_score ?? context.deal?.lead_score ?? ticket.lead_score;
    if (!matchesNumberCondition(score, scoreCondition)) return false;
  }

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

function getActionTeamId(action = {}) {
  return action.assign_to_team
    || action.assignToTeam
    || action.team_id
    || action.teamId
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

async function resolveTenantTeamUser(tenantId, teamId, client) {
  if (!teamId) return null;
  const result = await execute(client, `
    SELECT id
    FROM users
    WHERE tenant_id = $1
      AND role IN ('owner', 'admin', 'agent')
      AND department = $2
    ORDER BY role ASC, created_at ASC
    LIMIT 1
  `, [tenantId, String(teamId)]);

  return result.rows[0]?.id || null;
}

async function applyRuleAction(tenantId, rule, context = {}, client) {
  const action = rule.action || {};
  const directUserId = await validateTenantUser(tenantId, getActionUserId(action), client);
  const teamUserId = directUserId ? null : await resolveTenantTeamUser(tenantId, getActionTeamId(action), client);
  const userId = directUserId || teamUserId;
  if (!userId) {
    return {
      matched: true,
      applied: false,
      rule,
      reason: action.assign_to_ai || action.assign_to_queue ? 'routed without human assignee' : 'no valid assignee',
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

  const directUserId = await validateTenantUser(tenantId, getActionUserId(rule.action), client);
  const teamUserId = directUserId ? null : await resolveTenantTeamUser(tenantId, getActionTeamId(rule.action), client);
  const assigneeId = directUserId || teamUserId;
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
