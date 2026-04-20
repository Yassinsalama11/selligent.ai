'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const poolModulePath = require.resolve('../src/db/pool');
const ORIGINAL_ENV = { ...process.env };

function loadPoolModule(envOverrides = {}) {
  const pools = [];
  const fakePg = {
    Pool: class FakePool {
      constructor(options) {
        this.options = options;
        pools.push(this);
      }

      on() {}

      async query() {
        return { rows: [{ ok: true }] };
      }

      async connect() {
        return {
          query: async () => ({ rows: [] }),
          release() {},
        };
      }
    },
  };

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'pg') return fakePg;
    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[poolModulePath];

  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: '',
    RAILWAY_ENVIRONMENT_NAME: '',
    DATABASE_URL: '',
    DATABASE_URL_ADMIN: '',
    ...envOverrides,
  };

  try {
    return { mod: require(poolModulePath), pools };
  } finally {
    Module._load = originalLoad;
  }
}

test.afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete require.cache[poolModulePath];
});

test('queryAdmin uses DATABASE_URL_ADMIN when it is provided', async () => {
  const { mod, pools } = loadPoolModule({
    DATABASE_URL: 'postgresql://app_user:pw@db.local/app',
    DATABASE_URL_ADMIN: 'postgresql://postgres:pw@db.local/app',
  });

  await mod.queryAdmin('SELECT 1');

  assert.equal(pools[0].options.connectionString, 'postgresql://app_user:pw@db.local/app');
  assert.equal(pools[1].options.connectionString, 'postgresql://postgres:pw@db.local/app');
});

test('queryAdmin falls back to DATABASE_URL outside production-like environments', async () => {
  const { mod, pools } = loadPoolModule({
    DATABASE_URL: 'postgresql://app_user:pw@db.local/app',
  });

  await mod.queryAdmin('SELECT 1');

  assert.equal(pools[1].options.connectionString, 'postgresql://app_user:pw@db.local/app');
});

test('queryAdmin fails closed in NODE_ENV=production when DATABASE_URL_ADMIN is missing', async () => {
  const { mod, pools } = loadPoolModule({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://app_user:pw@db.local/app',
  });

  await assert.rejects(() => mod.queryAdmin('SELECT 1'), (err) => {
    assert.equal(err.code, 'DB_UNAVAILABLE');
    assert.equal(err.status, 503);
    assert.match(err.message, /DATABASE_URL_ADMIN/);
    return true;
  });

  assert.equal(pools[1].options.connectionString, undefined);
});

test('queryAdmin fails closed in Railway production when DATABASE_URL_ADMIN is missing', async () => {
  const { mod } = loadPoolModule({
    RAILWAY_ENVIRONMENT_NAME: 'production',
    DATABASE_URL: 'postgresql://app_user:pw@db.local/app',
  });

  await assert.rejects(() => mod.queryAdmin('SELECT 1'), (err) => {
    assert.equal(err.code, 'DB_UNAVAILABLE');
    assert.equal(err.status, 503);
    assert.match(err.message, /DATABASE_URL_ADMIN/);
    return true;
  });
});
