const crypto = require('crypto');
const { queryAdmin } = require('../db/pool');
const { buildBillingSummary } = require('./billingService');

const PROVIDERS = new Set(['google', 'microsoft', 'saml']);
const USER_ROLES = new Set(['agent', 'admin']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function normalizeDomain(domain) {
  return String(domain || '').trim().toLowerCase().replace(/^@+/, '');
}

function emailDomain(email) {
  const parts = String(email || '').trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[1] : '';
}

function normalizeSsoConfig(input = {}, existing = {}) {
  const provider = String(input.provider || input.providerType || existing.provider || 'google').trim().toLowerCase();
  const allowedDomains = Array.isArray(input.allowedDomains)
    ? input.allowedDomains.map(normalizeDomain).filter(Boolean).slice(0, 25)
    : Array.isArray(existing.allowedDomains)
      ? existing.allowedDomains.map(normalizeDomain).filter(Boolean).slice(0, 25)
      : [];
  const defaultRole = USER_ROLES.has(String(input.defaultRole || existing.defaultRole || 'agent').toLowerCase())
    ? String(input.defaultRole || existing.defaultRole || 'agent').toLowerCase()
    : 'agent';
  const mappings = input.mappings && typeof input.mappings === 'object' && !Array.isArray(input.mappings)
    ? input.mappings
    : existing.mappings || {};

  return {
    enabled: Boolean(input.enabled ?? existing.enabled ?? false),
    provider: PROVIDERS.has(provider) ? provider : 'google',
    allowedDomains,
    requireSso: Boolean(input.requireSso ?? existing.requireSso ?? false),
    autoProvision: Boolean(input.autoProvision ?? existing.autoProvision ?? false),
    defaultRole,
    mappings: {
      email: String(mappings.email || 'email').slice(0, 80),
      name: String(mappings.name || 'name').slice(0, 80),
      department: String(mappings.department || 'department').slice(0, 80),
      role: String(mappings.role || 'role').slice(0, 80),
    },
    emergencyOwnerFallback: input.emergencyOwnerFallback !== undefined
      ? Boolean(input.emergencyOwnerFallback)
      : existing.emergencyOwnerFallback !== false,
    lastTestedAt: existing.lastTestedAt || null,
    lastLoginAt: existing.lastLoginAt || null,
    lastError: existing.lastError || '',
    updatedAt: existing.updatedAt || null,
    updatedBy: existing.updatedBy || null,
  };
}

function publicSsoConfig(config = {}) {
  const normalized = normalizeSsoConfig(config);
  return {
    enabled: normalized.enabled,
    provider: normalized.provider,
    allowedDomains: normalized.allowedDomains,
    requireSso: normalized.requireSso,
    autoProvision: normalized.autoProvision,
    defaultRole: normalized.defaultRole,
    mappings: normalized.mappings,
    emergencyOwnerFallback: normalized.emergencyOwnerFallback,
    status: normalized.enabled ? 'enabled' : 'disabled',
    lastTestedAt: normalized.lastTestedAt,
    lastLoginAt: normalized.lastLoginAt,
    lastError: normalized.lastError,
    saml: {
      supported: false,
      message: 'Enterprise SAML available on request. No SAML endpoint is enabled in this deployment.',
    },
  };
}

function getTenantSsoConfig(tenant = {}) {
  const settings = tenant.settings && typeof tenant.settings === 'object' ? tenant.settings : {};
  return normalizeSsoConfig(settings.sso || {});
}

function isDomainAllowed(email, config) {
  const domain = emailDomain(email);
  if (!domain) return false;
  const domains = Array.isArray(config.allowedDomains) ? config.allowedDomains.map(normalizeDomain).filter(Boolean) : [];
  return domains.length === 0 || domains.includes(domain);
}

async function assertSsoEntitled(tenant) {
  const summary = await buildBillingSummary(tenant);
  const ssoFeature = (summary?.featureAccess || []).find((entry) => entry.key === 'sso');
  if (ssoFeature?.allowed === false) {
    const err = new Error(ssoFeature.reason || 'SSO is not enabled for the current subscription package.');
    err.status = 403;
    err.code = 'SSO_NOT_ENTITLED';
    throw err;
  }
  return summary;
}

function getProviderRuntimeStatus(provider) {
  const normalized = String(provider || '').toLowerCase();
  if (normalized === 'google') {
    return {
      provider: 'google',
      configured: Boolean(process.env.GOOGLE_SSO_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)
        && Boolean(process.env.GOOGLE_SSO_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET),
      clientId: process.env.GOOGLE_SSO_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_SSO_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_SSO_REDIRECT_URI || `${process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL || 'http://localhost:3011'}/api/auth/sso/google/callback`,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    };
  }
  if (normalized === 'microsoft') {
    const tenant = process.env.MICROSOFT_SSO_TENANT_ID || process.env.AZURE_AD_TENANT_ID || 'organizations';
    return {
      provider: 'microsoft',
      configured: Boolean(process.env.MICROSOFT_SSO_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID)
        && Boolean(process.env.MICROSOFT_SSO_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET),
      clientId: process.env.MICROSOFT_SSO_CLIENT_ID || process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_SSO_CLIENT_SECRET || process.env.AZURE_AD_CLIENT_SECRET || '',
      redirectUri: process.env.MICROSOFT_SSO_REDIRECT_URI || `${process.env.API_PUBLIC_URL || process.env.BACKEND_PUBLIC_URL || 'http://localhost:3011'}/api/auth/sso/microsoft/callback`,
      authUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
    };
  }
  return { provider: normalized, configured: false };
}

function signState(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const body = Buffer.from(JSON.stringify({
    ...payload,
    nonce: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + 10 * 60 * 1000,
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig) {
    const err = new Error('Invalid SSO state');
    err.status = 400;
    throw err;
  }
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (Buffer.byteLength(sig) !== Buffer.byteLength(expected)
    || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    const err = new Error('Invalid SSO state');
    err.status = 400;
    throw err;
  }
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Date.now()) {
    const err = new Error('Expired SSO state');
    err.status = 400;
    throw err;
  }
  return payload;
}

async function resolveTenantForSso({ email, tenantId, provider }) {
  if (tenantId) {
    const result = await queryAdmin('SELECT * FROM tenants WHERE id = $1 LIMIT 1', [tenantId]);
    return result.rows[0] || null;
  }

  const domain = emailDomain(email);
  if (!domain) return null;
  const result = await queryAdmin(
    `SELECT *
     FROM tenants
     WHERE COALESCE((settings->'sso'->>'enabled')::boolean, false) = true
       AND LOWER(COALESCE(settings->'sso'->>'provider', '')) = LOWER($2)
       AND EXISTS (
         SELECT 1
         FROM jsonb_array_elements_text(COALESCE(settings->'sso'->'allowedDomains', '[]'::jsonb)) AS domains(value)
         WHERE LOWER(domains.value) = LOWER($1)
       )
     ORDER BY created_at ASC
     LIMIT 1`,
    [domain, provider],
  );
  return result.rows[0] || null;
}

async function buildSsoStart({ provider, email, tenantId, returnTo = '/dashboard' }) {
  const runtime = getProviderRuntimeStatus(provider);
  if (!runtime.configured) {
    const err = new Error(`${provider} SSO is not configured on the server.`);
    err.status = 503;
    err.code = 'SSO_PROVIDER_NOT_CONFIGURED';
    throw err;
  }

  const tenant = await resolveTenantForSso({ email, tenantId, provider });
  if (!tenant) {
    const err = new Error('No tenant SSO configuration matches this request.');
    err.status = 404;
    throw err;
  }
  await assertSsoEntitled(tenant);
  const config = getTenantSsoConfig(tenant);
  if (!config.enabled || config.provider !== provider) {
    const err = new Error(`${provider} SSO is not enabled for this tenant.`);
    err.status = 403;
    throw err;
  }
  if (email && !isDomainAllowed(email, config)) {
    const err = new Error('Email domain is not allowed for this tenant SSO configuration.');
    err.status = 403;
    throw err;
  }

  const state = signState({ tenantId: tenant.id, provider, returnTo: String(returnTo || '/dashboard').slice(0, 300) });
  const params = new URLSearchParams({
    client_id: runtime.clientId,
    redirect_uri: runtime.redirectUri,
    response_type: 'code',
    scope: provider === 'google' ? 'openid email profile' : 'openid email profile User.Read',
    state,
    prompt: 'select_account',
  });
  return { url: `${runtime.authUrl}?${params.toString()}`, state, provider, tenantId: tenant.id };
}

async function exchangeCodeForClaims(provider, code) {
  const runtime = getProviderRuntimeStatus(provider);
  if (!runtime.configured) {
    const err = new Error(`${provider} SSO is not configured on the server.`);
    err.status = 503;
    throw err;
  }

  const tokenResponse = await fetch(runtime.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: runtime.clientId,
      client_secret: runtime.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: runtime.redirectUri,
    }),
  });
  if (!tokenResponse.ok) {
    const err = new Error(`SSO token exchange failed with status ${tokenResponse.status}`);
    err.status = 502;
    throw err;
  }
  const tokenJson = await tokenResponse.json();
  const userResponse = await fetch(runtime.userInfoUrl, {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!userResponse.ok) {
    const err = new Error(`SSO userinfo lookup failed with status ${userResponse.status}`);
    err.status = 502;
    throw err;
  }
  const claims = await userResponse.json();
  return {
    email: String(claims.email || claims.preferred_username || claims.upn || '').toLowerCase(),
    name: String(claims.name || claims.given_name || '').trim(),
    department: String(claims.department || '').trim(),
    raw: claims,
  };
}

function resolveMappedValue(claims, mappingKey, fallback = '') {
  const key = String(mappingKey || '').trim();
  if (!key) return fallback;
  return claims.raw?.[key] || claims[key] || fallback;
}

function resolveMappedRole(claims, config) {
  const mapped = String(resolveMappedValue(claims, config.mappings?.role, '') || '').toLowerCase();
  if (USER_ROLES.has(mapped)) return mapped;
  return config.defaultRole || 'agent';
}

function shouldBlockPasswordLogin(user, tenant) {
  const config = getTenantSsoConfig(tenant);
  if (!config.enabled || !config.requireSso) return false;
  if (!isDomainAllowed(user.email, config)) return false;
  if (String(user.role || '').toLowerCase() === 'owner' && config.emergencyOwnerFallback !== false) return false;
  return true;
}

module.exports = {
  EMAIL_RE,
  buildSsoStart,
  exchangeCodeForClaims,
  getProviderRuntimeStatus,
  getTenantSsoConfig,
  isDomainAllowed,
  normalizeSsoConfig,
  publicSsoConfig,
  resolveMappedRole,
  resolveMappedValue,
  shouldBlockPasswordLogin,
  verifyState,
};
