import { alternativesData } from '@/lib/pseo/alternatives';
import { integrationsData } from '@/lib/pseo/integrations';
import { solutionsData } from '@/lib/pseo/solutions';
import { docsData } from '@/lib/pseo/docs';
import { comparePagesData } from '@/lib/pseo/compare';
import { bestPagesData } from '@/lib/pseo/best';
import { pricingInsightPages, categoryExplanationPages, discussionPages } from '@/lib/pseo/flywheel';

const overviewPage = {
  type: 'overview',
  href: '/ai-revenue-operating-system',
  title: 'See the AI Revenue Operating System',
  description: 'Understand how ChatorAI connects support, sales, routing, and automation in one platform.',
};

const featurePages = [
  {
    type: 'feature',
    href: '/features/omnichannel-ai-inbox',
    title: 'Use the Omnichannel AI Inbox',
    description: 'Manage WhatsApp, Instagram, Messenger, and web chat in one AI-assisted workspace.',
  },
  {
    type: 'feature',
    href: '/features/ai-customer-support-platform',
    title: 'Deploy the AI Customer Support Platform',
    description: 'Automate routine support with grounded answers, routing, and human handoff controls.',
  },
  {
    type: 'feature',
    href: '/features/ai-sales-agent-platform',
    title: 'Run lead qualification with AI Sales Agents',
    description: 'Qualify leads, recover carts, and route pipeline activity without manual follow-up lag.',
  },
  {
    type: 'feature',
    href: '/features/whatsapp-ai-automation',
    title: 'Scale on WhatsApp with AI Automation',
    description: 'Operate WhatsApp support, templates, and engagement workflows from one control layer.',
  },
];

const alternativeTitleOverrides = {
  intercom: 'Compare ChatorAI vs Intercom',
  zendesk: 'Compare ChatorAI vs Zendesk',
  freshchat: 'Compare ChatorAI vs Freshchat',
  hubspot: 'Compare ChatorAI vs HubSpot Service Hub',
  salesforce: 'Compare ChatorAI vs Salesforce Service Cloud',
  'help-scout': 'Compare ChatorAI vs Help Scout',
};

const integrationTitleOverrides = {
  shopify: 'Connect Shopify with ChatorAI',
  'whatsapp-business-api': 'Run ChatorAI on WhatsApp Business API',
  hubspot: 'Sync HubSpot with ChatorAI',
  salesforce: 'Sync Salesforce with ChatorAI',
};

const solutionTitleOverrides = {
  ecommerce: 'See how E-commerce teams use ChatorAI',
  saas: 'See how SaaS teams use ChatorAI',
  'real-estate': 'See how Real Estate teams use ChatorAI',
  agencies: 'See how Agencies deploy ChatorAI',
};

const docTitleOverrides = {
  quickstart: 'Start with the ChatorAI quickstart guide',
  concepts: 'Understand ChatorAI core concepts',
  'integrations/shopify': 'Set up the Shopify integration guide',
  'integrations/whatsapp': 'Prepare WhatsApp Business API onboarding',
  'api/overview': 'Review the current ChatorAI API overview',
  'ai-customer-support': 'Define AI customer support with ChatorAI',
  'ai-sales-automation': 'Define AI sales automation with ChatorAI',
  'omnichannel-communication': 'Understand omnichannel communication',
  'whatsapp-automation': 'Define WhatsApp automation with ChatorAI',
  'conversation-routing': 'Understand conversation routing',
};

const alternativePages = Object.values(alternativesData).map((page) => ({
  type: 'alternative',
  href: `/alternatives/${page.slug}`,
  title: alternativeTitleOverrides[page.slug] || `Compare ChatorAI vs ${page.name}`,
  description: page.description,
}));

const integrationPages = Object.values(integrationsData).map((page) => ({
  type: 'integration',
  href: `/integrations/${page.slug}`,
  title: integrationTitleOverrides[page.slug] || `Connect ${page.name} with ChatorAI`,
  description: page.description,
}));

const solutionPages = Object.values(solutionsData).map((page) => ({
  type: 'solution',
  href: `/solutions/${page.slug}`,
  title: solutionTitleOverrides[page.slug] || `See how ${page.name} teams use ChatorAI`,
  description: page.description,
}));

const docPages = Object.entries(docsData).map(([path, page]) => ({
  type: 'doc',
  href: `/docs/${path}`,
  title: docTitleOverrides[path] || page.h1,
  description: page.description,
}));

const compareTitleOverrides = {
  'intercom-vs-zendesk': 'Compare Intercom vs Zendesk',
  'intercom-vs-chatorai': 'Compare Intercom vs ChatorAI',
  'zendesk-vs-chatorai': 'Compare Zendesk vs ChatorAI',
};

const bestTitleOverrides = {
  'intercom-alternatives': 'See the best Intercom alternatives',
  'zendesk-alternatives': 'See the best Zendesk alternatives',
};

const discussionTitleOverrides = {
  'intercom-is-too-expensive': 'Read the Intercom cost discussion',
  'zendesk-is-overkill': 'Read the Zendesk overkill discussion',
  'why-ai-support-is-the-future': 'Read why AI support is the future',
};

const comparePages = Object.values(comparePagesData).map((page) => ({
  type: 'compare',
  href: `/compare/${page.slug}`,
  title: compareTitleOverrides[page.slug] || page.pageTitle,
  description: page.description,
}));

const bestPages = Object.values(bestPagesData).map((page) => ({
  type: 'best',
  href: `/best/${page.slug}`,
  title: bestTitleOverrides[page.slug] || page.pageTitle,
  description: page.description,
}));

const compareHubPage = {
  type: 'compare-hub',
  href: '/compare',
  title: 'Explore the ChatorAI comparison hub',
  description: 'Use one hub to review competitor comparisons, best-alternative pages, and pricing intelligence before making the switch decision.',
};

const pricingPages = Object.values(pricingInsightPages).map((page) => ({
  type: 'pricing',
  href: page.path,
  title: page.pageTitle,
  description: page.description,
}));

const categoryPages = Object.values(categoryExplanationPages).map((page) => ({
  type: 'category',
  href: page.path,
  title: page.pageTitle,
  description: page.description,
}));

const discussionCatalogPages = Object.values(discussionPages).map((page) => ({
  type: 'discussion',
  href: page.path,
  title: discussionTitleOverrides[page.path.replace(/^\//, '')] || page.pageTitle,
  description: page.description,
}));

const seoCatalog = [
  overviewPage,
  ...featurePages,
  ...alternativePages,
  ...integrationPages,
  ...solutionPages,
  ...docPages,
  compareHubPage,
  ...comparePages,
  ...bestPages,
  ...pricingPages,
  ...categoryPages,
  ...discussionCatalogPages,
];

const catalogByHref = new Map(seoCatalog.map((page) => [page.href, page]));

const featureOrder = featurePages.map((page) => page.href);
const alternativeOrder = alternativePages.map((page) => page.href);
const integrationOrder = integrationPages.map((page) => page.href);
const compareOrder = comparePages.map((page) => page.href);
const bestOrder = bestPages.map((page) => page.href);
const pricingOrder = pricingPages.map((page) => page.href);
const categoryOrder = categoryPages.map((page) => page.href);
const discussionOrder = discussionCatalogPages.map((page) => page.href);

function uniqueValidHrefs(hrefs, currentPath) {
  return Array.from(new Set(hrefs)).filter((href) => href && href !== currentPath && catalogByHref.has(href));
}

function pickCyclicalNeighbors(order, currentPath, count) {
  const index = order.indexOf(currentPath);
  if (index === -1 || order.length <= 1) return [];

  const picks = [];
  for (let step = 1; picks.length < count && step < order.length + 1; step += 1) {
    const href = order[(index + step) % order.length];
    if (href !== currentPath) {
      picks.push(href);
    }
  }
  return picks;
}

const featureMappings = {
  '/features/omnichannel-ai-inbox': {
    integrations: ['/integrations/whatsapp-business-api', '/integrations/hubspot'],
    solution: '/solutions/saas',
    alternative: '/alternatives/intercom',
  },
  '/features/ai-customer-support-platform': {
    integrations: ['/integrations/hubspot', '/integrations/salesforce'],
    solution: '/solutions/saas',
    alternative: '/alternatives/zendesk',
  },
  '/features/ai-sales-agent-platform': {
    integrations: ['/integrations/shopify', '/integrations/hubspot'],
    solution: '/solutions/ecommerce',
    alternative: '/alternatives/hubspot',
  },
  '/features/whatsapp-ai-automation': {
    integrations: ['/integrations/whatsapp-business-api', '/integrations/shopify'],
    solution: '/solutions/real-estate',
    alternative: '/alternatives/freshchat',
  },
};

const alternativeMappings = {
  '/alternatives/intercom': {
    features: ['/features/omnichannel-ai-inbox', '/features/ai-customer-support-platform'],
    integration: '/integrations/hubspot',
    compare: '/compare/intercom-vs-chatorai',
    best: '/best/intercom-alternatives',
    pricing: '/intercom-pricing-breakdown',
    discussion: '/intercom-is-too-expensive',
  },
  '/alternatives/zendesk': {
    features: ['/features/ai-customer-support-platform', '/features/omnichannel-ai-inbox'],
    integration: '/integrations/salesforce',
    compare: '/compare/zendesk-vs-chatorai',
    best: '/best/zendesk-alternatives',
    pricing: '/zendesk-pricing-breakdown',
    discussion: '/zendesk-is-overkill',
  },
  '/alternatives/freshchat': {
    features: ['/features/whatsapp-ai-automation', '/features/ai-customer-support-platform'],
    integration: '/integrations/shopify',
  },
  '/alternatives/hubspot': {
    features: ['/features/ai-sales-agent-platform', '/features/omnichannel-ai-inbox'],
    integration: '/integrations/hubspot',
  },
  '/alternatives/salesforce': {
    features: ['/features/ai-sales-agent-platform', '/features/ai-customer-support-platform'],
    integration: '/integrations/salesforce',
  },
  '/alternatives/help-scout': {
    features: ['/features/ai-customer-support-platform', '/features/omnichannel-ai-inbox'],
    integration: '/integrations/shopify',
  },
};

const integrationMappings = {
  '/integrations/shopify': {
    features: ['/features/ai-sales-agent-platform', '/features/omnichannel-ai-inbox'],
    solutions: ['/solutions/ecommerce', '/solutions/agencies'],
    alternative: '/alternatives/intercom',
  },
  '/integrations/whatsapp-business-api': {
    features: ['/features/whatsapp-ai-automation', '/features/omnichannel-ai-inbox'],
    solutions: ['/solutions/ecommerce', '/solutions/real-estate'],
    alternative: '/alternatives/intercom',
  },
  '/integrations/hubspot': {
    features: ['/features/ai-sales-agent-platform', '/features/ai-customer-support-platform'],
    solutions: ['/solutions/saas', '/solutions/agencies'],
    alternative: '/alternatives/hubspot',
  },
  '/integrations/salesforce': {
    features: ['/features/ai-sales-agent-platform', '/features/ai-customer-support-platform'],
    solutions: ['/solutions/saas', '/solutions/real-estate'],
    alternative: '/alternatives/salesforce',
  },
};

const solutionMappings = {
  '/solutions/ecommerce': {
    features: ['/features/ai-sales-agent-platform', '/features/whatsapp-ai-automation'],
    integrations: ['/integrations/shopify', '/integrations/whatsapp-business-api'],
    alternative: '/alternatives/intercom',
  },
  '/solutions/saas': {
    features: ['/features/ai-customer-support-platform', '/features/ai-sales-agent-platform'],
    integrations: ['/integrations/hubspot', '/integrations/salesforce'],
    alternative: '/alternatives/zendesk',
  },
  '/solutions/real-estate': {
    features: ['/features/ai-sales-agent-platform', '/features/whatsapp-ai-automation'],
    integrations: ['/integrations/whatsapp-business-api', '/integrations/salesforce'],
    alternative: '/alternatives/help-scout',
  },
  '/solutions/agencies': {
    features: ['/features/omnichannel-ai-inbox', '/features/ai-customer-support-platform'],
    integrations: ['/integrations/hubspot', '/integrations/shopify'],
    alternative: '/alternatives/hubspot',
  },
};

const docsMappings = {
  '/docs/quickstart': {
    features: ['/features/omnichannel-ai-inbox', '/features/whatsapp-ai-automation'],
    integrations: ['/integrations/shopify', '/integrations/whatsapp-business-api'],
  },
  '/docs/concepts': {
    features: ['/features/ai-customer-support-platform', '/features/ai-sales-agent-platform'],
    integrations: ['/integrations/hubspot', '/integrations/salesforce'],
  },
  '/docs/integrations/shopify': {
    features: ['/features/ai-sales-agent-platform', '/features/ai-customer-support-platform'],
    integrations: ['/integrations/shopify', '/integrations/whatsapp-business-api'],
  },
  '/docs/integrations/whatsapp': {
    features: ['/features/whatsapp-ai-automation', '/features/omnichannel-ai-inbox'],
    integrations: ['/integrations/whatsapp-business-api', '/integrations/hubspot'],
  },
  '/docs/api/overview': {
    features: ['/features/ai-customer-support-platform', '/features/ai-sales-agent-platform'],
    integrations: ['/integrations/hubspot', '/integrations/salesforce'],
  },
  '/docs/ai-customer-support': {
    features: ['/features/ai-customer-support-platform', '/features/omnichannel-ai-inbox'],
    integrations: ['/integrations/salesforce', '/integrations/whatsapp-business-api'],
  },
  '/docs/ai-sales-automation': {
    features: ['/features/ai-sales-agent-platform', '/features/omnichannel-ai-inbox'],
    integrations: ['/integrations/hubspot', '/integrations/shopify'],
  },
  '/docs/omnichannel-communication': {
    features: ['/features/omnichannel-ai-inbox', '/features/whatsapp-ai-automation'],
    integrations: ['/integrations/whatsapp-business-api', '/integrations/hubspot'],
  },
  '/docs/whatsapp-automation': {
    features: ['/features/whatsapp-ai-automation', '/features/omnichannel-ai-inbox'],
    integrations: ['/integrations/whatsapp-business-api', '/integrations/shopify'],
  },
  '/docs/conversation-routing': {
    features: ['/features/ai-customer-support-platform', '/features/ai-sales-agent-platform'],
    integrations: ['/integrations/hubspot', '/integrations/salesforce'],
  },
};

function buildFeatureRelated(currentPath) {
  const mapping = featureMappings[currentPath];
  return uniqueValidHrefs(
    [
      ...pickCyclicalNeighbors(featureOrder, currentPath, 2),
      ...(mapping?.integrations || []),
      mapping?.solution,
      mapping?.alternative,
    ],
    currentPath,
  );
}

function buildAlternativeRelated(currentPath) {
  const mapping = alternativeMappings[currentPath];
  return uniqueValidHrefs(
    [
      ...pickCyclicalNeighbors(alternativeOrder, currentPath, 2),
      ...(mapping?.features || []),
      mapping?.integration,
      mapping?.compare,
      mapping?.best,
      mapping?.pricing,
      mapping?.discussion,
    ],
    currentPath,
  );
}

function buildIntegrationRelated(currentPath) {
  const mapping = integrationMappings[currentPath];
  return uniqueValidHrefs(
    [
      ...(mapping?.features || []),
      ...(mapping?.solutions || []),
      mapping?.alternative,
    ],
    currentPath,
  );
}

function buildSolutionRelated(currentPath) {
  const mapping = solutionMappings[currentPath];
  return uniqueValidHrefs(
    [
      ...(mapping?.features || []),
      ...(mapping?.integrations || []),
      mapping?.alternative,
    ],
    currentPath,
  );
}

function buildDocRelated(currentPath) {
  const mapping = docsMappings[currentPath];
  return uniqueValidHrefs(
    [
      ...(mapping?.features || []),
      ...(mapping?.integrations || []),
    ],
    currentPath,
  );
}

function buildOverviewRelated(currentPath) {
  return uniqueValidHrefs(
    [
      '/features/omnichannel-ai-inbox',
      '/features/ai-sales-agent-platform',
      '/integrations/shopify',
      '/solutions/ecommerce',
      '/alternatives/intercom',
      '/compare',
      '/compare/intercom-vs-zendesk',
      '/best/intercom-alternatives',
      '/what-is-ai-revenue-system',
      '/docs/quickstart',
    ],
    currentPath,
  );
}

const compareMappings = {
  '/compare/intercom-vs-zendesk': [
    '/compare',
    '/features/ai-customer-support-platform',
    '/features/omnichannel-ai-inbox',
    '/integrations/whatsapp-business-api',
    '/solutions/saas',
    '/alternatives/intercom',
    '/best/intercom-alternatives',
    '/intercom-pricing-breakdown',
    '/zendesk-pricing-breakdown',
    '/why-ai-support-is-the-future',
  ],
  '/compare/intercom-vs-chatorai': [
    '/compare',
    '/features/omnichannel-ai-inbox',
    '/features/whatsapp-ai-automation',
    '/integrations/whatsapp-business-api',
    '/solutions/ecommerce',
    '/alternatives/intercom',
    '/best/intercom-alternatives',
    '/intercom-hidden-costs',
    '/intercom-is-too-expensive',
  ],
  '/compare/zendesk-vs-chatorai': [
    '/compare',
    '/features/ai-customer-support-platform',
    '/features/ai-sales-agent-platform',
    '/integrations/salesforce',
    '/solutions/saas',
    '/alternatives/zendesk',
    '/best/zendesk-alternatives',
    '/zendesk-hidden-costs',
    '/zendesk-is-overkill',
  ],
};

const bestMappings = {
  '/best/intercom-alternatives': [
    '/compare',
    '/compare/intercom-vs-chatorai',
    '/compare/intercom-vs-zendesk',
    '/features/omnichannel-ai-inbox',
    '/integrations/whatsapp-business-api',
    '/solutions/ecommerce',
    '/alternatives/intercom',
    '/intercom-pricing-breakdown',
    '/intercom-is-too-expensive',
  ],
  '/best/zendesk-alternatives': [
    '/compare',
    '/compare/zendesk-vs-chatorai',
    '/compare/intercom-vs-zendesk',
    '/features/ai-customer-support-platform',
    '/integrations/salesforce',
    '/solutions/saas',
    '/alternatives/zendesk',
    '/zendesk-pricing-breakdown',
    '/zendesk-is-overkill',
  ],
};

const pricingMappings = {
  '/intercom-pricing-breakdown': [
    '/compare',
    '/alternatives/intercom',
    '/compare/intercom-vs-chatorai',
    '/best/intercom-alternatives',
    '/features/omnichannel-ai-inbox',
    '/what-is-ai-revenue-system',
    '/intercom-is-too-expensive',
  ],
  '/zendesk-pricing-breakdown': [
    '/compare',
    '/alternatives/zendesk',
    '/compare/zendesk-vs-chatorai',
    '/best/zendesk-alternatives',
    '/features/ai-customer-support-platform',
    '/what-is-ai-revenue-system',
    '/zendesk-is-overkill',
  ],
  '/intercom-hidden-costs': [
    '/compare',
    '/alternatives/intercom',
    '/compare/intercom-vs-chatorai',
    '/best/intercom-alternatives',
    '/features/whatsapp-ai-automation',
    '/what-is-ai-revenue-system',
    '/intercom-is-too-expensive',
  ],
  '/zendesk-hidden-costs': [
    '/compare',
    '/alternatives/zendesk',
    '/compare/zendesk-vs-chatorai',
    '/best/zendesk-alternatives',
    '/features/ai-customer-support-platform',
    '/what-is-ai-customer-support',
    '/zendesk-is-overkill',
  ],
};

const categoryMappings = {
  '/what-is-ai-customer-support': [
    '/compare',
    '/features/ai-customer-support-platform',
    '/alternatives/zendesk',
    '/compare/zendesk-vs-chatorai',
    '/zendesk-hidden-costs',
    '/what-is-ai-revenue-system',
    '/why-ai-support-is-the-future',
  ],
  '/what-is-ai-revenue-system': [
    '/compare',
    '/ai-revenue-operating-system',
    '/features/ai-sales-agent-platform',
    '/features/omnichannel-ai-inbox',
    '/compare/intercom-vs-zendesk',
    '/what-is-ai-customer-support',
    '/intercom-is-too-expensive',
  ],
};

const discussionMappings = {
  '/intercom-is-too-expensive': [
    '/alternatives/intercom',
    '/compare/intercom-vs-chatorai',
    '/intercom-pricing-breakdown',
    '/best/intercom-alternatives',
    '/what-is-ai-revenue-system',
    '/features/omnichannel-ai-inbox',
  ],
  '/zendesk-is-overkill': [
    '/alternatives/zendesk',
    '/compare/zendesk-vs-chatorai',
    '/zendesk-pricing-breakdown',
    '/best/zendesk-alternatives',
    '/what-is-ai-customer-support',
    '/features/ai-customer-support-platform',
  ],
  '/why-ai-support-is-the-future': [
    '/what-is-ai-customer-support',
    '/what-is-ai-revenue-system',
    '/features/ai-customer-support-platform',
    '/features/omnichannel-ai-inbox',
    '/compare',
    '/docs/ai-customer-support',
  ],
};

function buildCompareHubRelated(currentPath) {
  return uniqueValidHrefs(
    [
      '/compare/intercom-vs-zendesk',
      '/compare/intercom-vs-chatorai',
      '/compare/zendesk-vs-chatorai',
      '/best/intercom-alternatives',
      '/intercom-pricing-breakdown',
      '/what-is-ai-revenue-system',
      '/why-ai-support-is-the-future',
    ],
    currentPath,
  );
}

function buildCompareRelated(currentPath) {
  return uniqueValidHrefs(
    [
      ...pickCyclicalNeighbors(compareOrder, currentPath, 2),
      ...(compareMappings[currentPath] || []),
    ],
    currentPath,
  );
}

function buildBestRelated(currentPath) {
  return uniqueValidHrefs(
    [
      ...pickCyclicalNeighbors(bestOrder, currentPath, 1),
      ...(bestMappings[currentPath] || []),
    ],
    currentPath,
  );
}

function buildPricingRelated(currentPath) {
  return uniqueValidHrefs(
    [
      ...pickCyclicalNeighbors(pricingOrder, currentPath, 1),
      ...(pricingMappings[currentPath] || []),
    ],
    currentPath,
  );
}

function buildCategoryRelated(currentPath) {
  return uniqueValidHrefs(
    [
      ...pickCyclicalNeighbors(categoryOrder, currentPath, 1),
      ...(categoryMappings[currentPath] || []),
    ],
    currentPath,
  );
}

function buildDiscussionRelated(currentPath) {
  return uniqueValidHrefs(
    [
      ...pickCyclicalNeighbors(discussionOrder, currentPath, 2),
      ...(discussionMappings[currentPath] || []),
    ],
    currentPath,
  );
}

export function getRelatedPages(currentPath) {
  let hrefs = [];

  if (currentPath === overviewPage.href) {
    hrefs = buildOverviewRelated(currentPath);
  } else if (currentPath === compareHubPage.href) {
    hrefs = buildCompareHubRelated(currentPath);
  } else if (currentPath.startsWith('/features/')) {
    hrefs = buildFeatureRelated(currentPath);
  } else if (currentPath.startsWith('/alternatives/')) {
    hrefs = buildAlternativeRelated(currentPath);
  } else if (currentPath.startsWith('/integrations/')) {
    hrefs = buildIntegrationRelated(currentPath);
  } else if (currentPath.startsWith('/solutions/')) {
    hrefs = buildSolutionRelated(currentPath);
  } else if (currentPath.startsWith('/docs/')) {
    hrefs = buildDocRelated(currentPath);
  } else if (currentPath.startsWith('/compare/')) {
    hrefs = buildCompareRelated(currentPath);
  } else if (currentPath.startsWith('/best/')) {
    hrefs = buildBestRelated(currentPath);
  } else if (pricingOrder.includes(currentPath)) {
    hrefs = buildPricingRelated(currentPath);
  } else if (categoryOrder.includes(currentPath)) {
    hrefs = buildCategoryRelated(currentPath);
  } else if (discussionOrder.includes(currentPath)) {
    hrefs = buildDiscussionRelated(currentPath);
  }

  return hrefs.map((href) => catalogByHref.get(href)).filter(Boolean);
}

export function getInternalLinkGraph() {
  const routes = seoCatalog.map((page) => page.href);
  const graph = new Map(routes.map((href) => [href, getRelatedPages(href).map((page) => page.href)]));
  return graph;
}

export function getSeoRouteCatalog() {
  return seoCatalog;
}
