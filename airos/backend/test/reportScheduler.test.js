'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadScheduler({ tenant, sentEmails = [], savedSettings = [] } = {}) {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === '../db/pool'
      || request === '../db/queries/tenants'
      || request === './emailService'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../db/pool') {
      return {
        queryAdmin: async (sql) => {
          const text = String(sql);
          if (text.includes('FROM conversations') && text.includes('GROUP BY channel')) {
            return { rows: [{ channel: 'whatsapp', conversations: 3 }] };
          }
          if (text.includes('FROM conversations')) {
            return { rows: [{ total_conversations: 5, open_conversations: 2 }] };
          }
          if (text.includes('FROM deals')) {
            return { rows: [{ deals_won: 1, deals_lost: 0, revenue_won: 2500 }] };
          }
          if (text.includes('FROM ai_suggestions')) {
            return { rows: [{ sent: 4, used: 3, edited: 1 }] };
          }
          if (text.includes('FROM report_agent_daily')) {
            return { rows: [{ agent_name: 'Agent One', conversations_handled: 4, deals_closed: 1, revenue_closed: 2500 }] };
          }
          return { rows: [] };
        },
      };
    }

    if (request === '../db/queries/tenants') {
      return {
        getTenantById: async () => tenant,
        updateTenantSettings: async (tenantId, settings) => {
          savedSettings.push({ tenantId, settings });
          return { id: tenantId, settings };
        },
      };
    }

    if (request === './emailService') {
      return {
        sendEmail: async (payload) => {
          sentEmails.push(payload);
          return { ok: true };
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/core/reportScheduler')];
    return require('../src/core/reportScheduler');
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

test('runScheduledReportsForTenant sends a real HTML report and persists status', async () => {
  const sentEmails = [];
  const savedSettings = [];
  const tenant = {
    id: 'tenant-1',
    name: 'Acme',
    email: 'owner@example.com',
    settings: {
      schedReports: [
        { id: 'report-1', name: 'Daily Ops', freq: 'daily', time: '08:00', email: 'ops@example.com', active: true },
      ],
    },
  };
  const scheduler = loadScheduler({ tenant, sentEmails, savedSettings });

  const results = await scheduler.runScheduledReportsForTenant('tenant-1', 'report-1', { force: true });

  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'sent');
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'ops@example.com');
  assert.match(sentEmails[0].subject, /Daily Ops/);
  assert.match(sentEmails[0].html, /Conversations/);
  assert.match(sentEmails[0].html, /Revenue Won/);
  assert.equal(savedSettings.length, 1);
  assert.equal(savedSettings[0].settings.schedReports[0].lastStatus, 'sent');
});

test('forced run sends inactive schedule from Send now action', async () => {
  const sentEmails = [];
  const tenant = {
    id: 'tenant-1',
    name: 'Acme',
    email: 'owner@example.com',
    settings: {
      schedReports: [
        { id: 'report-1', name: 'Paused Ops', freq: 'daily', time: '08:00', email: '', active: false },
      ],
    },
  };
  const scheduler = loadScheduler({ tenant, sentEmails });

  const results = await scheduler.runScheduledReportsForTenant('tenant-1', 'report-1', { force: true });

  assert.equal(results.length, 1);
  assert.equal(results[0].status, 'sent');
  assert.equal(sentEmails[0].to, 'owner@example.com');
});
