/**
 * Tenant memory — Task 2-C5.
 *
 * Stores structured facts about a tenant's business, products, and preferences
 * as (subject, predicate, object) triples in tenant_memory.
 *
 * Promotion gate: only facts with confidence >= PROMOTE_THRESHOLD are eligible
 * for inclusion in the agent context. Low-confidence inferences sit in the table
 * but are filtered out during retrieval.
 *
 * Fact expiry: expiresAt allows time-bounded facts (e.g. "flash_sale: active until Thursday").
 *
 * Example triples:
 *   subject="business",   predicate="primaryLanguage",   object="Arabic"
 *   subject="return_policy", predicate="windowDays",     object="14"
 *   subject="peak_hours", predicate="busiest",           object="Friday 6-9pm"
 */
const { getPrismaForTenant } = require('@chatorai/db');

const PROMOTE_THRESHOLD = 0.8;

/**
 * Upsert a fact triple for a tenant.
 * If the (tenantId, subject, predicate) key already exists, updates object + confidence.
 *
 * @param {string}  tenantId
 * @param {object}  fact
 * @param {string}  fact.subject
 * @param {string}  fact.predicate
 * @param {string}  fact.object
 * @param {string}  [fact.source]      — "inferred" | "explicit" | "correction"
 * @param {number}  [fact.confidence]  — 0.0–1.0 (default 1.0 for explicit facts)
 * @param {Date}    [fact.expiresAt]
 * @returns {Promise<object>} the upserted memory row
 */
async function upsertFact(tenantId, { subject, predicate, object, source = 'inferred', confidence = 1.0, expiresAt } = {}) {
  if (!tenantId || !subject || !predicate || object == null) {
    throw new Error('tenantId, subject, predicate, and object are required');
  }

  const prisma = await getPrismaForTenant(tenantId);
  return prisma.tenantMemory.upsert({
    where: { tenantId_subject_predicate: { tenantId, subject, predicate } },
    create: { tenantId, subject, predicate, object: String(object), source, confidence, expiresAt: expiresAt || null },
    update: { object: String(object), confidence, source, expiresAt: expiresAt || null },
  });
}

/**
 * Retrieve active, high-confidence facts for a subject (or all subjects).
 * Filters out expired and low-confidence facts.
 *
 * @param {string}  tenantId
 * @param {string}  [subject]   — if omitted, returns all subjects
 * @param {number}  [minConfidence] — override PROMOTE_THRESHOLD
 * @returns {Promise<Array<{ subject, predicate, object, confidence, source }>>}
 */
async function getFacts(tenantId, subject, minConfidence = PROMOTE_THRESHOLD) {
  const prisma = await getPrismaForTenant(tenantId);

  const rows = await prisma.tenantMemory.findMany({
    where: {
      tenantId,
      ...(subject ? { subject } : {}),
      confidence: { gte: minConfidence },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: [{ subject: 'asc' }, { updatedAt: 'desc' }],
    select: { subject: true, predicate: true, object: true, confidence: true, source: true },
  });

  return rows;
}

/**
 * Promote a fact's confidence to 1.0 (mark as confirmed).
 * Useful when a human explicitly validates an inferred fact.
 *
 * @param {string} tenantId
 * @param {string} subject
 * @param {string} predicate
 * @returns {Promise<object>}
 */
async function promoteFact(tenantId, subject, predicate) {
  const prisma = await getPrismaForTenant(tenantId);
  return prisma.tenantMemory.update({
    where: { tenantId_subject_predicate: { tenantId, subject, predicate } },
    data: { confidence: 1.0, source: 'explicit' },
  });
}

/**
 * Delete a fact triple.
 *
 * @param {string} tenantId
 * @param {string} subject
 * @param {string} predicate
 */
async function deleteFact(tenantId, subject, predicate) {
  const prisma = await getPrismaForTenant(tenantId);
  await prisma.tenantMemory.deleteMany({
    where: { tenantId, subject, predicate },
  });
}

/**
 * Format all facts for a tenant as a compact string for LLM context injection.
 * Returns empty string if no facts exist.
 *
 * @param {string} tenantId
 * @returns {Promise<string>}
 */
async function formatFactsForContext(tenantId) {
  const facts = await getFacts(tenantId);
  if (facts.length === 0) return '';

  const lines = facts.map((f) => `${f.subject}.${f.predicate} = ${f.object}`);
  return `[Tenant Memory]\n${lines.join('\n')}`;
}

module.exports = {
  upsertFact,
  getFacts,
  promoteFact,
  deleteFact,
  formatFactsForContext,
  PROMOTE_THRESHOLD,
};
