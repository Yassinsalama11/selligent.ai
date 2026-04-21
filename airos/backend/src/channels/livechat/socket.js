const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../../db/redis');
const { queryAdmin } = require('../../db/pool');
const { logger } = require('../../core/logger');

let io;
let activeSockets = 0;
const tenantSocketCounts = new Map();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const DEFAULT_ALLOWED_ORIGINS = ['https://chatorai.com', 'http://localhost:3000'];

function loadRedisAdapter() {
  try {
    return require('@socket.io/redis-adapter').createAdapter;
  } catch {
    logger.warn('Socket.IO Redis adapter package not installed; running without horizontal adapter');
    return null;
  }
}

function tenantRoom(tenantId) {
  return `tenant:${tenantId}`;
}

function conversationRoom(tenantId) {
  return `tenant:${tenantId}:conversations`;
}

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;

  return [...new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  )];
}

function isAllowedOrigin(origin, allowedOrigins = getAllowedOrigins()) {
  if (!origin) return true;
  if (origin === 'null') return false;

  let parsed;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  return allowedOrigins.includes(parsed.origin);
}

function createCorsOriginChecker() {
  return (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  };
}

function readHandshakeValue(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readHandshakeToken(socket) {
  return readHandshakeValue(socket.handshake.auth?.token) || readHandshakeValue(socket.handshake.query?.token);
}

function readHandshakeTenantId(socket) {
  return readHandshakeValue(socket.handshake.query?.tenantId) || readHandshakeValue(socket.handshake.auth?.tenantId);
}

function readHandshakeSessionId(socket) {
  return readHandshakeValue(socket.handshake.query?.sessionId) || readHandshakeValue(socket.handshake.auth?.sessionId);
}

function normalizeTenantId(tenantId) {
  if (!tenantId || !UUID_RE.test(tenantId)) {
    return null;
  }

  return tenantId;
}

async function validateTenant(tenantId) {
  const result = await queryAdmin(
    'SELECT id FROM tenants WHERE id = $1 AND status IN ($2, $3) LIMIT 1',
    [tenantId, 'active', 'trial']
  );
  return Boolean(result.rows[0]);
}

function initSocketServer(httpServer) {
  const redisClient = getRedisClient();
  const originChecker = createCorsOriginChecker();

  io = new Server(httpServer, {
    cors: {
      origin: originChecker,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    allowRequest: (req, callback) => {
      callback(null, isAllowedOrigin(req.headers.origin));
    },
    transports: ['websocket', 'polling'],
  });

  // Redis adapter for horizontal scaling
  if (redisClient) {
    const createAdapter = loadRedisAdapter();
    if (createAdapter) {
      const pubClient = redisClient.duplicate();
      const subClient = redisClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter configured');
    }
  }

  io.use(async (socket, next) => {
    const normalizedTenantId = normalizeTenantId(readHandshakeTenantId(socket));
    if (!normalizedTenantId) return next(new Error('tenantId is required'));

    try {
      const sessionId = readHandshakeSessionId(socket);
      if (sessionId && !SESSION_ID_RE.test(sessionId)) {
        return next(new Error('invalid sessionId'));
      }

      const token = readHandshakeToken(socket);
      if (token) {
        let decoded;

        try {
          decoded = jwt.verify(token, process.env.JWT_SECRET || 'chatorai-secret');
        } catch {
          return next(new Error('invalid socket token'));
        }

        const tokenTenantId = normalizeTenantId(decoded.tenant_id || decoded.tenantId);
        if (!tokenTenantId || tokenTenantId !== normalizedTenantId) {
          return next(new Error('tenantId does not match authenticated tenant'));
        }

        const userId = decoded.id || decoded.userId || decoded.sub;
        if (!userId) {
          return next(new Error('invalid socket token'));
        }

        socket.data.userId = userId;
        socket.data.userRole = decoded.role || null;
        socket.data.authenticated = true;
      } else {
        socket.data.authenticated = false;
      }

      const tenantValid = await validateTenant(normalizedTenantId);
      if (!tenantValid) return next(new Error('tenant not found or inactive'));

      socket.data.tenantId = normalizedTenantId;
      socket.data.sessionId = sessionId;
      return next();
    } catch (err) {
      return next(err);
    }
  });

  io.on('connection', (socket) => {
    const tenantId = socket.data.tenantId;
    const sessionId = socket.data.sessionId;
    activeSockets += 1;
    tenantSocketCounts.set(tenantId, (tenantSocketCounts.get(tenantId) || 0) + 1);

    // Join tenant-scoped room
    socket.join(tenantRoom(tenantId));
    socket.join(conversationRoom(tenantId));
    if (sessionId) socket.join(`session:${sessionId}`);

    socket.on('customer:message', async (data) => {
      try {
        const { addToQueue } = require('../../workers/messageProcessor');
        await addToQueue({
          channel: 'livechat',
          tenant_id: tenantId,
          session_id: sessionId,
          raw: data,
        });
      } catch (err) {
        logger.error('LiveChat socket message failed', {
          tenantId,
          socketId: socket.id,
          error: err.message,
        });
      }
    });

    socket.on('disconnect', () => {
      activeSockets = Math.max(0, activeSockets - 1);
      const current = Math.max(0, (tenantSocketCounts.get(tenantId) || 1) - 1);
      if (current === 0) tenantSocketCounts.delete(tenantId);
      else tenantSocketCounts.set(tenantId, current);

      logger.info('Socket disconnected', { tenantId, socketId: socket.id });
    });

    logger.info('Socket connected', {
      tenantId,
      socketId: socket.id,
      authenticated: Boolean(socket.data.authenticated),
    });
  });

  return io;
}

function emitToTenant(tenantId, event, data) {
  if (!io) return;
  io.to(tenantRoom(tenantId)).emit(event, data);
}

function emitToTenantConversations(tenantId, event, data) {
  if (!io) return;
  io.to(conversationRoom(tenantId)).emit(event, data);
}

function emitToSession(sessionId, event, data) {
  if (!io) return;
  io.to(`session:${sessionId}`).emit(event, data);
}

function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function getSocketMetrics() {
  return {
    totalConnections: activeSockets,
    byTenant: Object.fromEntries(tenantSocketCounts.entries()),
  };
}

function parseAllowedOrigins() {
  return getAllowedOrigins();
}

module.exports = {
  initSocketServer,
  getIO,
  emitToTenant,
  emitToTenantConversations,
  emitToSession,
  getSocketMetrics,
  tenantRoom,
  conversationRoom,
  createCorsOriginChecker,
  isAllowedOrigin,
  parseAllowedOrigins,
  validateTenant,
};
