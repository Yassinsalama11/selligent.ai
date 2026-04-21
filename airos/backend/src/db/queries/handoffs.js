'use strict';
const { queryAdmin } = require('../pool');

const ENRICH = `
  SELECT h.*,
         req.name  AS requested_by_name,
         tgt.name  AS requested_to_name,
         res.name  AS resolved_by_name
  FROM   conversation_handoffs h
  LEFT JOIN users req ON req.id = h.requested_by
  LEFT JOIN users tgt ON tgt.id = h.requested_to
  LEFT JOIN users res ON res.id = h.resolved_by
`;

async function createHandoff(tenantId, conversationId, requestedBy, requestedTo, reason, client) {
  const sql = `
    INSERT INTO conversation_handoffs
      (tenant_id, conversation_id, requested_by, requested_to, reason)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const params = [tenantId, conversationId, requestedBy, requestedTo || null, reason || ''];
  const raw = client
    ? await client.query(sql, params)
    : await queryAdmin(sql, params);
  const id = raw.rows[0].id;
  return getHandoff(tenantId, id, client);
}

async function getPendingHandoff(tenantId, conversationId, client) {
  const sql = `${ENRICH}
    WHERE h.tenant_id = $1 AND h.conversation_id = $2 AND h.status = 'pending'
    ORDER BY h.requested_at DESC LIMIT 1
  `;
  const res = client
    ? await client.query(sql, [tenantId, conversationId])
    : await queryAdmin(sql, [tenantId, conversationId]);
  return res.rows[0] || null;
}

async function getHandoff(tenantId, handoffId, client) {
  const sql = `${ENRICH}
    WHERE h.tenant_id = $1 AND h.id = $2 LIMIT 1
  `;
  const res = client
    ? await client.query(sql, [tenantId, handoffId])
    : await queryAdmin(sql, [tenantId, handoffId]);
  return res.rows[0] || null;
}

async function resolveHandoff(tenantId, handoffId, status, resolvedBy, client) {
  const sql = `
    UPDATE conversation_handoffs
    SET    status = $1, resolved_at = NOW(), resolved_by = $2
    WHERE  tenant_id = $3 AND id = $4 AND status = 'pending'
    RETURNING id
  `;
  const raw = client
    ? await client.query(sql, [status, resolvedBy, tenantId, handoffId])
    : await queryAdmin(sql, [status, resolvedBy, tenantId, handoffId]);
  if (!raw.rows[0]) return null;
  return getHandoff(tenantId, handoffId, client);
}

// Fire-and-forget — called outside request context, uses adminPool directly
async function updateHandoffSummary(tenantId, handoffId, aiSummary) {
  await queryAdmin(
    'UPDATE conversation_handoffs SET ai_summary = $1 WHERE tenant_id = $2 AND id = $3',
    [aiSummary, tenantId, handoffId]
  );
}

module.exports = { createHandoff, getPendingHandoff, getHandoff, resolveHandoff, updateHandoffSummary };
