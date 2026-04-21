'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const conversationsModulePath = require.resolve('../src/db/queries/conversations');

function loadConversationsModule() {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../pool') {
      return { queryAdmin: async () => ({ rows: [] }) };
    }

    if (request === './messages') {
      return {
        decryptMessageContent: async (tenantId, value) => value,
        buildMessageSearchTokens: (tenantId, value) => [`token:${tenantId}:${String(value).toLowerCase()}`],
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[conversationsModulePath];

  try {
    return require(conversationsModulePath);
  } finally {
    Module._load = originalLoad;
  }
}

test.afterEach(() => {
  delete require.cache[conversationsModulePath];
});

test('conversation search uses message search tokens with plaintext legacy fallback', async () => {
  const { listConversations } = loadConversationsModule();
  let captured;
  const client = {
    async query(sql, params) {
      captured = { sql: String(sql), params };
      return { rows: [] };
    },
  };

  await listConversations('tenant-a', { search: 'Refund' }, client);

  assert.match(captured.sql, /m\.search_tokens \?\|/);
  assert.match(captured.sql, /m\.content, ''\) NOT LIKE 'enc:v1:%'/);
  assert.deepEqual(captured.params.slice(0, 3), [
    'tenant-a',
    '%refund%',
    ['token:tenant-a:refund'],
  ]);
});
