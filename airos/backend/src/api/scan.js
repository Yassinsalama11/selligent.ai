const express = require('express');

const { completeText } = require('../ai/completionClient');
const { heuristicProfile } = require('../ai/businessAnalyzer');
const { logger } = require('../core/logger');
const { crawlWebsite } = require('../ingest/crawler');

const router = express.Router();

function normalizeWebsiteUrl(rawUrl) {
  const text = String(rawUrl || '').trim();
  if (!text) return '';
  if (/^[a-z]+:\/\//i.test(text)) return text;
  return `${/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(text) ? 'http' : 'https'}://${text}`;
}

function buildFallbackPayload({ company = '', website = '', instagram = '', facebook = '', whatsapp = '' } = {}) {
  return {
    companyName: company || '',
    description: '',
    industry: '',
    businessCategory: '',
    businessType: '',
    businessModel: '',
    vertical: '',
    country: '',
    language: '',
    products: '',
    productServiceTypes: [],
    tone: '',
    supportStyle: '',
    targetCustomers: [],
    likelyDepartments: [],
    routingSuggestions: [],
    leadQualificationHints: [],
    customerIntentPatterns: [],
    faqCandidates: [],
    faqs: [],
    suggestedTags: [],
    suggestedTriggers: [],
    openingHours: '',
    locations: [],
    socialLinks: {
      website,
      instagram,
      facebook,
      whatsapp,
    },
    sourceStats: {
      crawledPages: 0,
      analyzedPages: 0,
      mode: 'fallback',
    },
  };
}

function buildChunkLikePages(pages = []) {
  return pages.map((page) => ({
    source_url: page.url,
    title: page.title,
    heading: page.title,
    content: page.content,
  }));
}

function sanitizeArray(value, fallback = []) {
  return Array.isArray(value) ? value.filter(Boolean).map((entry) => String(entry).trim()).filter(Boolean) : fallback;
}

function sanitizeFaqs(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const question = String(entry.question || '').trim();
      const answer = String(entry.answer || '').trim();
      if (!question) return null;
      return { question, answer };
    })
    .filter(Boolean);
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultSuggestedTags(profile) {
  return sanitizeArray([
    slugify(profile.vertical || profile.businessCategory),
    slugify(profile.primaryLanguage),
    'vip',
  ].filter(Boolean));
}

function defaultLikelyDepartments(profile) {
  const base = ['Support'];
  if ((profile.offerings || []).length) base.unshift('Sales');
  if ((profile.faqCandidates || []).some((entry) => /refund|delivery|shipping|invoice|payment/i.test(entry))) {
    base.push('Operations');
  }
  return sanitizeArray(base);
}

function defaultRoutingSuggestions(profile) {
  const departments = defaultLikelyDepartments(profile);
  return departments.includes('Sales')
    ? [{ when: 'High-intent pricing or product questions', assignTo: 'Sales', reason: 'Lead conversion and quoting.' }]
    : [];
}

function defaultSuggestedTriggers(profile) {
  const tags = defaultSuggestedTags(profile);
  return [
    {
      name: 'Auto-tag high-intent leads',
      event: 'message_received',
      conditionField: 'score',
      conditionOp: '>=',
      conditionValue: '70',
      actionType: 'add_tag',
      actionValue: tags.includes('vip') ? 'vip' : (tags[0] || 'vip'),
    },
  ];
}

function firstNonEmpty(values = []) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function extractCountryFromText(text) {
  const normalized = String(text || '').toLowerCase();
  const candidates = [
    ['Egypt', /egypt|sharm el sheikh|sharm|sinai|cairo|hurghada|dahab/],
    ['Saudi Arabia', /saudi|riyadh|jeddah|dammam/],
    ['United Arab Emirates', /dubai|abu dhabi|uae|united arab emirates/],
    ['United Kingdom', /united kingdom|uk|london/],
    ['United States', /united states|usa|new york|california|texas/],
  ];
  return candidates.find(([, pattern]) => pattern.test(normalized))?.[0] || '';
}

function extractOfferingsFromText(text) {
  const normalized = String(text || '').toLowerCase();
  const isHospitality = /hotel|beachfront hotel|resort|guest house|guesthouse|rooms|room types|check-in|check out|book your stay|restaurant|private beach|accommodation|reception/.test(normalized);
  const isTransportation = /taxi|airport transfer|airport transfers|chauffeur|shuttle|ride|driver|pickup|drop off|drop-off|transfer service|transport/.test(normalized);
  const isSaas = /software|saas|automation platform|revenue operating system|crm|customer support platform|sales platform|conversation platform|ai-powered sales/.test(normalized)
    || (/dashboard|api|integrations?/.test(normalized) && /automation|platform|software|ai/.test(normalized));
  if (isSaas) {
    return sanitizeArray([
      /whatsapp|instagram|messenger|live chat/.test(normalized) ? 'Multi-channel messaging platform' : '',
      /ai-powered|automation|ai replies|intent detection|lead scoring/.test(normalized) ? 'AI sales automation' : '',
      /dashboard|analytics|reports/.test(normalized) ? 'Dashboard and analytics' : '',
      /integrat|shopify|woocommerce|salla|zid/.test(normalized) ? 'Commerce integrations' : '',
    ]);
  }
  if (isHospitality) {
    return sanitizeArray([
      /room|rooms|suite|apartment|chalet|accommodation|stay|book your stay/.test(normalized) ? 'Rooms and accommodation' : '',
      /restaurant|dining|breakfast|buffet|tajine|bbq|coffee bar/.test(normalized) ? 'Restaurant and dining' : '',
      /pool|private beach|beach access|swimming pool/.test(normalized) ? 'Beach and pool amenities' : '',
      /dive|diving|snorkel|snorkeling|blue hole/.test(normalized) ? 'Diving and snorkeling experiences' : '',
      /yoga|massage|wellness/.test(normalized) ? 'Yoga and wellness' : '',
      /airport transfer|airport transfers/.test(normalized) ? 'Airport transfers' : '',
      /excursion|tour|desert/.test(normalized) ? 'Tours and excursions' : '',
    ]);
  }
  if (!isTransportation) return [];
  return sanitizeArray([
    /airport transfer|airport transfers/.test(normalized) ? 'Airport transfers' : '',
    /city transfer|city ride|city pickup/.test(normalized) ? 'City transfers' : '',
    /chauffeur/.test(normalized) ? 'Chauffeur service' : '',
    /private taxi|private transfer|taxi service/.test(normalized) ? 'Private taxi service' : '',
    /tour|excursion/.test(normalized) ? 'Tours and excursions' : '',
  ]);
}

function inferBusinessShapeFromText(text) {
  const normalized = String(text || '').toLowerCase();
  if (/software|saas|automation platform|revenue operating system|crm|customer support platform|sales platform|conversation platform|ai-powered sales/.test(normalized)
    || (/dashboard|api|integrations?/.test(normalized) && /automation|platform|software|ai/.test(normalized))) {
    return {
      businessCategory: 'Software',
      businessModel: 'subscription',
      vertical: 'saas',
      targetCustomers: sanitizeArray([
        /sales/.test(normalized) ? 'Sales teams' : '',
        /support/.test(normalized) ? 'Support teams' : '',
        /ecommerce|commerce/.test(normalized) ? 'Commerce brands' : '',
      ]),
      tone: 'Professional and product-focused',
      supportStyle: 'Helpful, concise, and solution-oriented',
      likelyDepartments: ['Sales', 'Support', 'Operations'],
      routingSuggestions: [
        { when: 'Demo or pricing request', assignTo: 'Sales', reason: 'High-intent software lead needs product or pricing guidance.' },
      ],
      suggestedTags: ['vip', 'software', 'automation'],
      suggestedTriggers: [
        {
          name: 'Route demo requests',
          event: 'message_received',
          conditionField: 'keyword',
          conditionOp: 'contains',
          conditionValue: 'demo',
          actionType: 'assign_to',
          actionValue: 'Sales',
        },
      ],
    };
  }
  if (/hotel|beachfront hotel|resort|guest house|guesthouse|rooms|room types|check-in|check out|book your stay|restaurant|private beach|accommodation|reception/.test(normalized)) {
    return {
      businessCategory: 'Hospitality',
      businessModel: 'services',
      vertical: 'hotel_hospitality',
      targetCustomers: sanitizeArray([
        /traveler|travellers|travelers/.test(normalized) ? 'Travelers' : '',
        /tourist|tourists/.test(normalized) ? 'Tourists' : '',
        /family|families/.test(normalized) ? 'Families' : '',
      ]),
      tone: 'Warm, professional, and welcoming',
      supportStyle: 'Helpful, concise, and reservation-focused',
      likelyDepartments: ['Reservations', 'Support', 'Operations'],
      routingSuggestions: [
        { when: 'Booking or room availability request', assignTo: 'Reservations', reason: 'Guest needs reservation handling or stay details.' },
      ],
      suggestedTags: ['vip', 'hospitality', 'travelers'],
      suggestedTriggers: [
        {
          name: 'Route booking requests',
          event: 'message_received',
          conditionField: 'keyword',
          conditionOp: 'contains',
          conditionValue: 'book',
          actionType: 'assign_to',
          actionValue: 'Reservations',
        },
      ],
    };
  }
  if (/taxi|airport transfer|airport transfers|chauffeur|shuttle|ride|driver|pickup|drop off|drop-off|transfer service|transport/.test(normalized)) {
    return {
      businessCategory: 'Transportation',
      businessModel: 'services',
      vertical: 'travel_transportation',
      targetCustomers: sanitizeArray([
        /traveler|travellers|travelers/.test(normalized) ? 'Travelers' : '',
        /tourist|tourists/.test(normalized) ? 'Tourists' : '',
        /business traveler|corporate transfer|executive transfer/.test(normalized) ? 'Business travelers' : '',
      ]),
      tone: 'Professional, helpful, and reassuring',
      supportStyle: 'Helpful, concise, and booking-oriented',
      likelyDepartments: ['Sales', 'Support', 'Operations'],
      routingSuggestions: [
        { when: 'Transfer or booking request', assignTo: 'Sales', reason: 'High-intent travel lead needing quote or confirmation.' },
      ],
      suggestedTags: ['vip', 'transportation', 'travelers'],
      suggestedTriggers: [
        {
          name: 'Route transfer booking requests',
          event: 'message_received',
          conditionField: 'keyword',
          conditionOp: 'contains',
          conditionValue: 'airport',
          actionType: 'assign_to',
          actionValue: 'Sales',
        },
      ],
    };
  }
  if (/real estate|property|apartment|villa/.test(normalized)) {
    return {
      businessCategory: 'Real estate',
      businessModel: 'services',
      vertical: 'real_estate',
      targetCustomers: [],
      tone: 'Professional and consultative',
      supportStyle: 'Helpful and consultative',
      likelyDepartments: [],
      routingSuggestions: [],
      suggestedTags: [],
      suggestedTriggers: [],
    };
  }
  if (/travel|tour|hotel|excursion/.test(normalized)) {
    return {
      businessCategory: 'Travel',
      businessModel: 'services',
      vertical: 'tourism',
      targetCustomers: sanitizeArray([
        /traveler|travelers|tourists/.test(normalized) ? 'Travelers' : '',
      ]),
      tone: 'Professional and informative',
      supportStyle: 'Helpful and itinerary-aware',
      likelyDepartments: [],
      routingSuggestions: [],
      suggestedTags: [],
      suggestedTriggers: [],
    };
  }
  return {
    businessCategory: '',
    businessModel: '',
    vertical: '',
    targetCustomers: [],
    tone: '',
    supportStyle: '',
    likelyDepartments: [],
    routingSuggestions: [],
    suggestedTags: [],
    suggestedTriggers: [],
  };
}

function cleanDescription(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^generated from crawled website content and tenant metadata\.?$/i, '');
}

function buildPartialProfileFromCrawl(crawl = {}, company = '', heuristic = {}) {
  const primaryPage = crawl.pages?.[0] || null;
  const primarySignals = [primaryPage?.title, primaryPage?.metadata?.description]
    .filter(Boolean)
    .join('\n')
    .trim();
  const combinedText = (crawl.pages || [])
    .map((page) => [page.title, page.metadata?.description, page.content].filter(Boolean).join('\n'))
    .join('\n\n')
    .slice(0, 12000);
  const primaryInferred = inferBusinessShapeFromText(primarySignals);
  const inferred = primaryInferred.businessCategory ? primaryInferred : inferBusinessShapeFromText(combinedText);
  const preferPrimaryInference = Boolean(primaryInferred.businessCategory);
  const description = cleanDescription(firstNonEmpty([
    primaryPage?.metadata?.description,
    primaryPage?.content?.split('\n').find((entry) => String(entry || '').trim().length >= 60),
    heuristic.brandVoiceNotes,
  ]));
  const offerings = extractOfferingsFromText(primarySignals || combinedText);
  const title = firstNonEmpty([
    primaryPage?.title,
    crawl.failures?.find((entry) => entry.title)?.title,
  ]);

  return {
    businessName: firstNonEmpty([company, title.replace(/\s*[\-|–|•].*$/, '').trim()]),
    businessCategory: inferred.businessCategory || heuristic.businessCategory || '',
    businessModel: inferred.businessModel || heuristic.businessModel || '',
    vertical: inferred.vertical || heuristic.vertical || '',
    offerings: offerings.length ? offerings : sanitizeArray(heuristic.offerings, []),
    productServiceTypes: offerings.length ? offerings : sanitizeArray(heuristic.productServiceTypes, []),
    tone: inferred.tone || heuristic.tone || '',
    supportStyle: inferred.supportStyle || heuristic.supportStyle || '',
    primaryLanguage: heuristic.primaryLanguage || '',
    primaryDialect: heuristic.primaryDialect || '',
    openingHours: heuristic.openingHours || '',
    locations: sanitizeArray(heuristic.locations, []),
    targetCustomers: inferred.targetCustomers.length
      ? inferred.targetCustomers
      : (preferPrimaryInference ? [] : sanitizeArray(heuristic.targetCustomers, [])),
    faqCandidates: sanitizeArray(heuristic.faqCandidates, []),
    faqs: sanitizeFaqs(heuristic.faqs, []),
    leadQualificationHints: preferPrimaryInference ? [] : sanitizeArray(heuristic.leadQualificationHints, []),
    customerIntentPatterns: preferPrimaryInference ? [] : sanitizeArray(heuristic.customerIntentPatterns, []),
    likelyDepartments: preferPrimaryInference
      ? sanitizeArray(inferred.likelyDepartments, [])
      : sanitizeArray(heuristic.likelyDepartments, []),
    routingSuggestions: preferPrimaryInference
      ? (Array.isArray(inferred.routingSuggestions) ? inferred.routingSuggestions : [])
      : (Array.isArray(heuristic.routingSuggestions) ? heuristic.routingSuggestions : []),
    suggestedTags: preferPrimaryInference
      ? sanitizeArray(inferred.suggestedTags, [])
      : sanitizeArray(heuristic.suggestedTags, []),
    suggestedTriggers: preferPrimaryInference
      ? (Array.isArray(inferred.suggestedTriggers) ? inferred.suggestedTriggers : [])
      : (Array.isArray(heuristic.suggestedTriggers) ? heuristic.suggestedTriggers : []),
    brandVoiceNotes: description,
    country: extractCountryFromText(combinedText),
    websiteTitle: title,
    websiteDescription: cleanDescription(primaryPage?.metadata?.description || ''),
  };
}

function buildSourceStats(crawl = {}, options = {}) {
  const failures = Array.isArray(crawl.failures) ? crawl.failures : [];
  const blockedPages = failures.filter((entry) => entry.blocked);
  const warnings = sanitizeArray(options.warnings, []);
  return {
    crawledPages: Number(crawl.pagesSeen || 0),
    analyzedPages: Array.isArray(crawl.pages) ? crawl.pages.length : 0,
    mode: options.mode || 'fallback',
    crawlStatus: options.crawlStatus || 'not_started',
    analysisStatus: options.analysisStatus || 'not_started',
    warnings,
    blockedPages: blockedPages.map((entry) => ({
      url: entry.url,
      status: entry.status,
      reason: entry.reason,
      title: entry.title,
    })),
    failedPages: failures
      .filter((entry) => !entry.blocked)
      .slice(0, 5)
      .map((entry) => ({
        url: entry.url,
        status: entry.status,
        reason: entry.reason,
      })),
    websiteTitle: options.websiteTitle || '',
    websiteDescription: options.websiteDescription || '',
  };
}

function profileToScanPayload(profile, context = {}) {
  const offerings = sanitizeArray(profile.offerings, []);
  const faqCandidates = sanitizeArray(profile.faqCandidates, []);
  const suggestedTags = sanitizeArray(profile.suggestedTags, defaultSuggestedTags(profile));
  const likelyDepartments = sanitizeArray(profile.likelyDepartments, defaultLikelyDepartments(profile));
  const customerIntentPatterns = sanitizeArray(profile.customerIntentPatterns, []);
  const leadQualificationHints = sanitizeArray(profile.leadQualificationHints, []);
  const targetCustomers = sanitizeArray(profile.targetCustomers, []);
  const routingSuggestions = Array.isArray(profile.routingSuggestions)
    ? profile.routingSuggestions
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        return {
          when: String(entry.when || '').trim(),
          assignTo: String(entry.assignTo || '').trim(),
          reason: String(entry.reason || '').trim(),
        };
      })
      .filter((entry) => entry && entry.when && entry.assignTo)
    : defaultRoutingSuggestions(profile);
  const suggestedTriggers = Array.isArray(profile.suggestedTriggers)
    ? profile.suggestedTriggers
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        return {
          name: String(entry.name || '').trim(),
          event: String(entry.event || 'message_received').trim(),
          conditionField: String(entry.conditionField || '').trim(),
          conditionOp: String(entry.conditionOp || '=').trim(),
          conditionValue: String(entry.conditionValue || '').trim(),
          actionType: String(entry.actionType || '').trim(),
          actionValue: String(entry.actionValue || '').trim(),
        };
      })
      .filter((entry) => entry && entry.name && entry.actionType)
    : defaultSuggestedTriggers(profile);

  return {
    companyName: profile.businessName || context.company || '',
    description: profile.brandVoiceNotes || '',
    industry: profile.businessCategory || profile.vertical || '',
    businessCategory: profile.businessCategory || '',
    businessType: profile.businessCategory || '',
    businessModel: profile.businessModel || '',
    vertical: profile.vertical || '',
    country: context.country || profile.country || profile.locations?.[0] || '',
    language: profile.primaryLanguage || '',
    products: offerings.slice(0, 5).join(', '),
    productServiceTypes: sanitizeArray(profile.productServiceTypes, offerings),
    tone: profile.tone || '',
    supportStyle: profile.supportStyle || '',
    targetCustomers,
    likelyDepartments,
    routingSuggestions,
    leadQualificationHints,
    customerIntentPatterns,
    faqCandidates,
    faqs: sanitizeFaqs(profile.faqs, faqCandidates.map((question) => ({ question, answer: '' }))),
    suggestedTags,
    suggestedTriggers,
    openingHours: profile.openingHours || '',
    locations: sanitizeArray(profile.locations, []),
    socialLinks: {
      website: context.website || '',
      instagram: context.instagram || '',
      facebook: context.facebook || '',
      whatsapp: context.whatsapp || '',
    },
    sourceStats: context.sourceStats || {
      crawledPages: 0,
      analyzedPages: 0,
      mode: 'heuristic',
    },
  };
}

async function inferProfileWithAi({ company, website, instagram, facebook, whatsapp, pages }) {
  const content = pages
    .slice(0, 10)
    .map((page) => `URL: ${page.url}\nTitle: ${page.title}\n${page.content}`)
    .join('\n\n---\n\n')
    .slice(0, 35000);

  const prompt = `Analyze this business presence and return JSON only.

Schema:
{
  "businessName": string,
  "businessCategory": string,
  "businessModel": string,
  "vertical": string,
  "offerings": string[],
  "productServiceTypes": string[],
  "tone": string,
  "supportStyle": string,
  "primaryLanguage": string,
  "primaryDialect": string,
  "openingHours": string,
  "locations": string[],
  "targetCustomers": string[],
  "faqCandidates": string[],
  "faqs": [{"question": string, "answer": string}],
  "leadQualificationHints": string[],
  "customerIntentPatterns": string[],
  "likelyDepartments": string[],
  "routingSuggestions": [{"when": string, "assignTo": string, "reason": string}],
  "suggestedTags": string[],
  "suggestedTriggers": [{"name": string, "event": string, "conditionField": string, "conditionOp": string, "conditionValue": string, "actionType": string, "actionValue": string}],
  "brandVoiceNotes": string
}

Business name: ${company || 'Unknown'}
Website: ${website || 'Not provided'}
Instagram: ${instagram || 'Not provided'}
Facebook: ${facebook || 'Not provided'}
WhatsApp: ${whatsapp || 'Not provided'}

Crawled content:
${content || 'No website content available'}
`;

  const text = await completeText({
    tenantId: null,
    prompt,
    maxTokens: 1800,
    purpose: 'signup_brand_scan',
    safetyInput: `${company} ${website}`.trim(),
  });

  return JSON.parse(String(text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
}

/* ── POST /api/scan/brand ─────────────────────────────────────────────────── */
router.post('/brand', async (req, res) => {
  const company = String(req.body?.company || '').trim();
  const website = normalizeWebsiteUrl(req.body?.website);
  const instagram = String(req.body?.instagram || '').trim();
  const facebook = String(req.body?.facebook || '').trim();
  const whatsapp = String(req.body?.whatsapp || '').trim();

  if (!website && !instagram && !facebook && !whatsapp && !company) {
    return res.status(400).json({ error: 'At least one business detail is required for AI scan.' });
  }

  const fallback = buildFallbackPayload({ company, website, instagram, facebook, whatsapp });

  try {
    let crawl = { pages: [], pagesSeen: 0, rootUrl: website || '', failures: [] };
    if (website) {
      crawl = await crawlWebsite(website, { maxPages: 8, rateLimitMs: 75 });
    }

    const heuristic = heuristicProfile(
      { name: company, email: '', settings: { company: { website } } },
      buildChunkLikePages(crawl.pages),
    );

    const partialProfile = buildPartialProfileFromCrawl(crawl, company, heuristic);
    let profile = partialProfile;
    let mode = 'input_only';
    let crawlStatus = website ? 'no_content' : 'not_requested';
    let analysisStatus = 'not_started';
    const warnings = [];

    if (crawl.pages.length > 0) {
      mode = 'crawl_only';
      crawlStatus = 'content_extracted';
      try {
        const aiProfile = await inferProfileWithAi({ company, website, instagram, facebook, whatsapp, pages: crawl.pages });
        profile = { ...partialProfile, ...aiProfile };
        mode = 'crawl+analysis';
        analysisStatus = 'completed';
      } catch (error) {
        logger.error('[BrandScan] AI enrichment failed', {
          company,
          website,
          error: error.message,
          code: error.code || null,
          status: error.status || null,
        });
        analysisStatus = 'failed';
        warnings.push('AI enrichment temporarily unavailable. We extracted your website details and you can continue manually.');
      }
    } else if ((crawl.failures || []).some((entry) => entry.blocked)) {
      mode = 'blocked';
      crawlStatus = 'blocked';
      analysisStatus = 'skipped';
      warnings.push('Website blocked automated crawl, so only limited website signals are available.');
    } else if (website) {
      mode = 'no_content';
      crawlStatus = 'failed';
      analysisStatus = 'skipped';
      warnings.push('No crawlable website content was extracted from the provided URL.');
    } else {
      warnings.push('No website content available for AI enrichment.');
    }

    return res.json(profileToScanPayload(profile, {
      company,
      website,
      instagram,
      facebook,
      whatsapp,
      sourceStats: buildSourceStats(crawl, {
        mode,
        crawlStatus,
        analysisStatus,
        warnings,
        websiteTitle: partialProfile.websiteTitle,
        websiteDescription: partialProfile.websiteDescription,
      }),
    }));
  } catch (err) {
    if (err.message && /invalid website url/i.test(err.message)) {
      return res.status(400).json({ error: 'Website URL is invalid. Include a valid domain or URL.' });
    }

    return res.status(200).json({
      ...fallback,
      sourceStats: buildSourceStats({}, {
        mode: 'fallback',
        crawlStatus: 'failed',
        analysisStatus: 'skipped',
        warnings: [err.message],
      }),
    });
  }
});

module.exports = router;
