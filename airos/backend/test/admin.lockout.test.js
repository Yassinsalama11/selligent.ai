const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_JWT_SECRET ||= 'test-admin-secret';

const {
  LOCKOUT_THRESHOLD,
  buildLockoutIdentifier,
  checkLockout,
  clearLockout,
  recordFailedLogin,
} = require('../src/api/middleware/adminLockout');

function createRedisStub() {
  const values = new Map();
  const ttls = new Map();
  return {
    values,
    deleted: [],
    async get(key) {
      return values.get(key) || null;
    },
    async ttl(key) {
      return ttls.get(key) || -1;
    },
    async incr(key) {
      const next = Number(values.get(key) || 0) + 1;
      values.set(key, String(next));
      return next;
    },
    async expire(key, ttl) {
      ttls.set(key, ttl);
    },
    async set(key, value, mode, ttl) {
      values.set(key, value);
      if (mode === 'EX') ttls.set(key, ttl);
    },
    async del(...keys) {
      this.deleted.push(...keys);
      keys.forEach((key) => values.delete(key));
    },
  };
}

test('buildLockoutIdentifier hashes email and IP without exposing either value', () => {
  const identifier = buildLockoutIdentifier('Admin@Example.com', '203.0.113.9');

  assert.equal(identifier.length, 64);
  assert.doesNotMatch(identifier, /admin/i);
  assert.doesNotMatch(identifier, /203\.0\.113\.9/);
  assert.equal(identifier, buildLockoutIdentifier('admin@example.com', '203.0.113.9'));
  assert.notEqual(identifier, buildLockoutIdentifier('admin@example.com', '203.0.113.10'));
});

test('checkLockout uses Redis as primary when a lock key exists', async () => {
  const redis = createRedisStub();
  const identifier = buildLockoutIdentifier('admin@example.com', '127.0.0.1');
  redis.values.set(`admin_lockout:${identifier}:locked`, '1');

  let dbCalled = false;
  const result = await checkLockout(identifier, {
    redis,
    queryFn: async () => {
      dbCalled = true;
      return { rows: [] };
    },
  });

  assert.equal(result.locked, true);
  assert.equal(result.source, 'redis');
  assert.equal(dbCalled, false);
});

test('checkLockout falls back to DB when Redis is unavailable', async () => {
  const identifier = buildLockoutIdentifier('admin@example.com', '127.0.0.1');
  const result = await checkLockout(identifier, {
    redis: {
      async get() {
        throw new Error('redis unavailable');
      },
    },
    queryFn: async (sql, params) => {
      assert.match(sql, /platform_admin_security/);
      assert.deepEqual(params, [identifier]);
      return { rows: [{ ttl: 600 }] };
    },
  });

  assert.equal(result.locked, true);
  assert.equal(result.source, 'db');
});

test('checkLockout honors DB lockout state after a Redis miss', async () => {
  const redis = createRedisStub();
  const identifier = buildLockoutIdentifier('admin@example.com', '127.0.0.1');
  const result = await checkLockout(identifier, {
    redis,
    queryFn: async () => ({ rows: [{ ttl: 300 }] }),
  });

  assert.equal(result.locked, true);
  assert.equal(result.source, 'db');
});

test('recordFailedLogin locks after threshold and mirrors to DB fallback storage', async () => {
  const redis = createRedisStub();
  const identifier = buildLockoutIdentifier('admin@example.com', '127.0.0.1');
  const dbCalls = [];
  const queryFn = async (sql, params) => {
    dbCalls.push({ sql, params });
    return { rows: [{ failed_login_count: dbCalls.length, locked: dbCalls.length >= LOCKOUT_THRESHOLD }] };
  };

  let result;
  for (let i = 0; i < LOCKOUT_THRESHOLD; i += 1) {
    result = await recordFailedLogin(identifier, 'admin-id', { redis, queryFn });
  }

  assert.equal(result.locked, true);
  assert.equal(redis.values.get(`admin_lockout:${identifier}:locked`), '1');
  assert.equal(dbCalls.length, LOCKOUT_THRESHOLD);
  assert.equal(dbCalls[0].params[0], identifier);
  assert.equal(dbCalls[0].params[1], 'admin-id');
});

test('clearLockout deletes Redis keys and resets DB state', async () => {
  const redis = createRedisStub();
  const identifier = buildLockoutIdentifier('admin@example.com', '127.0.0.1');
  const dbCalls = [];

  await clearLockout(identifier, 'admin-id', {
    redis,
    queryFn: async (sql, params) => {
      dbCalls.push({ sql, params });
      return { rows: [] };
    },
  });

  assert.deepEqual(redis.deleted, [
    `admin_lockout:${identifier}:count`,
    `admin_lockout:${identifier}:locked`,
  ]);
  assert.equal(dbCalls.length, 1);
  assert.match(dbCalls[0].sql, /failed_login_count = 0/);
  assert.deepEqual(dbCalls[0].params, [identifier, 'admin-id']);
});
