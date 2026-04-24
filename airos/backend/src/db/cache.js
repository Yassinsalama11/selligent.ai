const { getRedisClient } = require('./redis');

const IS_PERF_DEBUG = process.env.DEBUG_PERF === 'true';

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
  const redis = getRedisClient();
  if (!redis) return null;

  const key = buildKey(tenantId, scope, identifier);
  try {
    const data = await redis.get(key);
    if (data) {
      if (IS_PERF_DEBUG) console.log(`[PERF:HIT] tenant=${tenantId} scope=${scope} key=${key}`);
      return JSON.parse(data);
    }
    if (IS_PERF_DEBUG) console.log(`[PERF:MISS] tenant=${tenantId} scope=${scope} key=${key}`);
  } catch (err) {
    console.error('[Cache] get error:', err.message);
  }
  return null;
}

/**
 * Safe set to cache
 */
async function setCache(tenantId, scope, identifier, value, ttlSeconds = 60) {
  const redis = getRedisClient();
  if (!redis) return false;

  const key = buildKey(tenantId, scope, identifier);
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    if (IS_PERF_DEBUG) console.log(`[PERF:SET] tenant=${tenantId} scope=${scope} key=${key} TTL=${ttlSeconds}s`);
    return true;
  } catch (err) {
    console.error('[Cache] set error:', err.message);
    return false;
  }
}

/**
 * Safe delete from cache
 */
async function delCache(tenantId, scope, identifier) {
  const redis = getRedisClient();
  if (!redis) return false;

  const key = buildKey(tenantId, scope, identifier);
  try {
    await redis.del(key);
    if (IS_PERF_DEBUG) console.log(`[CACHE:DEL] ${key}`);
    return true;
  } catch (err) {
    console.error('[Cache] del error:', err.message);
    return false;
  }
}

/**
 * Invalidate multiple keys by pattern (prefix) using non-blocking SCAN.
 */
async function invalidatePattern(tenantId, scope) {
  const redis = getRedisClient();
  if (!redis) return false;

  const prefix = `tenant:${tenantId}:${scope}:*`;
  let cursor = '0';
  let totalInvalidated = 0;

  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', prefix, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await redis.del(...keys);
        totalInvalidated += keys.length;
      }
    } while (cursor !== '0');

    if (totalInvalidated > 0 && IS_PERF_DEBUG) {
      console.log(`[CACHE:INVALIDATE] ${prefix} (${totalInvalidated} keys)`);
    }
    return true;
  } catch (err) {
    console.error('[Cache] invalidatePattern error:', err.message);
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
