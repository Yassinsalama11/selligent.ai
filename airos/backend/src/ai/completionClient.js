const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { performance } = require('perf_hooks');

const { logAuditEvent } = require('../db/queries/audit');
const { recordAiUsage } = require('../core/telemetry');
const { assessTextSafety, buildSafeRefusal } = require('./safetyGuard');
const { getPlatformAiConfig } = require('../db/queries/platform');
const { getCustomAiProviderRaw } = require('../db/queries/customAiProvider');

let anthropicClient;
let openaiClient;
let anthropicClientKey;
let openaiClientKey;

function getEnvPlatformConfig() {
  const anthropicKey = process.env.PLATFORM_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
  const openaiKey = process.env.PLATFORM_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
  const preferred = String(process.env.PLATFORM_AI_PROVIDER || process.env.AI_PROVIDER || '').trim().toLowerCase();
  const provider = preferred || (anthropicKey ? 'anthropic' : 'openai');

  return {
    provider,
    anthropicKey,
    openaiKey,
    anthropicModel: process.env.PLATFORM_ANTHROPIC_MODEL || process.env.ANTHROPIC_AI_MODEL || 'claude-sonnet-4-20250514',
    openaiModel: process.env.PLATFORM_OPENAI_MODEL || process.env.OPENAI_AI_MODEL || 'gpt-4o-mini',
  };
}

async function getPlatformConfig() {
  const envConfig = getEnvPlatformConfig();
  try {
    const dbConfig = await getPlatformAiConfig();
    return {
      provider: String(dbConfig.provider || envConfig.provider).trim().toLowerCase(),
      anthropicKey: String(dbConfig.providerCredentials?.anthropicApiKey || envConfig.anthropicKey || '').trim(),
      openaiKey: String(dbConfig.providerCredentials?.openaiApiKey || envConfig.openaiKey || '').trim(),
      anthropicModel: dbConfig.provider === 'anthropic'
        ? (dbConfig.activeModel || envConfig.anthropicModel)
        : envConfig.anthropicModel,
      openaiModel: dbConfig.provider === 'openai'
        ? (dbConfig.activeModel || envConfig.openaiModel)
        : envConfig.openaiModel,
      fallbackModel: String(dbConfig.fallbackModel || '').trim(),
      enabledModels: Array.isArray(dbConfig.enabledModels) ? dbConfig.enabledModels : [],
      safetyMode: dbConfig.safetyMode || 'strict',
      responseMode: dbConfig.responseMode || 'balanced',
      temperature: Number.isFinite(Number(dbConfig.temperature)) ? Number(dbConfig.temperature) : 0.3,
      topP: Number.isFinite(Number(dbConfig.topP)) ? Number(dbConfig.topP) : 1,
      source: 'database',
    };
  } catch {
    return {
      ...envConfig,
      fallbackModel: '',
      enabledModels: [],
      safetyMode: 'strict',
      responseMode: 'balanced',
      temperature: 0.3,
      topP: 1,
      source: 'environment',
    };
  }
}

function getAnthropicClient(apiKey) {
  if (!apiKey) return null;
  if (anthropicClient && anthropicClientKey !== apiKey) anthropicClient = null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
    anthropicClientKey = apiKey;
  }
  return anthropicClient;
}

function getOpenAIClient(apiKey) {
  if (!apiKey) return null;
  if (openaiClient && openaiClientKey !== apiKey) openaiClient = null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
    openaiClientKey = apiKey;
  }
  return openaiClient;
}

async function logSafetyDenial({ tenantId, purpose, guard, phase }) {
  try {
    await logAuditEvent({
      tenantId: tenantId || null,
      actorType: 'platform_ai',
      actorId: 'chator',
      action: 'ai.safety.denied',
      entityType: 'ai_request',
      entityId: guard.inputHash || null,
      metadata: {
        purpose,
        phase,
        category: guard.category,
        reason: guard.reason,
      },
    });
  } catch {
    // Safety logging must not make the user-facing refusal unavailable.
  }
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`AI completion timed out after ${ms}ms (${label})`)), ms)),
  ]);
}

async function completeTextWithMetadata({
  prompt,
  maxTokens = 300,
  tenantId = null,
  purpose = 'generic',
  temperature = 0.3,
  safetyInput = null,
  modelPreference = '',
  timeoutMs = 30000,
}) {
  const inputGuard = assessTextSafety(safetyInput == null ? prompt : safetyInput);
  if (!inputGuard.allowed) {
    await logSafetyDenial({ tenantId, purpose, guard: inputGuard, phase: 'input' });
    return {
      text: buildSafeRefusal(),
      provider: 'platform_guard',
      model: 'safety_guard',
      usage: { input_tokens: 0, output_tokens: 0 },
      safetyDenied: true,
      safetyCategory: inputGuard.category,
    };
  }

  const started = performance.now();
  const config = await getPlatformConfig();
  let provider = config.provider;
  let model = provider === 'anthropic' ? config.anthropicModel : config.openaiModel;
  const requestedModel = String(modelPreference || '').trim();
  const allowedModels = new Set([
    config.anthropicModel,
    config.openaiModel,
    config.fallbackModel,
    ...(Array.isArray(config.enabledModels) ? config.enabledModels : []),
  ].filter(Boolean));
  let text;
  let usage = {};

  const anthropic = getAnthropicClient(config.anthropicKey);
  const openai = getOpenAIClient(config.openaiKey);

  if ((provider === 'anthropic' || !openai) && anthropic) {
    provider = 'anthropic';
    model = requestedModel && allowedModels.has(requestedModel) ? requestedModel : config.anthropicModel;
    const response = await withTimeout(
      anthropic.messages.create({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
      timeoutMs,
      `anthropic/${model}`,
    );
    text = (response.content?.[0]?.text || '').trim();
    usage = response.usage || {};
  } else if (openai) {
    provider = 'openai';
    model = requestedModel && allowedModels.has(requestedModel) ? requestedModel : config.openaiModel;
    const response = await withTimeout(
      openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: Number.isFinite(Number(config.temperature)) ? Number(config.temperature) : temperature,
        max_tokens: maxTokens,
        top_p: Number.isFinite(Number(config.topP)) ? Number(config.topP) : 1,
      }),
      timeoutMs,
      `openai/${model}`,
    );
    text = (response.choices?.[0]?.message?.content || '').trim();
    usage = response.usage || {};
  } else {
    throw new Error('No platform AI provider configured. Set PLATFORM_ANTHROPIC_API_KEY or PLATFORM_OPENAI_API_KEY.');
  }

  const outputGuard = assessTextSafety(text);
  if (!outputGuard.allowed) {
    await logSafetyDenial({ tenantId, purpose, guard: outputGuard, phase: 'output' });
    text = buildSafeRefusal();
  }

  await recordAiUsage({
    tenantId,
    provider,
    model,
    purpose,
    status: outputGuard.allowed ? 'success' : 'blocked',
    tokensIn: usage.input_tokens || usage.prompt_tokens || 0,
    tokensOut: usage.output_tokens || usage.completion_tokens || 0,
    latencyMs: Math.round(performance.now() - started),
  }).catch(() => {});

  return {
    text,
    provider,
    model,
    usage,
    safetyDenied: !outputGuard.allowed,
    safetyCategory: outputGuard.allowed ? null : outputGuard.category,
  };
}

async function completeText(options) {
  const result = await completeTextWithMetadata(options || {});
  return result.text;
}

async function getPlatformAiStatus() {
  const config = await getPlatformConfig();
  return {
    provider: config.provider,
    configured: Boolean(config.anthropicKey || config.openaiKey),
    providers: {
      anthropic: {
        configured: Boolean(config.anthropicKey),
        model: config.anthropicModel,
      },
      openai: {
        configured: Boolean(config.openaiKey),
        model: config.openaiModel,
      },
    },
    managedByPlatform: true,
    tenantApiKeysAllowed: false,
    source: config.source || 'environment',
    fallbackModel: config.fallbackModel || '',
  };
}

async function getTenantConfig(tenantId) {
  if (!tenantId) return null;
  try {
    return await getCustomAiProviderRaw(tenantId);
  } catch {
    return null;
  }
}

async function completeTextWithMetadataForTenant(options) {
  const { tenantId } = options || {};
  const tenantProvider = await getTenantConfig(tenantId);
  if (!tenantProvider) return completeTextWithMetadata(options);

  const { provider, apiKey, model } = tenantProvider;
  const started = performance.now();
  const config = await getPlatformConfig();
  const safetyInput = options.safetyInput == null ? options.prompt : options.safetyInput;
  const inputGuard = assessTextSafety(safetyInput);
  if (!inputGuard.allowed) {
    await logSafetyDenial({ tenantId, purpose: options.purpose, guard: inputGuard, phase: 'input' });
    return { text: buildSafeRefusal(), provider: 'platform_guard', model: 'safety_guard', usage: {}, safetyDenied: true, safetyCategory: inputGuard.category };
  }

  let text;
  let usedModel = model;
  let usedProvider = provider;
  let usage = {};

  try {
    if (provider === 'anthropic') {
      const client = getAnthropicClient(apiKey);
      usedModel = model || config.anthropicModel;
      const response = await client.messages.create({ model: usedModel, max_tokens: options.maxTokens || 300, messages: [{ role: 'user', content: options.prompt }] });
      text = (response.content?.[0]?.text || '').trim();
      usage = response.usage || {};
    } else if (provider === 'openai') {
      const client = getOpenAIClient(apiKey);
      usedModel = model || config.openaiModel;
      const response = await client.chat.completions.create({ model: usedModel, messages: [{ role: 'user', content: options.prompt }], temperature: options.temperature || 0.3, max_tokens: options.maxTokens || 300 });
      text = (response.choices?.[0]?.message?.content || '').trim();
      usage = response.usage || {};
    } else if (provider === 'gemini') {
      let GoogleGenAI;
      try { ({ GoogleGenAI } = require('@google/genai')); } catch { return completeTextWithMetadata(options); }
      const client = new GoogleGenAI({ apiKey });
      usedModel = model || 'gemini-1.5-flash';
      const response = await client.models.generateContent({ model: usedModel, contents: options.prompt });
      text = (response.text || '').trim();
    } else {
      return completeTextWithMetadata(options);
    }
  } catch {
    return completeTextWithMetadata(options);
  }

  const outputGuard = assessTextSafety(text);
  if (!outputGuard.allowed) {
    await logSafetyDenial({ tenantId, purpose: options.purpose, guard: outputGuard, phase: 'output' });
    text = buildSafeRefusal();
  }

  await recordAiUsage({ tenantId, provider: usedProvider, model: usedModel, purpose: options.purpose || 'tenant_reply', status: outputGuard.allowed ? 'success' : 'blocked', tokensIn: usage.input_tokens || usage.prompt_tokens || 0, tokensOut: usage.output_tokens || usage.completion_tokens || 0, latencyMs: Math.round(performance.now() - started) }).catch(() => {});

  return { text, provider: usedProvider, model: usedModel, usage, safetyDenied: !outputGuard.allowed, safetyCategory: outputGuard.allowed ? null : outputGuard.category };
}

async function completeTextForTenant(options) {
  const result = await completeTextWithMetadataForTenant(options || {});
  return result.text;
}

module.exports = {
  completeText,
  completeTextWithMetadata,
  completeTextForTenant,
  completeTextWithMetadataForTenant,
  getPlatformConfig,
  getPlatformAiStatus,
};
