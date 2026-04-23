const { queryAdmin } = require('../db/pool');
const { getKnowledgeChunks } = require('../ingest/ingestionJob');
const { completeText } = require('./completionClient');

function buildKnowledgeBaseFromProfile(profile = {}, tenant = {}) {
  return {
    company: {
      name: profile.businessName || tenant.name || '',
      category: profile.businessCategory || '',
      model: profile.businessModel || '',
      vertical: profile.vertical || '',
      tone: profile.tone || '',
      language: profile.primaryLanguage || '',
      dialect: profile.primaryDialect || '',
      supportStyle: profile.supportStyle || '',
      locations: Array.isArray(profile.locations) ? profile.locations : [],
      openingHours: profile.openingHours || '',
      website: tenant.settings?.company?.website || '',
      email: tenant.email || '',
    },
    offerings: Array.isArray(profile.offerings) ? profile.offerings : [],
    policies: Array.isArray(profile.policies) ? profile.policies : [],
    faqs: Array.isArray(profile.faqs)
      ? profile.faqs
      : (Array.isArray(profile.faqCandidates)
        ? profile.faqCandidates.map((entry) => ({ question: entry, answer: '' }))
        : []),
    knowledge: Array.isArray(profile.knowledge) ? profile.knowledge : [],
    leadQualificationHints: Array.isArray(profile.leadQualificationHints) ? profile.leadQualificationHints : [],
    customerIntentPatterns: Array.isArray(profile.customerIntentPatterns) ? profile.customerIntentPatterns : [],
    brandVoiceNotes: profile.brandVoiceNotes || '',
  };
}

function buildFallbackProfile(tenant = {}) {
  const company = tenant.settings?.company || {};
  return {
    businessName: company.name || tenant.name || '',
    businessCategory: company.industry || 'Commerce',
    businessModel: 'online sales',
    vertical: 'ecommerce',
    offerings: [],
    policies: [],
    tone: 'professional and helpful',
    primaryLanguage: company.language || 'arabic',
    primaryDialect: 'ar',
    supportStyle: 'helpful and concise',
    leadQualificationHints: [],
    customerIntentPatterns: [],
    productServiceTypes: [],
    agentName: tenant.settings?.aiConfig?.agentName || 'Chator Assistant',
    openingHours: '',
    locations: company.address ? [company.address] : [],
    faqCandidates: [],
    faqs: [],
    knowledge: [],
    brandVoiceNotes: company.description || '',
  };
}

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
    businessCategory: /real estate|property|apartment/i.test(combined) ? 'Real estate'
      : /hotel|travel|tour/i.test(combined) ? 'Tourism'
        : 'Commerce',
    businessModel: /subscription|monthly|plan/i.test(combined) ? 'subscription'
      : /service|consultation|booking/i.test(combined) ? 'services'
        : 'online sales',
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
    supportStyle: 'helpful, concise, and sales-aware',
    leadQualificationHints: ['Need', 'budget', 'timeline', 'preferred product or service'],
    customerIntentPatterns: ['product inquiry', 'price question', 'availability check', 'support request'],
    productServiceTypes: chunks.slice(0, 8).map((chunk) => chunk.heading || chunk.title).filter(Boolean),
    agentName: 'Chator Assistant',
    openingHours: '',
    locations: [],
    faqCandidates,
    faqs: faqCandidates.map((entry) => ({ question: entry, answer: '' })),
    knowledge: [],
    brandVoiceNotes: 'Generated from crawled website content and tenant metadata.',
  };
}

async function callPlatformAiForProfile(tenant, chunks) {
  const content = chunks
    .slice(0, 30)
    .map((chunk) => `Source: ${chunk.source_url}\n${chunk.content}`)
    .join('\n\n---\n\n')
    .slice(0, 50000);

  const prompt = `Analyze this business content and return JSON only.

Schema:
{
  "businessName": string,
  "businessCategory": string,
  "businessModel": string,
  "vertical": string,
  "offerings": string[],
  "policies": [{"title": string, "source": string}],
  "tone": string,
  "primaryLanguage": string,
  "primaryDialect": string,
  "supportStyle": string,
  "leadQualificationHints": string[],
  "customerIntentPatterns": string[],
  "productServiceTypes": string[],
  "agentName": string,
  "openingHours": string,
  "locations": string[],
  "faqCandidates": string[],
  "brandVoiceNotes": string
}

Tenant name: ${tenant.name}
Tenant email: ${tenant.email}

Content:
${content}`;

  const text = await completeText({
    tenantId: tenant.id,
    prompt,
    maxTokens: 2000,
    purpose: 'business_profile_analysis',
    safetyInput: tenant.name,
  });
  return JSON.parse(text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, ''));
}

async function analyzeBusinessProfile(tenantId) {
  const [tenantResult, chunks] = await Promise.all([
    queryAdmin('SELECT id, name, email, settings FROM tenants WHERE id = $1', [tenantId]),
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
    profile = await callPlatformAiForProfile(tenant, chunks);
  } catch {
    profile = null;
  }

  if (!profile) profile = heuristicProfile(tenant, chunks);

  const latestJob = await queryAdmin(
    `SELECT id
     FROM ingestion_jobs
     WHERE tenant_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [tenantId]
  ).then((result) => result.rows[0]?.id || null);

  const saved = await queryAdmin(
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
  const result = await queryAdmin(
    'SELECT * FROM tenant_profiles WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  return result.rows[0] || null;
}

async function saveTenantProfile(tenantId, profile, status = 'reviewed') {
  const tenant = await queryAdmin(
    'SELECT id, name, email, settings FROM tenants WHERE id = $1 LIMIT 1',
    [tenantId]
  ).then((result) => result.rows[0] || null);
  const result = await queryAdmin(
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

  if (tenant) {
    await queryAdmin(
      'UPDATE tenants SET knowledge_base = $1 WHERE id = $2',
      [JSON.stringify(buildKnowledgeBaseFromProfile(profile || {}, tenant)), tenantId]
    );
  }

  return result.rows[0];
}

async function ensureTenantBusinessProfile(tenantId, tenant = null) {
  const existing = await getTenantProfile(tenantId);
  if (existing?.profile && Object.keys(existing.profile).length > 0) return existing;

  const tenantRow = tenant || await queryAdmin(
    'SELECT id, name, email, settings FROM tenants WHERE id = $1 LIMIT 1',
    [tenantId]
  ).then((result) => result.rows[0] || null);
  if (!tenantRow) return null;

  const fallbackProfile = buildFallbackProfile(tenantRow);
  return saveTenantProfile(tenantId, fallbackProfile, 'draft');
}

async function getTenantBusinessContext(tenantId, tenant = null) {
  const ensured = await ensureTenantBusinessProfile(tenantId, tenant);
  const tenantRow = tenant || await queryAdmin(
    'SELECT id, name, email, settings, knowledge_base FROM tenants WHERE id = $1 LIMIT 1',
    [tenantId]
  ).then((result) => result.rows[0] || null);

  const profile = ensured?.profile || {};
  const existingKnowledge = tenantRow?.knowledge_base && typeof tenantRow.knowledge_base === 'object'
    ? tenantRow.knowledge_base
    : {};
  const profileKnowledge = buildKnowledgeBaseFromProfile(profile, tenantRow || {});

  return {
    profile,
    knowledgeBase: {
      ...existingKnowledge,
      business_profile: profile,
      company: {
        ...(existingKnowledge.company || {}),
        ...(profileKnowledge.company || {}),
      },
      offerings: profileKnowledge.offerings,
      policies: profileKnowledge.policies,
      faqs: profileKnowledge.faqs,
      knowledge: profileKnowledge.knowledge,
      brandVoiceNotes: profileKnowledge.brandVoiceNotes,
    },
  };
}

module.exports = {
  analyzeBusinessProfile,
  buildKnowledgeBaseFromProfile,
  ensureTenantBusinessProfile,
  getTenantBusinessContext,
  getTenantProfile,
  saveTenantProfile,
  heuristicProfile,
};
