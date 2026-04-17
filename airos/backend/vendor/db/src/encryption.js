/**
 * PII envelope encryption — Task 1-C2.
 *
 * Architecture:
 *   KEK (Key Encryption Key) — AES-256 master key from env PII_MASTER_KEY (hex).
 *   DEK (Data Encryption Key) — AES-256 random key, one per tenant.
 *   DEK is encrypted with KEK and stored in tenant_encryption_keys table.
 *   Field values are encrypted with the DEK using AES-256-GCM.
 *
 * Wire format (encrypted string):
 *   "enc:v1:<keyVersion>:<ivHex>:<authTagHex>:<ciphertextHex>"
 *
 * If PII_MASTER_KEY is not set, encrypt() returns plaintext untouched (dev mode).
 */
const crypto = require('crypto');
const { getPrisma } = require('./client');

const ALGO = 'aes-256-gcm';
const ENC_PREFIX = 'enc:v1:';

function getMasterKey() {
  const hex = process.env.PII_MASTER_KEY;
  if (!hex) return null;
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== 32) throw new Error('PII_MASTER_KEY must be 64 hex chars (32 bytes)');
  return buf;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

// ── DEK management ────────────────────────────────────────────────────────────

const _dekCache = new Map(); // tenantId → { dek: Buffer, keyVersion: number }

async function _getDek(tenantId) {
  if (_dekCache.has(tenantId)) return _dekCache.get(tenantId);

  const masterKey = getMasterKey();
  if (!masterKey) return null; // encryption disabled

  // Use the tenant's regional cluster — DEK lives on the same cluster as tenant data
  const { getPrismaForTenant } = require('./client');
  const prisma = await getPrismaForTenant(tenantId);
  let row = await prisma.tenantEncryptionKey.findUnique({ where: { tenantId } });

  if (!row) {
    // Generate and persist a new DEK for this tenant
    const dek = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, masterKey, iv);
    const encDekBuf = Buffer.concat([cipher.update(dek), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Store as: <ivHex>:<authTagHex>:<encDekHex>
    const encDek = `${iv.toString('hex')}:${authTag.toString('hex')}:${encDekBuf.toString('hex')}`;

    row = await prisma.tenantEncryptionKey.upsert({
      where: { tenantId },
      create: { tenantId, encDek, keyVersion: 1 },
      update: {},
    });

    const entry = { dek, keyVersion: row.keyVersion };
    _dekCache.set(tenantId, entry);
    return entry;
  }

  // Decrypt stored DEK
  const parts = row.encDek.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encDekBuf = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv(ALGO, masterKey, iv);
  decipher.setAuthTag(authTag);
  const dek = Buffer.concat([decipher.update(encDekBuf), decipher.final()]);

  const entry = { dek, keyVersion: row.keyVersion };
  _dekCache.set(tenantId, entry);
  return entry;
}

// ── Encrypt / decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string for a tenant.
 * Returns encrypted string if PII_MASTER_KEY is set, else returns plaintext.
 */
async function encrypt(tenantId, plaintext) {
  if (plaintext == null) return plaintext;
  const dekEntry = await _getDek(tenantId);
  if (!dekEntry) return plaintext; // dev mode: no-op

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, dekEntry.dek, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${ENC_PREFIX}${dekEntry.keyVersion}:${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Decrypt an encrypted field value for a tenant.
 * Returns plaintext. If value is not encrypted, returns it unchanged.
 */
async function decrypt(tenantId, value) {
  if (value == null || !isEncrypted(value)) return value;

  const parts = value.slice(ENC_PREFIX.length).split(':');
  // parts = [keyVersion, ivHex, authTagHex, ciphertextHex]
  const keyVersion = parseInt(parts[0], 10);
  const iv = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');
  const ciphertext = Buffer.from(parts[3], 'hex');

  const dekEntry = await _getDek(tenantId);
  if (!dekEntry) {
    throw new Error('PII_MASTER_KEY not set but found encrypted field — cannot decrypt');
  }
  if (dekEntry.keyVersion !== keyVersion) {
    throw new Error(`DEK version mismatch: stored ${keyVersion}, current ${dekEntry.keyVersion}`);
  }

  const decipher = crypto.createDecipheriv(ALGO, dekEntry.dek, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Rotate the DEK for a tenant (re-encrypt all PII fields is caller's responsibility).
 * Increments keyVersion and replaces encDek in DB.
 */
async function rotateDek(tenantId) {
  const masterKey = getMasterKey();
  if (!masterKey) throw new Error('PII_MASTER_KEY not set');

  const newDek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, masterKey, iv);
  const encDekBuf = Buffer.concat([cipher.update(newDek), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const encDek = `${iv.toString('hex')}:${authTag.toString('hex')}:${encDekBuf.toString('hex')}`;

  const prisma = getPrisma();
  const row = await prisma.tenantEncryptionKey.upsert({
    where: { tenantId },
    create: { tenantId, encDek, keyVersion: 1 },
    update: { encDek, keyVersion: { increment: 1 } },
  });

  _dekCache.set(tenantId, { dek: newDek, keyVersion: row.keyVersion });
  return row.keyVersion;
}

/** Evict the cached DEK for a tenant (e.g. after rotation). */
function evictDekCache(tenantId) {
  _dekCache.delete(tenantId);
}

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  rotateDek,
  evictDekCache,
};
