const { queryAdmin } = require('../pool');
const { encrypt, decrypt, isEncrypted } = require('../../../vendor/db/src/encryption');
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
  const res = client
    ? await client.query(`
    INSERT INTO messages (tenant_id, conversation_id, direction, type, content, media_url, sent_by, metadata, search_tokens)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [tenantId, conversationId, direction, type, encryptedContent, media_url, sent_by, JSON.stringify(metadata), JSON.stringify(searchTokens)])
    : await queryAdmin(`
    INSERT INTO messages (tenant_id, conversation_id, direction, type, content, media_url, sent_by, metadata, search_tokens)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [tenantId, conversationId, direction, type, encryptedContent, media_url, sent_by, JSON.stringify(metadata), JSON.stringify(searchTokens)]);

  // Bump conversation updated_at
  client
    ? await client.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId])
    : await queryAdmin('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

  return decryptMessageRow(tenantId, res.rows[0]);
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
