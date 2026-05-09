'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadReplyGenerator() {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;
  let capturedPrompt = '';

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === '../db/pool'
      || request === './promptRegistry'
      || request === './completionClient'
      || request === './safetyGuard'
      || request === './businessAnalyzer'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../db/pool') {
      return {
        queryAdmin: async () => ({
          rows: [{
            id: 'suggestion-1',
            suggested_reply: 'stub reply',
            confidence: '0.92',
          }],
        }),
      };
    }

    if (request === './promptRegistry') {
      return {
        resolvePromptContent: async () => 'Base instruction',
      };
    }

    if (request === './completionClient') {
      return {
        completeText: async ({ prompt }) => {
          capturedPrompt = prompt;
          return 'stub reply';
        },
      };
    }

    if (request === './safetyGuard') {
      return {
        assessTextSafety: () => ({ allowed: true }),
        buildSafeRefusal: () => 'safe refusal',
      };
    }

    if (request === './businessAnalyzer') {
      return {
        getTenantBusinessContext: async () => ({
          knowledgeBase: {},
          profile: {},
        }),
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/ai/replyGenerator')];
    return {
      generateReply: require('../src/ai/replyGenerator').generateReply,
      getCapturedPrompt: () => capturedPrompt,
    };
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

test('generateReply applies channel brand override and human takeover policy to the prompt', async () => {
  const { generateReply, getCapturedPrompt } = loadReplyGenerator();

  await generateReply({
    tenantId: 'tenant-1',
    messageId: 'message-1',
    conversationId: 'conversation-1',
    channel: 'instagram',
    tenant: {
      name: 'Acme',
      settings: {
        company: { name: 'Acme Store' },
        brands: [
          { id: 'brand-default', name: 'Default Brand', tone: 'formal', lang: 'en', active: true },
          { id: 'brand-instagram', name: 'Instagram Brand', tone: 'playful', lang: 'fr' },
        ],
        channels: {
          instagram: {
            brandId: 'brand-instagram',
            humanTakeoverPolicy: 'Escalate VIP shoppers after one unresolved turn.',
          },
        },
        aiConfig: {
          identity: {},
        },
      },
    },
    customer: { id: 'customer-1' },
    history: [],
    lastMessage: 'Do you ship internationally?',
    intent: 'shipping_question',
    leadScore: 82,
    products: [],
    offers: [],
    shipping: [],
    detectedLanguage: 'english',
  });

  const prompt = getCapturedPrompt();
  assert.match(prompt, /close the deal in a playful tone/i);
  assert.match(prompt, /Channel human takeover policy \(instagram\): Escalate VIP shoppers after one unresolved turn\./);
});

test('generateReply removes shipping context when policy knowledge source is disabled', async () => {
  const { generateReply, getCapturedPrompt } = loadReplyGenerator();

  await generateReply({
    tenantId: 'tenant-1',
    messageId: 'message-1',
    conversationId: 'conversation-1',
    channel: 'whatsapp',
    tenant: {
      name: 'Acme',
      settings: {
        aiConfig: {
          identity: {},
          knowledgeSources: { policies: false },
        },
      },
    },
    customer: { id: 'customer-1' },
    history: [],
    lastMessage: 'How much is shipping?',
    intent: 'shipping_question',
    leadScore: 70,
    products: [],
    offers: [],
    shipping: [{ name: 'Cairo', rates: [{ cost: 45 }], currency: 'EGP' }],
    detectedLanguage: 'english',
  });

  const prompt = getCapturedPrompt();
  assert.match(prompt, /Shipping options:\n\(shipping policies disabled\)/);
  assert.doesNotMatch(prompt, /Cairo: from 45/);
});
