/**
 * Multi-cluster Prisma client with data-residency routing (Task 1-C1).
 *
 * Clusters: us | eu | gcc
 *
 * Env vars (fall back to DATABASE_URL if region-specific one is absent):
 *   DATABASE_URL_US  — US Postgres cluster
 *   DATABASE_URL_EU  — EU Postgres cluster
 *   DATABASE_URL_GCC — GCC Postgres cluster
 *   DATABASE_URL     — fallback / single-cluster dev
 */
const { PrismaClient } = require('@prisma/client');

const VALID_REGIONS = new Set(['us', 'eu', 'gcc']);

// ── Per-region PrismaClient pool ──────────────────────────────────────────────

const _clients = {};

function _clientForRegion(region = 'us') {
  const key = VALID_REGIONS.has(region) ? region : 'us';
  if (!_clients[key]) {
    const envKey = `DATABASE_URL_${key.toUpperCase()}`;
    const url = process.env[envKey] || process.env.DATABASE_URL;
    if (!url) throw new Error(`No DATABASE_URL configured for region "${key}"`);

    _clients[key] = new PrismaClient({
      datasources: { db: { url } },
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
    });
  }
  return _clients[key];
}

// ── Tenant → region cache (process-lifetime) ─────────────────────────────────
// Keyed by tenantId, value is 'us' | 'eu' | 'gcc'.
// We look up the tenant on the US cluster (which holds the master routing table)
// and cache the result so subsequent calls skip the extra query.
const _tenantRegionCache = new Map();

async function _resolveRegion(tenantId) {
  if (_tenantRegionCache.has(tenantId)) return _tenantRegionCache.get(tenantId);

  // Look up on the US cluster (or DATABASE_URL fallback)
  const usClient = _clientForRegion('us');
  const tenant = await usClient.tenant.findUnique({
    where: { id: tenantId },
    select: { dataResidency: true },
  });

  const region = tenant?.dataResidency || 'us';
  _tenantRegionCache.set(tenantId, region);
  return region;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Return a PrismaClient for the given region.
 * Usage: getPrisma('eu') or getPrisma() for default US.
 */
function getPrisma(region = 'us') {
  return _clientForRegion(region);
}

/**
 * Return the PrismaClient that owns data for this tenant.
 * Performs a one-time async lookup + caches the result.
 */
async function getPrismaForTenant(tenantId) {
  const region = await _resolveRegion(tenantId);
  return _clientForRegion(region);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Run `fn(tx)` inside a transaction on the correct cluster for this tenant.
 * Sets app.tenant_id session variable for RLS.
 */
async function withTenant(tenantId, fn) {
  if (!UUID_RE.test(String(tenantId || ''))) {
    throw new Error('withTenant: tenantId must be a UUID');
  }
  const prisma = await getPrismaForTenant(tenantId);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}

/**
 * Invalidate the cached region for a tenant (call after changing dataResidency).
 */
function invalidateTenantCache(tenantId) {
  _tenantRegionCache.delete(tenantId);
}

async function disconnect() {
  await Promise.all(
    Object.values(_clients).map((c) => c.$disconnect()),
  );
  Object.keys(_clients).forEach((k) => delete _clients[k]);
  _tenantRegionCache.clear();
}

module.exports = {
  getPrisma,
  getPrismaForTenant,
  withTenant,
  invalidateTenantCache,
  disconnect,
};
