import { priorityPages } from '@/lib/seo-data';
import { alternativesData } from '@/lib/pseo/alternatives';
import { integrationsData } from '@/lib/pseo/integrations';
import { solutionsData } from '@/lib/pseo/solutions';
import { docsData } from '@/lib/pseo/docs';
import { comparePagesData } from '@/lib/pseo/compare';
import { bestPagesData } from '@/lib/pseo/best';
import { pricingInsightPages, categoryExplanationPages, discussionPages } from '@/lib/pseo/flywheel';

const rawSearchDocuments = [
  ...priorityPages.map((page) => ({
    title: page.title,
    href: page.href,
    description: page.description,
    type: 'Page',
    keywords: [page.title, page.description].join(' '),
  })),
  ...Object.values(alternativesData).map((page) => ({
    title: `${page.name} Alternative`,
    href: `/alternatives/${page.slug}`,
    description: page.description,
    type: 'Alternative',
    keywords: [
      page.name,
      page.pageTitle,
      page.categoryDefinition,
      ...(page.capabilities || []).map((item) => item.title),
    ].join(' '),
  })),
  ...Object.values(integrationsData).map((page) => ({
    title: `${page.name} Integration`,
    href: `/integrations/${page.slug}`,
    description: page.description,
    type: 'Integration',
    keywords: [
      page.name,
      page.pageTitle,
      page.categoryDefinition,
      ...(page.capabilities || []).map((item) => item.title),
    ].join(' '),
  })),
  ...Object.values(solutionsData).map((page) => ({
    title: `${page.name} Solution`,
    href: `/solutions/${page.slug}`,
    description: page.description,
    type: 'Solution',
    keywords: [
      page.name,
      page.pageTitle,
      page.categoryDefinition,
      ...(page.capabilities || []).map((item) => item.title),
    ].join(' '),
  })),
  ...Object.entries(docsData).map(([path, page]) => ({
    title: page.h1,
    href: `/docs/${path}`,
    description: page.description,
    type: 'Documentation',
    keywords: [
      page.h1,
      page.intro,
      ...(page.sections || []).map((section) => section.title),
    ].join(' '),
  })),
  ...Object.values(comparePagesData).map((page) => ({
    title: page.pageTitle,
    href: `/compare/${page.slug}`,
    description: page.description,
    type: 'Comparison',
    keywords: [
      page.subject || '',
      page.pageTitle,
      page.categoryDefinition,
      ...(page.capabilities || []).map((item) => item.title),
      ...(page.summaryCards || []).map((item) => item.title),
    ].join(' '),
  })),
  ...Object.values(bestPagesData).map((page) => ({
    title: page.pageTitle,
    href: `/best/${page.slug}`,
    description: page.description,
    type: 'Best Alternatives',
    keywords: [
      page.subject,
      page.pageTitle,
      page.categoryDefinition,
      ...(page.capabilities || []).map((item) => item.title),
      ...(page.ranking || []).map((item) => item.name),
    ].join(' '),
  })),
  ...Object.values(pricingInsightPages).map((page) => ({
    title: page.pageTitle,
    href: page.path,
    description: page.description,
    type: 'Pricing Intelligence',
    keywords: [
      page.pageTitle,
      page.categoryDefinition,
      page.directAnswer,
      ...(page.capabilities || []).map((item) => item.title),
    ].join(' '),
  })),
  ...Object.values(categoryExplanationPages).map((page) => ({
    title: page.pageTitle,
    href: page.path,
    description: page.description,
    type: 'Category Guide',
    keywords: [
      page.pageTitle,
      page.categoryDefinition,
      page.directAnswer,
      ...(page.capabilities || []).map((item) => item.title),
    ].join(' '),
  })),
  ...Object.values(discussionPages).map((page) => ({
    title: page.pageTitle,
    href: page.path,
    description: page.description,
    type: 'Discussion',
    keywords: [
      page.pageTitle,
      page.categoryDefinition,
      page.directAnswer,
      ...(page.capabilities || []).map((item) => item.title),
      ...(page.talkableItems || []).map((item) => item.title),
    ].join(' '),
  })),
];

export const searchDocuments = Array.from(
  rawSearchDocuments.reduce((docsByHref, doc) => {
    if (!docsByHref.has(doc.href)) {
      docsByHref.set(doc.href, doc);
    }

    return docsByHref;
  }, new Map()).values(),
);

export function findSearchResults(query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return [];

  const scored = searchDocuments
    .map((doc) => {
      const haystack = `${doc.title} ${doc.description} ${doc.keywords}`.toLowerCase();
      if (!haystack.includes(normalized)) return null;

      let score = 0;
      if (doc.title.toLowerCase().includes(normalized)) score += 5;
      if (doc.description.toLowerCase().includes(normalized)) score += 3;
      if (doc.keywords.toLowerCase().includes(normalized)) score += 1;

      return { ...doc, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  return scored.slice(0, 12);
}
