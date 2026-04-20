const { queryAdmin } = require('../pool');

async function getOrCreateConversation(tenantId, customerId, channel, client) {
  // Try to find an existing open conversation
  const existing = client
    ? await client.query(`
    SELECT * FROM conversations
    WHERE tenant_id = $1 AND customer_id = $2 AND channel = $3 AND status = 'open'
    ORDER BY updated_at DESC LIMIT 1
  `, [tenantId, customerId, channel])
    : await queryAdmin(`
    SELECT * FROM conversations
    WHERE tenant_id = $1 AND customer_id = $2 AND channel = $3 AND status = 'open'
    ORDER BY updated_at DESC LIMIT 1
  `, [tenantId, customerId, channel]);

  if (existing.rows.length > 0) return existing.rows[0];

  const res = client
    ? await client.query(`
    INSERT INTO conversations (tenant_id, customer_id, channel)
    VALUES ($1, $2, $3) RETURNING *
  `, [tenantId, customerId, channel])
    : await queryAdmin(`
    INSERT INTO conversations (tenant_id, customer_id, channel)
    VALUES ($1, $2, $3) RETURNING *
  `, [tenantId, customerId, channel]);

  return res.rows[0];
}

async function listConversations(tenantId, { status, channel, assigned_to, limit = 50, offset = 0 } = {}, client) {
  const conditions = ['c.tenant_id = $1'];
  const params = [tenantId];
  let i = 2;

  if (status) { conditions.push(`c.status = $${i++}`); params.push(status); }
  if (channel) { conditions.push(`c.channel = $${i++}`); params.push(channel); }
  if (assigned_to) { conditions.push(`c.assigned_to = $${i++}`); params.push(assigned_to); }

  params.push(limit, offset);

  const res = client
    ? await client.query(`
    SELECT c.*, cu.name AS customer_name, cu.avatar_url,
           (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN customers cu ON cu.id = c.customer_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.updated_at DESC
    LIMIT $${i++} OFFSET $${i}
  `, params)
    : await queryAdmin(`
    SELECT c.*, cu.name AS customer_name, cu.avatar_url,
           (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN customers cu ON cu.id = c.customer_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.updated_at DESC
    LIMIT $${i++} OFFSET $${i}
  `, params);

  return res.rows;
}

async function updateConversationStatus(tenantId, conversationId, status, client) {
  const res = client
    ? await client.query(`
    UPDATE conversations SET status = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [status, conversationId, tenantId])
    : await queryAdmin(`
    UPDATE conversations SET status = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [status, conversationId, tenantId]);
  return res.rows[0];
}

async function assignConversation(tenantId, conversationId, userId, client) {
  const res = client
    ? await client.query(`
    UPDATE conversations SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [userId, conversationId, tenantId])
    : await queryAdmin(`
    UPDATE conversations SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [userId, conversationId, tenantId]);
  return res.rows[0];
}

module.exports = { getOrCreateConversation, listConversations, updateConversationStatus, assignConversation };
