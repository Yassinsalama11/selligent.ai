const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../../db/redis');
const { query } = require('../../db/pool');
const { logger } = require('../../core/logger');

let io;

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

async function validateTenant(tenantId) {
  const result = await query(
    'SELECT id FROM tenants WHERE id = $1 AND status IN ($2, $3) LIMIT 1',
    [tenantId, 'active', 'trial']
  );
  return Boolean(result.rows[0]);
}

function initSocketServer(httpServer) {
  const redisClient = getRedisClient();

  io = new Server(httpServer, {
    cors: {
      origin: parseAllowedOrigins(),
      methods: ['GET', 'POST'],
      credentials: true,
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
    const { tenantId, token } = socket.handshake.query;
    if (!tenantId) return next(new Error('tenantId is required'));

    const normalizedTenantId = String(tenantId);

    try {
      try {
        if (token) {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'chatorai-secret');
          const tokenTenantId = decoded.tenant_id || decoded.tenantId;
          if (!tokenTenantId || String(tokenTenantId) !== normalizedTenantId) {
            return next(new Error('tenantId does not match authenticated tenant'));
          }

          socket.userId = decoded.id || decoded.userId;
          socket.userRole = decoded.role;
          socket.authenticated = true;
        }
      } catch {
        return next(new Error('invalid socket token'));
      }

      const tenantValid = await validateTenant(normalizedTenantId);
      if (!tenantValid) return next(new Error('tenant not found or inactive'));

      socket.tenantId = normalizedTenantId;
      return next();
    } catch (err) {
      return next(err);
    }
  });

  io.on('connection', (socket) => {
    const tenantId = socket.tenantId;
    const sessionId = socket.handshake.query.sessionId;

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
      logger.info('Socket disconnected', { tenantId, socketId: socket.id });
    });

    logger.info('Socket connected', {
      tenantId,
      socketId: socket.id,
      authenticated: Boolean(socket.authenticated),
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

function parseAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const defaults = ['https://chatorai.com', 'http://localhost:3000'];
  if (!raw) return defaults;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

module.exports = {
  initSocketServer,
  getIO,
  emitToTenant,
  emitToTenantConversations,
  emitToSession,
  tenantRoom,
  conversationRoom,
};
