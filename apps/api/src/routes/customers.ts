import { repos } from '@chatorai/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate } from '../lib/auth';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
  search: z.string().optional(),
});

const updateBodySchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

export async function registerCustomerRoutes(app: FastifyInstance) {
  app.get('/v1/customers', { preHandler: authenticate }, async (request) => {
    const query = listQuerySchema.parse(request.query);
    return repos.customers.list(request.user!.tenantId, query);
  });

  app.get('/v1/customers/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const customer = await repos.customers.getById(request.user!.tenantId, params.id);
    if (!customer) return reply.code(404).send({ error: 'Customer not found' });
    return reply.send(customer);
  });

  app.patch('/v1/customers/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateBodySchema.parse(request.body);
    const customer = await repos.customers.update(request.user!.tenantId, params.id, body);
    return reply.send(customer);
  });
}
