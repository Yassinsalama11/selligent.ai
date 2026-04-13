const express = require('express');

const { query, withTransaction } = require('../../db/pool');
const { updateTenantSettings } = require('../../db/queries/tenants');
const { normalizeTenantSettings, isPlainObject } = require('../../core/tenantSettings');

const router = express.Router();

const PLAN_LIMITS = {
  starter: {
    conversations: 1000,
    messages: 10000,
    aiReplies: 2500,
    contacts: 500,
    storageGb: 2,
    broadcast: 1000,
  },
  growth: {
    conversations: 5000,
    messages: 50000,
    aiReplies: 10000,
    contacts: 1000,
    storageGb: 10,
    broadcast: 5000,
  },
  pro: {
    conversations: 20000,
    messages: 200000,
    aiReplies: 50000,
    contacts: 5000,
    storageGb: 50,
    broadcast: 20000,
  },
};

function getPlanLimits(plan) {
  return PLAN_LIMITS[String(plan || '').toLowerCase()] || PLAN_LIMITS.growth;
}

function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function parseImportedTags(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeImportedRow(row = {}) {
  const get = (...keys) => {
    for (const key of keys) {
      if (row[key] != null) return row[key];
    }
    return '';
  };

  return {
    name: String(get('name', 'Name', 'full_name', 'Full Name')).trim(),
    phone: String(get('phone', 'Phone', 'mobile', 'Mobile')).trim(),
    email: String(get('email', 'Email')).trim().toLowerCase(),
    country: String(get('country', 'Country')).trim(),
    tags: parseImportedTags(get('tags', 'Tags')),
  };
}

router.get('/', async (req, res, next) => {
  try {
    res.json(normalizeTenantSettings(req.tenant?.settings));
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  try {
    const payload = req.body?.settings ?? req.body;

    if (!isPlainObject(payload)) {
      return res.status(400).json({ error: 'Settings payload must be an object' });
    }

    const saved = await updateTenantSettings(
      req.user.tenant_id,
      normalizeTenantSettings(payload),
    );

    res.json(normalizeTenantSettings(saved?.settings));
  } catch (err) {
    next(err);
  }
});

router.get('/usage', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const limits = getPlanLimits(req.tenant?.plan);
    const cycleStart = startOfMonth();
    const cycleEnd = endOfMonth();

    const [conversationsRes, messagesRes, aiRepliesRes, contactsRes, storageRes, broadcastRes] = await Promise.all([
      query('SELECT COUNT(*)::int AS total FROM conversations WHERE tenant_id = $1', [tenantId]),
      query('SELECT COUNT(*)::int AS total FROM messages WHERE tenant_id = $1', [tenantId]),
      query('SELECT COUNT(*)::int AS total FROM ai_suggestions WHERE tenant_id = $1', [tenantId]),
      query('SELECT COUNT(*)::int AS total FROM customers WHERE tenant_id = $1', [tenantId]),
      query(`
        SELECT COALESCE(SUM(
          OCTET_LENGTH(COALESCE(content, '')) +
          OCTET_LENGTH(COALESCE(media_url, ''))
        ), 0)::bigint AS total_bytes
        FROM messages
        WHERE tenant_id = $1
      `, [tenantId]),
      query(`
        SELECT COUNT(*)::int AS total
        FROM messages
        WHERE tenant_id = $1 AND direction = 'outbound'
      `, [tenantId]),
    ]);

    const totalBytes = Number(storageRes.rows[0]?.total_bytes || 0);
    const usedStorageGb = Number((totalBytes / (1024 ** 3)).toFixed(2));

    res.json({
      plan: String(req.tenant?.plan || 'growth'),
      cycleStart: cycleStart.toISOString().slice(0, 10),
      cycleEnd: cycleEnd.toISOString().slice(0, 10),
      conversations: {
        used: Number(conversationsRes.rows[0]?.total || 0),
        limit: limits.conversations,
      },
      messages: {
        used: Number(messagesRes.rows[0]?.total || 0),
        limit: limits.messages,
      },
      aiReplies: {
        used: Number(aiRepliesRes.rows[0]?.total || 0),
        limit: limits.aiReplies,
      },
      contacts: {
        used: Number(contactsRes.rows[0]?.total || 0),
        limit: limits.contacts,
      },
      storage: {
        used: usedStorageGb,
        limit: limits.storageGb,
        unit: 'GB',
      },
      broadcast: {
        used: Number(broadcastRes.rows[0]?.total || 0),
        limit: limits.broadcast,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/monitor', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const result = await query(`
      SELECT
        c.id,
        c.channel,
        c.status,
        c.assigned_to,
        c.created_at,
        c.updated_at,
        cu.name AS customer_name,
        cu.phone AS customer_phone,
        u.name AS agent_name,
        COALESCE(msg_counts.total, 0) AS message_count,
        COALESCE(last_message.sent_by, 'customer') AS last_sent_by
      FROM conversations c
      JOIN customers cu ON cu.id = c.customer_id
      LEFT JOIN users u ON u.id = c.assigned_to
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS total
        FROM messages m
        WHERE m.conversation_id = c.id
      ) AS msg_counts ON TRUE
      LEFT JOIN LATERAL (
        SELECT m.sent_by
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS last_message ON TRUE
      WHERE c.tenant_id = $1 AND c.status = 'open'
      ORDER BY c.updated_at DESC
      LIMIT 25
    `, [tenantId]);

    const conversations = result.rows.map((row) => {
      const ageMinutes = Math.max(
        1,
        Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000),
      );
      let monitorStatus = 'active';
      if (!row.assigned_to) monitorStatus = 'waiting';
      else if (row.last_sent_by === 'ai') monitorStatus = 'bot';

      return {
        id: row.id,
        channel: row.channel,
        customer: row.customer_name || row.customer_phone || 'Unknown customer',
        agent: row.agent_name || 'Unassigned',
        msgs: Number(row.message_count || 0),
        duration: `${ageMinutes}m`,
        status: monitorStatus,
      };
    });

    const summary = {
      active: conversations.filter((conversation) => conversation.status === 'active').length,
      bot: conversations.filter((conversation) => conversation.status === 'bot').length,
      waiting: conversations.filter((conversation) => conversation.status === 'waiting').length,
    };

    res.json({ summary, conversations });
  } catch (err) {
    next(err);
  }
});

router.post('/import/contacts', async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (rows.length === 0) {
      return res.status(400).json({ error: 'rows must be a non-empty array' });
    }
    if (rows.length > 2000) {
      return res.status(400).json({ error: 'Import is limited to 2000 rows per request' });
    }

    const tenantId = req.user.tenant_id;
    const result = await withTransaction(async (client) => {
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const rawRow of rows) {
        const row = normalizeImportedRow(rawRow);
        const identifier = row.email || row.phone;

        if (!identifier || (!row.name && !row.phone && !row.email)) {
          skipped += 1;
          continue;
        }

        try {
          const channelCustomerId = `import:${identifier}`;
          const preferences = {
            email: row.email || '',
            country: row.country || '',
            imported_at: new Date().toISOString(),
          };

          const existing = await client.query(`
            SELECT id, tags, preferences
            FROM customers
            WHERE tenant_id = $1 AND channel = 'import' AND channel_customer_id = $2
            LIMIT 1
          `, [tenantId, channelCustomerId]);

          if (existing.rows[0]) {
            const existingRow = existing.rows[0];
            const mergedTags = [...new Set([...(existingRow.tags || []), ...row.tags])];
            const mergedPreferences = {
              ...(existingRow.preferences || {}),
              ...preferences,
            };

            await client.query(`
              UPDATE customers
              SET
                name = $1,
                phone = $2,
                tags = $3,
                preferences = $4
              WHERE id = $5 AND tenant_id = $6
            `, [
              row.name || identifier,
              row.phone || null,
              JSON.stringify(mergedTags),
              JSON.stringify(mergedPreferences),
              existingRow.id,
              tenantId,
            ]);
          } else {
            await client.query(`
              INSERT INTO customers (
                tenant_id,
                channel_customer_id,
                channel,
                name,
                phone,
                tags,
                preferences
              )
              VALUES ($1, $2, 'import', $3, $4, $5, $6)
            `, [
              tenantId,
              channelCustomerId,
              row.name || identifier,
              row.phone || null,
              JSON.stringify(row.tags),
              JSON.stringify(preferences),
            ]);
          }

          imported += 1;
        } catch (err) {
          errors += 1;
        }
      }

      return {
        imported,
        skipped,
        errors,
        total: rows.length,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
