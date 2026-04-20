const { queryAdmin } = require('../pool');

async function getTenantById(tenantId, client) {
  const res = client
    ? await client.query('SELECT * FROM tenants WHERE id = $1', [tenantId])
    : await queryAdmin('SELECT * FROM tenants WHERE id = $1', [tenantId]);
  return res.rows[0] || null;
}

async function updateTenantSettings(tenantId, settings, client) {
  const res = client
    ? await client.query(
        'UPDATE tenants SET settings = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(settings), tenantId]
      )
    : await queryAdmin(
        'UPDATE tenants SET settings = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(settings), tenantId]
      );
  return res.rows[0];
}

async function updateKnowledgeBase(tenantId, knowledgeBase, client) {
  const res = client
    ? await client.query(
        'UPDATE tenants SET knowledge_base = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(knowledgeBase), tenantId]
      )
    : await queryAdmin(
        'UPDATE tenants SET knowledge_base = $1 WHERE id = $2 RETURNING *',
        [JSON.stringify(knowledgeBase), tenantId]
      );
  return res.rows[0];
}

module.exports = { getTenantById, updateTenantSettings, updateKnowledgeBase };
