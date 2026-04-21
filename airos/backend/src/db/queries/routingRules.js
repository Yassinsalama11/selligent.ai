const { queryAdmin } = require('../pool');

async function execute(client, sql, params) {
  return client ? client.query(sql, params) : queryAdmin(sql, params);
}

function normalizeRule(row = {}) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name || '',
    description: row.description || '',
    priority: Number(row.priority || 100),
    enabled: row.enabled !== false,
    conditions: row.conditions || {},
    action: row.action || {},
    created_by: row.created_by || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function normalizeRuleInput(input = {}) {
  return {
    name: String(input.name || '').trim(),
    description: String(input.description || '').trim(),
    priority: Number.isInteger(Number(input.priority)) ? Number(input.priority) : 100,
    enabled: input.enabled !== false,
    conditions: input.conditions && typeof input.conditions === 'object' ? input.conditions : {},
    action: input.action && typeof input.action === 'object' ? input.action : {},
  };
}

async function listRoutingRules(tenantId, filters = {}, client) {
  const params = [tenantId];
  const clauses = ['tenant_id = $1'];

  if (typeof filters.enabled !== 'undefined' && filters.enabled !== 'all') {
    params.push(String(filters.enabled) === 'true' || filters.enabled === true);
    clauses.push(`enabled = $${params.length}`);
  }

  const result = await execute(client, `
    SELECT *
    FROM routing_rules
    WHERE ${clauses.join(' AND ')}
    ORDER BY priority ASC, created_at ASC
  `, params);

  return result.rows.map(normalizeRule);
}

async function listEnabledRoutingRules(tenantId, client) {
  const result = await execute(client, `
    SELECT *
    FROM routing_rules
    WHERE tenant_id = $1
      AND enabled = TRUE
    ORDER BY priority ASC, created_at ASC
  `, [tenantId]);

  return result.rows.map(normalizeRule);
}

async function getRoutingRuleById(tenantId, ruleId, client) {
  const result = await execute(client, `
    SELECT *
    FROM routing_rules
    WHERE tenant_id = $1 AND id = $2
    LIMIT 1
  `, [tenantId, ruleId]);

  return result.rows[0] ? normalizeRule(result.rows[0]) : null;
}

async function createRoutingRule(tenantId, input = {}, createdBy = null, client) {
  const rule = normalizeRuleInput(input);
  if (!rule.name) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }

  const result = await execute(client, `
    INSERT INTO routing_rules (
      tenant_id,
      name,
      description,
      priority,
      enabled,
      conditions,
      action,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [
    tenantId,
    rule.name,
    rule.description,
    rule.priority,
    rule.enabled,
    JSON.stringify(rule.conditions),
    JSON.stringify(rule.action),
    createdBy,
  ]);

  return normalizeRule(result.rows[0]);
}

async function updateRoutingRule(tenantId, ruleId, updates = {}, client) {
  const allowed = new Set(['name', 'description', 'priority', 'enabled', 'conditions', 'action']);
  const fields = Object.keys(updates).filter((field) => allowed.has(field));
  if (!fields.length) return getRoutingRuleById(tenantId, ruleId, client);

  const params = [tenantId, ruleId];
  const sets = [];

  for (const field of fields) {
    let value = updates[field];
    if (field === 'name' || field === 'description') value = String(value || '').trim();
    if (field === 'priority') value = Number.isInteger(Number(value)) ? Number(value) : 100;
    if (field === 'enabled') value = value !== false;
    if (field === 'conditions' || field === 'action') value = JSON.stringify(value && typeof value === 'object' ? value : {});
    params.push(value);
    sets.push(`${field} = $${params.length}`);
  }

  sets.push('updated_at = NOW()');

  const result = await execute(client, `
    UPDATE routing_rules
    SET ${sets.join(', ')}
    WHERE tenant_id = $1 AND id = $2
    RETURNING *
  `, params);

  return result.rows[0] ? normalizeRule(result.rows[0]) : null;
}

async function deleteRoutingRule(tenantId, ruleId, client) {
  const result = await execute(client, `
    DELETE FROM routing_rules
    WHERE tenant_id = $1 AND id = $2
    RETURNING id
  `, [tenantId, ruleId]);

  return result.rows[0] ? { id: result.rows[0].id } : null;
}

module.exports = {
  listRoutingRules,
  listEnabledRoutingRules,
  getRoutingRuleById,
  createRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
  normalizeRule,
};
