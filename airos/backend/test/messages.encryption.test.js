'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const messagesModulePath = require.resolve('../src/db/queries/messages');

function loadMessagesModule() {
  const originalLoad = Module._load;

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../pool') {
      return { queryAdmin: async () => ({ rows: [] }) };
    }

    if (request === '../../../vendor/db/src/encryption') {
      return {
        encrypt: async (tenantId, value) => (value == null ? value : `enc:test:${tenantId}:${value}`),
        decrypt: async (tenantId, value) => String(value).replace(`enc:test:${tenantId}:`, ''),
        isEncrypted: (value) => typeof value === 'string' && value.startsWith('enc:test:'),
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  delete require.cache[messagesModulePath];

  try {
    return require(messagesModulePath);
  } finally {
    Module._load = originalLoad;
  }
}

test.afterEach(() => {
  delete require.cache[messagesModulePath];
});

test('saveMessage encrypts stored content and returns plaintext-shaped row', async () => {
  const { saveMessage } = loadMessagesModule();
  const queries = [];
  const client = {
    async query(sql, params) {
      queries.push({ sql, params });
      if (String(sql).includes('INSERT INTO messages')) {
        return {
          rows: [{
            id: 'msg-1',
            tenant_id: params[0],
            conversation_id: params[1],
            content: params[4],
          }],
        };
      }
      return { rows: [] };
    },
  };

  const row = await saveMessage('tenant-a', 'conv-1', {
    direction: 'inbound',
    content: 'hello customer',
    sent_by: 'customer',
  }, client);

  const insert = queries.find((entry) => String(entry.sql).includes('INSERT INTO messages'));
  assert.equal(insert.params[4], 'enc:test:tenant-a:hello customer');
  assert.deepEqual(JSON.parse(insert.params[8]), [
    '838d69182fe263aaa73ae26c80fad0f570792a964e4b958989e1cb6b069a29fb',
    '041e9693d25cf4e1bf0c96a9e5cb73773ec8f71fe69329cdc4efe5ccea481056',
  ]);
  assert.equal(row.content, 'hello customer');
});

test('getMessages decrypts encrypted rows and preserves existing plaintext rows', async () => {
  const { getMessages } = loadMessagesModule();
  const client = {
    async query() {
      return {
        rows: [
          { id: 'encrypted', content: 'enc:test:tenant-a:secret reply' },
          { id: 'plaintext', content: 'legacy plaintext' },
        ],
      };
    },
  };

  const rows = await getMessages('tenant-a', 'conv-1', {}, client);

  assert.deepEqual(rows.map((row) => [row.id, row.content]), [
    ['plaintext', 'legacy plaintext'],
    ['encrypted', 'secret reply'],
  ]);
});

test('buildMessageSearchTokens returns deterministic tenant-scoped hashes', () => {
  const { buildMessageSearchTokens } = loadMessagesModule();

  assert.deepEqual(buildMessageSearchTokens('tenant-a', 'Refund refund Order #123'), [
    'cf1e1c19dd0ceb3e2fa5a7310f637b3f5806832bbd8ef479e704d828de5385b7',
    '9052f4e6a239c6f75ce05197b2931963ec95bababfeb642e4bf88fdfd6eef6fe',
    'fe5c6eb25a46bf0a85fd0ed7a2bb780f2fc3a80507a360d4363877f97b96a08d',
  ]);
  assert.notDeepEqual(
    buildMessageSearchTokens('tenant-a', 'refund'),
    buildMessageSearchTokens('tenant-b', 'refund')
  );
});
