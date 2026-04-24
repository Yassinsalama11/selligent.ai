const { queryAdmin } = require('../pool');
const { encrypt, decrypt, isEncrypted } = require('../../../vendor/db/src/encryption');
const { delCache, invalidatePattern } = require('../cache');
const crypto = require('crypto');

function normalizeSearchText(value) {
  return String(value || '').toLowerCase();
}

function tokenizeSearchText(value) {
  return [...new Set(
    normalizeSearchText(value)
      .split(/[^\p{L}\p{N}]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2)
  )];
}

function hashSearchToken(tenantId, token) {
  return crypto
    .createHash('sha256')
    .update(`${tenantId}:${token}`)
    .digest('hex');
}

function buildMessageSearchTokens(tenantId, content) {
  return tokenizeSearchText(content).map((token) => hashSearchToken(tenantId, token));
}

async function decryptMessageContent(tenantId, content) {
  if (!isEncrypted(content)) return content;
  return decrypt(tenantId, content);
}

async function decryptMessageRow(tenantId, row = {}) {
  if (!row || typeof row !== 'object') return row;
  return {
    ...row,
    content: await decryptMessageContent(tenantId, row.content),
  };
}

async function saveMessage(tenantId, conversationId, { direction, type = 'text', content, media_url, sent_by, metadata = {} }, client) {
  const encryptedContent = await encrypt(tenantId, content);
  const searchTokens = buildMessageSearchTokens(tenantId, content);
  const db = client || { query: queryAdmin };

  const res = await db.query(`
    INSERT INTO messages (tenant_id, conversation_id, direction, type, content, media_url, sent_by, metadata, search_tokens)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [tenantId, conversationId, direction, type, encryptedContent, media_url, sent_by, JSON.stringify(metadata), JSON.stringify(searchTokens)]);

  const saved = res.rows[0];

  // Denormalize last_message fields in parent conversation
  let preview = 'Message';
  if (type === 'image') preview = 'Image attachment';
  else if (type === 'file') preview = 'File attachment';
  else if (type === 'internal_note') preview = 'Internal note';
  else if (content) {
    // Safe short preview (max 160 chars)
    preview = String(content).slice(0, 160);
  }

  await db.query(`
    UPDATE conversations
    SET updated_at = $1,
        last_message_at = $1,
        last_message_preview = $2,
        last_message_sender = $3,
        last_message_direction = $4
    WHERE id = $5 AND tenant_id = $6
  `, [saved.created_at, preview, sent_by, direction, conversationId, tenantId]);

  // Invalidate dashboard summary cache
  await delCache(tenantId, 'dashboard', 'summary');
  // Invalidate conversation list caches
  await invalidatePattern(tenantId, 'conversations');

  return decryptMessageRow(tenantId, saved);
}

async function getMessages(tenantId, conversationId, { limit = 50, before } = {}, client) {
  const params = [conversationId, tenantId];
  let whereBefore = '';

  if (before) {
    params.push(before);
    whereBefore = `AND created_at < $${params.length}`;
  }

  params.push(limit);

  const res = client
    ? await client.query(`
    SELECT * FROM messages
    WHERE conversation_id = $1 AND tenant_id = $2 ${whereBefore}
    ORDER BY created_at DESC LIMIT $${params.length}
  `, params)
    : await queryAdmin(`
    SELECT * FROM messages
    WHERE conversation_id = $1 AND tenant_id = $2 ${whereBefore}
    ORDER BY created_at DESC LIMIT $${params.length}
  `, params);

  const rows = res.rows.reverse();
  return Promise.all(rows.map((row) => decryptMessageRow(tenantId, row)));
}

module.exports = {
  saveMessage,
  getMessages,
  decryptMessageRow,
  decryptMessageContent,
  buildMessageSearchTokens,
};
