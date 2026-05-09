'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadMessageRouter(users, options = {}) {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;
  const addedJobs = options.addedJobs || [];
  const aiModeUpdates = options.aiModeUpdates || [];
  const savedMessages = options.savedMessages || [];
  const livechatSends = options.livechatSends || [];
  const analysisRequests = options.analysisRequests || [];

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === './tenantManager'
      || request === '../db/queries/conversations'
      || request === '../db/queries/messages'
      || request === '../db/queries/deals'
      || request === '../db/pool'
      || request === '../channels/whatsapp/normalizer'
      || request === '../channels/instagram/normalizer'
      || request === '../channels/messenger/normalizer'
      || request === '../channels/livechat/normalizer'
      || request === '../channels/livechat/socket'
      || request === '../channels/livechat/sender'
      || request === './routingRulesEngine'
      || request === './tenantSettings'
      || request === '../workers/messageProcessor'
      || request === '../ai/intentDetector'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === './tenantManager') {
      return {};
    }
    if (request === '../db/queries/conversations') {
      return {
        updateConversationAiMode: async (tenantId, conversationId, aiMode) => {
          aiModeUpdates.push({ tenantId, conversationId, aiMode });
          return { id: conversationId, tenant_id: tenantId, ai_mode: aiMode };
        },
      };
    }
    if (request === '../db/queries/messages') {
      return {
        saveMessage: async (tenantId, conversationId, message) => {
          const saved = { id: `saved-${savedMessages.length + 1}`, tenant_id: tenantId, conversation_id: conversationId, ...message };
          savedMessages.push(saved);
          return saved;
        },
      };
    }
    if (request === '../db/queries/deals') {
      return {};
    }
    if (request === '../db/pool') {
      return {
        queryAdmin: async (sql) => {
          if (String(sql).includes('FROM conversations')) {
            return { rows: options.fallbackConversation ? [options.fallbackConversation] : [] };
          }
          if (String(sql).includes('FROM messages')) {
            return { rows: options.outboundAfterMessage ? [{ id: 'outbound-1' }] : [] };
          }
          if (String(sql).includes('FROM users')) {
            return { rows: users };
          }
          return { rows: [] };
        },
      };
    }
    if (
      request === '../channels/whatsapp/normalizer'
      || request === '../channels/instagram/normalizer'
      || request === '../channels/messenger/normalizer'
      || request === '../channels/livechat/normalizer'
    ) {
      return {};
    }
    if (request === '../channels/livechat/socket' || String(request).includes('/channels/livechat/socket')) {
      return { getIO: () => ({ to: () => ({ emit: () => {} }) }) };
    }
    if (request === '../channels/livechat/sender' || String(request).includes('/channels/livechat/sender')) {
      return {
        sendText: (sessionId, text, sentBy) => {
          livechatSends.push({ sessionId, text, sentBy });
        },
      };
    }
    if (request === './routingRulesEngine') {
      return {
        resolveRoutingAssigneeId: async () => ({ matched: false }),
      };
    }
    if (request === './tenantSettings') {
      return {
        normalizeTenantSettings: (value) => value || {},
        getChannelGreetingText: () => ({ text: '', withinHours: true, businessHoursMode: 'global' }),
        containsProfanity: () => false,
        isBlockedSpammer: () => false,
        isWithinWorkingHours: () => true,
      };
    }
    if (request === '../workers/messageProcessor' || String(request).includes('/workers/messageProcessor')) {
      return {
        addToQueue: async (payload) => {
          addedJobs.push(payload);
        },
      };
    }
    if (request === '../ai/intentDetector' || String(request).includes('/ai/intentDetector')) {
      return {
        detectIntent: async (payload) => {
          analysisRequests.push(payload);
          return options.intentAnalysis || {
            intent: 'other',
            lead_score: 0,
            language: 'english',
          };
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/core/messageRouter')];
    const router = require('../src/core/messageRouter');
    if (options.keepHooks) {
      router.restoreMocks = () => {
        Module._resolveFilename = originalResolveFilename;
        Module._load = originalLoad;
      };
    }
    return router;
  } finally {
    if (!options.keepHooks) {
      Module._resolveFilename = originalResolveFilename;
      Module._load = originalLoad;
    }
  }
}

test('determineAssignee uses the channel department override when no operator override is set', async () => {
  const users = [
    {
      id: 'agent-sales',
      name: 'Sales Agent',
      role: 'agent',
      department: 'dept-sales',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'agent-support',
      name: 'Support Agent',
      role: 'agent',
      department: 'dept-support',
      created_at: '2026-01-02T00:00:00.000Z',
    },
  ];
  const { determineAssignee } = loadMessageRouter(users);

  const assigneeId = await determineAssignee('tenant-1', {
    global: { workingHours: false, autoAssign: true },
    visitorRouting: { mode: 'round_robin' },
    channels: {
      instagram: {
        departmentId: 'dept-support',
      },
    },
    depts: [
      { id: 'dept-support', name: 'Support' },
    ],
    routing: [],
  }, {
    conversation: { id: 'conv-1', channel: 'instagram' },
    customer: { id: 'cust-1' },
    message: { content: 'hello' },
  });

  assert.equal(assigneeId, 'agent-support');
});

test('determineAssignee applies structured chat routing rules to a direct agent target', async () => {
  const users = [
    {
      id: 'agent-sales',
      name: 'Sales Agent',
      role: 'agent',
      department: 'Sales',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ];
  const { determineAssignee } = loadMessageRouter(users);

  const assigneeId = await determineAssignee('tenant-1', {
    global: { workingHours: false, autoAssign: true },
    routing: [
      {
        id: 'rule-1',
        name: 'WhatsApp to Sales',
        conditionField: 'channel',
        conditionOp: '=',
        conditionValue: 'whatsapp',
        assignTo: 'agent:agent-sales',
        active: true,
      },
    ],
    visitorRouting: { mode: 'round_robin' },
  }, {
    conversation: { id: 'conv-1', channel: 'whatsapp' },
    customer: { id: 'cust-1' },
    message: { content: 'hello' },
  });

  assert.equal(assigneeId, 'agent-sales');
});

test('determineAssignee applies structured score chat routing and enables AI mode for AI Bot target', async () => {
  const aiModeUpdates = [];
  const users = [
    {
      id: 'agent-sales',
      name: 'Sales Agent',
      role: 'agent',
      department: 'Sales',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ];
  const { determineAssignee } = loadMessageRouter(users, { aiModeUpdates });

  const assigneeId = await determineAssignee('tenant-1', {
    global: { workingHours: false, autoAssign: true },
    routing: [
      {
        id: 'rule-1',
        name: 'High score to AI',
        conditionField: 'score',
        conditionOp: '>=',
        conditionValue: '70',
        assignTo: 'ai_bot',
        active: true,
      },
    ],
    visitorRouting: { mode: 'round_robin' },
  }, {
    conversation: { id: 'conv-ai', channel: 'livechat' },
    customer: { id: 'cust-1' },
    message: { content: 'pricing' },
    deal: { lead_score: 91 },
  });

  assert.equal(assigneeId, null);
  assert.deepEqual(aiModeUpdates, [{ tenantId: 'tenant-1', conversationId: 'conv-ai', aiMode: 'auto' }]);
});

test('determineAssignee generates analysis when a chat routing intent condition needs it', async () => {
  const analysisRequests = [];
  const router = loadMessageRouter([
    {
      id: 'agent-sales',
      name: 'Sales Agent',
      role: 'agent',
      department: 'Sales',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ], {
    keepHooks: true,
    analysisRequests,
    intentAnalysis: { intent: 'ready_to_buy', lead_score: 88, language: 'english' },
  });

  try {
    const assigneeId = await router.determineAssignee('tenant-1', {
      global: { workingHours: false, autoAssign: true },
      routing: [
        {
          id: 'rule-1',
          name: 'Buyer intent to sales',
          conditionField: 'intent',
          conditionOp: '=',
          conditionValue: 'ready_to_buy',
          assignTo: 'agent:agent-sales',
          active: true,
        },
      ],
      visitorRouting: { mode: 'round_robin' },
    }, {
      conversation: { id: 'conv-intent', channel: 'livechat' },
      customer: { id: 'cust-1' },
      message: { content: 'I want to buy today' },
    });

    assert.equal(assigneeId, 'agent-sales');
    assert.equal(analysisRequests.length, 1);
    assert.equal(analysisRequests[0].message, 'I want to buy today');
  } finally {
    router.restoreMocks();
  }
});

test('visitor routing AI Bot fallback enables AI mode and requeues saved inbound message', async () => {
  const addedJobs = [];
  const aiModeUpdates = [];
  const router = loadMessageRouter([], {
    keepHooks: true,
    addedJobs,
    aiModeUpdates,
    fallbackConversation: {
      id: 'conv-1',
      tenant_id: 'tenant-1',
      status: 'open',
      assigned_to: null,
      ai_mode: 'manual',
      channel: 'livechat',
    },
  });

  try {
    const result = await router.applyVisitorRoutingFallback({
      tenantId: 'tenant-1',
      settings: { visitorRouting: { fallback: 'AI Bot' } },
      conversationId: 'conv-1',
      customer: { id: 'cust-1', channel_customer_id: 'session-1' },
      savedMessageId: 'msg-1',
      credentials: { token: 'x' },
    });

    assert.equal(result.applied, true);
    assert.equal(result.fallback, 'ai_bot');
    assert.deepEqual(aiModeUpdates, [{ tenantId: 'tenant-1', conversationId: 'conv-1', aiMode: 'auto' }]);
    assert.deepEqual(addedJobs, [{
      already_saved: true,
      tenant_id: 'tenant-1',
      conversation_id: 'conv-1',
      customer_id: 'cust-1',
      message_id: 'msg-1',
      credentials: { token: 'x' },
    }]);
  } finally {
    router.restoreMocks();
  }
});

test('visitor routing offline fallback sends and persists the offline message', async () => {
  const savedMessages = [];
  const livechatSends = [];
  const router = loadMessageRouter([], {
    keepHooks: true,
    savedMessages,
    livechatSends,
    fallbackConversation: {
      id: 'conv-2',
      tenant_id: 'tenant-1',
      status: 'open',
      assigned_to: null,
      ai_mode: 'manual',
      channel: 'livechat',
    },
  });

  try {
    const result = await router.applyVisitorRoutingFallback({
      tenantId: 'tenant-1',
      settings: {
        visitorRouting: { fallback: 'offline' },
        channels: { livechat: { awayMessage: 'We are offline now' } },
      },
      conversationId: 'conv-2',
      customer: { id: 'cust-2', channel_customer_id: 'session-2' },
      savedMessageId: 'msg-2',
      credentials: {},
    });

    assert.equal(result.applied, true);
    assert.equal(result.fallback, 'offline');
    assert.deepEqual(livechatSends, [{ sessionId: 'session-2', text: 'We are offline now', sentBy: 'ai' }]);
    assert.equal(savedMessages[0].content, 'We are offline now');
    assert.equal(savedMessages[0].metadata.visitor_routing_fallback, true);
    assert.equal(savedMessages[0].metadata.send_status, 'sent');
  } finally {
    router.restoreMocks();
  }
});
