const { getPrisma } = require('../client');

async function getOrCreate(tenantId, { channel, channelCustomerId, name, phone, avatar }) {
  const prisma = getPrisma();
  const existing = await prisma.customer.findFirst({
    where: { tenantId, channel, channelCustomerId },
  });
  if (existing) return existing;

  return prisma.customer.create({
    data: { tenantId, channel, channelCustomerId, name, phone, avatarUrl: avatar },
  });
}

async function getById(tenantId, customerId) {
  const prisma = getPrisma();
  return prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
  });
}

async function list(tenantId, { limit = 50, offset = 0, search } = {}) {
  const prisma = getPrisma();
  const where = { tenantId, deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.customer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
  });
}

async function update(tenantId, customerId, data) {
  const prisma = getPrisma();
  return prisma.customer.update({
    where: { id: customerId, tenantId },
    data,
  });
}

module.exports = { getOrCreate, getById, list, update };
