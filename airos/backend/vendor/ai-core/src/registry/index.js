/**
 * Prompt Registry — versioned, hashed, tenant-pinnable prompts.
 *
 * Versioning scheme: monotonically-increasing integers stored as strings ("1", "2", …).
 * Content is SHA-256 hashed for deduplication — publishing an identical prompt body
 * is a no-op that returns the existing version.
 *
 * DB tables used:  prompt_versions, tenant_prompt_pins
 */
const crypto = require('crypto');
const { getPrisma } = require('@chatorai/db');

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Publish a new version of a prompt for a tenant.
 * If the content hash already exists for this (tenantId, id) pair, returns the
 * existing record rather than inserting a duplicate.
 *
 * @param {string} tenantId
 * @param {string} id       — logical prompt name, e.g. "sales-reply"
 * @param {string} content  — the full prompt text
 * @returns {Promise<{ tenantId, id, version, promptHash, content, createdAt }>}
 */
async function publishPrompt(tenantId, id, content) {
  const prisma = getPrisma();
  const promptHash = sha256(content);

  // Idempotency: return existing if same content already stored
  const existing = await prisma.promptVersion.findFirst({
    where: { tenantId, id, promptHash },
  });
  if (existing) return existing;

  // Determine next version number
  const latest = await prisma.promptVersion.findFirst({
    where: { tenantId, id },
    orderBy: { createdAt: 'desc' },
  });
  const nextVersion = latest ? String(Number(latest.version) + 1) : '1';

  return prisma.promptVersion.create({
    data: { tenantId, id, version: nextVersion, promptHash, content },
  });
}

/**
 * Resolve the active prompt for a tenant.
 * Resolution order:
 *   1. Explicit version arg (if provided)
 *   2. Tenant-level pin in tenant_prompt_pins
 *   3. Latest version by createdAt
 *
 * Returns null if no version exists yet.
 *
 * @param {string} tenantId
 * @param {string} id
 * @param {string} [version]
 * @returns {Promise<{ content: string, version: string } | null>}
 */
async function resolvePrompt(tenantId, id, version) {
  const prisma = getPrisma();

  if (version) {
    return prisma.promptVersion.findUnique({
      where: { tenantId_id_version: { tenantId, id, version } },
    });
  }

  // Check for a tenant pin
  const pin = await prisma.tenantPromptPin.findUnique({
    where: { tenantId_promptId: { tenantId, promptId: id } },
    include: { promptVersion: true },
  });
  if (pin) return pin.promptVersion;

  // Fall back to latest
  return prisma.promptVersion.findFirst({
    where: { tenantId, id },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Pin a tenant to a specific prompt version.
 * Upserts — calling again with a different version updates the pin.
 *
 * @param {string} tenantId
 * @param {string} id
 * @param {string} version
 */
async function pinPrompt(tenantId, id, version) {
  const prisma = getPrisma();

  // Verify the version exists
  const record = await prisma.promptVersion.findUnique({
    where: { tenantId_id_version: { tenantId, id, version } },
  });
  if (!record) throw new Error(`Prompt ${id}@${version} not found for tenant ${tenantId}`);

  return prisma.tenantPromptPin.upsert({
    where: { tenantId_promptId: { tenantId, promptId: id } },
    create: { tenantId, promptId: id, version },
    update: { version },
  });
}

/**
 * List all stored versions for a prompt, newest first.
 *
 * @param {string} tenantId
 * @param {string} id
 * @returns {Promise<Array<{ version, promptHash, createdAt }>>}
 */
async function listVersions(tenantId, id) {
  const prisma = getPrisma();
  return prisma.promptVersion.findMany({
    where: { tenantId, id },
    orderBy: { createdAt: 'desc' },
    select: { version: true, promptHash: true, createdAt: true },
  });
}

module.exports = { publishPrompt, resolvePrompt, pinPrompt, listVersions };
