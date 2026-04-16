import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      tenantId: string;
      role: string;
      email?: string;
    };
    rawBody?: string | Buffer;
    requestId: string;
    tenantId?: string;
    startedAt?: number;
  }
}
