'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const AGENT_ID = '22222222-2222-2222-2222-222222222222';

function loadEngine(rules = []) {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;
  const assigned = [];

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === '../db/queries/routingRules'
      || request === '../db/queries/conversations'
      || request === '../db/pool'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../db/queries/routingRules') {
      return {
        listEnabledRoutingRules: async () => rules,
      };
    }

    if (request === '../db/queries/conversations') {
      return {
        assignConversation: async (tenantId, conversationId, userId) => {
          assigned.push({ tenantId, conversationId, userId });
          return { id: conversationId, assigned_to: userId };
        },
      };
    }

    if (request === '../db/pool') {
      return {
        queryAdmin: async (sql, params) => {
          if (String(sql).includes('FROM users')) {
            return params[1] === AGENT_ID ? { rows: [{ id: AGENT_ID }] } : { rows: [] };
          }
          if (String(sql).includes('UPDATE tickets')) {
            return { rows: [{ id: params[1], assignee_id: params[2] }] };
          }
          return { rows: [] };
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/core/routingRulesEngine')];
    return { engine: require('../src/core/routingRulesEngine'), assigned };
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

test('matches channel, keyword, customer attributes, and ticket priority', () => {
  const { engine } = loadEngine();
  const rule = {
    conditions: {
      channel: 'whatsapp',
      keywords: ['refund'],
      country: 'EG',
      tag: 'VIP',
      ticket_priority: 'urgent',
    },
  };

  assert.equal(engine.matchesRule(rule, {
    conversation: { channel: 'whatsapp' },
    message: { content: 'Need a refund now' },
    customer: { tags: ['VIP'], preferences: { country: 'EG' } },
    ticket: { priority: 'urgent' },
  }), true);

  assert.equal(engine.matchesRule(rule, {
    conversation: { channel: 'instagram' },
    message: { content: 'Need a refund now' },
    customer: { tags: ['VIP'], preferences: { country: 'EG' } },
    ticket: { priority: 'urgent' },
  }), false);
});

test('first matching rule wins deterministically', async () => {
  const { engine, assigned } = loadEngine([
    {
      id: 'first',
      conditions: { channel: 'whatsapp' },
      action: { assign_to_user: AGENT_ID },
    },
    {
      id: 'second',
      conditions: { channel: 'whatsapp', keywords: ['refund'] },
      action: { assign_to_user: '33333333-3333-3333-3333-333333333333' },
    },
  ]);

  const result = await engine.applyRoutingRules(TENANT_ID, {
    conversation: { id: 'conv-1', channel: 'whatsapp' },
    message: { content: 'refund please' },
    customer: {},
  });

  assert.equal(result.matched, true);
  assert.equal(result.applied, true);
  assert.equal(result.rule.id, 'first');
  assert.deepEqual(assigned, [{ tenantId: TENANT_ID, conversationId: 'conv-1', userId: AGENT_ID }]);
});
