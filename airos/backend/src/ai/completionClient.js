const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { performance } = require('perf_hooks');

const { logAuditEvent } = require('../db/queries/audit');
const { recordAiUsage } = require('../core/telemetry');
const { assessTextSafety, buildSafeRefusal } = require('./safetyGuard');

let anthropicClient;
let openaiClient;
let anthropicClientKey;
let openaiClientKey;

function getPlatformConfig() {
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

async function completeTextWithMetadata({
  prompt,
  maxTokens = 300,
  tenantId = null,
  purpose = 'generic',
  temperature = 0.3,
  safetyInput = null,
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
  const config = getPlatformConfig();
  let provider = config.provider;
  let model = provider === 'anthropic' ? config.anthropicModel : config.openaiModel;
  let text;
  let usage = {};

  const anthropic = getAnthropicClient(config.anthropicKey);
  const openai = getOpenAIClient(config.openaiKey);

  if ((provider === 'anthropic' || !openai) && anthropic) {
    provider = 'anthropic';
    model = config.anthropicModel;
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    text = (response.content?.[0]?.text || '').trim();
    usage = response.usage || {};
  } else if (openai) {
    provider = 'openai';
    model = config.openaiModel;
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    });
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

function getPlatformAiStatus() {
  const config = getPlatformConfig();
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
  };
}

module.exports = {
  completeText,
  completeTextWithMetadata,
  getPlatformAiStatus,
};
