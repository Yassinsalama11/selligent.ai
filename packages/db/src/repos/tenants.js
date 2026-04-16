const { getPrisma } = require('../client');

async function getById(tenantId) {
  const prisma = getPrisma();
  return prisma.tenant.findFirst({
    where: { id: tenantId, deletedAt: null },
  });
}

async function getByEmail(email) {
  const prisma = getPrisma();
  return prisma.tenant.findFirst({
    where: { email, deletedAt: null },
  });
}

async function updateSettings(tenantId, settings) {
  const prisma = getPrisma();
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { settings },
  });
}

async function updateKnowledgeBase(tenantId, knowledgeBase) {
  const prisma = getPrisma();
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { knowledgeBase },
  });
}

module.exports = { getById, getByEmail, updateSettings, updateKnowledgeBase };
