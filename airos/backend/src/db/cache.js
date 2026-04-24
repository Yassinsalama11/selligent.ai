const { getRedisClient } = require('./redis');

const IS_PERF_DEBUG = process.env.DEBUG_PERF === 'true';
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';

/**
 * Tenant-safe cache key generator
 */
function buildKey(tenantId, scope, identifier) {
  return `tenant:${tenantId}:${scope}:${identifier}`;
}

/**
 * Safe get from cache
 */
async function getCache(tenantId, scope, identifier) {
  if (!CACHE_ENABLED) return null;
  const redis = getRedisClient();
  if (!redis) return null;

  const key = buildKey(tenantId, scope, identifier);
  const start = Date.now();
  try {
    const data = await redis.get(key);
    const duration = Date.now() - start;
    if (data) {
      if (IS_PERF_DEBUG) console.log(`[PERF:HIT] tenant=${tenantId} scope=${scope} duration=${duration}ms key=${key}`);
      return JSON.parse(data);
    }
    if (IS_PERF_DEBUG) console.log(`[PERF:MISS] tenant=${tenantId} scope=${scope} duration=${duration}ms key=${key}`);
  } catch (err) {
    console.warn('[Cache] get timeout or error:', err.message);
  }
  return null;
}

/**
 * Safe set to cache
 */
async function setCache(tenantId, scope, identifier, value, ttlSeconds = 60) {
  if (!CACHE_ENABLED) return false;
  const redis = getRedisClient();
  if (!redis) return false;

  const key = buildKey(tenantId, scope, identifier);
  const start = Date.now();
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    const duration = Date.now() - start;
    if (IS_PERF_DEBUG) console.log(`[PERF:SET] tenant=${tenantId} scope=${scope} duration=${duration}ms key=${key} TTL=${ttlSeconds}s`);
    return true;
  } catch (err) {
    console.warn('[Cache] set timeout or error:', err.message);
    return false;
  }
}

/**
 * Safe delete from cache
 */
async function delCache(tenantId, scope, identifier) {
  if (!CACHE_ENABLED) return false;
  const redis = getRedisClient();
  if (!redis) return false;

  const key = buildKey(tenantId, scope, identifier);
  const start = Date.now();
  try {
    await redis.del(key);
    const duration = Date.now() - start;
    if (IS_PERF_DEBUG) console.log(`[CACHE:DEL] ${key} duration=${duration}ms`);
    return true;
  } catch (err) {
    console.warn('[Cache] del timeout or error:', err.message);
    return false;
  }
}

/**
 * Invalidate multiple keys by pattern (prefix) using non-blocking SCAN.
 */
async function invalidatePattern(tenantId, scope) {
  if (!CACHE_ENABLED) return false;
  const redis = getRedisClient();
  if (!redis) return false;

  const prefix = `tenant:${tenantId}:${scope}:*`;
  let cursor = '0';
  let totalInvalidated = 0;
  const start = Date.now();

  try {
    do {
      // Emergency: if invalidation takes too long, stop.
      if (Date.now() - start > 300) {
        console.warn(`[Cache] invalidatePattern partial timeout for ${prefix}`);
        break;
      }
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', prefix, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
        totalInvalidated += keys.length;
      }
    } while (cursor !== '0');

    if (totalInvalidated > 0 && IS_PERF_DEBUG) {
      console.log(`[CACHE:INVALIDATE] ${prefix} (${totalInvalidated} keys) duration=${Date.now() - start}ms`);
    }
    return true;
  } catch (err) {
    console.warn('[Cache] invalidatePattern error:', err.message);
    return false;
  }
}

module.exports = {
  getCache,
  setCache,
  delCache,
  invalidatePattern,
  buildKey
};
