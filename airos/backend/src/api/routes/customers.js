const crypto = require('crypto');
const express = require('express');

const { appendRecycleItem } = require('../../core/recycleBin');

const router = express.Router();

function parseTags(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value !== 'string') return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function formatLastSeen(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function mapCustomerRow(row = {}) {
  const preferences = row.preferences || {};
  const customFields = preferences.custom_fields || {};

  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    email: preferences.email || '',
    ch: row.last_channel || row.channel || 'import',
    channel: row.last_channel || row.channel || 'import',
    country: preferences.country || '',
    tags: Array.isArray(row.tags) ? row.tags : [],
    orders: Number(row.orders || 0),
    revenue: Number(row.revenue || 0),
    lastSeen: formatLastSeen(row.last_seen || row.created_at),
    createdAt: row.created_at,
    customFields,
  };
}

function daysSince(value) {
  if (!value) return 999;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 999;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86400000));
}

function computeChurnScore(customer, messages = [], deals = []) {
  const lastActivity = messages[messages.length - 1]?.created_at || customer.lastSeen || customer.createdAt;
  const inactiveDays = daysSince(lastActivity);
  const lostDeals = deals.filter((deal) => deal.stage === 'lost').length;
  const openDeals = deals.filter((deal) => !['won', 'lost'].includes(deal.stage)).length;

  let score = 10;
  if (inactiveDays > 30) score += 35;
  else if (inactiveDays > 14) score += 22;
  else if (inactiveDays > 7) score += 12;
  score += Math.min(30, lostDeals * 12);
  if (openDeals === 0) score += 10;
  if (customer.tags?.includes('VIP')) score -= 8;

  return Math.max(0, Math.min(100, score));
}

router.get('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const params = [tenantId];
    const filters = [
      'c.tenant_id = $1',
      "COALESCE(c.preferences->>'deleted_at', '') = ''",
    ];
    let index = 2;

    if (req.query.search) {
      params.push(`%${String(req.query.search).trim().toLowerCase()}%`);
      filters.push(`(
        LOWER(COALESCE(c.name, '')) LIKE $${index}
        OR LOWER(COALESCE(c.phone, '')) LIKE $${index}
        OR LOWER(COALESCE(c.preferences->>'email', '')) LIKE $${index}
      )`);
      index += 1;
    }

    if (req.query.channel && req.query.channel !== 'all') {
      params.push(String(req.query.channel));
      filters.push(`COALESCE(last_conv.channel, c.channel) = $${index}`);
      index += 1;
    }

    if (req.query.tag) {
      params.push(String(req.query.tag));
      filters.push(`c.tags ? $${index}`);
      index += 1;
    }

    params.push(Number(req.query.limit || 200));

    const result = await req.db.query(`
      SELECT
        c.*,
        COALESCE(stats.orders, 0)::int AS orders,
        COALESCE(stats.revenue, 0)::numeric AS revenue,
        last_conv.channel AS last_channel,
        last_conv.updated_at AS last_seen
      FROM customers c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE d.stage = 'won') AS orders,
          COALESCE(SUM(CASE WHEN d.stage = 'won' THEN COALESCE(d.estimated_value, 0) ELSE 0 END), 0) AS revenue
        FROM deals d
        WHERE d.tenant_id = c.tenant_id AND d.customer_id = c.id
      ) AS stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT conv.channel, conv.updated_at
        FROM conversations conv
        WHERE conv.tenant_id = c.tenant_id AND conv.customer_id = c.id
        ORDER BY conv.updated_at DESC
        LIMIT 1
      ) AS last_conv ON TRUE
      WHERE ${filters.join(' AND ')}
      ORDER BY COALESCE(last_conv.updated_at, c.created_at) DESC
      LIMIT $${index}
    `, params);

    res.json(result.rows.map(mapCustomerRow));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/timeline', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const customerResult = await req.db.query(`
      SELECT
        c.*,
        COALESCE(stats.orders, 0)::int AS orders,
        COALESCE(stats.revenue, 0)::numeric AS revenue,
        last_conv.channel AS last_channel,
        last_conv.updated_at AS last_seen
      FROM customers c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE d.stage = 'won') AS orders,
          COALESCE(SUM(CASE WHEN d.stage = 'won' THEN COALESCE(d.estimated_value, 0) ELSE 0 END), 0) AS revenue
        FROM deals d
        WHERE d.tenant_id = c.tenant_id AND d.customer_id = c.id
      ) AS stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT conv.channel, conv.updated_at
        FROM conversations conv
        WHERE conv.tenant_id = c.tenant_id AND conv.customer_id = c.id
        ORDER BY conv.updated_at DESC
        LIMIT 1
      ) AS last_conv ON TRUE
      WHERE c.id = $1
        AND c.tenant_id = $2
        AND COALESCE(c.preferences->>'deleted_at', '') = ''
      LIMIT 1
    `, [req.params.id, tenantId]);

    const customerRow = customerResult.rows[0];
    if (!customerRow) return res.status(404).json({ error: 'Customer not found' });

    const [conversationResult, messageResult, dealResult] = await Promise.all([
      req.db.query(`
        SELECT c.*, u.name AS assigned_name
        FROM conversations c
        LEFT JOIN users u ON u.id = c.assigned_to
        WHERE c.tenant_id = $1 AND c.customer_id = $2
        ORDER BY c.created_at ASC
      `, [tenantId, req.params.id]),
      req.db.query(`
        SELECT
          m.*,
          c.channel,
          c.status AS conversation_status
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.tenant_id = $1 AND c.customer_id = $2
        ORDER BY m.created_at ASC
      `, [tenantId, req.params.id]),
      req.db.query(`
        SELECT *
        FROM deals
        WHERE tenant_id = $1 AND customer_id = $2
        ORDER BY created_at ASC
      `, [tenantId, req.params.id]),
    ]);

    const customer = mapCustomerRow(customerRow);
    const conversations = conversationResult.rows;
    const messages = messageResult.rows;
    const deals = dealResult.rows;

    const activity = [
      ...conversations.map((conversation) => ({
        id: `conversation:${conversation.id}`,
        type: 'conversation',
        title: `${conversation.channel} conversation ${conversation.status}`,
        description: conversation.assigned_name ? `Assigned to ${conversation.assigned_name}` : 'Conversation opened',
        timestamp: conversation.created_at,
        channel: conversation.channel,
        conversationId: conversation.id,
      })),
      ...messages.map((message) => ({
        id: `message:${message.id}`,
        type: 'message',
        title: message.direction === 'inbound' ? 'Customer message' : `${message.sent_by || 'agent'} reply`,
        description: message.content || message.media_url || message.type,
        timestamp: message.created_at,
        channel: message.channel,
        conversationId: message.conversation_id,
        direction: message.direction,
        sentBy: message.sent_by,
      })),
      ...deals.map((deal) => ({
        id: `deal:${deal.id}`,
        type: 'deal',
        title: `Deal ${String(deal.stage || '').replace(/_/g, ' ')}`,
        description: `${deal.currency || 'USD'} ${Number(deal.estimated_value || 0).toLocaleString()} · score ${deal.lead_score || 0}`,
        timestamp: deal.created_at,
        dealId: deal.id,
        stage: deal.stage,
      })),
    ].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));

    const openConversation = conversations
      .filter((conversation) => conversation.status === 'open')
      .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at))[0] || null;
    const activeDeal = deals.find((deal) => !['won', 'lost'].includes(deal.stage)) || null;

    res.json({
      customer: {
        ...customer,
        lifetimeValue: Number(customer.revenue || 0),
        churnScore: computeChurnScore(customer, messages, deals),
      },
      conversations,
      messages,
      deals,
      activity,
      quickActions: {
        openConversationId: openConversation?.id || null,
        activeDealId: activeDeal?.id || null,
        canCreateDeal: !activeDeal,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      name,
      phone,
      email,
      channel = 'import',
      country = '',
      tags = [],
      customFields = {},
    } = req.body || {};

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const channelCustomerId = `manual:${phone}:${crypto.randomUUID()}`;
    const preferences = {
      email: String(email || '').trim().toLowerCase(),
      country: String(country || '').trim().toUpperCase(),
      custom_fields: customFields && typeof customFields === 'object' ? customFields : {},
      source: 'dashboard',
    };

    const result = await req.db.query(`
      INSERT INTO customers (
        tenant_id,
        channel_customer_id,
        channel,
        name,
        phone,
        tags,
        preferences
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      tenantId,
      channelCustomerId,
      String(channel || 'import'),
      String(name).trim(),
      String(phone).trim(),
      JSON.stringify(parseTags(tags)),
      JSON.stringify(preferences),
    ]);

    res.status(201).json(mapCustomerRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const current = await req.db.query(`
      SELECT *
      FROM customers
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `, [req.params.id, tenantId]).then((result) => result.rows[0] || null);

    if (!current) return res.status(404).json({ error: 'Customer not found' });

    const nextPreferences = {
      ...(current.preferences || {}),
      email: String(req.body?.email ?? current.preferences?.email ?? '').trim().toLowerCase(),
      country: String(req.body?.country ?? current.preferences?.country ?? '').trim().toUpperCase(),
      custom_fields: req.body?.customFields && typeof req.body.customFields === 'object'
        ? req.body.customFields
        : (current.preferences?.custom_fields || {}),
    };

    const result = await req.db.query(`
      UPDATE customers
      SET
        name = $1,
        phone = $2,
        channel = $3,
        tags = $4,
        preferences = $5
      WHERE id = $6 AND tenant_id = $7
      RETURNING *
    `, [
      String(req.body?.name ?? current.name ?? '').trim(),
      String(req.body?.phone ?? current.phone ?? '').trim(),
      String(req.body?.channel ?? current.channel ?? 'import'),
      JSON.stringify(parseTags(req.body?.tags ?? current.tags ?? [])),
      JSON.stringify(nextPreferences),
      req.params.id,
      tenantId,
    ]);

    res.json(mapCustomerRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const current = await req.db.query(`
      SELECT *
      FROM customers
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1
    `, [req.params.id, tenantId]).then((result) => result.rows[0] || null);

    if (!current) return res.status(404).json({ error: 'Customer not found' });

    const deletedAt = new Date().toISOString();
    const nextPreferences = {
      ...(current.preferences || {}),
      deleted_at: deletedAt,
      deleted_by: req.user.id,
    };

    await req.db.query(`
      UPDATE customers
      SET preferences = $1
      WHERE id = $2 AND tenant_id = $3
    `, [JSON.stringify(nextPreferences), req.params.id, tenantId]);

    const recycle = await appendRecycleItem(tenantId, {
      type: 'contact',
      entityType: 'customer',
      entityId: current.id,
      name: current.name || current.phone || 'Untitled contact',
      info: current.phone || current.preferences?.email || current.channel,
      deletedAt,
      metadata: {
        phone: current.phone || '',
        email: current.preferences?.email || '',
      },
    }, req.db);

    res.json({
      ok: true,
      recycled: recycle.item,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
