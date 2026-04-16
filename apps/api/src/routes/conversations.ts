import { repos } from '@chatorai/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../lib/auth';

const querySchema = z.object({
  status: z.string().optional(),
  channel: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const statusSchema = z.object({
  status: z.enum(['open', 'closed', 'snoozed']),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
});

export async function registerConversationRoutes(app: FastifyInstance) {
  app.get('/v1/conversations', { preHandler: authenticate }, async (request) => {
    const query = querySchema.parse(request.query);
    return repos.conversations.list(request.user!.tenantId, query);
  });

  app.patch('/v1/conversations/:id/status', { preHandler: authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = statusSchema.parse(request.body);
    const conversation = await repos.conversations.updateStatus(request.user!.tenantId, params.id, body.status);
    return reply.send(conversation);
  });

  app.patch('/v1/conversations/:id/assign', { preHandler: authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = assignSchema.parse(request.body);
    const conversation = await repos.conversations.assign(request.user!.tenantId, params.id, body.userId);
    return reply.send(conversation);
  });
}
