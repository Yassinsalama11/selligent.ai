import type { Server as HttpServer } from 'node:http';

import { createAdapter } from '@socket.io/redis-adapter';
import type { InboundMessage } from '@chatorai/shared';
import { REALTIME_CHANNEL } from '@chatorai/shared';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { Server, type Socket } from 'socket.io';

export interface LivechatSocketContext {
  tenantId: string;
  sessionId?: string;
  userId?: string;
}

export interface RealtimeEnvelope {
  tenantId: string;
  room: 'tenant' | 'conversations' | `session:${string}`;
  event: string;
  payload: unknown;
}

export interface LivechatSocketOptions {
  allowedOrigins: string[];
  jwtSecret: string;
  redisUrl?: string;
  onCustomerMessage?: (message: InboundMessage, context: LivechatSocketContext) => Promise<void> | void;
  logger?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
}

function tenantRoom(tenantId: string) {
  return `tenant:${tenantId}`;
}

function conversationRoom(tenantId: string) {
  return `tenant:${tenantId}:conversations`;
}

function resolveRoom(tenantId: string, room: RealtimeEnvelope['room']) {
  if (room === 'tenant') return tenantRoom(tenantId);
  if (room === 'conversations') return conversationRoom(tenantId);
  return room;
}

function originAllowed(origin: string | undefined, allowedOrigins: string[]) {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

export function createLivechatSocketServer(httpServer: HttpServer, options: LivechatSocketOptions) {
  const logger = options.logger || console;
  const io = new Server(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
        if (!originAllowed(origin || undefined, options.allowedOrigins)) {
          callback(new Error('Origin not allowed'), false);
          return;
        }
        callback(null, true);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  let pub: Redis | undefined;
  let sub: Redis | undefined;
  let events: Redis | undefined;

  if (options.redisUrl) {
    pub = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    sub = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    events = new Redis(options.redisUrl, { maxRetriesPerRequest: null });
    io.adapter(createAdapter(pub, sub));
    events.subscribe(REALTIME_CHANNEL).catch((error: Error) => {
      logger.warn('Failed to subscribe livechat realtime channel', { error: error.message });
    });
    events.on('message', (_channel: string, raw: string) => {
      try {
        const envelope = JSON.parse(raw) as RealtimeEnvelope;
        io.to(resolveRoom(envelope.tenantId, envelope.room)).emit(envelope.event, envelope.payload);
      } catch (error) {
        logger.warn('Failed to relay realtime envelope', { error: (error as Error).message });
      }
    });
  }

  io.use((socket: Socket, next: (error?: Error) => void) => {
    const origin = socket.request.headers.origin;
    if (!originAllowed(origin, options.allowedOrigins)) {
      return next(new Error('Origin not allowed'));
    }

    const tenantId = String(socket.handshake.query.tenantId || '');
    const token = String(socket.handshake.auth.token || socket.handshake.query.token || '');
    if (!tenantId || !token) {
      return next(new Error('tenantId and JWT are required'));
    }

    try {
      const decoded = jwt.verify(token, options.jwtSecret) as { id?: string; tenant_id?: string; tenantId?: string };
      const tokenTenant = String(decoded.tenant_id || decoded.tenantId || '');
      if (tokenTenant !== tenantId) {
        return next(new Error('tenant mismatch'));
      }

      socket.data.tenantId = tenantId;
      socket.data.userId = decoded.id;
      socket.data.sessionId = String(socket.handshake.query.sessionId || '');
      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on('connection', (socket: Socket) => {
    const tenantId = String(socket.data.tenantId);
    const sessionId = String(socket.data.sessionId || '');

    socket.join(tenantRoom(tenantId));
    socket.join(conversationRoom(tenantId));
    if (sessionId) socket.join(`session:${sessionId}`);

    socket.on('customer:message', async (payload: Omit<InboundMessage, 'tenantId' | 'receivedAt'>) => {
      if (!options.onCustomerMessage) return;
      await options.onCustomerMessage(
        {
          ...payload,
          tenantId,
          receivedAt: new Date().toISOString(),
        } as InboundMessage,
        {
          tenantId,
          sessionId: sessionId || undefined,
          userId: String(socket.data.userId || ''),
        },
      );
    });

    logger.info('Livechat socket connected', {
      tenantId,
      socketId: socket.id,
      sessionId: sessionId || undefined,
    });
  });

  return {
    io,
    tenantRoom,
    conversationRoom,
    async close() {
      await io.close();
      await Promise.all([
        pub?.quit(),
        sub?.quit(),
        events?.quit(),
      ]);
    },
  };
}

export { tenantRoom, conversationRoom };
