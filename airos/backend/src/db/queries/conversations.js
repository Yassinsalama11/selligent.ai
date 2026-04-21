const { queryAdmin } = require('../pool');
const { decryptMessageContent, buildMessageSearchTokens } = require('./messages');

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

function normalizeLimit(value, fallback = 50) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 100);
}

function normalizeOffset(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

async function listConversations(tenantId, {
  status,
  channel,
  assigned_to,
  priority,
  search,
  limit = 50,
  offset = 0,
  viewerRole,
  viewerId,
} = {}, client) {
  const conditions = ['c.tenant_id = $1'];
  const params = [tenantId];
  let i = 2;

  if (status && status !== 'all') { conditions.push(`c.status = $${i++}`); params.push(status); }
  if (channel && channel !== 'all') { conditions.push(`c.channel = $${i++}`); params.push(channel); }
  if (assigned_to && assigned_to !== 'all') {
    if (assigned_to === 'unassigned') conditions.push('c.assigned_to IS NULL');
    else { conditions.push(`c.assigned_to = $${i++}`); params.push(assigned_to); }
  }
  if (priority && priority !== 'all') {
    conditions.push(`t.priority = $${i++}`);
    params.push(priority);
  }
  if (search) {
    const like = `%${String(search).trim().toLowerCase()}%`;
    const searchTokens = buildMessageSearchTokens(tenantId, search);
    conditions.push(`(
      LOWER(COALESCE(cu.name, '')) LIKE $${i}
      OR LOWER(COALESCE(cu.phone, '')) LIKE $${i}
      OR LOWER(COALESCE(cu.preferences->>'email', '')) LIKE $${i}
      OR EXISTS (
        SELECT 1
        FROM messages m
        WHERE m.tenant_id = c.tenant_id
          AND m.conversation_id = c.id
          AND (
            m.search_tokens ?| $${i + 1}::text[]
            OR (
              COALESCE(jsonb_array_length(m.search_tokens), 0) = 0
              AND COALESCE(m.content, '') NOT LIKE 'enc:v1:%'
              AND LOWER(COALESCE(m.content, '')) LIKE $${i}
            )
          )
      )
    )`);
    params.push(like);
    params.push(searchTokens);
    i += 2;
  }

  if (viewerRole === 'agent' && viewerId) {
    conditions.push('(c.assigned_to = $' + i + ' OR c.assigned_to IS NULL)');
    params.push(viewerId);
    i += 1;
  }

  params.push(normalizeLimit(limit), normalizeOffset(offset));

  const res = client
    ? await client.query(`
    SELECT c.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.avatar_url,
           cu.preferences->>'email' AS customer_email,
           u.name AS assignee_name,
           t.priority,
           (SELECT content FROM messages WHERE tenant_id = c.tenant_id AND conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN customers cu ON cu.id = c.customer_id
    LEFT JOIN users u ON u.id = c.assigned_to AND u.tenant_id = c.tenant_id
    LEFT JOIN tickets t ON t.tenant_id = c.tenant_id AND t.conversation_id = c.id AND t.deleted_at IS NULL
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.updated_at DESC
    LIMIT $${i++} OFFSET $${i}
  `, params)
    : await queryAdmin(`
    SELECT c.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.avatar_url,
           cu.preferences->>'email' AS customer_email,
           u.name AS assignee_name,
           t.priority,
           (SELECT content FROM messages WHERE tenant_id = c.tenant_id AND conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN customers cu ON cu.id = c.customer_id
    LEFT JOIN users u ON u.id = c.assigned_to AND u.tenant_id = c.tenant_id
    LEFT JOIN tickets t ON t.tenant_id = c.tenant_id AND t.conversation_id = c.id AND t.deleted_at IS NULL
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.updated_at DESC
    LIMIT $${i++} OFFSET $${i}
  `, params);

  return Promise.all(res.rows.map(async (row) => ({
    ...row,
    last_message: await decryptMessageContent(tenantId, row.last_message),
  })));
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
  const nextAssignee = userId || null;
  if (nextAssignee) {
    const assignee = client
      ? await client.query(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1',
        [nextAssignee, tenantId]
      )
      : await queryAdmin(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1',
        [nextAssignee, tenantId]
      );
    if (!assignee.rows[0]) return null;
  }

  const db = client || { query: queryAdmin };
  const res = client
    ? await client.query(`
    UPDATE conversations SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [nextAssignee, conversationId, tenantId])
    : await queryAdmin(`
    UPDATE conversations SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [nextAssignee, conversationId, tenantId]);
  if (!res.rows[0]) return null;

  const enriched = await db.query(`
    SELECT c.*, cu.name AS customer_name, cu.phone AS customer_phone, cu.avatar_url,
           cu.preferences->>'email' AS customer_email,
           u.name AS assignee_name,
           t.priority,
           (SELECT content FROM messages WHERE tenant_id = c.tenant_id AND conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM conversations c
    JOIN customers cu ON cu.id = c.customer_id
    LEFT JOIN users u ON u.id = c.assigned_to AND u.tenant_id = c.tenant_id
    LEFT JOIN tickets t ON t.tenant_id = c.tenant_id AND t.conversation_id = c.id AND t.deleted_at IS NULL
    WHERE c.id = $1 AND c.tenant_id = $2
    LIMIT 1
  `, [conversationId, tenantId]);

  const row = enriched.rows[0] || res.rows[0];
  return row
    ? { ...row, last_message: await decryptMessageContent(tenantId, row.last_message) }
    : row;
}

module.exports = { getOrCreateConversation, listConversations, updateConversationStatus, assignConversation };
