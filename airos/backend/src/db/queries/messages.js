const { queryAdmin } = require('../pool');
const { encrypt, decrypt, isEncrypted } = require('../../../vendor/db/src/encryption');
const { delCache, invalidatePattern, getCache, setCache } = require('../cache');
const { enqueueJob } = require('../../core/queue');
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

async function saveMessage(tenantId, conversationId, { direction, type = 'text', content, media_url, sent_by, metadata = {}, created_at }, client) {
  const encryptedContent = await encrypt(tenantId, content);
  const searchTokens = buildMessageSearchTokens(tenantId, content);
  const db = client || { query: queryAdmin };
  const createdAt = created_at ? new Date(created_at) : new Date();
  const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date() : createdAt;

  const res = await db.query(`
    INSERT INTO messages (tenant_id, conversation_id, direction, type, content, media_url, sent_by, metadata, search_tokens, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
  `, [tenantId, conversationId, direction, type, encryptedContent, media_url, sent_by, JSON.stringify(metadata), JSON.stringify(searchTokens), safeCreatedAt]);

  const saved = { ...res.rows[0] };
  if (!saved.created_at) saved.created_at = safeCreatedAt;
  else if (!(saved.created_at instanceof Date)) saved.created_at = new Date(saved.created_at);

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

  // Invalidate caches — fire and forget, don't block response
  delCache(tenantId, 'dashboard', 'summary').catch(() => {});
  invalidatePattern(tenantId, 'conversations').catch(() => {});
  invalidatePattern(tenantId, 'messages').catch(() => {});

  // Enqueue background refreshes
  enqueueJob('refresh_tenant_stats', { tenantId }).catch(() => {});
  enqueueJob('refresh_daily_report', { tenantId, date: saved.created_at.toISOString().slice(0, 10) }).catch(() => {});

  return decryptMessageRow(tenantId, saved);
}

async function getMessages(tenantId, conversationId, { limit = 50, before } = {}, client) {
  // Cache the initial page (no before cursor) for 30s — evicted on saveMessage
  const cacheKey = !before ? `msgs:${conversationId}:${limit}` : null;
  if (cacheKey) {
    const cached = await getCache(tenantId, 'messages', cacheKey);
    if (cached) return cached;
  }

  const params = [conversationId, tenantId];
  let whereBefore = '';

  if (before) {
    params.push(before);
    whereBefore = `AND created_at < $${params.length}`;
  }

  params.push(limit);

  const cols = 'id, tenant_id, conversation_id, direction, type, content, media_url, sent_by, metadata, created_at';
  const res = client
    ? await client.query(`
    SELECT ${cols} FROM messages
    WHERE conversation_id = $1 AND tenant_id = $2 ${whereBefore}
    ORDER BY created_at DESC LIMIT $${params.length}
  `, params)
    : await queryAdmin(`
    SELECT ${cols} FROM messages
    WHERE conversation_id = $1 AND tenant_id = $2 ${whereBefore}
    ORDER BY created_at DESC LIMIT $${params.length}
  `, params);

  const rows = res.rows.reverse();
  const decrypted = await Promise.all(rows.map((row) => decryptMessageRow(tenantId, row)));

  if (cacheKey) {
    setCache(tenantId, 'messages', cacheKey, decrypted, 30).catch(() => {});
  }
  return decrypted;
}

module.exports = {
  saveMessage,
  getMessages,
  decryptMessageRow,
  decryptMessageContent,
  buildMessageSearchTokens,
};
