import { repos } from '@chatorai/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../lib/auth';

const paramsSchema = z.object({
  conversationId: z.string().uuid(),
});

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  before: z.string().datetime().optional(),
});

const bodySchema = z.object({
  direction: z.enum(['inbound', 'outbound']),
  type: z.enum(['text', 'image', 'voice', 'document']).default('text'),
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  sentBy: z.string().default('agent'),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function registerMessageRoutes(app: FastifyInstance) {
  app.get('/v1/messages/:conversationId', { preHandler: authenticate }, async (request) => {
    const params = paramsSchema.parse(request.params);
    const query = querySchema.parse(request.query);
    return repos.messages.list(request.user!.tenantId, params.conversationId, query);
  });

  app.post('/v1/messages/:conversationId', { preHandler: authenticate }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = bodySchema.parse(request.body);
    const conversation = await repos.conversations.getById(request.user!.tenantId, params.conversationId);
    if (!conversation) {
      return reply.code(404).send({ error: 'Conversation not found' });
    }

    const message = await repos.messages.save(request.user!.tenantId, params.conversationId, body);
    return reply.code(201).send({ conversationId: params.conversationId, message });
  });
}
