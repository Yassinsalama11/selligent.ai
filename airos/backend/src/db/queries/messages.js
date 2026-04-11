const { query } = require('../pool');

async function saveMessage(tenantId, conversationId, { direction, type = 'text', content, media_url, sent_by, metadata = {} }) {
  const res = await query(`
    INSERT INTO messages (tenant_id, conversation_id, direction, type, content, media_url, sent_by, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `, [tenantId, conversationId, direction, type, content, media_url, sent_by, JSON.stringify(metadata)]);

  // Bump conversation updated_at
  await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

  return res.rows[0];
}

async function getMessages(tenantId, conversationId, { limit = 50, before } = {}) {
  const params = [conversationId, tenantId];
  let whereBefore = '';

  if (before) {
    params.push(before);
    whereBefore = `AND created_at < $${params.length}`;
  }

  params.push(limit);

  const res = await query(`
    SELECT * FROM messages
    WHERE conversation_id = $1 AND tenant_id = $2 ${whereBefore}
    ORDER BY created_at DESC LIMIT $${params.length}
  `, params);

  return res.rows.reverse();
}

module.exports = { saveMessage, getMessages };
