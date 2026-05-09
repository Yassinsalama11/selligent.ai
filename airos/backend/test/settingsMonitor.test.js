'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadSettingsRouter({ createdTickets = [], aiModeUpdates = [] } = {}) {
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
      return { updateTenantSettings: async (tenantId, settings) => ({ settings }) };
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
      return {
        updateConversationAiMode: async (tenantId, conversationId, aiMode) => {
          aiModeUpdates.push({ tenantId, conversationId, aiMode });
          return { id: conversationId, tenant_id: tenantId, ai_mode: aiMode };
        },
      };
    }
    if (request === '../../db/queries/tickets') {
      return {
        createTicket: async (tenantId, input) => {
          const ticket = { id: 'ticket-created', tenant_id: tenantId, ...input };
          createdTickets.push(ticket);
          return ticket;
        },
      };
    }
    if (request === '../../core/importProcessor') {
      return { processImport: async () => ({ ok: true }) };
    }
    if (request === './uploads') {
      return { getUploadRoot: () => '/tmp' };
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

async function invokeRoute(router, routePath, method, { body = {}, role = 'admin', queryHandler }) {
  const layer = router.stack.find((entry) => entry.route?.path === routePath && entry.route?.methods?.[method.toLowerCase()]);
  assert.ok(layer, `Route not found: ${method} ${routePath}`);

  const req = {
    method,
    url: routePath.replace(':id', 'conv-1'),
    params: { id: 'conv-1' },
    body,
    user: { id: 'user-1', role, tenant_id: 'tenant-1', name: 'Admin User' },
    tenant: { id: 'tenant-1', settings: {} },
    db: { query: queryHandler },
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

test('monitor escalate creates an urgent ticket and pauses AI', async () => {
  const createdTickets = [];
  const aiModeUpdates = [];
  const router = loadSettingsRouter({ createdTickets, aiModeUpdates });
  const queryHandler = async (sql) => {
    const text = String(sql);
    if (text.includes('FROM conversations c') && text.includes('c.status =')) {
      return {
        rows: [{
          id: 'conv-1',
          customer_id: 'cust-1',
          channel: 'whatsapp',
          assigned_to: null,
          customer_name: 'Customer One',
          last_message_preview: 'Need help',
          ticket_id: null,
        }],
      };
    }
    return { rows: [] };
  };

  const result = await invokeRoute(router, '/monitor/:id/escalate', 'POST', { body: {}, queryHandler });

  assert.equal(result.status, 200);
  assert.equal(result.json.priority, 'urgent');
  assert.equal(result.json.ticket_id, 'ticket-created');
  assert.equal(createdTickets[0].priority, 'urgent');
  assert.equal(createdTickets[0].conversation_id, 'conv-1');
  assert.deepEqual(aiModeUpdates, [{ tenantId: 'tenant-1', conversationId: 'conv-1', aiMode: 'manual' }]);
});

test('monitor escalate is forbidden for agent role', async () => {
  const router = loadSettingsRouter();

  const result = await invokeRoute(router, '/monitor/:id/escalate', 'POST', {
    body: {},
    role: 'agent',
    queryHandler: async () => ({ rows: [] }),
  });

  assert.equal(result.status, 403);
});
