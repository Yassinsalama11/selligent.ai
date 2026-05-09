export const dynamic = 'force-static';

import { priorityPages } from '@/lib/seo-data';
import { alternativesData } from '@/lib/pseo/alternatives';
import { integrationsData } from '@/lib/pseo/integrations';
import { solutionsData } from '@/lib/pseo/solutions';
import { docsData } from '@/lib/pseo/docs';
import { comparePagesData } from '@/lib/pseo/compare';
import { bestPagesData } from '@/lib/pseo/best';
import { pricingInsightPages, categoryExplanationPages, discussionPages } from '@/lib/pseo/flywheel';

export default function sitemap() {
  const baseUrl = 'https://chatorai.com';
  const entries = new Map();

  const addEntries = (items) => {
    items.forEach((item) => {
      if (!entries.has(item.url)) {
        entries.set(item.url, item);
      }
    });
  };

  const corePages = priorityPages.map((page) => ({
    url: `${baseUrl}${page.href}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const publicStaticPages = [
    '/about',
    '/blog',
    '/careers',
    '/changelog',
    '/contact',
    '/cookies',
    '/demo',
    '/press',
    '/privacy',
    '/security',
    '/status',
    '/terms',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: ['/demo', '/about', '/security', '/contact'].includes(path) ? 0.7 : 0.5,
  }));

  const alternatives = Object.keys(alternativesData).map((slug) => ({
    url: `${baseUrl}/alternatives/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const integrations = Object.keys(integrationsData).map((slug) => ({
    url: `${baseUrl}/integrations/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const solutions = Object.keys(solutionsData).map((slug) => ({
    url: `${baseUrl}/solutions/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const docs = Object.keys(docsData).map((path) => ({
    url: `${baseUrl}/docs/${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const comparisons = Object.keys(comparePagesData).map((slug) => ({
    url: `${baseUrl}/compare/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  const bestPages = Object.keys(bestPagesData).map((slug) => ({
    url: `${baseUrl}/best/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  const pricingInsights = Object.values(pricingInsightPages).map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.72,
  }));

  const categoryPages = Object.values(categoryExplanationPages).map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const discussionEntries = Object.values(discussionPages).map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.72,
  }));

  addEntries([
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]);
  addEntries(publicStaticPages);
  addEntries(corePages);
  addEntries(alternatives);
  addEntries(integrations);
  addEntries(solutions);
  addEntries(docs);
  addEntries(comparisons);
  addEntries(bestPages);
  addEntries(pricingInsights);
  addEntries(categoryPages);
  addEntries(discussionEntries);

  return Array.from(entries.values());
}
