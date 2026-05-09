const { queryAdmin } = require('../db/pool');
const { normalizeTenantSettings } = require('../core/tenantSettings');
const { updateTenantSettings, updateKnowledgeBase } = require('../db/queries/tenants');
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

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueStrings(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((entry) => String(entry || '').trim())
    .filter(Boolean))];
}

function buildSuggestedDepartments(profile = {}) {
  const base = [];
  if ((profile.offerings || []).length || /sales|lead|quote|pricing/i.test((profile.customerIntentPatterns || []).join(' '))) {
    base.push({ name: 'Sales', description: 'Handles product questions, quotes, and lead conversion.', manager: '', slaTarget: 30, priority: 'high', active: true });
  }
  base.push({ name: 'Support', description: 'Handles customer help, troubleshooting, and follow-up.', manager: '', slaTarget: 60, priority: 'normal', active: true });
  if (/refund|return|delivery|invoice|payment/i.test(`${(profile.policies || []).map((entry) => entry.title || '').join(' ')} ${(profile.faqCandidates || []).join(' ')}`)) {
    base.push({ name: 'Operations', description: 'Handles fulfillment, billing, and operational escalations.', manager: '', slaTarget: 120, priority: 'normal', active: true });
  }
  return base.slice(0, 3);
}

function buildSuggestedTags(profile = {}) {
  const vertical = slugify(profile.vertical || profile.businessCategory);
  const language = slugify(profile.primaryLanguage);
  const offerings = uniqueStrings(profile.offerings || []).slice(0, 3).map(slugify);
  return uniqueStrings(['vip', vertical, language, ...offerings].filter(Boolean));
}

function buildSuggestedTriggers(profile = {}, departments = []) {
  const salesDepartment = departments.find((entry) => /sales/i.test(entry.name || ''))?.name || '';
  const operationsDepartment = departments.find((entry) => /operations|billing/i.test(entry.name || ''))?.name || '';
  const triggers = [
    {
      id: `trg_${slugify(profile.businessName || 'business')}_lead`,
      name: 'High-intent lead routing',
      event: 'message_received',
      conditionField: 'score',
      conditionOp: '>=',
      conditionValue: '70',
      actionType: salesDepartment ? 'assign_to' : 'add_tag',
      actionValue: salesDepartment || 'vip',
      active: true,
    },
  ];
  if (operationsDepartment) {
    triggers.push({
      id: `trg_${slugify(profile.businessName || 'business')}_billing`,
      name: 'Billing or delivery escalation',
      event: 'message_received',
      conditionField: 'keyword',
      conditionOp: 'contains',
      conditionValue: 'refund',
      actionType: 'assign_to',
      actionValue: operationsDepartment,
      active: true,
    });
  }
  return triggers;
}

function mergeProfileIntoSettings(profile = {}, rawSettings = {}, tenant = {}) {
  const settings = normalizeTenantSettings(rawSettings);
  const departments = settings.depts.length ? settings.depts : buildSuggestedDepartments(profile);
  const tags = settings.tags.length ? settings.tags : buildSuggestedTags(profile);
  const triggers = settings.triggers.length ? settings.triggers : buildSuggestedTriggers(profile, departments);

  settings.company = {
    ...settings.company,
    name: profile.businessName || settings.company.name || tenant.name || '',
    industry: profile.businessCategory || profile.vertical || settings.company.industry || '',
    description: profile.brandVoiceNotes || settings.company.description || '',
    website: profile.channels?.website || settings.company.website || tenant.settings?.company?.website || '',
    language: profile.primaryLanguage || settings.company.language || '',
    address: profile.locations?.[0] || settings.company.address || '',
  };
  settings.aiConfig = {
    ...settings.aiConfig,
    agentName: profile.agentName || settings.aiConfig.agentName,
    identity: {
      ...settings.aiConfig.identity,
      tone: profile.tone || settings.aiConfig.identity.tone,
      defaultLanguage: /arab/i.test(profile.primaryLanguage || '') ? 'ar' : (profile.primaryDialect || settings.aiConfig.identity.defaultLanguage),
      secondaryLanguage: /english/i.test(profile.primaryLanguage || '') ? 'en' : settings.aiConfig.identity.secondaryLanguage,
      brandPersonality: profile.brandVoiceNotes || settings.aiConfig.identity.brandPersonality,
      persona: profile.supportStyle || settings.aiConfig.identity.persona,
      greetingStyle: profile.supportStyle || settings.aiConfig.identity.greetingStyle,
    },
    leadQualification: {
      ...settings.aiConfig.leadQualification,
      targetCustomers: uniqueStrings(profile.targetCustomers || []),
      leadQualificationHints: uniqueStrings(profile.leadQualificationHints || []),
      customerIntentPatterns: uniqueStrings(profile.customerIntentPatterns || []),
    },
  };
  settings.depts = departments;
  settings.tags = tags;
  settings.tagMeta = {
    ...settings.tagMeta,
    ...Object.fromEntries(tags.map((tag) => [tag, settings.tagMeta[tag] || {
      color: tag === 'vip' ? '#f59e0b' : '#64748b',
      category: 'ai_suggested',
      description: `AI-suggested tag for ${profile.businessName || tenant.name || 'this workspace'}.`,
    }])),
  };
  settings.triggers = triggers;
  settings.onboarding = {
    ...(settings.onboarding || {}),
    aiSuggestions: {
      refreshedAt: new Date().toISOString(),
      likelyDepartments: uniqueStrings(profile.likelyDepartments || departments.map((entry) => entry.name)),
      routingSuggestions: Array.isArray(profile.routingSuggestions) ? profile.routingSuggestions : [],
      suggestedTags: tags,
      suggestedTriggers: triggers,
    },
  };

  return settings;
}

function heuristicProfile(tenant = {}, chunks = []) {
  const combined = chunks.map((chunk) => chunk.content).join('\n').slice(0, 8000);
  const normalized = combined.toLowerCase();
  const language = /[\u0600-\u06ff]/.test(combined) ? 'arabic' : 'english';
  const faqCandidates = chunks
    .filter((chunk) => /\?/.test(chunk.content) || /faq|question|shipping|return|delivery/i.test(chunk.content))
    .slice(0, 8)
    .map((chunk) => chunk.heading || chunk.title)
    .filter(Boolean);
  const hasMeaningfulContent = combined.replace(/\s+/g, '').length >= 200;
  const isSaas = /software|saas|automation platform|revenue operating system|crm|customer support platform|sales platform|conversation platform|ai-powered sales/i.test(normalized)
    || ((/dashboard|api|integrations?/i.test(normalized)) && (/automation|platform|software|ai/i.test(normalized)));
  const isHospitality = /hotel|beachfront hotel|resort|guest house|guesthouse|rooms|room types|check-in|check out|book your stay|restaurant|private beach|accommodation|reception/i.test(normalized);
  const isTransportation = /taxi|airport transfer|airport transfers|chauffeur|shuttle|ride|driver|pickup|drop off|drop-off|transfer service|transport/i.test(normalized);
  const isTravel = /travel|tour|tourism|airport|hotel|excursion|trip/i.test(normalized);
  const isRealEstate = /real estate|property|apartment|villa|rental/i.test(normalized);
  const inferredCategory = isSaas
    ? 'Software'
    : isHospitality
    ? 'Hospitality'
    : isTransportation
    ? 'Transportation'
    : isRealEstate
      ? 'Real estate'
      : isTravel
        ? 'Travel'
        : '';
  const inferredModel = /subscription|monthly|plan/i.test(normalized)
    ? 'subscription'
    : /service|consultation|booking|reservation|chauffeur|transfer|ride|stay|room/i.test(normalized)
      ? 'services'
      : '';
  const inferredVertical = isSaas
    ? 'saas'
    : isHospitality
    ? 'hotel_hospitality'
    : isTransportation
    ? 'transportation'
    : isRealEstate
      ? 'real_estate'
      : isTravel
        ? 'travel'
        : '';
  const inferredOfferings = uniqueStrings(chunks
    .map((chunk) => chunk.heading || chunk.title)
    .filter(Boolean))
    .slice(0, 8);
  const transportationOfferings = isSaas
    ? uniqueStrings([
      ...inferredOfferings,
      /whatsapp|instagram|messenger|live chat/i.test(normalized) ? 'Multi-channel messaging platform' : '',
      /ai-powered|automation|ai replies|intent detection|lead scoring/i.test(normalized) ? 'AI sales automation' : '',
      /dashboard|analytics|reports/i.test(normalized) ? 'Dashboard and analytics' : '',
      /integrat|shopify|woocommerce|salla|zid/i.test(normalized) ? 'Commerce integrations' : '',
    ])
    : isHospitality
    ? uniqueStrings([
      ...inferredOfferings,
      /room|rooms|suite|apartment|chalet|accommodation|stay/i.test(normalized) ? 'Rooms and accommodation' : '',
      /restaurant|dining|breakfast|buffet|tajine|bbq|coffee bar/i.test(normalized) ? 'Restaurant and dining' : '',
      /pool|private beach|beach access|swimming pool/i.test(normalized) ? 'Beach and pool amenities' : '',
      /dive|diving|snorkel|snorkeling|blue hole/i.test(normalized) ? 'Diving and snorkeling experiences' : '',
      /yoga|massage|wellness/i.test(normalized) ? 'Yoga and wellness' : '',
      /airport transfer/i.test(normalized) ? 'Airport transfers' : '',
      /tour|excursion|desert/i.test(normalized) ? 'Tours and excursions' : '',
    ])
    : isTransportation
    ? uniqueStrings([
      ...inferredOfferings,
      /airport transfer/i.test(normalized) ? 'Airport transfers' : '',
      /chauffeur/i.test(normalized) ? 'Chauffeur service' : '',
      /city transfer|city ride/i.test(normalized) ? 'City transfers' : '',
      /private taxi|private transfer/i.test(normalized) ? 'Private taxi service' : '',
      /tour/i.test(normalized) ? 'Tours and excursions' : '',
    ])
    : inferredOfferings;

  if (!hasMeaningfulContent) {
    return {
      businessName: tenant.name || '',
      businessCategory: tenant.settings?.company?.industry || '',
      businessModel: '',
      vertical: '',
      offerings: [],
      policies: [],
      tone: '',
      primaryLanguage: '',
      primaryDialect: '',
      supportStyle: '',
      leadQualificationHints: [],
      customerIntentPatterns: [],
      productServiceTypes: [],
      agentName: 'Chator Assistant',
      openingHours: '',
      locations: [],
      faqCandidates: [],
      faqs: [],
      knowledge: [],
      brandVoiceNotes: '',
      targetCustomers: [],
      likelyDepartments: [],
      routingSuggestions: [],
      suggestedTags: [],
      suggestedTriggers: [],
    };
  }

  return {
    businessName: tenant.name || '',
    businessCategory: inferredCategory,
    businessModel: inferredModel,
    vertical: inferredVertical,
    offerings: transportationOfferings,
    policies: chunks
      .filter((chunk) => /return|refund|shipping|delivery|privacy|terms/i.test(chunk.content))
      .slice(0, 8)
      .map((chunk) => ({ title: chunk.heading || chunk.title, source: chunk.source_url })),
    tone: isSaas
      ? 'professional and product-focused'
      : isHospitality
      ? 'warm, professional, and welcoming'
      : isTransportation ? 'professional, helpful, and reassuring' : 'professional and helpful',
    primaryLanguage: language,
    primaryDialect: language === 'arabic' ? 'ar-msa' : 'en',
    supportStyle: isSaas
      ? 'helpful, concise, and solution-oriented'
      : isHospitality ? 'helpful, concise, and reservation-focused' : 'helpful, concise, and sales-aware',
    leadQualificationHints: ['Need', 'budget', 'timeline', 'preferred product or service'],
    customerIntentPatterns: isSaas
      ? ['demo request', 'pricing question', 'integration question', 'support request']
      : isHospitality
      ? ['room availability inquiry', 'booking request', 'amenities question', 'airport transfer question']
      : isTransportation
      ? ['airport transfer request', 'availability check', 'destination pricing', 'pickup coordination']
      : ['product inquiry', 'price question', 'availability check', 'support request'],
    productServiceTypes: transportationOfferings,
    agentName: 'Chator Assistant',
    openingHours: '',
    locations: [],
    faqCandidates,
    faqs: faqCandidates.map((entry) => ({ question: entry, answer: '' })),
    knowledge: [],
    brandVoiceNotes: isSaas
      ? 'Software platform focused on AI-powered messaging, automation, and revenue operations.'
      : isHospitality
      ? 'Hospitality business offering beachfront stays, on-site amenities, and guest experiences for travelers visiting Dahab.'
      : isTransportation
      ? 'Transportation and transfer business serving travelers who need reliable booking and pickup coordination.'
      : '',
    targetCustomers: isSaas
      ? ['Sales teams', 'Support teams', 'Commerce brands']
      : isHospitality
      ? ['Travelers', 'Tourists', 'Families']
      : isTransportation
      ? ['Travelers', 'Tourists', 'Business travelers']
      : [],
    likelyDepartments: isSaas ? ['Sales', 'Support', 'Operations'] : isHospitality ? ['Reservations', 'Support', 'Operations'] : isTransportation ? ['Sales', 'Support', 'Operations'] : [],
    routingSuggestions: isSaas
      ? [{ when: 'Demo or pricing request', assignTo: 'Sales', reason: 'High-intent software lead needs product or pricing guidance.' }]
      : isHospitality
      ? [{ when: 'Booking or room availability request', assignTo: 'Reservations', reason: 'Guest needs reservation handling or stay details.' }]
      : isTransportation
      ? [{ when: 'Transfer or booking request', assignTo: 'Sales', reason: 'High-intent travel lead needing quote or confirmation.' }]
      : [],
    suggestedTags: isSaas ? ['vip', 'software', 'automation'] : isHospitality ? ['vip', 'hospitality', 'travelers'] : isTransportation ? ['vip', 'transportation', 'travelers'] : [],
    suggestedTriggers: isSaas
      ? [{
        name: 'Route demo requests',
        event: 'message_received',
        conditionField: 'keyword',
        conditionOp: 'contains',
        conditionValue: 'demo',
        actionType: 'assign_to',
        actionValue: 'Sales',
      }]
      : isHospitality
      ? [{
        name: 'Route booking requests',
        event: 'message_received',
        conditionField: 'keyword',
        conditionOp: 'contains',
        conditionValue: 'book',
        actionType: 'assign_to',
        actionValue: 'Reservations',
      }]
      : isTransportation
      ? [{
        name: 'Route transfer booking requests',
        event: 'message_received',
        conditionField: 'keyword',
        conditionOp: 'contains',
        conditionValue: 'airport',
        actionType: 'assign_to',
        actionValue: 'Sales',
      }]
      : [],
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

  return saveTenantProfile(tenantId, profile, 'draft', { sourceJobId: latestJob, tenant });
}

async function getTenantProfile(tenantId) {
  const result = await queryAdmin(
    'SELECT * FROM tenant_profiles WHERE tenant_id = $1 LIMIT 1',
    [tenantId]
  );
  return result.rows[0] || null;
}

async function saveTenantProfile(tenantId, profile, status = 'reviewed', options = {}) {
  const tenant = options.tenant || await queryAdmin(
    'SELECT id, name, email, settings FROM tenants WHERE id = $1 LIMIT 1',
    [tenantId]
  ).then((result) => result.rows[0] || null);
  const result = await queryAdmin(
    `INSERT INTO tenant_profiles (tenant_id, source_job_id, profile, status, reviewed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id) DO UPDATE
       SET source_job_id = COALESCE(EXCLUDED.source_job_id, tenant_profiles.source_job_id),
           profile = EXCLUDED.profile,
           status = EXCLUDED.status,
           reviewed_at = EXCLUDED.reviewed_at,
           updated_at = NOW()
     RETURNING *`,
    [
      tenantId,
      options.sourceJobId || null,
      JSON.stringify(profile || {}),
      status,
      status === 'reviewed' ? new Date().toISOString() : null,
    ]
  );

  if (tenant) {
    await updateKnowledgeBase(tenantId, buildKnowledgeBaseFromProfile(profile || {}, tenant)).catch(() => {});
    await updateTenantSettings(
      tenantId,
      mergeProfileIntoSettings(profile || {}, tenant.settings || {}, tenant),
    ).catch(() => {});
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
  mergeProfileIntoSettings,
};
