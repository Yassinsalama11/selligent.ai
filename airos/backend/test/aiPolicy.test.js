'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluateForbiddenActions,
  matchesSilentModeConditions,
  countConsecutiveAiAutoReplies,
  countConsecutiveAiFailures,
  evaluateHandoffRules,
  getAiTimeBehavior,
} = require('../src/ai/policyEngine');

test('evaluateForbiddenActions matches configured tenant policy keywords', () => {
  const match = evaluateForbiddenActions([
    { id: 'fa_1', pattern: 'competitor', enforcement: 'block' },
  ], 'Can you compare this with a competitor?');

  assert.equal(match.matched, true);
  assert.equal(match.enforcement, 'block');
});

test('matchesSilentModeConditions supports channel, tag, and intent conditions', () => {
  const match = matchesSilentModeConditions('when tag=vip, channel=instagram', {
    channel: 'whatsapp',
    customer: { tags: ['VIP'] },
    intent: 'pricing',
  });

  assert.deepEqual(match, { field: 'tag', expected: 'vip' });
});

test('counts consecutive AI auto-replies and failed sends from message history', () => {
  const history = [
    { direction: 'inbound', sent_by: 'customer' },
    { direction: 'outbound', sent_by: 'ai', metadata: { ai_auto_reply: true } },
    { direction: 'inbound', sent_by: 'customer' },
    { direction: 'outbound', sent_by: 'ai', metadata: { ai_auto_reply: true, send_error: 'timeout' } },
    { direction: 'inbound', sent_by: 'customer' },
  ];

  assert.equal(countConsecutiveAiAutoReplies(history), 2);
  assert.equal(countConsecutiveAiFailures(history), 1);
});

test('evaluateHandoffRules matches low score and human-request messages', () => {
  assert.equal(Boolean(evaluateHandoffRules([
    { condition: 'score_below', threshold: 40, channel: '__all__' },
  ], { leadScore: 25, channel: 'livechat' })), true);

  assert.equal(Boolean(evaluateHandoffRules([
    { condition: 'customer_requests_human', channel: '__all__' },
  ], { text: 'Please connect me to a human agent', channel: 'whatsapp' })), true);
});

test('getAiTimeBehavior selects business-hours and after-hours modes', () => {
  const responseControl = {
    businessHoursAiBehavior: 'auto',
    afterHoursAiBehavior: 'suggest',
  };

  assert.equal(getAiTimeBehavior(responseControl, {}, new Date(), () => true), 'auto');
  assert.equal(getAiTimeBehavior(responseControl, {}, new Date(), () => false), 'suggest');
});
