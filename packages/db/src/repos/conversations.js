const { getPrisma } = require('../client');

async function getOrCreate(tenantId, customerId, channel) {
  const prisma = getPrisma();
  const existing = await prisma.conversation.findFirst({
    where: { tenantId, customerId, channel, status: 'open', deletedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: { tenantId, customerId, channel },
  });
}

async function list(tenantId, { status, channel, assignedTo, limit = 50, offset = 0 } = {}) {
  const prisma = getPrisma();
  const where = { tenantId, deletedAt: null };
  if (status) where.status = status;
  if (channel) where.channel = channel;
  if (assignedTo) where.assignedTo = assignedTo;

  return prisma.conversation.findMany({
    where,
    include: {
      customer: { select: { id: true, name: true, avatarUrl: true, channel: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true } },
    },
    orderBy: { updatedAt: 'desc' },
    skip: offset,
    take: limit,
  });
}

async function updateStatus(tenantId, conversationId, status) {
  const prisma = getPrisma();
  return prisma.conversation.update({
    where: { id: conversationId, tenantId },
    data: { status },
  });
}

async function assign(tenantId, conversationId, userId) {
  const prisma = getPrisma();
  return prisma.conversation.update({
    where: { id: conversationId, tenantId },
    data: { assignedTo: userId },
  });
}

async function getById(tenantId, conversationId) {
  const prisma = getPrisma();
  return prisma.conversation.findFirst({
    where: { id: conversationId, tenantId, deletedAt: null },
    include: { customer: true },
  });
}

module.exports = { getOrCreate, list, updateStatus, assign, getById };
