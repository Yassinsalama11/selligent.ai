import { repos } from '@chatorai/db';
import type { FastifyInstance } from 'fastify';

import { authenticate } from '../lib/auth';

export async function registerTenantRoutes(app: FastifyInstance) {
  app.get('/v1/tenants/me', { preHandler: authenticate }, async (request, reply) => {
    const tenant = await repos.tenants.getById(request.user!.tenantId);
    if (!tenant) return reply.code(404).send({ error: 'Tenant not found' });
    return reply.send(tenant);
  });
}
