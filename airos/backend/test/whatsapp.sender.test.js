'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('node:events');
const Module = require('node:module');

function loadSenderWithRequestStub() {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;
  const calls = [];

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'https') return request;
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === 'https') {
      return {
        request: (options, callback) => {
          const req = new EventEmitter();
          let body = '';
          req.write = (chunk) => { body += chunk; };
          req.end = () => {
            calls.push({ options, body: JSON.parse(body) });
            const res = new EventEmitter();
            res.statusCode = 200;
            callback(res);
            res.emit('data', JSON.stringify({ success: true }));
            res.emit('end');
          };
          return req;
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/channels/whatsapp/sender')];
    return {
      sender: require('../src/channels/whatsapp/sender'),
      calls,
    };
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

test('markRead can include a WhatsApp typing indicator payload', async () => {
  const { sender, calls } = loadSenderWithRequestStub();

  await sender.markRead('phone-number-id', 'token-123', 'wamid.123', { typingIndicator: true });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.messaging_product, 'whatsapp');
  assert.equal(calls[0].body.status, 'read');
  assert.equal(calls[0].body.message_id, 'wamid.123');
  assert.deepEqual(calls[0].body.typing_indicator, { type: 'text' });
});

test('markRead omits typing indicator unless explicitly requested', async () => {
  const { sender, calls } = loadSenderWithRequestStub();

  await sender.markRead('phone-number-id', 'token-123', 'wamid.456');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.typing_indicator, undefined);
});
