'use strict';

const { queryAdmin } = require('../pool');
const { encrypt, decrypt } = require('../../core/crypto');

const VALID_PROVIDERS = new Set(['openai', 'anthropic', 'gemini']);
const VALID_MODELS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-opus-4-7', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'],
};

function maskApiKey(key) {
  if (!key || key.length < 8) return '***';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function getCustomAiProvider(tenantId) {
  const result = await queryAdmin(
    'SELECT * FROM custom_ai_providers WHERE tenant_id = $1 LIMIT 1',
    [tenantId],
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  const plainKey = decrypt(row.encrypted_api_key);
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    isActive: row.is_active,
    maskedKey: maskApiKey(plainKey),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCustomAiProviderRaw(tenantId) {
  const result = await queryAdmin(
    'SELECT * FROM custom_ai_providers WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1',
    [tenantId],
  );
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return {
    provider: row.provider,
    model: row.model,
    apiKey: decrypt(row.encrypted_api_key),
  };
}

async function upsertCustomAiProvider(tenantId, { provider, apiKey, model }) {
  if (!VALID_PROVIDERS.has(provider)) throw Object.assign(new Error(`Invalid provider: ${provider}`), { status: 400 });
  if (!apiKey || String(apiKey).trim().length < 10) throw Object.assign(new Error('API key too short'), { status: 400 });
  const resolvedModel = model || null;
  const encryptedKey = encrypt(String(apiKey).trim());
  const result = await queryAdmin(
    `INSERT INTO custom_ai_providers (tenant_id, provider, encrypted_api_key, model, is_active, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     ON CONFLICT (tenant_id) DO UPDATE
     SET provider = EXCLUDED.provider,
         encrypted_api_key = EXCLUDED.encrypted_api_key,
         model = EXCLUDED.model,
         is_active = TRUE,
         updated_at = NOW()
     RETURNING *`,
    [tenantId, provider, encryptedKey, resolvedModel],
  );
  const row = result.rows[0];
  const plainKey = decrypt(row.encrypted_api_key);
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    isActive: row.is_active,
    maskedKey: maskApiKey(plainKey),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function deleteCustomAiProvider(tenantId) {
  await queryAdmin('DELETE FROM custom_ai_providers WHERE tenant_id = $1', [tenantId]);
}

module.exports = {
  VALID_PROVIDERS,
  VALID_MODELS,
  getCustomAiProvider,
  getCustomAiProviderRaw,
  upsertCustomAiProvider,
  deleteCustomAiProvider,
};
