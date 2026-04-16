const Anthropic = require('@anthropic-ai/sdk');

const { query } = require('../db/pool');
const { getKnowledgeChunks } = require('../ingest/ingestionJob');

function heuristicProfile(tenant = {}, chunks = []) {
  const combined = chunks.map((chunk) => chunk.content).join('\n').slice(0, 8000);
  const language = /[\u0600-\u06ff]/.test(combined) ? 'arabic' : 'english';
  const faqCandidates = chunks
    .filter((chunk) => /\?/.test(chunk.content) || /faq|question|shipping|return|delivery/i.test(chunk.content))
    .slice(0, 8)
    .map((chunk) => chunk.heading || chunk.title)
    .filter(Boolean);

  return {
    businessName: tenant.name || '',
    vertical: /real estate|property|apartment/i.test(combined) ? 'real_estate'
      : /hotel|travel|tour/i.test(combined) ? 'tourism'
        : 'ecommerce',
    offerings: chunks.slice(0, 8).map((chunk) => chunk.heading || chunk.title).filter(Boolean),
    policies: chunks
      .filter((chunk) => /return|refund|shipping|delivery|privacy|terms/i.test(chunk.content))
      .slice(0, 8)
      .map((chunk) => ({ title: chunk.heading || chunk.title, source: chunk.source_url })),
    tone: 'professional and helpful',
    primaryLanguage: language,
    primaryDialect: language === 'arabic' ? 'ar-msa' : 'en',
    openingHours: '',
    locations: [],
    faqCandidates,
    brandVoiceNotes: 'Generated from crawled website content and tenant metadata.',
  };
}

async function callClaudeForProfile(tenant, chunks) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const content = chunks
    .slice(0, 30)
    .map((chunk) => `Source: ${chunk.source_url}\n${chunk.content}`)
    .join('\n\n---\n\n')
    .slice(0, 50000);

  const prompt = `Analyze this business content and return JSON only.

Schema:
{
  "businessName": string,
  "vertical": string,
  "offerings": string[],
  "policies": [{"title": string, "source": string}],
  "tone": string,
  "primaryLanguage": string,
  "primaryDialect": string,
  "openingHours": string,
  "locations": string[],
  "faqCandidates": string[],
  "brandVoiceNotes": string
}

Tenant name: ${tenant.name}
Tenant email: ${tenant.email}

Content:
${content}`;

  const response = await client.messages.create({
    model: process.env.ANTHROPIC_ANALYSIS_MODEL || 'claude-3-5-sonnet-20240620',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content?.[0]?.text || '{}';
  return JSON.parse(text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, ''));
}

async function analyzeBusinessProfile(tenantId) {
  const [tenantResult, chunks] = await Promise.all([
    query('SELECT id, name, email, settings FROM tenants WHERE id = $1', [tenantId]),
    getKnowledgeChunks(tenantId, { limit: 250 }),
  ]);

  const tenant = tenantResult.rows[0];
  if (!tenant) {
    const err = new Error('Tenant not found');
    err.status = 404;
    throw err;
  }

  let profile = null;
  try {
    profile = await callClaudeForProfile(tenant, chunks);
  } catch {
    profile = null;
  }

  if (!profile) profile = heuristicProfile(tenant, chunks);

  const latestJob = await query(
    `SELECT id
     FROM ingestion_jobs
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId]
  ).then((result) => result.rows[0]?.id || null);

  const saved = await query(
    `INSERT INTO tenant_profiles (tenant_id, source_job_id, profile, status)
     VALUES ($1, $2, $3, 'draft')
     ON CONFLICT (tenant_id) DO UPDATE
       SET source_job_id = EXCLUDED.source_job_id,
           profile = EXCLUDED.profile,
           status = 'draft',
           updated_at = NOW()
     RETURNING *`,
    [tenantId, latestJob, JSON.stringify(profile)]
  );

  return saved.rows[0];
}

async function getTenantProfile(tenantId) {
  const result = await query(
    'SELECT * FROM tenant_profiles WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  return result.rows[0] || null;
}

async function saveTenantProfile(tenantId, profile, status = 'reviewed') {
  const result = await query(
    `INSERT INTO tenant_profiles (tenant_id, profile, status, reviewed_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (tenant_id) DO UPDATE
       SET profile = EXCLUDED.profile,
           status = EXCLUDED.status,
           reviewed_at = NOW(),
           updated_at = NOW()
     RETURNING *`,
    [tenantId, JSON.stringify(profile || {}), status]
  );
  return result.rows[0];
}

module.exports = {
  analyzeBusinessProfile,
  getTenantProfile,
  saveTenantProfile,
  heuristicProfile,
};
