import bcrypt from 'bcrypt';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type { FastifyReply, FastifyRequest } from 'fastify';

const JWT_SECRET = process.env.JWT_SECRET || 'chatorai-dev-secret';

export interface AuthClaims {
  id: string;
  tenantId: string;
  role: string;
  email?: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signToken(claims: AuthClaims) {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  };

  return jwt.sign(
    {
      id: claims.id,
      tenant_id: claims.tenantId,
      role: claims.role,
      email: claims.email,
    },
    JWT_SECRET as Secret,
    options,
  );
}

export function decodeTenantFromAuthorization(header?: string) {
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice(7);
  const decoded = jwt.decode(token) as { tenant_id?: string; tenantId?: string } | null;
  return decoded?.tenant_id || decoded?.tenantId;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as {
      id?: string;
      tenant_id?: string;
      tenantId?: string;
      role?: string;
      email?: string;
    };
    request.user = {
      id: String(decoded.id || ''),
      tenantId: String(decoded.tenant_id || decoded.tenantId || ''),
      role: String(decoded.role || 'agent'),
      email: decoded.email,
    };
  } catch {
    return reply.code(401).send({ error: 'Invalid or expired token' });
  }
}
