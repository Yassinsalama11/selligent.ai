const { query } = require('../db/pool');
const { updateMigrationJob } = require('./base');
const { encrypt } = require('../vendor/db/src/encryption');
const { buildMessageSearchTokens } = require('../db/queries/messages');

function stripHtml(value = '') {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fromUnix(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? new Date(numeric * 1000).toISOString() : null;
}

async function fetchIntercom(path, accessToken) {
  const response = await fetch(path, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'Intercom-Version': '2.11',
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.errors?.[0]?.message || body?.message || `Intercom request failed: ${response.status}`);
  }
  return body;
}

async function upsertCustomer(tenantId, contact = {}, tags = []) {
  const externalId = String(contact.id || contact.user_id || contact.external_id || contact.email || '').trim();
  if (!externalId) return null;

  const email = String(contact.email || '').trim().toLowerCase();
  const phone = String(contact.phone || contact.phone_number || '').trim();
  const name = String(contact.name || email || phone || externalId).trim();
  const preferences = {
    email,
    source: 'intercom',
    external_id: externalId,
    intercom: {
      role: contact.role || '',
      created_at: fromUnix(contact.created_at),
      updated_at: fromUnix(contact.updated_at),
    },
  };

  const result = await query(`
    INSERT INTO customers (tenant_id, channel_customer_id, channel, name, phone, tags, preferences)
    VALUES ($1, $2, 'intercom', $3, $4, $5, $6)
    ON CONFLICT (tenant_id, channel_customer_id, channel) DO UPDATE
      SET name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          tags = EXCLUDED.tags,
          preferences = customers.preferences || EXCLUDED.preferences
    RETURNING *
  `, [
    tenantId,
    externalId,
    name,
    phone,
    JSON.stringify(tags.filter(Boolean)),
    JSON.stringify(preferences),
  ]);

  return result.rows[0] || null;
}

async function getOrCreateConversation(tenantId, customerId, externalConversationId) {
  const existing = await query(`
    SELECT c.*
    FROM conversations c
    JOIN messages m ON m.conversation_id = c.id
    WHERE c.tenant_id = $1
      AND c.channel = 'intercom'
      AND m.metadata->>'external_conversation_id' = $2
    ORDER BY c.created_at ASC
    LIMIT 1
  `, [tenantId, externalConversationId]);

  if (existing.rows[0]) return existing.rows[0];

  const created = await query(`
    INSERT INTO conversations (tenant_id, customer_id, channel, status)
    VALUES ($1, $2, 'intercom', 'closed')
    RETURNING *
  `, [tenantId, customerId]);

  return created.rows[0];
}

async function insertMessageIfNeeded(tenantId, conversationId, message) {
  if (!message.externalId || !message.content) return false;

  const duplicate = await query(`
    SELECT id
    FROM messages
    WHERE tenant_id = $1 AND metadata->>'external_message_id' = $2
    LIMIT 1
  `, [tenantId, message.externalId]);

  if (duplicate.rows[0]) return false;

  const encryptedContent = await encrypt(tenantId, message.content);
  const searchTokens = buildMessageSearchTokens(tenantId, message.content);

  await query(`
    INSERT INTO messages (
      tenant_id, conversation_id, direction, type, content, sent_by, metadata, created_at, search_tokens
    )
    VALUES ($1, $2, $3, 'text', $4, $5, $6, COALESCE($7::timestamptz, NOW()), $8)
  `, [
    tenantId,
    conversationId,
    message.direction,
    encryptedContent,
    message.sentBy,
    JSON.stringify(message.metadata),
    message.createdAt,
    JSON.stringify(searchTokens),
  ]);

  await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);
  return true;
}

function mapIntercomMessage(externalConversationId, part, fallbackId) {
  const authorType = part?.author?.type || '';
  const isOutbound = ['admin', 'bot', 'team'].includes(authorType);
  return {
    externalId: String(part.id || fallbackId),
    direction: isOutbound ? 'outbound' : 'inbound',
    sentBy: isOutbound ? 'agent' : 'customer',
    content: stripHtml(part.body || part.summary || ''),
    createdAt: fromUnix(part.created_at),
    metadata: {
      source: 'intercom',
      external_conversation_id: String(externalConversationId),
      external_message_id: String(part.id || fallbackId),
      author_type: authorType,
      part_type: part.part_type || 'source',
    },
  };
}

async function importConversation(tenantId, conversation, counts) {
  const externalConversationId = String(conversation.id || '').trim();
  if (!externalConversationId) return;

  const contact = conversation.contacts?.contacts?.[0]
    || conversation.source?.author
    || conversation.user
    || {};
  const customer = await upsertCustomer(tenantId, contact);
  if (!customer) return;

  const storedConversation = await getOrCreateConversation(tenantId, customer.id, externalConversationId);
  counts.conversations += 1;

  const sourceMessage = mapIntercomMessage(externalConversationId, {
    id: `${externalConversationId}:source`,
    body: conversation.source?.body,
    author: conversation.source?.author,
    created_at: conversation.created_at,
    part_type: 'source',
  }, `${externalConversationId}:source`);

  if (await insertMessageIfNeeded(tenantId, storedConversation.id, sourceMessage)) {
    counts.messages += 1;
  }

  const parts = conversation.conversation_parts?.conversation_parts || [];
  for (const part of parts) {
    const mapped = mapIntercomMessage(externalConversationId, part, `${externalConversationId}:${counts.messages}`);
    if (await insertMessageIfNeeded(tenantId, storedConversation.id, mapped)) {
      counts.messages += 1;
    }
  }
}

async function importContacts(tenantId, accessToken, maxPages, counts) {
  let url = 'https://api.intercom.io/contacts?per_page=150';

  for (let page = 0; page < maxPages && url; page += 1) {
    const data = await fetchIntercom(url, accessToken);
    const contacts = Array.isArray(data.data) ? data.data : [];
    for (const contact of contacts) {
      const tags = (contact.tags?.data || []).map((tag) => tag.name).filter(Boolean);
      const stored = await upsertCustomer(tenantId, contact, tags);
      if (stored) counts.customers += 1;
    }

    const nextCursor = data.pages?.next?.starting_after;
    url = nextCursor
      ? `https://api.intercom.io/contacts?per_page=150&starting_after=${encodeURIComponent(nextCursor)}`
      : '';
  }
}

async function importConversations(tenantId, accessToken, maxPages, counts) {
  let url = 'https://api.intercom.io/conversations?per_page=50';

  for (let page = 0; page < maxPages && url; page += 1) {
    const data = await fetchIntercom(url, accessToken);
    const conversations = Array.isArray(data.conversations) ? data.conversations : [];

    for (const entry of conversations) {
      if (!entry.id) continue;
      const detail = await fetchIntercom(`https://api.intercom.io/conversations/${entry.id}`, accessToken);
      await importConversation(tenantId, detail, counts);
    }

    const nextCursor = data.pages?.next?.starting_after;
    url = nextCursor
      ? `https://api.intercom.io/conversations?per_page=50&starting_after=${encodeURIComponent(nextCursor)}`
      : '';
  }
}

async function runIntercomImport({ tenantId, jobId, accessToken, workspace = '', maxPages = 3 }) {
  if (!accessToken) throw new Error('Intercom access token is required');

  const counts = { customers: 0, conversations: 0, messages: 0, macros: 0, tags: 0, teams: 0 };
  await updateMigrationJob(jobId, { status: 'running' });

  try {
    await importContacts(tenantId, accessToken, maxPages, counts);
    await importConversations(tenantId, accessToken, maxPages, counts);

    const [teams, tags] = await Promise.all([
      fetchIntercom('https://api.intercom.io/admins', accessToken).catch(() => ({ admins: [] })),
      fetchIntercom('https://api.intercom.io/tags', accessToken).catch(() => ({ data: [] })),
    ]);
    counts.teams = Array.isArray(teams.admins) ? teams.admins.length : 0;
    counts.tags = Array.isArray(tags.data) ? tags.data.length : 0;

    return updateMigrationJob(jobId, {
      status: 'completed',
      external_account: String(workspace || '').trim() || null,
      imported_counts: counts,
      metadata: { completed_at: new Date().toISOString() },
    });
  } catch (err) {
    await updateMigrationJob(jobId, { status: 'failed', error: err.message, imported_counts: counts });
    throw err;
  }
}

module.exports = { runIntercomImport };
