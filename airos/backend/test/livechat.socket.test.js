'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';

function loadSocketModule() {
  const originalResolveFilename = Module._resolveFilename;
  const originalLoad = Module._load;

  class FakeServer {
    constructor() {
      this.useHandler = null;
      this.connectionHandler = null;
      this.sockets = new Set();
    }

    use(handler) {
      this.useHandler = handler;
    }

    on(event, handler) {
      if (event === 'connection') {
        this.connectionHandler = handler;
      }
    }

    to(room) {
      return {
        emit: (event, data) => {
          for (const socket of this.sockets) {
            if (socket.rooms.has(room)) {
              socket.received.push({ event, data, room });
            }
          }
        },
      };
    }
  }

  Module._resolveFilename = function(request, parent, isMain, options) {
    if (request === 'socket.io' || request === 'jsonwebtoken' || request === '../../db/redis' || request === '../../db/pool' || request === '../../core/logger') {
      return request;
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._load = function(request, parent, isMain) {
    if (request === 'socket.io') {
      return { Server: FakeServer };
    }

    if (request === 'jsonwebtoken') {
      return { verify: () => ({}) };
    }

    if (request === '../../db/redis') {
      return { getRedisClient: () => null };
    }

    if (request === '../../db/pool') {
      return {
        queryAdmin: async () => ({ rows: [{ id: TENANT_A }, { id: TENANT_B }] }),
      };
    }

    if (request === '../../core/logger') {
      return {
        logger: {
          info() {},
          warn() {},
          error() {},
          debug() {},
        },
      };
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve('../src/channels/livechat/socket')];
    return require('../src/channels/livechat/socket');
  } finally {
    Module._resolveFilename = originalResolveFilename;
    Module._load = originalLoad;
  }
}

function createSocket(server, tenantId) {
  const socket = {
    id: `socket-${tenantId.slice(0, 8)}`,
    handshake: { query: { tenantId } },
    data: {},
    rooms: new Set(),
    received: [],
    join(room) {
      this.rooms.add(room);
    },
    on() {},
  };

  server.sockets.add(socket);
  return socket;
}

async function connect(server, socket) {
  await new Promise((resolve, reject) => {
    server.useHandler(socket, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  server.connectionHandler(socket);
}

test('CORS rejects arbitrary pages.dev preview origins', async () => {
  const { isAllowedOrigin, createCorsOriginChecker } = loadSocketModule();

  assert.equal(isAllowedOrigin('https://chatorai.com'), true);
  assert.equal(isAllowedOrigin('https://tenant-preview.pages.dev'), false);

  await new Promise((resolve) => {
    createCorsOriginChecker()('https://tenant-preview.pages.dev', (err, allowed) => {
      assert.ok(err);
      assert.equal(allowed, undefined);
      resolve();
    });
  });
});

test('tenant sockets stay scoped to their own room', async () => {
  const { initSocketServer, emitToTenantConversations, conversationRoom } = loadSocketModule();
  const server = initSocketServer({});

  const tenantASocket = createSocket(server, TENANT_A);
  const tenantBSocket = createSocket(server, TENANT_B);

  await connect(server, tenantASocket);
  await connect(server, tenantBSocket);

  assert.equal(tenantASocket.rooms.has(conversationRoom(TENANT_A)), true);
  assert.equal(tenantASocket.rooms.has(conversationRoom(TENANT_B)), false);
  assert.equal(tenantBSocket.rooms.has(conversationRoom(TENANT_B)), true);
  assert.equal(tenantBSocket.rooms.has(conversationRoom(TENANT_A)), false);

  emitToTenantConversations(TENANT_A, 'message:new', { tenantId: TENANT_A });
  emitToTenantConversations(TENANT_B, 'message:new', { tenantId: TENANT_B });

  assert.deepEqual(tenantASocket.received, [
    {
      event: 'message:new',
      data: { tenantId: TENANT_A },
      room: conversationRoom(TENANT_A),
    },
  ]);
  assert.deepEqual(tenantBSocket.received, [
    {
      event: 'message:new',
      data: { tenantId: TENANT_B },
      room: conversationRoom(TENANT_B),
    },
  ]);
});
