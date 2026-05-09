'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadSettingsRouter({ processedImports = [], savedSettings = [] } = {}) {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === '../../db/queries/tenants'
      || request === '../../core/recycleBin'
      || request === '../../core/emailService'
      || request === '../../core/reportScheduler'
      || request === '../../db/queries/routingRules'
      || request === '../../db/queries/conversations'
      || request === '../../db/queries/tickets'
      || request === '../../core/importProcessor'
      || request === './uploads'
      || request === '../../ai/promptRegistry'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../../db/queries/tenants') {
      return {
        updateTenantSettings: async (tenantId, settings) => {
          savedSettings.push({ tenantId, settings });
          return { settings };
        },
      };
    }
    if (request === '../../core/recycleBin') {
      return { getRecycleBin: async () => [], removeRecycleItem: async () => ({}), clearRecycleBin: async () => {} };
    }
    if (request === '../../core/emailService') {
      return { buildDefaultTemplateBody: () => '<p>ok</p>', sendEmail: async () => ({ ok: true }) };
    }
    if (request === '../../core/reportScheduler') {
      return { runScheduledReportsForTenant: async () => [] };
    }
    if (request === '../../db/queries/routingRules') {
      return {
        listRoutingRules: async () => [],
        createRoutingRule: async () => ({}),
        updateRoutingRule: async () => ({}),
        deleteRoutingRule: async () => ({}),
      };
    }
    if (request === '../../db/queries/conversations') {
      return { updateConversationAiMode: async () => ({}) };
    }
    if (request === '../../db/queries/tickets') {
      return { createTicket: async () => ({}) };
    }
    if (request === '../../core/importProcessor') {
      return {
        processImport: async (payload) => {
          processedImports.push(payload);
          return {
            processed: 1,
            inserted: 1,
            skipped: 0,
            errors: [],
            completedAt: '2026-01-02T03:04:05.000Z',
          };
        },
      };
    }
    if (request === './uploads') {
      return { getUploadRoot: () => '/tmp/airos-uploads' };
    }
    if (request === '../../ai/promptRegistry') {
      return { listPrompts: async () => [], rollbackPrompt: async () => ({}) };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/api/routes/settings')];
    return require('../src/api/routes/settings');
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

async function invokeRoute(router, routePath, method, { body = {}, role = 'admin', settings = {} } = {}) {
  const layer = router.stack.find((entry) => entry.route?.path === routePath && entry.route?.methods?.[method.toLowerCase()]);
  assert.ok(layer, `Route not found: ${method} ${routePath}`);

  const req = {
    method,
    url: routePath,
    params: {},
    body,
    user: { id: 'user-1', role, tenant_id: 'tenant-1', name: 'Admin User' },
    tenant: { id: 'tenant-1', settings },
    db: { query: async () => ({ rows: [] }) },
  };
  const res = {
    statusCode: 200,
    payload: undefined,
    finished: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.payload = value;
      this.finished = true;
      return this;
    },
    end() {
      this.finished = true;
      return this;
    },
  };

  for (const routeLayer of layer.route.stack) {
    if (res.finished) break;
    await new Promise((resolve, reject) => {
      const next = (err) => (err ? reject(err) : resolve());
      try {
        const result = routeLayer.handle(req, res, next);
        if (result && typeof result.then === 'function') {
          result.then(() => resolve()).catch(reject);
        } else if (routeLayer.handle.length < 3 || res.finished) {
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  return { status: res.statusCode, json: res.payload };
}

test('import process rejects uploads from a different tenant directory', async () => {
  const processedImports = [];
  const router = loadSettingsRouter({ processedImports });

  const result = await invokeRoute(router, '/import/process', 'POST', {
    body: { importType: 'conversations', filePath: '/uploads/other-tenant/import.csv' },
  });

  assert.equal(result.status, 403);
  assert.equal(result.json.error, 'Import file does not belong to this tenant');
  assert.equal(processedImports.length, 0);
});

test('import process resolves only tenant-owned upload paths and persists last result', async () => {
  const processedImports = [];
  const savedSettings = [];
  const router = loadSettingsRouter({ processedImports, savedSettings });

  const result = await invokeRoute(router, '/import/process', 'POST', {
    body: { importType: 'tickets', filePath: '/uploads/tenant-1/import.csv' },
  });

  assert.equal(result.status, 200);
  assert.equal(result.json.inserted, 1);
  assert.equal(processedImports[0].tenantId, 'tenant-1');
  assert.equal(processedImports[0].filePath, '/tmp/airos-uploads/tenant-1/import.csv');
  assert.equal(processedImports[0].importType, 'tickets');
  assert.equal(savedSettings[0].settings.importConfig.lastResult.filePath, '/uploads/tenant-1/import.csv');
});

test('agents can read import status but cannot process imports', async () => {
  const router = loadSettingsRouter();

  const readResult = await invokeRoute(router, '/import', 'GET', {
    role: 'agent',
    settings: { importConfig: { lastResult: { inserted: 3 } } },
  });
  const processResult = await invokeRoute(router, '/import/process', 'POST', {
    role: 'agent',
    body: { importType: 'tickets', filePath: '/uploads/tenant-1/import.csv' },
  });

  assert.equal(readResult.status, 200);
  assert.equal(readResult.json.lastResult.inserted, 3);
  assert.equal(processResult.status, 403);
});
