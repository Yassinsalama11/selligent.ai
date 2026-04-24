const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
const { authenticator } = require('otplib');

const { queryAdmin, adminWithTransaction } = require('../../db/pool');
const { adminAuthMiddleware } = require('../middleware/adminAuth');
const {
  buildLockoutIdentifier,
  checkLockout,
  clearLockout,
  getRequestIp,
  hashIdentifier,
  normalizeAdminEmail,
  recordFailedLogin,
} = require('../middleware/adminLockout');
const { logAuditEvent } = require('../../db/queries/audit');
const { getPlatformAiStatus } = require('../../ai/completionClient');
const {
  VALID_CATALOG_PLATFORMS,
  buildPublicPricingPayload,
  createPlatformOffer,
  ensurePlatformControlSchema,
  getPlatformAiConfig,
  listPlatformOffers,
  listPlatformPlans,
  updatePlatformAiConfig,
  updatePlatformOffer,
  upsertPlatformPlan,
} = require('../../db/queries/platform');
const { getPlatformConfig } = require('../../ai/completionClient');
const { getCache, setCache } = require('../../db/cache');

const router = express.Router();
const SALT_ROUNDS = 12;
const ADMIN_SESSION_TTL_MS = 60 * 60 * 1000;
const TOTP_CHALLENGE_TTL = '5m';
const TOTP_ISSUER = 'ChatOrAI Admin';
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET
  || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('[SECURITY] ADMIN_JWT_SECRET env var is required in production'); })()
    : (console.warn('[SECURITY] ADMIN_JWT_SECRET not set - falling back to JWT_SECRET. Do not use in production.'), process.env.JWT_SECRET));
const IS_PERF_DEBUG = process.env.DEBUG_PERF === 'true';

authenticator.options = { window: 1 };
function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  return ['starter', 'growth', 'pro', 'enterprise'].includes(plan) ? plan : 'starter';
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
    ADMIN_SECRET,
    { expiresIn: '1h' },
  );
}

function signTotpChallengeToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      scope: 'admin_totp_challenge',
    },
    ADMIN_SECRET,
    { expiresIn: TOTP_CHALLENGE_TTL },
  );
}

function sanitizeAdmin(admin) {
  const { password_hash, ...safe } = admin || {};
  return safe;
}

function getTotpEncryptionKey() {
  return Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(ADMIN_SECRET),
    Buffer.alloc(0),
    Buffer.from('airos-admin-totp-encryption'),
    32,
  ));
}

function encryptTotpSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getTotpEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(secret), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((part) => part.toString('base64url')).join(':');
}

function decryptTotpSecret(encrypted) {
  const [ivRaw, authTagRaw, ciphertextRaw] = String(encrypted || '').split(':');
  if (!ivRaw || !authTagRaw || !ciphertextRaw) {
    throw new Error('Invalid encrypted TOTP secret');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getTotpEncryptionKey(),
    Buffer.from(ivRaw, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTagRaw, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function verifyTotpCode(secret, code) {
  const normalizedCode = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6}$/.test(normalizedCode)) return false;
  return authenticator.check(normalizedCode, secret);
}

function buildTotpSecurityKey(userId) {
  return hashIdentifier(`admin_totp:${userId}`);
}

function setAdminCookie(res, token) {
  res.cookie('chatorai_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ADMIN_SESSION_TTL_MS,
    path: '/',
  });
}

function clearAdminCookie(res) {
  res.clearCookie('chatorai_admin_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

async function logAdminAction(req, action, entityType, entityId, metadata = {}) {
  try {
    await logAuditEvent({
      tenantId: null,
      actorType: 'platform_admin',
      actorId: req.admin?.id || 'unknown',
      action,
      entityType,
      entityId,
      metadata: {
        request_id: req.requestId,
        ...metadata,
      },
    });
  } catch {
    // Audit logging should not block admin control-plane operations.
  }
}

async function logAdminLoginFailure(req, email, admin, action = 'admin.login.failed') {
  await logAuditEvent({
    tenantId: null,
    actorType: 'platform_admin',
    actorId: admin?.id || null,
    action,
    entityType: 'admin_session',
    entityId: admin?.id || hashIdentifier(normalizeAdminEmail(email)),
    metadata: {
      request_id: req.requestId,
      email_hash: hashIdentifier(normalizeAdminEmail(email)),
      ip: getRequestIp(req),
    },
  }).catch(() => {});
}

function maskSecret(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= 8) return '********';
  return `${text.slice(0, 4)}••••${text.slice(-4)}`;
}

async function issueAdminSession(req, res, admin) {
  const safeAdmin = sanitizeAdmin(admin);
  const token = signAdminToken(safeAdmin);
  setAdminCookie(res, token);
  await logAuditEvent({
    tenantId: null,
    actorType: 'platform_admin',
    actorId: safeAdmin.id,
    action: 'admin.login',
    entityType: 'admin_session',
    entityId: safeAdmin.id,
    metadata: {
      request_id: req.requestId,
      email: safeAdmin.email,
    },
  }).catch(() => {});
  return res.json({ admin: safeAdmin });
}

async function getPlatformAdminByEmail(email) {
  await ensurePlatformControlSchema();
  const result = await queryAdmin(`
    SELECT u.id, u.email, u.name, u.role, u.password_hash, u.created_at
    FROM users
    LEFT JOIN platform_team_members ptm ON ptm.user_id = u.id
    WHERE u.tenant_id IS NULL
      AND u.role IN ('platform_admin', 'super_admin')
      AND LOWER(u.email) = LOWER($1)
      AND COALESCE(ptm.is_active, TRUE) = TRUE
    ORDER BY u.created_at ASC
    LIMIT 1
  `, [String(email || '').trim().toLowerCase()]);
  return result.rows[0] || null;
}

async function getPlatformAdminById(id) {
  await ensurePlatformControlSchema();
  const result = await queryAdmin(`
    SELECT u.id, u.email, u.name, u.role, u.password_hash, u.created_at
    FROM users u
    LEFT JOIN platform_team_members ptm ON ptm.user_id = u.id
    WHERE u.id = $1
      AND u.tenant_id IS NULL
      AND u.role IN ('platform_admin', 'super_admin')
      AND COALESCE(ptm.is_active, TRUE) = TRUE
    LIMIT 1
  `, [id]);
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

async function ensureConfiguredAdmin(email, password) {
  await ensurePlatformControlSchema();
  const configured = getConfiguredAdmin(email, password);
  if (!configured) return null;

  const existingResult = await queryAdmin(`
    SELECT u.id, u.email, u.name, u.role, u.password_hash, u.created_at, COALESCE(ptm.is_active, TRUE) AS is_active
    FROM users u
    LEFT JOIN platform_team_members ptm ON ptm.user_id = u.id
    WHERE u.tenant_id IS NULL
      AND u.role IN ('platform_admin', 'super_admin')
      AND LOWER(u.email) = LOWER($1)
    ORDER BY u.created_at ASC
    LIMIT 1
  `, [configured.email]);
  const existing = existingResult.rows[0] || null;
  if (existing) {
    const matchesConfiguredPassword = existing.password_hash
      ? await bcrypt.compare(password, existing.password_hash).catch(() => false)
      : false;

    if (!matchesConfiguredPassword || existing.name !== configured.name || existing.role !== 'platform_admin') {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const updated = await queryAdmin(`
        UPDATE users
        SET password_hash = $2,
            name = $3,
            role = 'platform_admin'
        WHERE id = $1
        RETURNING id, email, name, role, password_hash, created_at
      `, [existing.id, passwordHash, configured.name]);
      await queryAdmin(`
        INSERT INTO platform_team_members (user_id, is_active)
        VALUES ($1, TRUE)
        ON CONFLICT (user_id) DO UPDATE
        SET is_active = TRUE,
            updated_at = NOW()
      `, [existing.id]);
      return updated.rows[0];
    }

    if (existing.is_active !== true) {
      await queryAdmin(`
        INSERT INTO platform_team_members (user_id, is_active)
        VALUES ($1, TRUE)
        ON CONFLICT (user_id) DO UPDATE
        SET is_active = TRUE,
            updated_at = NOW()
      `, [existing.id]);
    }

    return existing;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const created = await queryAdmin(`
    INSERT INTO users (tenant_id, email, password_hash, name, role)
    VALUES (NULL, $1, $2, $3, 'platform_admin')
    RETURNING id, email, name, role, password_hash, created_at
  `, [configured.email, passwordHash, configured.name]);

  await queryAdmin(`
    INSERT INTO platform_team_members (user_id, is_active)
    VALUES ($1, TRUE)
    ON CONFLICT (user_id) DO NOTHING
  `, [created.rows[0].id]);

  return created.rows[0];
}

async function getAdminSecurity(userId) {
  const result = await queryAdmin(`
    SELECT user_id, totp_secret_enc, totp_enabled, totp_enrolled_at, updated_at
    FROM platform_admin_security
    WHERE user_id = $1
    ORDER BY totp_enabled DESC, (totp_secret_enc IS NOT NULL) DESC, updated_at DESC
    LIMIT 1
  `, [userId]);
  return result.rows[0] || null;
}

async function upsertTotpSecret(userId, encryptedSecret) {
  const result = await queryAdmin(`
    INSERT INTO platform_admin_security (
      lockout_key,
      user_id,
      failed_login_count,
      locked_until,
      totp_secret_enc,
      totp_enabled,
      totp_enrolled_at
    )
    VALUES ($1, $2, 0, NULL, $3, FALSE, NULL)
    ON CONFLICT (lockout_key) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        totp_secret_enc = EXCLUDED.totp_secret_enc,
        totp_enabled = FALSE,
        totp_enrolled_at = NULL,
        updated_at = NOW()
    RETURNING user_id, totp_secret_enc, totp_enabled, totp_enrolled_at
  `, [buildTotpSecurityKey(userId), userId, encryptedSecret]);
  return result.rows[0] || null;
}

async function enableTotp(userId) {
  const result = await queryAdmin(`
    UPDATE platform_admin_security
    SET totp_enabled = TRUE,
        totp_enrolled_at = NOW(),
        updated_at = NOW()
    WHERE user_id = $1
      AND totp_secret_enc IS NOT NULL
    RETURNING user_id, totp_enabled, totp_enrolled_at
  `, [userId]);
  return result.rows[0] || null;
}

function formatEuro(value) {
  return Math.max(0, Number(value || 0));
}

function getSystemAvailableModels(config = null) {
  const base = [
    'gpt-5.4-mini',
    'gpt-5.4',
    'gpt-4o-mini',
    'gpt-4o',
    'claude-haiku-4-5-20251001',
    'claude-sonnet-4-20250514',
    'claude-sonnet-4-6',
  ];
  const configured = config
    ? [
      config.activeModel,
      config.fallbackModel,
      ...(Array.isArray(config.enabledModels) ? config.enabledModels : []),
      ...Object.values(config.defaultModelByPlan || {}),
    ]
    : [];

  return [...new Set([...base, ...configured].filter(Boolean))];
}

function buildClientPayload(row, planCatalog = []) {
  const settings = row.settings || {};
  const plan = normalizePlan(row.plan);
  const planMeta = planCatalog.find((entry) => entry.key === plan) || null;
  const purchasedSeats = Math.max(
    Number.parseInt(settings.purchased_seats || settings.purchasedSeats || 0, 10) || 0,
    Number(planMeta?.includedSeats || 1),
  );
  const activeUsers = Number(row.active_users_count || 0);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    plan,
    status: normalizeStatus(row.status),
    monthlyValue: formatEuro((planMeta?.priceEur || 0) * purchasedSeats),
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
    agentName: settings.agent_name || settings.agentName || '',
    purchasedSeats,
    activeUsers,
    operatorsCount: Number(row.users_count || 0),
    channelsConnected: Number(row.channels_count || 0),
    customersCount: Number(row.customers_count || 0),
    conversationsCount: Number(row.conversations_count || 0),
    messagesCount: Number(row.messages_count || 0),
    lastSeen: row.last_activity_at || null,
  };
}

async function fetchClients({ search = '', limit = 200 } = {}) {
  await ensurePlatformControlSchema();
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

  const result = await queryAdmin(`
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
      s.conversations_count,
      s.messages_count,
      s.customers_count,
      s.tickets_count,
      s.deals_count,
      s.users_count,
      s.active_users_count,
      s.channels_count,
      s.last_activity_at
    FROM tenants t
    LEFT JOIN tenant_stats s ON s.tenant_id = t.id
    LEFT JOIN LATERAL (
      SELECT u.id, u.name, u.email
      FROM users u
      WHERE u.tenant_id = t.id AND u.role = 'owner'
      ORDER BY u.created_at ASC
      LIMIT 1
    ) AS owner ON TRUE
    ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
    ORDER BY COALESCE(s.last_activity_at, t.created_at) DESC, t.created_at DESC
    LIMIT $${params.length}
  `, params);

  const planCatalog = await listPlatformPlans();
  return result.rows.map((row) => buildClientPayload(row, planCatalog));
}

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = normalizeAdminEmail(email);
    const lockoutIdentifier = buildLockoutIdentifier(normalizedEmail, getRequestIp(req));
    const lockout = await checkLockout(lockoutIdentifier);
    if (lockout.locked) {
      await logAdminLoginFailure(req, normalizedEmail, null, 'admin.login.locked');
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    let admin = null;
    try {
      admin = await ensureConfiguredAdmin(normalizedEmail, password);
    } catch (err) {
      if (err.code !== 'ECONNREFUSED' && err.code !== 'DB_UNAVAILABLE') throw err;
    }

    if (!admin) {
      try {
        admin = await getPlatformAdminByEmail(normalizedEmail);
      } catch (err) {
        if (err.code !== 'ECONNREFUSED' && err.code !== 'DB_UNAVAILABLE') throw err;
      }
    }

    if (!admin) {
      const failure = await recordFailedLogin(lockoutIdentifier, null);
      await logAdminLoginFailure(req, normalizedEmail, null, failure.locked ? 'admin.login.locked' : 'admin.login.failed');
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    if (!admin.password_hash) {
      const failure = await recordFailedLogin(lockoutIdentifier, admin.id);
      await logAdminLoginFailure(req, normalizedEmail, admin, failure.locked ? 'admin.login.locked' : 'admin.login.failed');
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      const failure = await recordFailedLogin(lockoutIdentifier, admin.id);
      await logAdminLoginFailure(req, normalizedEmail, admin, failure.locked ? 'admin.login.locked' : 'admin.login.failed');
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    await clearLockout(lockoutIdentifier, admin.id);
    const security = await getAdminSecurity(admin.id);
    if (security?.totp_enabled === true) {
      return res.json({
        totp_required: true,
        challenge_token: signTotpChallengeToken(sanitizeAdmin(admin)),
      });
    }

    return issueAdminSession(req, res, admin);
  } catch (err) {
    return next(err);
  }
});

router.get('/auth/totp/setup', adminAuthMiddleware, async (req, res, next) => {
  try {
    if (req.admin.source === 'env' || String(req.admin.id || '').startsWith('env-admin:')) {
      return res.status(409).json({ error: 'Database admin account required for MFA setup' });
    }

    const admin = await getPlatformAdminById(req.admin.id);
    if (!admin) return res.status(404).json({ error: 'Admin not found' });

    const currentSecurity = await getAdminSecurity(admin.id);
    if (currentSecurity?.totp_enabled === true) {
      return res.status(409).json({ error: 'TOTP MFA is already enabled' });
    }

    const secret = authenticator.generateSecret();
    const encryptedSecret = encryptTotpSecret(secret);
    await upsertTotpSecret(admin.id, encryptedSecret);

    return res.json({
      otpauth_uri: authenticator.keyuri(admin.email, TOTP_ISSUER, secret),
      secret,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/auth/totp/setup/confirm', adminAuthMiddleware, async (req, res, next) => {
  try {
    if (req.admin.source === 'env' || String(req.admin.id || '').startsWith('env-admin:')) {
      return res.status(409).json({ error: 'Database admin account required for MFA setup' });
    }

    const security = await getAdminSecurity(req.admin.id);
    if (!security?.totp_secret_enc) {
      return res.status(400).json({ error: 'TOTP setup has not been started' });
    }

    const secret = decryptTotpSecret(security.totp_secret_enc);
    if (!verifyTotpCode(secret, req.body?.code)) {
      await logAuditEvent({
        tenantId: null,
        actorType: 'platform_admin',
        actorId: req.admin.id,
        action: 'admin.totp.failed',
        entityType: 'admin_mfa',
        entityId: req.admin.id,
        metadata: {
          request_id: req.requestId,
          ip: getRequestIp(req),
        },
      }).catch(() => {});
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    const enabled = await enableTotp(req.admin.id);
    if (!enabled) return res.status(400).json({ error: 'TOTP setup has not been started' });

    await logAuditEvent({
      tenantId: null,
      actorType: 'platform_admin',
      actorId: req.admin.id,
      action: 'admin.totp.enrolled',
      entityType: 'admin_mfa',
      entityId: req.admin.id,
      metadata: {
        request_id: req.requestId,
      },
    }).catch(() => {});

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.post('/auth/totp/verify', async (req, res, next) => {
  try {
    const { challenge_token: challengeToken, code } = req.body || {};
    if (!challengeToken || !code) {
      return res.status(400).json({ error: 'Challenge token and code are required' });
    }

    let challenge;
    try {
      challenge = jwt.verify(challengeToken, ADMIN_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired verification challenge' });
    }

    if (challenge.scope !== 'admin_totp_challenge') {
      return res.status(401).json({ error: 'Invalid or expired verification challenge' });
    }

    const admin = await getPlatformAdminById(challenge.id);
    if (!admin) return res.status(401).json({ error: 'Invalid or expired verification challenge' });

    const security = await getAdminSecurity(admin.id);
    if (security?.totp_enabled !== true || !security?.totp_secret_enc) {
      return res.status(401).json({ error: 'Invalid or expired verification challenge' });
    }

    const lockoutIdentifier = buildLockoutIdentifier(admin.email, getRequestIp(req));
    const lockout = await checkLockout(lockoutIdentifier);
    if (lockout.locked) {
      await logAdminLoginFailure(req, admin.email, admin, 'admin.login.locked');
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    const secret = decryptTotpSecret(security.totp_secret_enc);
    if (!verifyTotpCode(secret, code)) {
      const failure = await recordFailedLogin(lockoutIdentifier, admin.id);
      await logAdminLoginFailure(req, admin.email, admin, failure.locked ? 'admin.login.locked' : 'admin.totp.failed');
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    await clearLockout(lockoutIdentifier, admin.id);
    return issueAdminSession(req, res, admin);
  } catch (err) {
    return next(err);
  }
});

router.post('/auth/logout', adminAuthMiddleware, async (req, res) => {
  await logAdminAction(req, 'admin.logout', 'admin_session', req.admin.id);
  clearAdminCookie(res);
  res.json({ ok: true });
});

router.get('/auth/me', adminAuthMiddleware, async (req, res, next) => {
  try {
    await ensurePlatformControlSchema();
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

    const admin = await queryAdmin(`
      SELECT u.id, u.email, u.name, u.role, u.created_at
      FROM users u
      LEFT JOIN platform_team_members ptm ON ptm.user_id = u.id
      WHERE u.id = $1
        AND u.tenant_id IS NULL
        AND u.role IN ('platform_admin', 'super_admin')
        AND COALESCE(ptm.is_active, TRUE) = TRUE
      LIMIT 1
    `, [req.admin.id]).then((result) => result.rows[0] || null);

    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    return res.json({ admin });
  } catch (err) {
    return next(err);
  }
});

router.get('/plans', adminAuthMiddleware, async (req, res, next) => {
  try {
    const plans = await listPlatformPlans();
    return res.json({ plans });
  } catch (err) {
    return next(err);
  }
});

router.post('/plans', adminAuthMiddleware, async (req, res, next) => {
  try {
    const plan = await upsertPlatformPlan(req.body || {});
    await logAdminAction(req, 'admin.plan.created', 'platform_plan', plan.key, {
      price_eur: plan.priceEur,
      included_seats: plan.includedSeats,
    });
    return res.status(201).json({ plan });
  } catch (err) {
    return next(err);
  }
});

router.get('/overview', adminAuthMiddleware, async (req, res, next) => {
  const startTime = Date.now();
  let cacheStatus = 'MISS';
  try {
    const tenantId = 'platform_admin'; // Global admin cache
    
    // 1. Try cache first
    const cachedOverview = await getCache(tenantId, 'admin', 'overview');
    if (cachedOverview) {
      cacheStatus = 'HIT';
      if (IS_PERF_DEBUG) {
        console.log(`[PERF:ENDPOINT] name=/api/admin/overview tenant_id=${tenantId} duration=${Date.now() - startTime}ms cache=${cacheStatus}`);
      }
      return res.json(cachedOverview);
    }

    const result = await queryAdmin(`
      SELECT
        COUNT(*)::int AS total_clients,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)::int AS active_clients,
        SUM(CASE WHEN status = 'trial' THEN 1 ELSE 0 END)::int AS trial_clients,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END)::int AS suspended_clients,
        COALESCE(SUM(s.conversations_count), 0)::int AS total_conversations,
        COALESCE(SUM(s.messages_count), 0)::int AS total_messages,
        COALESCE(SUM(s.customers_count), 0)::int AS total_customers,
        COALESCE(SUM(s.channels_count), 0)::int AS connected_channels
      FROM tenants t
      LEFT JOIN tenant_stats s ON s.tenant_id = t.id
    `);

    const stats = result.rows[0];

    const recentResult = await queryAdmin(`
      SELECT t.id, t.name, t.email, t.plan, t.status, t.created_at, s.last_activity_at
      FROM tenants t
      LEFT JOIN tenant_stats s ON s.tenant_id = t.id
      ORDER BY t.created_at DESC
      LIMIT 6
    `);

    const topResult = await queryAdmin(`
      SELECT t.id, t.name, t.email, t.plan, t.status, t.created_at, s.messages_count, s.conversations_count
      FROM tenants t
      JOIN tenant_stats s ON s.tenant_id = t.id
      ORDER BY s.messages_count DESC, s.conversations_count DESC
      LIMIT 6
    `);

    const payload = {
      totals: {
        totalClients: stats.total_clients,
        monthlyRevenue: 0, // Needs pricing calculation if required
        totalConversations: stats.total_conversations,
        totalMessages: stats.total_messages,
        totalCustomers: stats.total_customers,
        connectedChannels: stats.connected_channels,
        byStatus: {
          active: stats.active_clients,
          trial: stats.trial_clients,
          suspended: stats.suspended_clients,
        },
      },
      recentClients: recentResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        plan: r.plan,
        status: r.status,
        createdAt: r.created_at,
        lastSeen: r.last_activity_at,
      })),
      topClients: topResult.rows.map(r => ({
        id: r.id,
        name: r.name,
        email: r.email,
        plan: r.plan,
        status: r.status,
        messagesCount: r.messages_count,
        conversationsCount: r.conversations_count,
      })),
    };

    // 2. Set cache with 30s TTL
    await setCache(tenantId, 'admin', 'overview', payload, 30);

    if (IS_PERF_DEBUG) {
      console.log(`[PERF:ENDPOINT] name=/api/admin/overview tenant_id=${tenantId} duration=${Date.now() - startTime}ms cache=${cacheStatus}`);
    }

    return res.json(payload);
  } catch (err) {
    next(err);
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
    next(err);
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

    const created = await adminWithTransaction(async (client) => {
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
        purchased_seats: Math.max(Number.parseInt(req.body?.purchasedSeats, 10) || 0, 0),
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

    const planCatalog = await listPlatformPlans();
    const clientPayload = buildClientPayload({
      ...created.tenant,
      owner_id: created.owner.id,
      owner_name: created.owner.name,
      owner_email: created.owner.email,
      users_count: 1,
      channels_count: 0,
      customers_count: 0,
      conversations_count: 0,
      messages_count: 0,
      last_activity_at: null,
    }, planCatalog);

    await logAdminAction(req, 'admin.client.created', 'tenant', created.tenant.id, {
      plan: created.tenant.plan,
      status: created.tenant.status,
      owner_email: created.owner.email,
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
    const current = await queryAdmin(`
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
      purchased_seats: Math.max(
        Number.parseInt(
          req.body?.purchasedSeats
            ?? current.settings?.purchased_seats
            ?? current.settings?.purchasedSeats
            ?? 0,
          10,
        ) || 0,
        0,
      ),
    };

    const result = await queryAdmin(`
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
    await logAdminAction(req, 'admin.client.updated', 'tenant', req.params.id, {
      plan: normalizePlan(req.body?.plan ?? current.plan),
      status: normalizeStatus(req.body?.status ?? current.status),
    });
    const planCatalog = await listPlatformPlans();
    return res.json({ client: clientPayload || buildClientPayload(result.rows[0], planCatalog) });
  } catch (err) {
    return next(err);
  }
});

router.get('/billing', adminAuthMiddleware, async (req, res, next) => {
  try {
    const [clients, planCatalog, offers] = await Promise.all([
      fetchClients({ limit: 500 }),
      listPlatformPlans(),
      listPlatformOffers(),
    ]);
    const tenantPlans = clients.map((client) => ({
      tenantId: client.id,
      name: client.name,
      email: client.email,
      plan: client.plan,
      status: client.status,
      purchasedSeats: client.purchasedSeats,
      activeUsers: client.activeUsers,
      monthlyValue: client.status === 'active' ? client.monthlyValue : 0,
    }));

    let stripeSubscriptions = [];
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const subscriptions = await stripe.subscriptions.list({ limit: 50, status: 'all' });
      stripeSubscriptions = subscriptions.data.map((subscription) => ({
        id: subscription.id,
        customer: subscription.customer,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        amount: subscription.items.data.reduce((sum, item) => (
          sum + Number(item.price?.unit_amount || 0)
        ), 0) / 100,
        currency: 'EUR',
      }));
    }

    const totals = tenantPlans.reduce((acc, plan) => {
      acc.activeTenants += plan.status === 'active' ? 1 : 0;
      acc.projectedMrr += plan.monthlyValue;
      return acc;
    }, { activeTenants: 0, projectedMrr: 0 });

    res.json({
      totals,
      tenantPlans,
      planCatalog,
      offers,
      billingCurrency: 'EUR',
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      pricingControls: {
        localizedPricing: true,
        seatBasedBilling: true,
        aiIncludedInPlans: true,
        adminManagedPlans: true,
        supportedCountries: ['US', 'EU', 'GB', 'SA', 'AE', 'EG'],
      },
      stripeSubscriptions,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/logs', adminAuthMiddleware, async (req, res, next) => {
  try {
    const result = await queryAdmin(`
      SELECT id, actor_type, actor_id, action, entity_type, entity_id, metadata, created_at
      FROM audit_log
      WHERE tenant_id IS NULL
      ORDER BY created_at DESC
      LIMIT $1
    `, [Number(req.query.limit || 100)]);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

router.get('/ingestion', adminAuthMiddleware, async (req, res, next) => {
  try {
    const result = await queryAdmin(`
      SELECT
        j.id,
        j.tenant_id,
        t.name AS tenant_name,
        t.email AS tenant_email,
        j.source_url,
        j.status,
        j.pages_seen,
        j.chunks_stored,
        j.error,
        j.metadata,
        j.created_at,
        j.updated_at
      FROM ingestion_jobs j
      JOIN tenants t ON t.id = j.tenant_id
      ORDER BY j.created_at DESC
      LIMIT $1
    `, [Number(req.query.limit || 100)]);

    const totals = result.rows.reduce((acc, job) => {
      acc.total += 1;
      acc.pagesSeen += Number(job.pages_seen || 0);
      acc.chunksStored += Number(job.chunks_stored || 0);
      acc.byStatus[job.status] = (acc.byStatus[job.status] || 0) + 1;
      return acc;
    }, {
      total: 0,
      pagesSeen: 0,
      chunksStored: 0,
      byStatus: {},
    });

    res.json({ totals, jobs: result.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/system/health', adminAuthMiddleware, async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    redisConfigured: Boolean(process.env.REDIS_URL),
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
    ai: await getPlatformAiStatus(),
  });
});

module.exports = router;
module.exports._test = {
  buildTotpSecurityKey,
  decryptTotpSecret,
  encryptTotpSecret,
  signTotpChallengeToken,
  verifyTotpCode,
};
