const { query } = require('../pool');

async function getTenantById(tenantId) {
  const res = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  return res.rows[0] || null;
}

async function updateTenantSettings(tenantId, settings) {
  const res = await query(
    'UPDATE tenants SET settings = $1 WHERE id = $2 RETURNING *',
    [JSON.stringify(settings), tenantId]
  );
  return res.rows[0];
}

async function updateKnowledgeBase(tenantId, knowledgeBase) {
  const res = await query(
    'UPDATE tenants SET knowledge_base = $1 WHERE id = $2 RETURNING *',
    [JSON.stringify(knowledgeBase), tenantId]
  );
  return res.rows[0];
}

module.exports = { getTenantById, updateTenantSettings, updateKnowledgeBase };
