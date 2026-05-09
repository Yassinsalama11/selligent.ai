export const SITE_URL = 'https://chatorai.com';
export const SITE_NAME = 'ChatorAI';
export const SITE_DESCRIPTION =
  'ChatorAI is an AI revenue operating system for support, sales, and customer communication across WhatsApp, Instagram, Messenger, email, and web chat.';

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const BRAND_ID = `${SITE_URL}/#brand`;
export const SOFTWARE_ID = `${SITE_URL}/#software`;
export const PRODUCT_ID = `${SITE_URL}/#product`;
export const OFFER_ID = `${SITE_URL}/#offer-free-trial`;
export const LOGO_ID = `${SITE_URL}/#logo`;

const WORLDWIDE = {
  '@type': 'Place',
  name: 'Worldwide',
};

const BUSINESS_AUDIENCE = {
  '@type': 'BusinessAudience',
  audienceType: 'Customer-facing business teams',
};

export function absoluteUrl(path = '/') {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildJsonLdGraph(nodes) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean),
  };
}

export function buildOfferNode() {
  return {
    '@type': 'Offer',
    '@id': OFFER_ID,
    url: absoluteUrl('/#pricing'),
    availability: 'https://schema.org/InStock',
    price: '0',
    priceCurrency: 'USD',
    description:
      'Free-trial SaaS signup with plan, seat count, and billing cycle selection before payment.',
  };
}

export function buildOrganizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      '@id': LOGO_ID,
      url: absoluteUrl('/chatorai-logo.svg'),
      contentUrl: absoluteUrl('/chatorai-logo.svg'),
    },
    description: SITE_DESCRIPTION,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@chatorai.com',
        url: absoluteUrl('/contact'),
        availableLanguage: ['English', 'Arabic'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'sales@chatorai.com',
        url: absoluteUrl('/contact'),
        availableLanguage: ['English', 'Arabic'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'security',
        email: 'security@chatorai.com',
        url: absoluteUrl('/security'),
        availableLanguage: ['English', 'Arabic'],
      },
    ],
    areaServed: WORLDWIDE,
    knowsAbout: [
      'AI customer support',
      'AI sales automation',
      'WhatsApp Business API operations',
      'Omnichannel communication workflows',
      'Knowledge ingestion and retrieval',
      'Conversation routing and escalation',
      'Billing lifecycle management for SaaS workspaces',
    ],
  };
}

export function buildBrandNode() {
  return {
    '@type': 'Brand',
    '@id': BRAND_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: { '@id': LOGO_ID },
  };
}

export function buildSoftwareApplicationNode() {
  return {
    '@type': 'SoftwareApplication',
    '@id': SOFTWARE_ID,
    name: SITE_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: SITE_DESCRIPTION,
    featureList: [
      'Omnichannel AI inbox',
      'AI customer support workflows',
      'AI sales agent workflows',
      'WhatsApp Business API operations',
      'Knowledge ingestion for company context and FAQs',
      'Billing and trial lifecycle controls',
    ],
    offers: { '@id': OFFER_ID },
    provider: { '@id': ORGANIZATION_ID },
    brand: { '@id': BRAND_ID },
    url: SITE_URL,
    audience: BUSINESS_AUDIENCE,
    availableLanguage: ['English', 'Arabic'],
  };
}

export function buildProductNode() {
  return {
    '@type': 'Product',
    '@id': PRODUCT_ID,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    brand: { '@id': BRAND_ID },
    category: 'AI customer communication platform',
    offers: { '@id': OFFER_ID },
    serviceType: 'AI revenue operating system',
    areaServed: WORLDWIDE,
  };
}

export function buildWebsiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: ['en', 'ar'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbNode(items, pagePath) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return {
    '@type': 'BreadcrumbList',
    '@id': absoluteUrl(`${pagePath}#breadcrumb`),
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href),
    })),
  };
}

export function buildFaqNode(faqs, pagePath) {
  if (!Array.isArray(faqs) || faqs.length === 0) return null;

  return {
    '@type': 'FAQPage',
    '@id': absoluteUrl(`${pagePath}#faq`),
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildWebPageNode({
  path,
  name,
  description,
  type = 'WebPage',
  breadcrumb = true,
  mainEntityId,
  aboutIds = [],
  mentionIds = [],
}) {
  return {
    '@type': type,
    '@id': absoluteUrl(`${path}#webpage`),
    url: absoluteUrl(path),
    name,
    description,
    isPartOf: { '@id': WEBSITE_ID },
    primaryImageOfPage: { '@id': LOGO_ID },
    inLanguage: 'en',
    publisher: { '@id': ORGANIZATION_ID },
    ...(aboutIds.length ? { about: aboutIds.map((id) => ({ '@id': id })) } : {}),
    ...(mentionIds.length ? { mentions: mentionIds.map((id) => ({ '@id': id })) } : {}),
    ...(breadcrumb ? { breadcrumb: { '@id': absoluteUrl(`${path}#breadcrumb`) } } : {}),
    ...(mainEntityId ? { mainEntity: { '@id': mainEntityId } } : {}),
  };
}

export function buildFeatureServiceNode({ path, title, description, capabilities = [] }) {
  return {
    '@type': 'Service',
    '@id': absoluteUrl(`${path}#service`),
    name: title,
    description,
    serviceType: 'AI communication platform feature',
    provider: { '@id': ORGANIZATION_ID },
    brand: { '@id': BRAND_ID },
    isPartOf: { '@id': PRODUCT_ID },
    areaServed: WORLDWIDE,
    audience: BUSINESS_AUDIENCE,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${title} capabilities`,
      itemListElement: capabilities.map((capability, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Service',
          name: capability.title,
          description: capability.description,
        },
      })),
    },
  };
}

export function buildSolutionServiceNode({ path, title, description, capabilities = [], industryName }) {
  return {
    '@type': 'Service',
    '@id': absoluteUrl(`${path}#service`),
    name: title,
    description,
    serviceType: `AI workflows for ${industryName}`,
    provider: { '@id': ORGANIZATION_ID },
    brand: { '@id': BRAND_ID },
    areaServed: WORLDWIDE,
    audience: BUSINESS_AUDIENCE,
    about: {
      '@type': 'Thing',
      name: industryName,
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${industryName} workflows`,
      itemListElement: capabilities.map((capability, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Service',
          name: capability.title,
          description: capability.description,
        },
      })),
    },
  };
}

export function buildIntegrationNodes({ path, title, description, capabilities = [], partnerName }) {
  const partnerId = absoluteUrl(`${path}#partner`);
  const serviceId = absoluteUrl(`${path}#service`);

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': partnerId,
      name: partnerName,
      applicationCategory: 'BusinessApplication',
    },
    {
      '@type': 'Service',
      '@id': serviceId,
      name: title,
      description,
      serviceType: `${partnerName} integration`,
      provider: { '@id': ORGANIZATION_ID },
      brand: { '@id': BRAND_ID },
      isPartOf: { '@id': PRODUCT_ID },
      isRelatedTo: { '@id': partnerId },
      areaServed: WORLDWIDE,
      audience: BUSINESS_AUDIENCE,
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: `${partnerName} integration capabilities`,
        itemListElement: capabilities.map((capability, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Service',
            name: capability.title,
            description: capability.description,
          },
        })),
      },
    },
  ];
}

export function buildAlternativeNodes({
  path,
  title,
  description,
  competitorName,
  comparisonTable = [],
}) {
  const competitorId = absoluteUrl(`${path}#competitor`);
  const articleId = absoluteUrl(`${path}#comparison`);
  const criteriaId = absoluteUrl(`${path}#criteria`);

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': competitorId,
      name: competitorName,
      applicationCategory: 'BusinessApplication',
    },
    {
      '@type': 'Article',
      '@id': articleId,
      headline: title,
      description,
      author: { '@id': ORGANIZATION_ID },
      publisher: { '@id': ORGANIZATION_ID },
      mainEntityOfPage: { '@id': absoluteUrl(`${path}#webpage`) },
      about: [{ '@id': SOFTWARE_ID }, { '@id': competitorId }],
      mentions: [{ '@id': competitorId }],
      isPartOf: { '@id': WEBSITE_ID },
    },
    {
      '@type': 'ItemList',
      '@id': criteriaId,
      name: `ChatorAI vs ${competitorName} comparison criteria`,
      itemListElement: comparisonTable.map((row, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: row.feature,
        additionalProperty: [
          {
            '@type': 'PropertyValue',
            name: SITE_NAME,
            value: row.chatorai,
          },
          {
            '@type': 'PropertyValue',
            name: competitorName,
            value: row.competitor,
          },
        ],
      })),
    },
    {
      '@type': 'SoftwareApplication',
      '@id': SOFTWARE_ID,
      subjectOf: [{ '@id': articleId }],
      isSimilarTo: [{ '@id': competitorId }],
    },
  ];
}

export function buildDocNodes({ path, title, description, howToSteps = [] }) {
  const articleId = absoluteUrl(`/docs/${path}#article`);

  const articleNode = {
    '@type': 'TechArticle',
    '@id': articleId,
    headline: title,
    description,
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
    mainEntityOfPage: { '@id': absoluteUrl(`/docs/${path}#webpage`) },
    isPartOf: { '@id': WEBSITE_ID },
    about: [{ '@id': SOFTWARE_ID }, { '@id': PRODUCT_ID }],
    inLanguage: 'en',
  };

  const howToNode = howToSteps.length
    ? {
        '@type': 'HowTo',
        '@id': absoluteUrl(`/docs/${path}#howto`),
        name: title,
        description,
        step: howToSteps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.title,
          text: step.text,
        })),
      }
    : null;

  return [articleNode, howToNode].filter(Boolean);
}

export function toHowToSteps(sections = []) {
  return sections
    .filter((section) => section.title)
    .map((section) => ({
      title: section.title,
      text: [
        ...(section.paragraphs || []),
        ...((section.bullets || []).map((item) => `${item}.`)),
      ]
        .join(' ')
        .trim(),
    }))
    .filter((step) => step.text);
}
