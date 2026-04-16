/**
 * Business understanding generator — Task 1-C5.
 *
 * Input:  tenantId + optional ingestionJobId (to use specific crawl)
 * Output: TenantProfile row with structured business understanding
 *
 * Uses Claude Opus to extract a typed profile from KnowledgeChunks.
 * Stores result in tenant_profiles table (upsert).
 *
 * Profile schema (Zod-typed):
 * {
 *   businessName, vertical, offerings[], policies[], tone, primaryLanguage,
 *   primaryDialect, openingHours, locations[], faqCandidates[], brandVoiceNotes
 * }
 */
const { z } = require('zod');
const Anthropic = require('@anthropic-ai/sdk');
const { getPrisma } = require('@chatorai/db');

const ProfileSchema = z.object({
  businessName: z.string().min(1),
  vertical: z.string().describe(
    'Industry vertical, e.g. ecommerce, real_estate, tourism, hospitality, education, healthcare, other',
  ),
  offerings: z.array(z.string()).describe('Products or services offered'),
  policies: z.array(z.string()).describe('Return, shipping, privacy, or other policies'),
  tone: z.enum(['formal', 'friendly', 'casual', 'professional', 'luxury']).default('professional'),
  primaryLanguage: z.string().default('en').describe('ISO 639-1 code'),
  primaryDialect: z.string().optional().describe('e.g. gulf_arabic, egyptian_arabic, levantine'),
  openingHours: z.string().optional(),
  locations: z.array(z.string()).default([]).describe('Physical locations or service areas'),
  faqCandidates: z.array(z.string()).default([]).describe('Common questions customers ask'),
  brandVoiceNotes: z.string().optional().describe('Tone and style guidelines'),
});

const MAX_CHUNKS = 20;
const MAX_CHUNK_CHARS = 1500;
const MODEL = 'claude-opus-4-6';

/**
 * Generate (or refresh) the TenantProfile for a tenant.
 *
 * @param {string} tenantId
 * @param {object} opts
 * @param {string} [opts.ingestionJobId] — scope chunks to a specific job
 * @param {boolean} [opts.force=false] — re-generate even if profile exists
 * @returns {Promise<object>} The saved TenantProfile row
 */
async function generateBusinessProfile(tenantId, { ingestionJobId, force = false } = {}) {
  const prisma = getPrisma();

  // Skip if an approved profile already exists and force is not set
  if (!force) {
    const existing = await prisma.tenantProfile.findUnique({ where: { tenantId } });
    if (existing?.status === 'approved') return existing;
  }

  // Fetch top knowledge chunks
  const where = { tenantId, ...(ingestionJobId ? { jobId: ingestionJobId } : {}) };
  const chunks = await prisma.knowledgeChunk.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: MAX_CHUNKS,
    select: { title: true, heading: true, content: true, sourceUrl: true },
  });

  if (chunks.length === 0) {
    throw new Error(`No knowledge chunks found for tenant ${tenantId}. Run an ingestion job first.`);
  }

  const context = chunks
    .map((c, i) => {
      const header = [c.title, c.heading].filter(Boolean).join(' › ');
      const body = c.content.slice(0, MAX_CHUNK_CHARS);
      return `--- Chunk ${i + 1}${header ? ` [${header}]` : ''} ---\n${body}`;
    })
    .join('\n\n');

  const systemPrompt = `You are a business intelligence analyst. Extract a structured profile from the website content below.
Respond ONLY with valid JSON that matches this TypeScript interface exactly:
{
  businessName: string;
  vertical: string;           // e.g. ecommerce, real_estate, tourism, hospitality, education, healthcare, other
  offerings: string[];        // products or services offered
  policies: string[];         // return, shipping, privacy, or other policies
  tone: "formal" | "friendly" | "casual" | "professional" | "luxury";
  primaryLanguage: string;    // ISO 639-1 code
  primaryDialect?: string;    // e.g. gulf_arabic, egyptian_arabic
  openingHours?: string;
  locations: string[];
  faqCandidates: string[];    // common customer questions inferred from content
  brandVoiceNotes?: string;
}

Rules:
- Do not invent data not present in the content.
- For missing optional fields, omit them or use empty arrays.
- brandVoiceNotes: describe the communication style in 1-2 sentences.
- faqCandidates: list 5-10 questions customers would likely ask.`;

  const userPrompt = `Extract the business profile from this website content:\n\n${context}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const raw = message.content?.[0]?.text || '';

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
  const jsonStr = jsonMatch[1].trim();

  let profile;
  try {
    profile = ProfileSchema.parse(JSON.parse(jsonStr));
  } catch (err) {
    throw new Error(`Failed to parse business profile JSON: ${err.message}\nRaw: ${raw.slice(0, 500)}`);
  }

  // Upsert into tenant_profiles
  const row = await prisma.tenantProfile.upsert({
    where: { tenantId },
    create: {
      tenantId,
      sourceJobId: ingestionJobId || null,
      profile,
      status: 'draft',
    },
    update: {
      sourceJobId: ingestionJobId || undefined,
      profile,
      status: 'draft',
    },
  });

  return row;
}

module.exports = { generateBusinessProfile, ProfileSchema };
