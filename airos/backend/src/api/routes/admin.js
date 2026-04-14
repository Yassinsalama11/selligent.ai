const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { query, withTransaction } = require('../../db/pool');
const { adminAuthMiddleware } = require('../middleware/adminAuth');

const router = express.Router();
const SALT_ROUNDS = 12;
const PLAN_VALUES = {
  starter: 49,
  growth: 149,
  pro: 149,
  enterprise: 299,
};

function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  return PLAN_VALUES[plan] ? plan : 'starter';
}

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ['active', 'trial', 'suspended'].includes(status) ? status : 'active';
}

function signAdminToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      source: admin.source || 'db',
      scope: 'platform_admin',
    },
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '7d' },
  );
}

function sanitizeAdmin(admin) {
  const { password_hash, ...safe } = admin || {};
  return safe;
}

async function getPlatformAdminByEmail(email) {
  const result = await query(`
    SELECT id, email, name, role, password_hash, created_at
    FROM users
    WHERE tenant_id IS NULL
      AND role IN ('platform_admin', 'super_admin')
      AND LOWER(email) = LOWER($1)
    ORDER BY created_at ASC
    LIMIT 1
  `, [String(email || '').trim().toLowerCase()]);
  return result.rows[0] || null;
}

function getConfiguredAdmin(email, password) {
  const configuredEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const configuredPassword = String(process.env.ADMIN_PASSWORD || '');
  const configuredName = String(process.env.ADMIN_NAME || 'ChatOrAI Admin').trim();

  if (!configuredEmail || !configuredPassword) return null;
  if (configuredEmail !== String(email || '').trim().toLowerCase()) return null;
  if (configuredPassword !== password) return null;

  return {
    id: `env-admin:${configuredEmail}`,
    email: configuredEmail,
    name: configuredName,
    role: 'platform_admin',
    created_at: null,
    source: 'env',
  };
}

function buildClientPayload(row) {
  const settings = row.settings || {};
  const plan = normalizePlan(row.plan);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    plan,
    status: normalizeStatus(row.status),
    monthlyValue: PLAN_VALUES[plan] || 0,
    createdAt: row.created_at,
    owner: row.owner_id ? {
      id: row.owner_id,
      name: row.owner_name || '',
      email: row.owner_email || '',
    } : null,
    domain: settings.domain || '',
    country: settings.country || '',
    phone: settings.phone || '',
    notes: settings.notes || '',
    operatorsCount: Number(row.operators_count || 0),
    channelsConnected: Number(row.channels_connected || 0),
    customersCount: Number(row.customers_count || 0),
    conversationsCount: Number(row.conversations_count || 0),
    messagesCount: Number(row.messages_count || 0),
    lastSeen: row.last_seen || null,
  };
}

async function fetchClients({ search = '', limit = 200 } = {}) {
  const params = [];
  const filters = [];

  if (search) {
    params.push(`%${String(search).trim().toLowerCase()}%`);
    filters.push(`(
      LOWER(t.name) LIKE $${params.length}
      OR LOWER(t.email) LIKE $${params.length}
      OR LOWER(COALESCE(owner.email, '')) LIKE $${params.length}
      OR LOWER(COALESCE(t.settings->>'domain', '')) LIKE $${params.length}
    )`);
  }

  params.push(Number(limit || 200));

  const result = await query(`
    SELECT
      t.id,
      t.name,
      t.email,
      t.plan,
      t.status,
      t.settings,
      t.created_at,
      owner.id AS owner_id,
      owner.name AS owner_name,
      owner.email AS owner_email,
      COALESCE(operator_counts.count, 0)::int AS operators_count,
      COALESCE(channel_counts.count, 0)::int AS channels_connected,
      COALESCE(customer_counts.count, 0)::int AS customers_count,
      COALESCE(conversation_counts.count, 0)::int AS conversations_count,
      COALESCE(message_counts.count, 0)::int AS messages_count,
      last_activity.last_seen
    FROM tenants t
    LEFT JOIN LATERAL (
      SELECT u.id, u.name, u.email
      FROM users u
      WHERE u.tenant_id = t.id AND u.role = 'owner'
      ORDER BY u.created_at ASC
      LIMIT 1
    ) AS owner ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count
      FROM users u
      WHERE u.tenant_id = t.id
    ) AS operator_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count
      FROM channel_connections cc
      WHERE cc.tenant_id = t.id AND cc.status = 'active'
    ) AS channel_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count
      FROM customers c
      WHERE c.tenant_id = t.id
        AND COALESCE(c.preferences->>'deleted_at', '') = ''
    ) AS customer_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count
      FROM conversations cv
      WHERE cv.tenant_id = t.id
    ) AS conversation_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS count
      FROM messages m
      WHERE m.tenant_id = t.id
    ) AS message_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT MAX(cv.updated_at) AS last_seen
      FROM conversations cv
      WHERE cv.tenant_id = t.id
    ) AS last_activity ON TRUE
    ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
    ORDER BY COALESCE(last_activity.last_seen, t.created_at) DESC, t.created_at DESC
    LIMIT $${params.length}
  `, params);

  return result.rows.map(buildClientPayload);
}

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let admin = await getPlatformAdminByEmail(email);
    if (!admin) admin = getConfiguredAdmin(email, password);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const valid = admin.password_hash
      ? await bcrypt.compare(password, admin.password_hash)
      : String(process.env.ADMIN_PASSWORD || '') === password;

    if (!valid) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const safeAdmin = sanitizeAdmin(admin);
    return res.json({
      token: signAdminToken(safeAdmin),
      admin: safeAdmin,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/auth/me', adminAuthMiddleware, async (req, res, next) => {
  try {
    if (req.admin.source === 'env' || String(req.admin.id || '').startsWith('env-admin:')) {
      return res.json({
        admin: {
          id: req.admin.id,
          email: req.admin.email,
          name: req.admin.name,
          role: req.admin.role,
          created_at: null,
        },
      });
    }

    const admin = await query(`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE id = $1
        AND tenant_id IS NULL
        AND role IN ('platform_admin', 'super_admin')
      LIMIT 1
    `, [req.admin.id]).then((result) => result.rows[0] || null);

    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    return res.json({ admin });
  } catch (err) {
    return next(err);
  }
});

router.get('/overview', adminAuthMiddleware, async (req, res, next) => {
  try {
    const clients = await fetchClients({ limit: 500 });
    const totals = clients.reduce((acc, client) => {
      acc.totalClients += 1;
      acc.monthlyRevenue += client.status === 'active' ? client.monthlyValue : 0;
      acc.totalConversations += client.conversationsCount;
      acc.totalMessages += client.messagesCount;
      acc.totalCustomers += client.customersCount;
      acc.connectedChannels += client.channelsConnected;
      acc.byStatus[client.status] = (acc.byStatus[client.status] || 0) + 1;
      return acc;
    }, {
      totalClients: 0,
      monthlyRevenue: 0,
      totalConversations: 0,
      totalMessages: 0,
      totalCustomers: 0,
      connectedChannels: 0,
      byStatus: { active: 0, trial: 0, suspended: 0 },
    });

    const recentClients = [...clients]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);

    const topClients = [...clients]
      .sort((a, b) => {
        if (b.messagesCount !== a.messagesCount) return b.messagesCount - a.messagesCount;
        return b.monthlyValue - a.monthlyValue;
      })
      .slice(0, 6);

    return res.json({
      totals,
      recentClients,
      topClients,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/clients', adminAuthMiddleware, async (req, res, next) => {
  try {
    const clients = await fetchClients({
      search: req.query.search || '',
      limit: req.query.limit || 200,
    });
    return res.json(clients);
  } catch (err) {
    return next(err);
  }
});

router.post('/clients', adminAuthMiddleware, async (req, res, next) => {
  try {
    const {
      name,
      ownerName,
      ownerEmail,
      password,
      plan,
      status,
      country = '',
      domain = '',
      phone = '',
      notes = '',
    } = req.body || {};

    if (!name || !ownerName || !ownerEmail) {
      return res.status(400).json({ error: 'Company name, owner name, and owner email are required' });
    }

    const normalizedPlan = normalizePlan(plan);
    const normalizedStatus = normalizeStatus(status);
    const ownerPassword = String(password || '').trim() || crypto.randomBytes(6).toString('base64url');

    if (ownerPassword.length < 8) {
      return res.status(400).json({ error: 'Owner password must be at least 8 characters' });
    }

    const tenantEmail = String(ownerEmail).trim().toLowerCase();
    const ownerEmailNormalized = tenantEmail;

    const created = await withTransaction(async (client) => {
      const existingTenant = await client.query(
        'SELECT id FROM tenants WHERE email = $1 LIMIT 1',
        [tenantEmail],
      );
      if (existingTenant.rows[0]) {
        const err = new Error('A client with this owner email already exists');
        err.status = 409;
        throw err;
      }

      const settings = {
        country: String(country || '').trim().toUpperCase(),
        domain: String(domain || '').trim().toLowerCase(),
        phone: String(phone || '').trim(),
        notes: String(notes || '').trim(),
        created_by_admin_id: req.admin.id,
      };

      const tenantResult = await client.query(`
        INSERT INTO tenants (name, email, plan, status, settings)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, email, plan, status, settings, created_at
      `, [String(name).trim(), tenantEmail, normalizedPlan, normalizedStatus, JSON.stringify(settings)]);

      const tenant = tenantResult.rows[0];
      const passwordHash = await bcrypt.hash(ownerPassword, SALT_ROUNDS);
      const ownerResult = await client.query(`
        INSERT INTO users (tenant_id, email, password_hash, name, role)
        VALUES ($1, $2, $3, $4, 'owner')
        RETURNING id, tenant_id, email, name, role, created_at
      `, [tenant.id, ownerEmailNormalized, passwordHash, String(ownerName).trim()]);

      return {
        tenant,
        owner: ownerResult.rows[0],
        generatedPassword: String(password || '').trim() ? '' : ownerPassword,
      };
    });

    const clientPayload = buildClientPayload({
      ...created.tenant,
      owner_id: created.owner.id,
      owner_name: created.owner.name,
      owner_email: created.owner.email,
      operators_count: 1,
      channels_connected: 0,
      customers_count: 0,
      conversations_count: 0,
      messages_count: 0,
      last_seen: null,
    });

    return res.status(201).json({
      client: clientPayload,
      generatedPassword: created.generatedPassword,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This email already exists' });
    }
    return next(err);
  }
});

router.patch('/clients/:id', adminAuthMiddleware, async (req, res, next) => {
  try {
    const current = await query(`
      SELECT id, name, email, plan, status, settings, created_at
      FROM tenants
      WHERE id = $1
      LIMIT 1
    `, [req.params.id]).then((result) => result.rows[0] || null);

    if (!current) return res.status(404).json({ error: 'Client not found' });

    const nextSettings = {
      ...(current.settings || {}),
      country: String(req.body?.country ?? current.settings?.country ?? '').trim().toUpperCase(),
      domain: String(req.body?.domain ?? current.settings?.domain ?? '').trim().toLowerCase(),
      phone: String(req.body?.phone ?? current.settings?.phone ?? '').trim(),
      notes: String(req.body?.notes ?? current.settings?.notes ?? '').trim(),
    };

    const result = await query(`
      UPDATE tenants
      SET
        name = $1,
        plan = $2,
        status = $3,
        settings = $4
      WHERE id = $5
      RETURNING id, name, email, plan, status, settings, created_at
    `, [
      String(req.body?.name ?? current.name).trim(),
      normalizePlan(req.body?.plan ?? current.plan),
      normalizeStatus(req.body?.status ?? current.status),
      JSON.stringify(nextSettings),
      req.params.id,
    ]);

    const clients = await fetchClients({ search: '', limit: 500 });
    const clientPayload = clients.find((entry) => entry.id === req.params.id);
    return res.json({ client: clientPayload || buildClientPayload(result.rows[0]) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
