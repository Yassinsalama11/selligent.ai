const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { adminWithTransaction, queryAdmin } = require('../../db/pool');
const { authMiddleware } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { enqueueJob } = require('../../core/queue');
const { logAuditEvent } = require('../../db/queries/audit');
const {
  consumeEmailActionToken,
  sendPasswordChangedAlert,
  sendPasswordResetEmail,
  sendTeamInvitationEmail,
  sendTrialStartedEmail,
  sendVerificationEmail,
  sendWelcomeEmail,
} = require('../../services/email/emailService');
const { normalizeEmailAddress } = require('../../services/email/emailValidators');
const {
  buildBillingSummary,
  getTenantWithStats,
} = require('../../services/billingService');
const {
  buildSsoStart,
  exchangeCodeForClaims,
  getTenantSsoConfig,
  isDomainAllowed,
  resolveMappedRole,
  resolveMappedValue,
  shouldBlockPasswordLogin,
  verifyState,
} = require('../../services/ssoService');

const router = express.Router();
const SALT_ROUNDS = 12;
const TRIAL_DAYS = 7;
const requireTeamReadRole = requireRole('owner', 'admin', 'agent');
const requireOwnerRole = requireRole('owner', 'admin');

function normalizePlan(value) {
  const plan = String(value || '').trim().toLowerCase();
  return ['starter', 'growth', 'pro', 'enterprise'].includes(plan) ? plan : 'starter';
}

function normalizeBillingCycle(value) {
  const cycle = String(value || '').trim().toLowerCase();
  return ['monthly', 'yearly'].includes(cycle) ? cycle : 'monthly';
}

function generateTemporaryPassword() {
  return crypto.randomBytes(24).toString('hex');
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, tenant_id: user.tenant_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

function sanitize(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

async function getTenantById(tenantId) {
  const result = await queryAdmin(
    `SELECT *
     FROM tenants
     WHERE id = $1
     LIMIT 1`,
    [tenantId],
  );
  return result.rows[0] || null;
}

async function getUserByEmail(email) {
  const result = await queryAdmin(
    `SELECT u.id, u.tenant_id, u.email, u.name, u.role, u.password_hash, u.email_verified_at,
            t.name AS tenant_name, t.plan, t.status, t.subscription_status, t.trial_ends_at
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     WHERE LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email],
  );
  return result.rows[0] || null;
}

async function getUserByEmailForTenant(email, tenantId) {
  const result = await queryAdmin(
    `SELECT id, tenant_id, email, name, role, password_hash, email_verified_at, department
     FROM users
     WHERE LOWER(email) = LOWER($1) AND tenant_id = $2
     LIMIT 1`,
    [email, tenantId],
  );
  return result.rows[0] || null;
}

function renderSsoLoginHtml({ token, user, billing, returnTo }) {
  const safeReturnTo = String(returnTo || '/dashboard').startsWith('/') ? String(returnTo || '/dashboard') : '/dashboard';
  return `<!doctype html><html><head><meta charset="utf-8"><title>SSO login complete</title></head><body><script>
localStorage.setItem('airos_token', ${JSON.stringify(token)});
localStorage.setItem('token', ${JSON.stringify(token)});
localStorage.setItem('airos_user', ${JSON.stringify(JSON.stringify(user))});
localStorage.setItem('airos_billing', ${JSON.stringify(JSON.stringify(billing || null))});
window.location.replace(${JSON.stringify(safeReturnTo)});
</script><noscript>SSO login complete. JavaScript is required to continue.</noscript></body></html>`;
}

async function getUserById(userId, tenantId) {
  const result = await queryAdmin(
    `SELECT id, tenant_id, email, name, role, password_hash, email_verified_at
     FROM users
     WHERE id = $1 AND tenant_id = $2
     LIMIT 1`,
    [userId, tenantId],
  );
  return result.rows[0] || null;
}

async function fireAndForgetEmail(promise) {
  promise.catch((error) => {
    console.error('[EmailFlow]', error.message);
  });
}

// POST /api/auth/register — create trial tenant + owner account
router.post('/register', async (req, res, next) => {
  try {
    const { tenantName, email, password, name, plan, seats, billingCycle } = req.body || {};
    if (!tenantName || !email || !password || !name) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = normalizeEmailAddress(email);
    const normalizedPlan = normalizePlan(plan);
    const normalizedBillingCycle = normalizeBillingCycle(billingCycle);
    const purchasedSeats = Math.max(Number.parseInt(seats, 10) || 0, 1);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const created = await adminWithTransaction(async (client) => {
      const existing = await client.query('SELECT id FROM tenants WHERE email = $1 LIMIT 1', [normalizedEmail]);
      if (existing.rows[0]) {
        const err = new Error('Email already registered');
        err.status = 409;
        throw err;
      }

      const tenant = await client.query(
        `INSERT INTO tenants (
           name, email, billing_email, plan, status, subscription_status, billing_cycle,
           trial_started_at, trial_ends_at, seat_count, selected_channels, feature_package, settings
         )
         VALUES ($1, $2, $2, $3, 'active', 'trialing', $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          String(tenantName).trim(),
          normalizedEmail,
          normalizedPlan,
          normalizedBillingCycle,
          now.toISOString(),
          trialEndsAt.toISOString(),
          purchasedSeats,
          JSON.stringify(['livechat']),
          normalizedPlan,
          JSON.stringify({
            purchased_seats: purchasedSeats,
            billing: {
              seat_count: purchasedSeats,
              selected_channels: ['livechat'],
              billing_cycle: normalizedBillingCycle,
            },
          }),
        ],
      );

      const user = await client.query(
        `INSERT INTO users (tenant_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, 'owner')
         RETURNING id, tenant_id, email, name, role, email_verified_at`,
        [tenant.rows[0].id, normalizedEmail, passwordHash, String(name).trim()],
      );

      return { tenant: tenant.rows[0], user: user.rows[0] };
    });

    enqueueJob('refresh_tenant_stats', { tenantId: created.user.tenant_id }).catch(() => {});
    fireAndForgetEmail(sendWelcomeEmail({ user: created.user, tenant: created.tenant }));
    fireAndForgetEmail(sendVerificationEmail({ user: created.user, tenant: created.tenant }));
    fireAndForgetEmail(sendTrialStartedEmail({ user: created.user, tenant: created.tenant }));

    const token = signToken(created.user);
    res.status(201).json({
      token,
      user: {
        ...sanitize(created.user),
        company: created.tenant.name,
        plan: created.tenant.plan,
        status: created.tenant.subscription_status,
        purchasedSeats,
        billingCycle: created.tenant.billing_cycle,
        trialEnd: created.tenant.trial_ends_at,
      },
    });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await getUserByEmail(normalizeEmailAddress(email));
    if (!user || ['deleted'].includes(String(user.status || '').toLowerCase())) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const loginTenant = await getTenantById(user.tenant_id);
    if (loginTenant && shouldBlockPasswordLogin(user, loginTenant)) {
      await logAuditEvent({
        tenantId: user.tenant_id,
        actorType: 'user',
        actorId: user.id,
        action: 'auth.password_login.blocked_by_sso',
        entityType: 'user',
        entityId: user.id,
        metadata: { email: user.email, provider: getTenantSsoConfig(loginTenant).provider },
      }).catch(() => {});
      return res.status(403).json({
        error: 'SSO login is required for this account.',
        code: 'SSO_REQUIRED',
        provider: getTenantSsoConfig(loginTenant).provider,
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    const tenant = await getTenantWithStats(user.tenant_id);
    const billing = tenant ? await buildBillingSummary(tenant) : null;
    res.json({ token, user: sanitize(user), billing });
  } catch (err) {
    if (err.code === 'INVALID_EMAIL') return res.status(400).json({ error: err.message });
    next(err);
  }
});

async function completeSsoLogin(provider, req, res, next) {
  try {
    const { code, state } = req.query || {};
    if (!code || !state) return res.status(400).json({ error: 'code and state are required' });

    const statePayload = verifyState(state);
    if (statePayload.provider !== provider) return res.status(400).json({ error: 'SSO provider mismatch' });

    const tenant = await getTenantById(statePayload.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    const entitlement = await buildBillingSummary(tenant);
    const ssoFeature = (entitlement?.featureAccess || []).find((entry) => entry.key === 'sso');
    if (ssoFeature?.allowed === false) return res.status(403).json({ error: ssoFeature.reason || 'SSO is not enabled for this subscription package.' });
    const config = getTenantSsoConfig(tenant);
    if (!config.enabled || config.provider !== provider) return res.status(403).json({ error: `${provider} SSO is disabled` });

    const claims = await exchangeCodeForClaims(provider, code);
    const mappedEmail = normalizeEmailAddress(resolveMappedValue(claims, config.mappings.email, claims.email));
    if (!mappedEmail || !isDomainAllowed(mappedEmail, config)) {
      await logAuditEvent({
        tenantId: tenant.id,
        actorType: 'sso',
        action: 'auth.sso.domain_blocked',
        entityType: 'tenant',
        entityId: tenant.id,
        metadata: { provider, email: mappedEmail },
      }).catch(() => {});
      return res.status(403).json({ error: 'Email domain is not allowed for this tenant SSO configuration.' });
    }

    let user = await getUserByEmailForTenant(mappedEmail, tenant.id);
    if (!user) {
      if (!config.autoProvision) return res.status(403).json({ error: 'SSO user is not provisioned for this tenant.' });
      const passwordHash = await bcrypt.hash(generateTemporaryPassword(), SALT_ROUNDS);
      const role = resolveMappedRole(claims, config);
      const name = String(resolveMappedValue(claims, config.mappings.name, claims.name || mappedEmail) || mappedEmail).slice(0, 255);
      const department = String(resolveMappedValue(claims, config.mappings.department, claims.department || '') || '').slice(0, 255);
      const created = await queryAdmin(
        `INSERT INTO users (tenant_id, email, password_hash, name, role, department, email_verified_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, tenant_id, email, name, role, email_verified_at, department`,
        [tenant.id, mappedEmail, passwordHash, name, role, department || null],
      );
      user = created.rows[0];
      enqueueJob('refresh_tenant_stats', { tenantId: tenant.id }).catch(() => {});
    }

    const settings = tenant.settings && typeof tenant.settings === 'object' ? tenant.settings : {};
    settings.sso = {
      ...config,
      lastLoginAt: new Date().toISOString(),
      lastError: '',
    };
    await queryAdmin('UPDATE tenants SET settings = $1 WHERE id = $2', [JSON.stringify(settings), tenant.id]);

    await logAuditEvent({
      tenantId: tenant.id,
      actorType: 'user',
      actorId: user.id,
      action: 'auth.sso.login',
      entityType: 'user',
      entityId: user.id,
      metadata: { provider, email: mappedEmail, autoProvisioned: !user.password_hash },
    }).catch(() => {});

    const token = signToken(user);
    const tenantWithStats = await getTenantWithStats(user.tenant_id);
    const billing = tenantWithStats ? await buildBillingSummary(tenantWithStats) : null;
    const safeUser = sanitize(user);
    res.type('html').send(renderSsoLoginHtml({
      token,
      user: safeUser,
      billing,
      returnTo: statePayload.returnTo || '/dashboard',
    }));
  } catch (err) {
    next(err);
  }
}

router.post('/sso/google/start', async (req, res, next) => {
  try {
    const start = await buildSsoStart({
      provider: 'google',
      email: req.body?.email || '',
      tenantId: req.body?.tenantId || '',
      returnTo: req.body?.returnTo || '/dashboard',
    });
    res.json(start);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || 'SSO_START_FAILED' });
    next(err);
  }
});

router.get('/sso/google/callback', (req, res, next) => completeSsoLogin('google', req, res, next));

router.post('/sso/microsoft/start', async (req, res, next) => {
  try {
    const start = await buildSsoStart({
      provider: 'microsoft',
      email: req.body?.email || '',
      tenantId: req.body?.tenantId || '',
      returnTo: req.body?.returnTo || '/dashboard',
    });
    res.json(start);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: err.code || 'SSO_START_FAILED' });
    next(err);
  }
});

router.get('/sso/microsoft/callback', (req, res, next) => completeSsoLogin('microsoft', req, res, next));

router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = normalizeEmailAddress(req.body?.email || '');
    const user = await getUserByEmail(email);

    if (user) {
      const tenant = await getTenantById(user.tenant_id);
      if (tenant) {
        fireAndForgetEmail(sendPasswordResetEmail({
          user,
          tenant,
          ip: req.ip,
          userAgent: req.get('user-agent') || '',
        }));
      }
    }

    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'INVALID_EMAIL') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const tokenRecord = await consumeEmailActionToken('password_reset', token);
    const passwordHash = await bcrypt.hash(String(newPassword), SALT_ROUNDS);

    const result = await queryAdmin(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2 AND tenant_id = $3
       RETURNING id, tenant_id, email, name, role, email_verified_at`,
      [passwordHash, tokenRecord.user_id, tokenRecord.tenant_id],
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const tenant = await getTenantById(user.tenant_id);
    if (tenant) {
      fireAndForgetEmail(sendPasswordChangedAlert({ user, tenant }));
    }

    await logAuditEvent({
      tenantId: user.tenant_id,
      actorType: 'user',
      actorId: user.id,
      action: 'auth.password_reset.completed',
      entityType: 'user',
      entityId: user.id,
      metadata: { email: user.email },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'TOKEN_INVALID') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post('/verify-email', async (req, res, next) => {
  try {
    const token = String(req.body?.token || req.query?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const tokenRecord = await consumeEmailActionToken('email_verification', token);
    const result = await queryAdmin(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, tenant_id, email, name, role, email_verified_at`,
      [tokenRecord.user_id, tokenRecord.tenant_id],
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ok: true, user: sanitize(user) });
  } catch (err) {
    if (err.code === 'TOKEN_INVALID') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post('/resend-verification', authMiddleware, async (req, res, next) => {
  try {
    const user = await getUserById(req.user.id, req.user.tenant_id);
    const tenant = await getTenantById(req.user.tenant_id);
    if (!user || !tenant) return res.status(404).json({ error: 'User not found' });

    fireAndForgetEmail(sendVerificationEmail({ user, tenant }));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/accept-invite', async (req, res, next) => {
  try {
    const { token, password, name } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const tokenRecord = await consumeEmailActionToken('team_invite', token);
    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const result = await queryAdmin(
      `UPDATE users
       SET password_hash = $1,
           name = COALESCE(NULLIF($2, ''), name),
           email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, tenant_id, email, name, role, email_verified_at`,
      [passwordHash, String(name || '').trim(), tokenRecord.user_id, tokenRecord.tenant_id],
    );

    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Invitation is no longer valid' });

    const tenant = await getTenantById(user.tenant_id);
    if (tenant) {
      fireAndForgetEmail(sendWelcomeEmail({ user, tenant }));
    }

    res.json({
      ok: true,
      token: signToken(user),
      user: sanitize(user),
    });
  } catch (err) {
    if (err.code === 'TOKEN_INVALID') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const normalizedEmail = normalizeEmailAddress(req.body?.email || '');
    const name = String(req.body?.name || '').trim();
    if (!normalizedEmail || !name) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const result = await queryAdmin(
      `UPDATE users
       SET email = $1,
           name = $2,
           email_verified_at = CASE WHEN LOWER(email) <> LOWER($1) THEN NULL ELSE email_verified_at END
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, tenant_id, email, name, role, email_verified_at`,
      [normalizedEmail, name, req.user.id, req.user.tenant_id],
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: sanitize(result.rows[0]) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    if (err.code === 'INVALID_EMAIL') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.get('/me/preferences', authMiddleware, async (req, res, next) => {
  try {
    const result = await queryAdmin(
      'SELECT preferences FROM users WHERE id = $1 AND tenant_id = $2 LIMIT 1',
      [req.user.id, req.user.tenant_id],
    );
    res.json(result.rows[0]?.preferences || {});
  } catch (err) { next(err); }
});

router.patch('/me/preferences', authMiddleware, async (req, res, next) => {
  try {
    const prefs = req.body || {};
    if (typeof prefs !== 'object' || Array.isArray(prefs)) {
      return res.status(400).json({ error: 'Payload must be a plain object' });
    }
    const result = await queryAdmin(
      `UPDATE users
       SET preferences = COALESCE(preferences, '{}') || $1::jsonb
       WHERE id = $2 AND tenant_id = $3
       RETURNING preferences`,
      [JSON.stringify(prefs), req.user.id, req.user.tenant_id],
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0].preferences || {});
  } catch (err) { next(err); }
});

router.patch('/password', authMiddleware, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const user = await getUserById(req.user.id, req.user.tenant_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await queryAdmin(
      'UPDATE users SET password_hash = $1 WHERE id = $2 AND tenant_id = $3',
      [passwordHash, req.user.id, req.user.tenant_id],
    );

    const tenant = await getTenantById(req.user.tenant_id);
    if (tenant) {
      fireAndForgetEmail(sendPasswordChangedAlert({ user, tenant }));
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/team', authMiddleware, requireTeamReadRole, async (req, res, next) => {
  try {
    const result = await queryAdmin(
      `SELECT id, tenant_id, email, name, role, department, email_verified_at, created_at
       FROM users
       WHERE tenant_id = $1
       ORDER BY created_at ASC`,
      [req.user.tenant_id],
    );

    res.json(result.rows.map(sanitize));
  } catch (err) {
    next(err);
  }
});

router.post('/invite', authMiddleware, requireOwnerRole, async (req, res, next) => {
  try {
    const email = normalizeEmailAddress(req.body?.email || '');
    const name = String(req.body?.name || '').trim();
    const department = req.body?.department ? String(req.body.department).trim() : null;
    const { tenant_id, role: callerRole } = req.user;
    if (!['owner', 'admin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Admins cannot mint owners; only existing owners can
    const allowedRoles = callerRole === 'owner' ? ['owner', 'admin', 'agent'] : ['admin', 'agent'];
    const role = allowedRoles.includes(String(req.body?.role || '').trim().toLowerCase())
      ? String(req.body.role).trim().toLowerCase()
      : 'agent';

    if (!name) return res.status(400).json({ error: 'Name is required' });

    const tenant = await getTenantWithStats(tenant_id);
    const billing = tenant ? await buildBillingSummary(tenant) : null;
    if (billing && billing.seatUsage >= billing.seatCount) {
      return res.status(403).json({ error: 'All purchased seats are in use. Increase seats before inviting another operator.' });
    }

    const passwordHash = await bcrypt.hash(generateTemporaryPassword(), SALT_ROUNDS);
    const result = await queryAdmin(
      `INSERT INTO users (tenant_id, email, password_hash, name, role, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, tenant_id, email, name, role, department, email_verified_at`,
      [tenant_id, email, passwordHash, name, role, department],
    );

    if (tenant) {
      fireAndForgetEmail(sendTeamInvitationEmail({
        invitedUser: result.rows[0],
        tenant,
        inviter: req.user,
      }));
    }

    enqueueJob('refresh_tenant_stats', { tenantId: tenant_id }).catch(() => {});
    res.status(201).json({ user: sanitize(result.rows[0]), invitationSent: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    if (err.code === 'INVALID_EMAIL') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.patch('/team/:id', authMiddleware, requireOwnerRole, async (req, res, next) => {
  try {
    const { tenant_id, role: callerRole, id: callerId } = req.user;
    if (!['owner', 'admin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates = {};
    if (req.body.name) updates.name = String(req.body.name).trim();
    if (req.body.role) {
      const targetRole = String(req.body.role).trim().toLowerCase();
      if (targetRole === 'owner' && callerRole !== 'owner') {
        return res.status(403).json({ error: 'Only owners can assign the owner role' });
      }
      updates.role = targetRole;
    }
    if ('department' in req.body) updates.department = req.body.department ? String(req.body.department).trim() : null;
    if (req.body.password) {
      if (String(req.body.password).length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      updates.password_hash = await bcrypt.hash(String(req.body.password), SALT_ROUNDS);
    }

    const fields = Object.keys(updates);
    if (!fields.length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    if (req.params.id === callerId && updates.role && updates.role !== callerRole) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    const sets = fields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const values = fields.map((field) => updates[field]);

    const result = await queryAdmin(
      `UPDATE users
       SET ${sets}
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, tenant_id, email, name, role, department, email_verified_at, created_at`,
      [req.params.id, tenant_id, ...values],
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    if (updates.password_hash) {
      const tenant = await getTenantById(tenant_id);
      if (tenant) {
        fireAndForgetEmail(sendPasswordChangedAlert({ user: result.rows[0], tenant }));
      }
    }

    res.json({ user: sanitize(result.rows[0]), passwordUpdated: Boolean(req.body.password) });
  } catch (err) {
    next(err);
  }
});

router.delete('/team/:id', authMiddleware, requireOwnerRole, async (req, res, next) => {
  try {
    const { tenant_id, role: callerRole, id: callerId } = req.user;
    if (!['owner', 'admin'].includes(callerRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (req.params.id === callerId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const result = await queryAdmin(
      `DELETE FROM users
       WHERE id = $1 AND tenant_id = $2
       RETURNING id`,
      [req.params.id, tenant_id],
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    enqueueJob('refresh_tenant_stats', { tenantId: tenant_id }).catch(() => {});
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
