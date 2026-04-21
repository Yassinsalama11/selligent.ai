const crypto = require('crypto');
const IORedis = require('ioredis');

const { queryAdmin } = require('../../db/pool');

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60;

let redisClient;

function normalizeAdminEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getRequestIp(req) {
  return String(
    req?.ip
    || req?.headers?.['x-forwarded-for']?.split(',')[0]
    || req?.socket?.remoteAddress
    || 'unknown'
  ).trim();
}

function hashIdentifier(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function buildLockoutIdentifier(email, ip) {
  return hashIdentifier(`${normalizeAdminEmail(email)}:${String(ip || 'unknown').trim()}`);
}

function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = new IORedis(process.env.REDIS_URL, {
      connectTimeout: 500,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });
    redisClient.on('error', () => {});
  }
  return redisClient;
}

function redisKeys(identifier) {
  return {
    counter: `admin_lockout:${identifier}:count`,
    locked: `admin_lockout:${identifier}:locked`,
  };
}

async function checkDbLockout(identifier, queryFn = queryAdmin) {
  try {
    const result = await queryFn(`
      SELECT EXTRACT(EPOCH FROM (locked_until - NOW()))::int AS ttl
      FROM platform_admin_security
      WHERE lockout_key = $1
        AND locked_until > NOW()
      LIMIT 1
    `, [identifier]);
    const ttl = Number(result.rows[0]?.ttl || 0);
    return ttl > 0 ? { locked: true, ttl, source: 'db' } : { locked: false, source: 'db' };
  } catch {
    return { locked: false, source: 'db_unavailable' };
  }
}

async function checkLockout(identifier, { queryFn = queryAdmin, redis = getRedisClient() } = {}) {
  if (redis) {
    try {
      const keys = redisKeys(identifier);
      const locked = await redis.get(keys.locked);
      if (locked) {
        const ttl = await redis.ttl(keys.locked);
        return { locked: true, ttl: Math.max(Number(ttl || 0), 0), source: 'redis' };
      }
      const dbLockout = await checkDbLockout(identifier, queryFn);
      if (dbLockout.locked) return dbLockout;
      return { locked: false, source: 'redis' };
    } catch {
      return checkDbLockout(identifier, queryFn);
    }
  }

  return checkDbLockout(identifier, queryFn);
}

async function recordRedisFailure(identifier, redis = getRedisClient()) {
  if (!redis) return { locked: false, source: 'redis_unconfigured' };

  const keys = redisKeys(identifier);
  const count = Number(await redis.incr(keys.counter));
  if (count === 1) await redis.expire(keys.counter, LOCKOUT_WINDOW_SECONDS);

  if (count >= LOCKOUT_THRESHOLD) {
    await redis.set(keys.locked, '1', 'EX', LOCKOUT_WINDOW_SECONDS);
    await redis.expire(keys.counter, LOCKOUT_WINDOW_SECONDS);
    return { locked: true, count, source: 'redis' };
  }

  return { locked: false, count, source: 'redis' };
}

async function recordDbFailure(identifier, userId, queryFn = queryAdmin) {
  try {
    const result = await queryFn(`
      INSERT INTO platform_admin_security (lockout_key, user_id, failed_login_count, locked_until)
      VALUES ($1, $2, 1, NULL)
      ON CONFLICT (lockout_key) DO UPDATE
      SET user_id = COALESCE(EXCLUDED.user_id, platform_admin_security.user_id),
          failed_login_count = CASE
            WHEN platform_admin_security.locked_until > NOW()
              THEN platform_admin_security.failed_login_count
            WHEN platform_admin_security.updated_at < NOW() - ($3::int * INTERVAL '1 second')
              THEN 1
            ELSE platform_admin_security.failed_login_count + 1
          END,
          locked_until = CASE
            WHEN platform_admin_security.locked_until > NOW()
              THEN platform_admin_security.locked_until
            WHEN (
              CASE
                WHEN platform_admin_security.updated_at < NOW() - ($3::int * INTERVAL '1 second')
                  THEN 1
                ELSE platform_admin_security.failed_login_count + 1
              END
            ) >= $4
              THEN NOW() + ($3::int * INTERVAL '1 second')
            ELSE NULL
          END,
          updated_at = NOW()
      RETURNING failed_login_count, locked_until > NOW() AS locked
    `, [identifier, userId || null, LOCKOUT_WINDOW_SECONDS, LOCKOUT_THRESHOLD]);

    const row = result.rows[0] || {};
    return {
      locked: row.locked === true,
      count: Number(row.failed_login_count || 0),
      source: 'db',
    };
  } catch {
    return { locked: false, source: 'db_unavailable' };
  }
}

async function recordFailedLogin(identifier, userId, { queryFn = queryAdmin, redis = getRedisClient() } = {}) {
  let redisResult = { locked: false };
  try {
    redisResult = await recordRedisFailure(identifier, redis);
  } catch {
    redisResult = { locked: false, source: 'redis_unavailable' };
  }

  const dbResult = await recordDbFailure(identifier, userId, queryFn);
  return {
    locked: Boolean(redisResult.locked || dbResult.locked),
    redis: redisResult,
    db: dbResult,
  };
}

async function clearLockout(identifier, userId, { queryFn = queryAdmin, redis = getRedisClient() } = {}) {
  if (redis) {
    try {
      const keys = redisKeys(identifier);
      await redis.del(keys.counter, keys.locked);
    } catch {}
  }

  try {
    await queryFn(`
      INSERT INTO platform_admin_security (lockout_key, user_id, failed_login_count, locked_until)
      VALUES ($1, $2, 0, NULL)
      ON CONFLICT (lockout_key) DO UPDATE
      SET user_id = COALESCE(EXCLUDED.user_id, platform_admin_security.user_id),
          failed_login_count = 0,
          locked_until = NULL,
          updated_at = NOW()
    `, [identifier, userId || null]);
  } catch {}
}

module.exports = {
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_SECONDS,
  buildLockoutIdentifier,
  checkLockout,
  clearLockout,
  getRequestIp,
  hashIdentifier,
  normalizeAdminEmail,
  recordFailedLogin,
};
