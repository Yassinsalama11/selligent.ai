const { queryAdmin } = require('../pool');

async function logAuditEvent({
  tenantId,
  actorType,
  actorId = null,
  action,
  entityType,
  entityId,
  metadata = {},
}) {
  const result = await queryAdmin(
    `INSERT INTO audit_log
      (tenant_id, actor_type, actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [tenantId, actorType, actorId, action, entityType, entityId, JSON.stringify(metadata || {})]
  );

  return result.rows[0];
}

module.exports = { logAuditEvent };
