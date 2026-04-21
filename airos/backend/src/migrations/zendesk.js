const { query } = require('../db/pool');
const { updateMigrationJob } = require('./base');
const { encrypt } = require('../../vendor/db/src/encryption');
const { buildMessageSearchTokens } = require('../db/queries/messages');

function basicAuth(email, apiToken) {
  return Buffer.from(`${email}/token:${apiToken}`).toString('base64');
}

function zendeskUrl(subdomain, path) {
  const clean = String(subdomain || '').replace(/^https?:\/\//, '').replace(/\.zendesk\.com.*$/, '').trim();
  if (!clean) throw new Error('Zendesk subdomain is required');
  return `https://${clean}.zendesk.com${path}`;
}

async function fetchZendesk(subdomain, path, email, apiToken) {
  const response = await fetch(zendeskUrl(subdomain, path), {
    headers: {
      Authorization: `Basic ${basicAuth(email, apiToken)}`,
      Accept: 'application/json',
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || body?.description || `Zendesk request failed: ${response.status}`);
  }
  return body;
}

async function upsertCustomer(tenantId, user = {}, tags = []) {
  const externalId = String(user.id || user.email || user.phone || '').trim();
  if (!externalId) return null;

  const email = String(user.email || '').trim().toLowerCase();
  const phone = String(user.phone || user.mobile || '').trim();
  const preferences = {
    email,
    source: 'zendesk',
    external_id: externalId,
    zendesk: {
      role: user.role || '',
      locale: user.locale || '',
      time_zone: user.time_zone || '',
      organization_id: user.organization_id || null,
    },
  };

  const result = await query(`
    INSERT INTO customers (tenant_id, channel_customer_id, channel, name, phone, tags, preferences)
    VALUES ($1, $2, 'zendesk', $3, $4, $5, $6)
    ON CONFLICT (tenant_id, channel_customer_id, channel) DO UPDATE
      SET name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          tags = EXCLUDED.tags,
          preferences = customers.preferences || EXCLUDED.preferences
    RETURNING *
  `, [
    tenantId,
    externalId,
    String(user.name || email || phone || externalId).trim(),
    phone,
    JSON.stringify(tags.filter(Boolean)),
    JSON.stringify(preferences),
  ]);

  return result.rows[0] || null;
}

async function getOrCreateConversation(tenantId, customerId, ticketId, status = 'closed') {
  const existing = await query(`
    SELECT c.*
    FROM conversations c
    JOIN messages m ON m.conversation_id = c.id
    WHERE c.tenant_id = $1
      AND c.channel = 'zendesk'
      AND m.metadata->>'external_conversation_id' = $2
    ORDER BY c.created_at ASC
    LIMIT 1
  `, [tenantId, String(ticketId)]);

  if (existing.rows[0]) return existing.rows[0];

  const created = await query(`
    INSERT INTO conversations (tenant_id, customer_id, channel, status)
    VALUES ($1, $2, 'zendesk', $3)
    RETURNING *
  `, [tenantId, customerId, status === 'closed' || status === 'solved' ? 'closed' : 'open']);

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

async function importUsers(tenantId, subdomain, email, apiToken, maxPages, counts) {
  let path = '/api/v2/users.json?role=end-user&per_page=100';

  for (let page = 0; page < maxPages && path; page += 1) {
    const data = await fetchZendesk(subdomain, path, email, apiToken);
    const users = Array.isArray(data.users) ? data.users : [];
    for (const user of users) {
      const stored = await upsertCustomer(tenantId, user, user.tags || []);
      if (stored) counts.customers += 1;
    }

    path = data.next_page
      ? new URL(data.next_page).pathname + new URL(data.next_page).search
      : '';
  }
}

async function importTicket(tenantId, subdomain, email, apiToken, ticket, counts) {
  const requester = ticket.requester_id
    ? await fetchZendesk(subdomain, `/api/v2/users/${ticket.requester_id}.json`, email, apiToken)
      .then((data) => data.user)
      .catch(() => ({ id: ticket.requester_id, name: `Requester ${ticket.requester_id}` }))
    : { id: `ticket:${ticket.id}`, name: ticket.subject || `Ticket ${ticket.id}` };

  const customer = await upsertCustomer(tenantId, requester, ticket.tags || []);
  if (!customer) return;

  const conversation = await getOrCreateConversation(tenantId, customer.id, ticket.id, ticket.status);
  counts.conversations += 1;

  const comments = await fetchZendesk(subdomain, `/api/v2/tickets/${ticket.id}/comments.json`, email, apiToken)
    .then((data) => Array.isArray(data.comments) ? data.comments : [])
    .catch(() => []);

  for (const comment of comments) {
    const isRequester = String(comment.author_id) === String(ticket.requester_id);
    const inserted = await insertMessageIfNeeded(tenantId, conversation.id, {
      externalId: `zendesk:${ticket.id}:${comment.id}`,
      direction: isRequester ? 'inbound' : 'outbound',
      sentBy: isRequester ? 'customer' : 'agent',
      content: String(comment.plain_body || comment.body || '').trim(),
      createdAt: comment.created_at || ticket.created_at || null,
      metadata: {
        source: 'zendesk',
        external_conversation_id: String(ticket.id),
        external_message_id: `zendesk:${ticket.id}:${comment.id}`,
        public: Boolean(comment.public),
        author_id: comment.author_id || null,
        ticket_status: ticket.status || '',
      },
    });
    if (inserted) counts.messages += 1;
  }
}

async function importTickets(tenantId, subdomain, email, apiToken, maxPages, counts) {
  let path = '/api/v2/tickets.json?per_page=100';

  for (let page = 0; page < maxPages && path; page += 1) {
    const data = await fetchZendesk(subdomain, path, email, apiToken);
    const tickets = Array.isArray(data.tickets) ? data.tickets : [];
    for (const ticket of tickets) {
      await importTicket(tenantId, subdomain, email, apiToken, ticket, counts);
    }

    path = data.next_page
      ? new URL(data.next_page).pathname + new URL(data.next_page).search
      : '';
  }
}

async function importReferenceCounts(subdomain, email, apiToken, counts) {
  const [macros, tags, groups] = await Promise.all([
    fetchZendesk(subdomain, '/api/v2/macros.json?per_page=100', email, apiToken).catch(() => ({ macros: [] })),
    fetchZendesk(subdomain, '/api/v2/tags.json', email, apiToken).catch(() => ({ tags: [] })),
    fetchZendesk(subdomain, '/api/v2/groups.json?per_page=100', email, apiToken).catch(() => ({ groups: [] })),
  ]);

  counts.macros = Array.isArray(macros.macros) ? macros.macros.length : 0;
  counts.tags = Array.isArray(tags.tags) ? tags.tags.length : 0;
  counts.teams = Array.isArray(groups.groups) ? groups.groups.length : 0;
}

async function runZendeskImport({ tenantId, jobId, subdomain, email, apiToken, maxPages = 3 }) {
  if (!subdomain || !email || !apiToken) {
    throw new Error('Zendesk subdomain, email, and API token are required');
  }

  const counts = { customers: 0, conversations: 0, messages: 0, macros: 0, tags: 0, teams: 0 };
  await updateMigrationJob(jobId, { status: 'running' });

  try {
    await importUsers(tenantId, subdomain, email, apiToken, maxPages, counts);
    await importTickets(tenantId, subdomain, email, apiToken, maxPages, counts);
    await importReferenceCounts(subdomain, email, apiToken, counts);

    return updateMigrationJob(jobId, {
      status: 'completed',
      external_account: String(subdomain).replace(/^https?:\/\//, ''),
      imported_counts: counts,
      metadata: { completed_at: new Date().toISOString() },
    });
  } catch (err) {
    await updateMigrationJob(jobId, { status: 'failed', error: err.message, imported_counts: counts });
    throw err;
  }
}

module.exports = { runZendeskImport };
