import { getPrisma } from '@chatorai/db';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { authenticate, hashPassword, signToken, verifyPassword } from '../lib/auth';

const registerSchema = z.object({
  tenantName: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  name: z.string().trim().min(1),
  plan: z.enum(['starter', 'growth', 'pro', 'enterprise']).default('starter'),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const prisma = getPrisma();

    const existing = await prisma.tenant.findFirst({
      where: { email: body.email, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      return reply.code(409).send({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(body.password);
    const created = await prisma.tenant.create({
      data: {
        name: body.tenantName,
        email: body.email,
        plan: body.plan,
        users: {
          create: {
            email: body.email,
            passwordHash,
            name: body.name,
            role: 'owner',
          },
        },
      },
      include: {
        users: {
          take: 1,
        },
      },
    });

    const user = created.users[0];
    const token = signToken({
      id: user.id,
      tenantId: created.id,
      role: user.role,
      email: user.email,
    });

    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        tenant_id: created.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: created.name,
        plan: created.plan,
        status: created.status,
      },
    });
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const prisma = getPrisma();

    const user = await prisma.user.findFirst({
      where: {
        email: body.email,
        deletedAt: null,
        tenant: {
          deletedAt: null,
          status: 'active',
        },
      },
      include: {
        tenant: true,
      },
    });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    return reply.send({
      token: signToken({
        id: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      }),
      user: {
        id: user.id,
        tenant_id: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.tenant.name,
        plan: user.tenant.plan,
        status: user.tenant.status,
      },
    });
  });

  app.get('/me', { preHandler: authenticate }, async (request) => {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: {
        id: request.user?.id,
        tenantId: request.user?.tenantId,
        deletedAt: null,
      },
      include: {
        tenant: true,
      },
    });

    if (!user) return { user: null };
    return {
      user: {
        id: user.id,
        tenant_id: user.tenantId,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.tenant.name,
        plan: user.tenant.plan,
        status: user.tenant.status,
      },
    };
  });
}
