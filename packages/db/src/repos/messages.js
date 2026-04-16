const { getPrisma } = require('../client');

async function save(tenantId, conversationId, { direction, type = 'text', content, mediaUrl, sentBy, metadata = {} }) {
  const prisma = getPrisma();
  const msg = await prisma.message.create({
    data: {
      tenantId,
      conversationId,
      direction,
      type,
      content,
      mediaUrl,
      sentBy,
      metadata,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return msg;
}

async function list(tenantId, conversationId, { limit = 50, before } = {}) {
  const prisma = getPrisma();
  const where = { conversationId, tenantId, deletedAt: null };
  if (before) where.createdAt = { lt: new Date(before) };

  const msgs = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return msgs.reverse();
}

module.exports = { save, list };
