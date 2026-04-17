/**
 * Initial settings generator — Task 1-C6.
 *
 * Takes a TenantProfile (from 1-C5) and generates the full workspace
 * settings scaffold via Claude Opus.
 *
 * Output stored as structured JSON in Tenant.settings under key "generated":
 * {
 *   routingRules, tags, cannedReplies, qualificationForm,
 *   leadScoringModel, agentPersona, workflows
 * }
 *
 * All fields are editable in the review UI (Codex owns UI; this provides the API).
 */
const { z } = require('zod');
const Anthropic = require('@anthropic-ai/sdk');
const { getPrisma } = require('@chatorai/db');

const MODEL = 'claude-opus-4-6';

const SettingsSchema = z.object({
  routingRules: z.array(
    z.object({
      condition: z.string().describe('e.g. language=ar, intent=purchase_intent'),
      action: z.string().describe('e.g. assign_queue:arabic_agents, set_priority:high'),
    }),
  ).default([]),

  tags: z.array(
    z.object({
      name: z.string(),
      color: z.string().default('#6366f1'),
      description: z.string().optional(),
    }),
  ).default([]),

  cannedReplies: z.array(
    z.object({
      shortcut: z.string().describe('slash-command shortcut, e.g. /welcome'),
      title: z.string(),
      body: z.string(),
      language: z.string().default('en'),
    }),
  ).default([]),

  qualificationForm: z.object({
    fields: z.array(
      z.object({
        name: z.string(),
        label: z.string(),
        type: z.enum(['text', 'select', 'number', 'boolean']),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
      }),
    ),
  }).default({ fields: [] }),

  leadScoringModel: z.object({
    signals: z.array(
      z.object({
        signal: z.string().describe('e.g. asked_about_price, provided_contact_info'),
        weight: z.number().min(-10).max(10),
      }),
    ),
  }).default({ signals: [] }),

  agentPersona: z.object({
    name: z.string().default('AI Assistant'),
    tone: z.string().default('professional'),
    language: z.string().default('en'),
    systemPromptSnippet: z.string().describe('Short system-level persona instruction for AI replies'),
  }).default({ name: 'AI Assistant', tone: 'professional', language: 'en', systemPromptSnippet: '' }),

  workflows: z.array(
    z.object({
      trigger: z.string().describe('e.g. conversation_opened, intent=purchase_intent'),
      steps: z.array(z.string()).describe('Action steps e.g. ["send_canned_reply:/welcome", "assign_to_sales"]'),
      name: z.string(),
    }),
  ).default([]),
});

/**
 * Generate initial workspace settings from a TenantProfile.
 *
 * @param {string} tenantId
 * @param {object} opts
 * @param {boolean} [opts.force=false] — overwrite existing generated settings
 * @returns {Promise<object>} The generated settings object
 */
async function generateInitialSettings(tenantId, { force = false } = {}) {
  const prisma = getPrisma();

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { tenantProfile: true },
  });

  if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
  if (!tenant.tenantProfile) {
    throw new Error(`No TenantProfile for tenant ${tenantId}. Run generateBusinessProfile first.`);
  }

  const currentSettings = tenant.settings || {};
  if (!force && currentSettings.generated) return currentSettings.generated;

  const profile = tenant.tenantProfile.profile;

  const systemPrompt = `You are a customer experience architect. Given a structured business profile, generate workspace settings for a conversational AI platform.
Respond ONLY with valid JSON matching this structure:
{
  routingRules: Array<{ condition: string; action: string }>;
  tags: Array<{ name: string; color: string; description?: string }>;
  cannedReplies: Array<{ shortcut: string; title: string; body: string; language: string }>;
  qualificationForm: { fields: Array<{ name: string; label: string; type: "text"|"select"|"number"|"boolean"; required: boolean; options?: string[] }> };
  leadScoringModel: { signals: Array<{ signal: string; weight: number }> };
  agentPersona: { name: string; tone: string; language: string; systemPromptSnippet: string };
  workflows: Array<{ trigger: string; steps: string[]; name: string }>;
}

Rules:
- Generate cannedReplies in ALL languages detected in the profile (at minimum: English + primaryLanguage).
- For Arabic businesses, include RTL-ready canned replies in Arabic.
- Tags should cover intents and topics relevant to the vertical.
- routingRules should route by language, intent, and urgency.
- leadScoringModel signals must be relevant to the business vertical.
- agentPersona.systemPromptSnippet must be 2-3 sentences embodying the brand voice.
- workflows: at minimum include welcome flow and purchase-intent escalation.`;

  const userPrompt = `Generate initial workspace settings for this business:\n\n${JSON.stringify(profile, null, 2)}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const raw = message.content?.[0]?.text || '';
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
  const jsonStr = jsonMatch[1].trim();

  let generated;
  try {
    generated = SettingsSchema.parse(JSON.parse(jsonStr));
  } catch (err) {
    throw new Error(`Failed to parse settings JSON: ${err.message}\nRaw: ${raw.slice(0, 500)}`);
  }

  // Persist into Tenant.settings.generated (merge, don't overwrite entire settings)
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...currentSettings,
        generated,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  return generated;
}

module.exports = { generateInitialSettings, SettingsSchema };
