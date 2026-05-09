import React from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { StructuredData } from '@/components/seo/StructuredData';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { findSearchResults } from '@/lib/search-index';
import { buildJsonLdGraph, buildWebPageNode } from '@/lib/site-schema';

export const metadata = {
  title: 'Search | ChatorAI',
  description: 'Search ChatorAI documentation, feature pages, integrations, alternatives, and solution pages.',
  alternates: {
    canonical: 'https://chatorai.com/search',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = String(params?.q || '').trim();
  const results = findSearchResults(query);
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Search', href: '/search' },
  ];

  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: '/search',
      name: 'ChatorAI Search',
      description: metadata.description,
      mainEntityId: null,
    }),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <BreadcrumbSchema items={breadcrumbs} pagePath="/search" />
      <StructuredData id="search-page-schema" data={graph} />
      <PublicNav />

      <section className="px-6 pb-20 pt-32 md:px-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Search</p>
            <h1 className="text-4xl font-bold tracking-tight">Search ChatorAI</h1>
            <p className="text-base text-muted-foreground">
              Search feature pages, documentation, integrations, alternatives, and solution guides.
            </p>
          </div>

          <form action="/search" method="get" className="mb-10">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search docs, integrations, features..."
              className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none ring-0 transition-colors placeholder:text-muted-foreground focus:border-primary"
            />
          </form>

          {query ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {results.length} result{results.length === 1 ? '' : 's'} for <span className="font-semibold text-foreground">{query}</span>
              </p>
              {results.length > 0 ? (
                <div className="space-y-3">
                  {results.map((result) => (
                    <Link
                      key={result.href}
                      href={result.href}
                      className="block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-muted/20"
                    >
                      <div className="mb-2 flex items-center gap-3">
                        <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                          {result.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{result.href}</span>
                      </div>
                      <h2 className="text-lg font-bold tracking-tight">{result.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{result.description}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  No matching public pages were found for that query yet. Try product names, integrations, industry terms, or documentation topics.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              Enter a search term to browse ChatorAI public pages and documentation.
            </div>
          )}
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
