const crypto = require('crypto');
const express = require('express');

const { query } = require('../../db/pool');
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

    const result = await query(`
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

    const result = await query(`
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
    const current = await query(`
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

    const result = await query(`
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
    const current = await query(`
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

    await query(`
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
    });

    res.json({
      ok: true,
      recycled: recycle.item,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
