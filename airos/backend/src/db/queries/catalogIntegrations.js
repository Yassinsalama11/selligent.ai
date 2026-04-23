const crypto = require('crypto');

const { queryAdmin } = require('../pool');

const VALID_CATALOG_PLATFORMS = new Set(['woocommerce', 'shopify', 'salla', 'zid']);

function encryptValue(value) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || '').slice(0, 32);
  if (key.length !== 32) return value;

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value || {}), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`,
  };
}

function decryptValue(value) {
  if (!value || typeof value !== 'object') return {};
  if (!value.encrypted) return value;

  const key = Buffer.from(process.env.ENCRYPTION_KEY || '').slice(0, 32);
  if (key.length !== 32) return {};

  const [ivHex, tagHex, encryptedHex] = String(value.encrypted).split(':');
  if (!ivHex || !tagHex || !encryptedHex) return {};

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

function randomToken(size = 24) {
  return crypto.randomBytes(size).toString('hex');
}

function buildWebhookPath(integrationId) {
  return `/v1/catalog/webhooks/${integrationId}`;
}

function sanitizeIntegration(row, productCounts = {}) {
  const config = row.config && typeof row.config === 'object' ? row.config : {};
  const meta = config.meta && typeof config.meta === 'object' ? config.meta : {};
  const secrets = decryptValue(config.secrets);

  return {
    id: row.id,
    platform: row.type,
    status: row.status || 'draft',
    syncStatus: row.sync_status || 'idle',
    lastSyncAt: row.last_sync_at || null,
    createdAt: row.created_at || null,
    storeLabel: meta.storeLabel || meta.storeDomain || meta.storeUrl || '',
    storeDomain: meta.storeDomain || '',
    storeUrl: meta.storeUrl || '',
    storeId: meta.storeId || '',
    mode: meta.mode || 'both',
    manualSyncEnabled: meta.manualSyncEnabled !== false,
    webhookEnabled: meta.webhookEnabled !== false,
    apiKey: config.api_key || '',
    webhookUrl: config.webhook_path || '',
    webhookUsername: config.webhook_username || 'plugin',
    webhookSecret: config.webhook_secret || '',
    sourceProducts: Number(productCounts[row.type] || 0),
    authConfigured: Boolean(
      secrets.accessToken
      || secrets.apiToken
      || secrets.consumerKey
      || secrets.shopAccessToken
    ),
    meta,
  };
}

function normalizePlatform(platform) {
  const normalized = String(platform || '').trim().toLowerCase();
  if (!VALID_CATALOG_PLATFORMS.has(normalized)) {
    const err = new Error('Unsupported catalog platform');
    err.status = 400;
    throw err;
  }
  return normalized;
}

function buildMeta(platform, input = {}, current = {}) {
  const base = current.meta && typeof current.meta === 'object' ? current.meta : {};
  const next = {
    ...base,
    mode: String(input.mode || base.mode || 'both').trim().toLowerCase() || 'both',
    manualSyncEnabled: input.manualSyncEnabled !== false,
    webhookEnabled: input.webhookEnabled !== false,
    storeLabel: String(input.storeLabel || input.store_label || base.storeLabel || '').trim(),
    storeDomain: String(input.storeDomain || input.store_domain || base.storeDomain || '').trim().toLowerCase(),
    storeUrl: String(input.storeUrl || input.store_url || base.storeUrl || '').trim(),
    storeId: String(input.storeId || input.store_id || base.storeId || '').trim(),
  };

  if (!next.storeLabel) {
    next.storeLabel = next.storeDomain || next.storeUrl || platform;
  }

  return next;
}

function buildSecrets(platform, input = {}, current = {}) {
  const prev = decryptValue(current.secrets);
  switch (platform) {
    case 'woocommerce':
      return encryptValue({
        ...prev,
        consumerKey: String(input.consumerKey || input.consumer_key || prev.consumerKey || '').trim(),
        consumerSecret: String(input.consumerSecret || input.consumer_secret || prev.consumerSecret || '').trim(),
      });
    case 'shopify':
      return encryptValue({
        ...prev,
        accessToken: String(input.accessToken || input.access_token || prev.accessToken || '').trim(),
      });
    case 'salla':
      return encryptValue({
        ...prev,
        accessToken: String(input.accessToken || input.access_token || prev.accessToken || '').trim(),
      });
    case 'zid':
      return encryptValue({
        ...prev,
        accessToken: String(input.accessToken || input.access_token || prev.accessToken || '').trim(),
        authorizationToken: String(input.authorizationToken || input.authorization_token || prev.authorizationToken || '').trim(),
        apiToken: String(input.apiToken || input.api_token || prev.apiToken || '').trim(),
      });
    default:
      return encryptValue(prev);
  }
}

async function listCatalogIntegrations(tenantId) {
  const [result, counts] = await Promise.all([
    queryAdmin(`
      SELECT id, type, status, config, last_sync_at, sync_status, created_at
      FROM integrations
      WHERE tenant_id = $1
        AND type = ANY($2::text[])
      ORDER BY created_at ASC
    `, [tenantId, Array.from(VALID_CATALOG_PLATFORMS)]),
    queryAdmin(`
      SELECT source, COUNT(*)::int AS total
      FROM products
      WHERE tenant_id = $1 AND is_active = TRUE
      GROUP BY source
    `, [tenantId]),
  ]);

  const countsBySource = Object.fromEntries(
    counts.rows.map((row) => [row.source, Number(row.total || 0)]),
  );

  return result.rows.map((row) => sanitizeIntegration(row, countsBySource));
}

async function getCatalogIntegration(tenantId, platform) {
  const normalized = normalizePlatform(platform);
  const result = await queryAdmin(`
    SELECT id, tenant_id, type, status, config, last_sync_at, sync_status, created_at
    FROM integrations
    WHERE tenant_id = $1 AND type = $2
    ORDER BY created_at DESC
    LIMIT 1
  `, [tenantId, normalized]);
  return result.rows[0] || null;
}

async function getCatalogIntegrationById(id) {
  const result = await queryAdmin(`
    SELECT id, tenant_id, type, status, config, last_sync_at, sync_status, created_at
    FROM integrations
    WHERE id = $1
    LIMIT 1
  `, [id]);
  return result.rows[0] || null;
}

async function upsertCatalogIntegration(tenantId, platform, input = {}) {
  const normalized = normalizePlatform(platform);
  const current = await getCatalogIntegration(tenantId, normalized);
  const integrationId = current?.id || crypto.randomUUID();
  const currentConfig = current?.config && typeof current.config === 'object' ? current.config : {};

  const nextConfig = {
    ...currentConfig,
    api_key: currentConfig.api_key || randomToken(16),
    webhook_username: currentConfig.webhook_username || 'plugin',
    webhook_secret: currentConfig.webhook_secret || randomToken(18),
    webhook_path: currentConfig.webhook_path || buildWebhookPath(integrationId),
    meta: buildMeta(normalized, input, currentConfig),
    secrets: buildSecrets(normalized, input, currentConfig),
  };

  const status = input.status ? String(input.status).trim().toLowerCase() : (current?.status || 'active');
  const syncStatus = current?.sync_status || 'idle';

  const result = await queryAdmin(`
    INSERT INTO integrations (
      id, tenant_id, type, status, config, sync_status, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (id) DO UPDATE
    SET status = EXCLUDED.status,
        config = EXCLUDED.config,
        sync_status = EXCLUDED.sync_status
    RETURNING id, type, status, config, last_sync_at, sync_status, created_at
  `, [
    integrationId,
    tenantId,
    normalized,
    status,
    JSON.stringify(nextConfig),
    syncStatus,
  ]);

  return sanitizeIntegration(result.rows[0]);
}

async function markCatalogSyncStarted(integrationId) {
  await queryAdmin(`
    UPDATE integrations
    SET sync_status = 'syncing'
    WHERE id = $1
  `, [integrationId]);
}

async function markCatalogSyncResult(integrationId, { status = 'active', syncStatus = 'synced' } = {}) {
  await queryAdmin(`
    UPDATE integrations
    SET status = $2,
        sync_status = $3,
        last_sync_at = NOW()
    WHERE id = $1
  `, [integrationId, status, syncStatus]);
}

async function disconnectCatalogIntegration(tenantId, platform) {
  const normalized = normalizePlatform(platform);
  const result = await queryAdmin(`
    DELETE FROM integrations
    WHERE tenant_id = $1 AND type = $2
    RETURNING id
  `, [tenantId, normalized]);
  return Boolean(result.rows[0]);
}

module.exports = {
  VALID_CATALOG_PLATFORMS,
  decryptValue,
  disconnectCatalogIntegration,
  getCatalogIntegration,
  getCatalogIntegrationById,
  listCatalogIntegrations,
  markCatalogSyncResult,
  markCatalogSyncStarted,
  normalizePlatform,
  sanitizeIntegration,
  upsertCatalogIntegration,
};
