'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { scoreLeadFromAI } = require('../src/ai/leadScorer');

test('custom lead scoring rules adjust score and support negative weights', () => {
  const result = scoreLeadFromAI(50, {}, 'price_objection', {
    settings: {
      compScore: { enabled: false },
      leadRules: [
        { signal: 'price objection', weight: -20, active: true },
        { signal: 'buy/order keywords', weight: 10, active: false },
      ],
    },
    message: 'price is high',
    historyLength: 1,
  });

  assert.equal(result.final_score, 30);
  assert.equal(result.probability, 15);
});

test('replies within 5 minutes uses message timestamps, not any history', () => {
  const result = scoreLeadFromAI(40, {}, 'inquiry', {
    settings: {
      compScore: { enabled: false },
      leadRules: [
        { signal: 'replies within 5 minutes', weight: 15, active: true },
      ],
    },
    message: 'yes',
    historyLength: 2,
    currentMessageAt: '2026-05-08T12:04:00.000Z',
    history: [
      { direction: 'outbound', sent_by: 'agent', created_at: '2026-05-08T12:00:00.000Z', content: 'Can I help?' },
      { direction: 'inbound', sent_by: 'customer', created_at: '2026-05-08T12:04:00.000Z', content: 'yes' },
    ],
  });

  assert.equal(result.final_score, 55);
});

test('replies within 5 minutes does not match stale history', () => {
  const result = scoreLeadFromAI(40, {}, 'inquiry', {
    settings: {
      compScore: { enabled: false },
      leadRules: [
        { signal: 'replies within 5 minutes', weight: 15, active: true },
      ],
    },
    message: 'yes',
    historyLength: 2,
    currentMessageAt: '2026-05-08T12:10:01.000Z',
    history: [
      { direction: 'outbound', sent_by: 'agent', created_at: '2026-05-08T12:00:00.000Z', content: 'Can I help?' },
      { direction: 'inbound', sent_by: 'customer', created_at: '2026-05-08T12:10:01.000Z', content: 'yes' },
    ],
  });

  assert.equal(result.final_score, 40);
});

test('company scoring thresholds boost lead score from customer purchase history', () => {
  const result = scoreLeadFromAI(50, {
    total_spent: 1500,
    purchase_history: [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }],
  }, 'inquiry', {
    settings: {
      leadRules: [{ signal: 'shares phone number', weight: 0, active: false }],
      compScore: {
        enabled: true,
        minRevenue: 1000,
        minOrders: 3,
        vipThreshold: 5000,
      },
    },
    message: 'hello',
    historyLength: 0,
  });

  assert.equal(result.final_score, 60);
});

test('company scoring can be disabled', () => {
  const result = scoreLeadFromAI(50, {
    total_spent: 6000,
    purchase_history: [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }],
  }, 'inquiry', {
    settings: {
      leadRules: [{ signal: 'shares phone number', weight: 0, active: false }],
      compScore: {
        enabled: false,
        minRevenue: 1000,
        minOrders: 3,
        vipThreshold: 5000,
      },
    },
    message: 'hello',
    historyLength: 0,
  });

  assert.equal(result.final_score, 50);
});

test('company scoring respects zero thresholds instead of replacing them with defaults', () => {
  const result = scoreLeadFromAI(10, {
    total_spent: 0,
    purchase_history: [],
  }, 'inquiry', {
    settings: {
      leadRules: [{ signal: 'shares phone number', weight: 0, active: false }],
      compScore: {
        enabled: true,
        minRevenue: 0,
        minOrders: 0,
        vipThreshold: 0,
      },
    },
    message: 'hello',
    historyLength: 0,
  });

  assert.equal(result.final_score, 25);
});
