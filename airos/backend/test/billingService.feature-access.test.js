'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadBillingService({ plans = [] } = {}) {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === '../db/queries/platform'
      || request === '../db/pool'
      || request === '../db/cache'
      || request === '../db/queries/audit'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../db/queries/platform') {
      return { listPlatformPlans: async () => plans };
    }
    if (request === '../db/pool') {
      return { queryAdmin: async () => ({ rows: [] }) };
    }
    if (request === '../db/cache') {
      return { setCache: async () => true, delCache: async () => true };
    }
    if (request === '../db/queries/audit') {
      return { logAuditEvent: async () => ({}) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/services/billingService')];
    return require('../src/services/billingService');
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

test('Messenger integration follows admin Plan Feature Access, not selected billing channels', async () => {
  const billing = loadBillingService({
    plans: [{
      key: 'growth',
      metadata: {
        featureFlags: {
          livechat: true,
          instagram: true,
          messenger: true,
          whatsapp: false,
          channels: ['livechat', 'instagram', 'messenger'],
        },
      },
    }],
  });

  const summary = await billing.buildBillingSummary({
    id: 'tenant-1',
    name: 'Tenant',
    plan: 'growth',
    status: 'active',
    subscription_status: 'active',
    selected_channels: ['livechat'],
    settings: {},
    active_users_count: 1,
  });

  const decision = billing.evaluateAccess(summary, 'integrations', {
    query: { channel: 'messenger' },
  });

  assert.equal(summary.selectedChannels.includes('messenger'), false);
  assert.equal(summary.featureAccess.find((entry) => entry.key === 'messenger')?.allowed, true);
  assert.equal(decision.allowed, true);
});

test('disabled channel feature blocks integration even if tenant selected the channel', async () => {
  const billing = loadBillingService({
    plans: [{
      key: 'growth',
      metadata: {
        featureFlags: {
          livechat: true,
          instagram: true,
          messenger: false,
          whatsapp: false,
          channels: ['livechat', 'instagram'],
        },
      },
    }],
  });

  const summary = await billing.buildBillingSummary({
    id: 'tenant-1',
    name: 'Tenant',
    plan: 'growth',
    status: 'active',
    subscription_status: 'active',
    selected_channels: ['livechat', 'messenger'],
    settings: {},
    active_users_count: 1,
  });

  const decision = billing.evaluateAccess(summary, 'integrations', {
    query: { channel: 'messenger' },
  });

  assert.equal(summary.featureAccess.find((entry) => entry.key === 'messenger')?.allowed, false);
  assert.equal(decision.allowed, false);
  assert.equal(decision.blockedBy, 'plan');
});

test('feature access flags gate matching backend feature actions', async () => {
  const billing = loadBillingService({
    plans: [{
      key: 'growth',
      metadata: {
        featureFlags: {
          livechat: true,
          instagram: true,
          messenger: true,
          whatsapp: false,
          aiTriggers: false,
          aiScoringRouting: false,
          aiSuggestions: false,
          exports: false,
          dealPipeline: false,
          serviceDesk: false,
          catalogSync: false,
          customAi: false,
          extraAgents: false,
          channels: ['livechat', 'instagram', 'messenger'],
        },
      },
    }],
  });

  const summary = await billing.buildBillingSummary({
    id: 'tenant-1',
    name: 'Tenant',
    plan: 'growth',
    status: 'active',
    subscription_status: 'active',
    selected_channels: ['livechat', 'messenger'],
    settings: {},
    active_users_count: 1,
  });

  const blockedActions = [
    'ai_triggers',
    'ai_scoring_routing',
    'ai_suggestions',
    'exports',
    'deal_pipeline',
    'service_desk',
    'catalog_sync',
    'custom_ai',
    'team_invite',
  ];

  for (const action of blockedActions) {
    const decision = billing.evaluateAccess(summary, action, {});
    assert.equal(decision.allowed, false, `${action} should be blocked`);
    assert.equal(decision.blockedBy, 'plan');
  }
});

test('classifyOperationalAction maps application routes to plan feature flags', () => {
  const { classifyOperationalAction } = loadBillingService();

  assert.equal(classifyOperationalAction({ originalUrl: '/api/settings/triggers', method: 'PUT' }), 'ai_triggers');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/settings/lead-scoring', method: 'PUT' }), 'ai_scoring_routing');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/settings/ai/simulate', method: 'POST' }), 'ai_suggestions');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/settings/ai/prompts/prompt-1/pin', method: 'POST' }), 'custom_ai');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/settings/ai', method: 'PUT' }), 'ai_config');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/reports', method: 'GET' }), 'exports');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/settings/schedule-report', method: 'PUT' }), 'exports');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/deals', method: 'GET' }), 'deal_pipeline');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/tickets', method: 'GET' }), 'service_desk');
  assert.equal(classifyOperationalAction({ originalUrl: '/v1/catalog/integrations', method: 'GET' }), 'catalog_sync');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/auth/invite', method: 'POST' }), 'team_invite');
  assert.equal(classifyOperationalAction({ originalUrl: '/api/auth/team', method: 'GET' }), 'read');
});
