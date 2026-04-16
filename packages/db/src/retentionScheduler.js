/**
 * Nightly retention purge — Task 1-C4.
 *
 * Runs once per day. For each tenant with a RetentionPolicy, hard-deletes rows
 * older than the configured threshold. Each purge is logged to AuditLog.
 *
 * Called from airos/backend/src/core/reportScheduler.js or directly via
 *   startRetentionScheduler() in process startup.
 */
const { getPrisma, getPrismaForTenant } = require('./client');

const MS_PER_DAY = 86_400_000;

async function runRetentionPurge() {
  // Read policies from the default (US) cluster — policies table is global
  const controlPrisma = getPrisma();
  const policies = await controlPrisma.retentionPolicy.findMany({
    include: { tenant: { select: { id: true, dataResidency: true } } },
  });

  const results = [];
  for (const policy of policies) {
    const tenantId = policy.tenantId;
    try {
      // Route deletions to the tenant's regional cluster
      const prisma = await getPrismaForTenant(tenantId);

      const messageCutoff = new Date(Date.now() - policy.messagesDays * MS_PER_DAY);
      const convCutoff    = new Date(Date.now() - policy.conversationsDays * MS_PER_DAY);
      const auditCutoff   = new Date(Date.now() - policy.auditLogDays * MS_PER_DAY);

      // Delete messages first (FK constraint order)
      const deletedMessages = await prisma.message.deleteMany({
        where: { tenantId, createdAt: { lt: messageCutoff } },
      });

      const deletedConvs = await prisma.conversation.deleteMany({
        where: { tenantId, createdAt: { lt: convCutoff } },
      });

      const deletedAudit = await prisma.auditLog.deleteMany({
        where: { tenantId, createdAt: { lt: auditCutoff } },
      });

      const summary = {
        tenantId,
        messages: deletedMessages.count,
        conversations: deletedConvs.count,
        auditLogs: deletedAudit.count,
      };

      // Audit the purge itself
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorType: 'system',
          actorId: 'retention-scheduler',
          action: 'retention_purge',
          entityType: 'retention_policy',
          entityId: tenantId,
          metadata: summary,
        },
      });

      results.push({ ...summary, status: 'ok' });
    } catch (err) {
      results.push({ tenantId, status: 'error', error: err.message });
    }
  }

  return results;
}

let _timer = null;

function startRetentionScheduler() {
  if (_timer) return;
  // Run immediately once, then every 24h
  runRetentionPurge().catch(() => {});
  _timer = setInterval(() => {
    runRetentionPurge().catch(() => {});
  }, MS_PER_DAY);
  if (_timer.unref) _timer.unref(); // don't keep process alive
}

function stopRetentionScheduler() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { runRetentionPurge, startRetentionScheduler, stopRetentionScheduler };
