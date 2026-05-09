'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const Module = require('node:module');

function loadImportProcessor({ savedMessages = [], updatedTickets = [] } = {}) {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (
      request === '../db/pool'
      || request === '../db/queries/deals'
      || request === '../db/queries/tickets'
      || request === '../db/queries/conversations'
      || request === '../db/queries/messages'
    ) {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === '../db/pool') {
      return {
        queryAdmin: async (sql, params = []) => {
          const text = String(sql);
          if (text.includes('INSERT INTO customers')) return { rows: [{ id: 'customer-1' }] };
          if (text.includes('UPDATE tickets')) {
            updatedTickets.push({ sql: text, params });
            return { rows: [] };
          }
          return { rows: [] };
        },
      };
    }
    if (request === '../db/queries/deals') {
      return { createDeal: async () => ({ id: 'deal-1' }) };
    }
    if (request === '../db/queries/tickets') {
      return { createTicket: async () => ({ id: 'ticket-1' }) };
    }
    if (request === '../db/queries/conversations') {
      return { getOrCreateConversation: async () => ({ id: 'conversation-1' }) };
    }
    if (request === '../db/queries/messages') {
      return {
        saveMessage: async (tenantId, conversationId, payload) => {
          savedMessages.push({ tenantId, conversationId, ...payload });
          return { id: 'message-1', created_at: payload.created_at || new Date() };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/core/importProcessor')];
    return require('../src/core/importProcessor');
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

test('conversation import writes messages through canonical persistence with imported timestamp', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'airos-import-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, 'conversations.csv');
  await fs.writeFile(filePath, [
    'customer_name,customer_phone,channel,message,direction,sent_at',
    'Ada,+15550100,whatsapp,hello,inbound,2026-01-02T03:04:05.000Z',
  ].join('\n'));

  const savedMessages = [];
  const { processImport } = loadImportProcessor({ savedMessages });

  const result = await processImport({ tenantId: 'tenant-1', filePath, importType: 'conversations' });

  assert.equal(result.processed, 1);
  assert.equal(result.inserted, 1);
  assert.equal(savedMessages.length, 1);
  assert.equal(savedMessages[0].tenantId, 'tenant-1');
  assert.equal(savedMessages[0].conversationId, 'conversation-1');
  assert.equal(savedMessages[0].sent_by, 'customer');
  assert.equal(savedMessages[0].metadata.imported, true);
  assert.equal(new Date(savedMessages[0].created_at).toISOString(), '2026-01-02T03:04:05.000Z');
});

test('import processor rejects unsupported file extensions before parsing', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'airos-import-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, 'payload.txt');
  await fs.writeFile(filePath, 'not an import file');

  const { processImport } = loadImportProcessor();

  await assert.rejects(
    () => processImport({ tenantId: 'tenant-1', filePath, importType: 'tickets' }),
    /Import file must be CSV, XLSX, or XLS/,
  );
});

test('ticket import preserves created_at when provided', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'airos-import-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const filePath = path.join(dir, 'tickets.csv');
  await fs.writeFile(filePath, [
    'customer_name,subject,description,status,priority,created_at',
    'Grace,Login problem,Cannot login,open,high,2026-02-03T04:05:06.000Z',
  ].join('\n'));

  const updatedTickets = [];
  const { processImport } = loadImportProcessor({ updatedTickets });

  const result = await processImport({ tenantId: 'tenant-1', filePath, importType: 'tickets' });

  assert.equal(result.inserted, 1);
  assert.equal(updatedTickets.length, 1);
  assert.equal(updatedTickets[0].params[0], 'ticket-1');
  assert.equal(updatedTickets[0].params[1], 'tenant-1');
  assert.equal(new Date(updatedTickets[0].params[2]).toISOString(), '2026-02-03T04:05:06.000Z');
});
