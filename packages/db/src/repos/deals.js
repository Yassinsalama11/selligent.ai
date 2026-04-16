const { getPrisma } = require('../client');

async function getOrCreate(tenantId, conversationId, customerId) {
  const prisma = getPrisma();
  const existing = await prisma.deal.findFirst({
    where: {
      tenantId,
      conversationId,
      stage: { notIn: ['won', 'lost'] },
      deletedAt: null,
    },
  });
  if (existing) return existing;

  return prisma.deal.create({
    data: { tenantId, conversationId, customerId },
  });
}

async function update(tenantId, dealId, data) {
  const prisma = getPrisma();
  return prisma.deal.update({
    where: { id: dealId, tenantId },
    data,
  });
}

async function list(tenantId, { stage, limit = 50 } = {}) {
  const prisma = getPrisma();
  const where = { tenantId, deletedAt: null };
  if (stage) where.stage = stage;

  return prisma.deal.findMany({
    where,
    include: { customer: { select: { name: true, channel: true } } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}

module.exports = { getOrCreate, update, list };
