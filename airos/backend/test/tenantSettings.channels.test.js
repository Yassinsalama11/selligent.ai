'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { buildCompanyContext, getChannelGreetingText } = require('../src/core/tenantSettings');

test('buildCompanyContext uses the channel brand override when configured', () => {
  const tenant = {
    settings: {
      company: { name: 'Acme Store' },
      brands: [
        { id: 'brand-default', name: 'Default', tone: 'formal', lang: 'en', active: true },
        { id: 'brand-instagram', name: 'Instagram Brand', tone: 'playful', lang: 'fr' },
      ],
      channels: {
        instagram: { brandId: 'brand-instagram' },
      },
    },
  };

  const context = buildCompanyContext(tenant, { channel: 'instagram' });
  assert.equal(context.brandTone, 'playful');
  assert.equal(context.brandLanguage, 'fr');
});

test('getChannelGreetingText treats off mode as always available', () => {
  const settings = {
    global: {
      workingHours: true,
      workStart: '09:00',
      workEnd: '18:00',
      workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    },
    channels: {
      instagram: {
        businessHoursMode: 'off',
        welcomeMessage: 'Welcome aboard',
        awayMessage: 'We are offline',
      },
    },
  };

  const result = getChannelGreetingText(settings, 'instagram', new Date('2026-05-09T23:00:00Z'));
  assert.equal(result.withinHours, true);
  assert.equal(result.text, 'Welcome aboard');
});
