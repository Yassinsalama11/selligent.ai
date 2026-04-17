const { getPrisma } = require('../client');

async function record(tenantId, { actorType = 'user', actorId, action, entityType, entityId, metadata = {} }) {
  const prisma = getPrisma();
  return prisma.auditLog.create({
    data: { tenantId, actorType, actorId, action, entityType, entityId, metadata },
  });
}

async function list(tenantId, { entityType, entityId, actorId, action, limit = 100, offset = 0, since } = {}) {
  const prisma = getPrisma();
  const where = { tenantId };
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (actorId) where.actorId = actorId;
  if (action) where.action = action;
  if (since) where.createdAt = { gte: new Date(since) };

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
  });
}

module.exports = { record, list };
