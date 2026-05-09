'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadTriggerEngine() {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;
  const calls = {
    dealUpdates: [],
    assignments: [],
    settingsUpdates: [],
  };

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === '../db/pool'
      || request === '../db/queries/tenants'
      || request === '../db/queries/messages'
      || request === '../db/queries/conversations'
      || request === './emailService'
      || request === '../channels/whatsapp/sender'
      || request === '../channels/livechat/socket'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../db/pool') {
      return {
        queryAdmin: async (sql, params) => {
          if (/UPDATE deals/i.test(sql)) {
            calls.dealUpdates.push(params);
            return { rows: [{ lead_score: 72 }] };
          }
          if (/FROM users/i.test(sql)) {
            return { rows: [{ id: 'agent-1', name: 'Agent One' }] };
          }
          if (/UPDATE customers/i.test(sql)) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      };
    }

    if (request === '../db/queries/tenants') {
      return {
        updateTenantSettings: async (tenantId, settings) => {
          calls.settingsUpdates.push({ tenantId, settings });
          return { settings };
        },
      };
    }

    if (request === '../db/queries/messages') {
      return { saveMessage: async () => ({ id: 'message-out' }) };
    }

    if (request === '../db/queries/conversations') {
      return {
        assignConversation: async (tenantId, conversationId, userId) => {
          calls.assignments.push({ tenantId, conversationId, userId });
          return { id: conversationId, assigned_to: userId };
        },
      };
    }

    if (request === './emailService') return { sendEmail: async () => ({ ok: true }) };
    if (request === '../channels/whatsapp/sender') return { sendText: async () => ({ messages: [{ id: 'wa-1' }] }) };
    if (request === '../channels/livechat/socket') return { getIO: () => ({ to: () => ({ emit: () => {} }) }) };

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/core/triggerEngine')];
    return {
      executeTriggers: require('../src/core/triggerEngine').executeTriggers,
      calls,
    };
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

test('executeTriggers applies message-count conditions and persists score adjustments', async () => {
  const { executeTriggers, calls } = loadTriggerEngine();

  const logs = await executeTriggers({
    tenantId: 'tenant-1',
    settings: {
      triggers: [{
        id: 'trigger-1',
        name: 'Boost engaged leads',
        active: true,
        event: 'message_received',
        conditionField: 'message_count',
        conditionOp: '>=',
        conditionValue: '2',
        actionType: 'update_score',
        actionValue: '+10',
      }],
    },
    conversation: { id: 'conversation-1', channel: 'livechat', created_at: new Date(Date.now() - 5000).toISOString() },
    customer: { id: 'customer-1', tags: [] },
    savedMessage: { id: 'message-1', content: 'hello', created_at: new Date().toISOString() },
    deal: { id: 'deal-1', lead_score: 62 },
    analysis: { lead_score: 62, intent: 'question' },
    historyLength: 3,
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].actions[0].status, 'updated');
  assert.deepEqual(calls.dealUpdates[0], [10, 'tenant-1', 'deal-1']);
  assert.equal(calls.settingsUpdates.length, 1);
});

test('executeTriggers assigns department targets to a real tenant operator', async () => {
  const { executeTriggers, calls } = loadTriggerEngine();

  const logs = await executeTriggers({
    tenantId: 'tenant-1',
    settings: {
      depts: [{ id: 'sales', name: 'Sales' }],
      triggers: [{
        id: 'trigger-2',
        name: 'Route sales',
        active: true,
        event: 'message_received',
        conditionField: 'channel',
        conditionOp: '=',
        conditionValue: 'livechat',
        actionType: 'assign_to',
        actionValue: 'dept:Sales',
      }],
    },
    conversation: { id: 'conversation-1', channel: 'livechat' },
    customer: { id: 'customer-1', tags: [] },
    savedMessage: { id: 'message-1', content: 'hello' },
    analysis: { lead_score: 50 },
    historyLength: 1,
  });

  assert.equal(logs.length, 1);
  assert.equal(logs[0].actions[0].status, 'assigned');
  assert.deepEqual(calls.assignments[0], {
    tenantId: 'tenant-1',
    conversationId: 'conversation-1',
    userId: 'agent-1',
  });
});
