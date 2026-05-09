import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { FileText, Zap, Globe, Cpu, BookOpen } from 'lucide-react';
import { SeoPageLayout } from '@/components/seo/SeoPageLayout';
import { HeroSection } from '@/components/seo/HeroSection';
import { ProblemSection } from '@/components/seo/ProblemSection';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { UseCasesSection } from '@/components/seo/UseCasesSection';
import { FAQSection } from '@/components/seo/FAQSection';
import { CTASection } from '@/components/seo/CTASection';
import {
  AnswerBlocksSection,
  CanonicalDefinitionSection,
  ComparisonStatementsSection,
  RevenueOperatingSystemExplanationSection,
  SemanticReferenceSection,
} from '@/components/seo/AuthorityContentSections';
import { docsData } from '@/lib/pseo/docs';
import { buildAnswerBlocks, prependDefinitionFaq, withCanonicalDefinition } from '@/lib/seo-authority';
import {
  buildDocNodes,
  buildJsonLdGraph,
  buildWebPageNode,
  toHowToSteps,
} from '@/lib/site-schema';

const DOCS_SIDEBAR = [
  {
    title: 'Getting Started',
    links: [
      { label: 'Quickstart', href: '/docs/quickstart', icon: <Zap className="h-4 w-4" /> },
      { label: 'Core Concepts', href: '/docs/concepts', icon: <BookOpen className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { label: 'Shopify', href: '/docs/integrations/shopify', icon: <Globe className="h-4 w-4" /> },
      { label: 'WhatsApp', href: '/docs/integrations/whatsapp', icon: <Cpu className="h-4 w-4" /> },
    ],
  },
  {
    title: 'API Reference',
    links: [
      { label: 'Overview', href: '/docs/api/overview', icon: <FileText className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Definitions',
    links: [
      { label: 'AI Customer Support', href: '/docs/ai-customer-support', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'AI Sales Automation', href: '/docs/ai-sales-automation', icon: <Zap className="h-4 w-4" /> },
      { label: 'Omnichannel Communication', href: '/docs/omnichannel-communication', icon: <Globe className="h-4 w-4" /> },
      { label: 'WhatsApp Automation', href: '/docs/whatsapp-automation', icon: <Cpu className="h-4 w-4" /> },
      { label: 'Conversation Routing', href: '/docs/conversation-routing', icon: <FileText className="h-4 w-4" /> },
    ],
  },
];

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const path = slug.join('/');
  const data = docsData[path];

  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `https://chatorai.com/docs/${path}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(docsData).map((path) => ({
    slug: path.split('/'),
  }));
}

export default async function DocPseoPage({ params }) {
  const { slug } = await params;
  const path = slug.join('/');
  const data = docsData[path];

  if (!data) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Docs', href: '/docs/quickstart' },
    { name: data.h1, href: `/docs/${path}` },
  ];

  const pagePath = `/docs/${path}`;
  const howToEligible = ['quickstart', 'integrations/shopify', 'integrations/whatsapp'].includes(path);
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: data.title,
      description: data.description,
      mainEntityId: `https://chatorai.com/docs/${path}#article`,
      aboutIds: ['https://chatorai.com/#software', 'https://chatorai.com/#product'],
    }),
    ...buildDocNodes({
      path,
      title: data.h1,
      description: data.description,
      howToSteps: howToEligible ? toHowToSteps(data.sections || []) : [],
    }),
  ]);

  const sidebar = (
    <div className="sticky top-28">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <nav className="space-y-8 pr-3">
          {DOCS_SIDEBAR.map((section) => (
            <div key={section.title}>
              <h4 className="mb-4 px-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {section.title}
              </h4>
              <ul className="space-y-1.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
                        pagePath === link.href
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/40 hover:text-foreground'
                      )}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );

  const mobileSidebar = (
    <div className="rounded-[1.5rem] border border-border/60 bg-card/90 p-5 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Documentation</p>
      <div className="flex flex-wrap gap-2">
        {DOCS_SIDEBAR.flatMap((section) => section.links).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
              pagePath === link.href
                ? 'border-primary/20 bg-primary/10 text-primary'
                : 'border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
            )}
          >
            {link.icon}
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId={`docs-schema-${path.replace(/[^a-z0-9]+/gi, '-')}`}
      sidebar={sidebar}
      mobileSidebar={mobileSidebar}
    >
      <HeroSection
        eyebrow="Documentation"
        title={data.h1}
        description={data.intro}
        supportingParagraph={withCanonicalDefinition(data.supportingParagraph)}
        showActions={false}
        variant="compact"
      />

      <CanonicalDefinitionSection />

      <AnswerBlocksSection answers={data.answerBlocks || buildAnswerBlocks({ type: 'doc', subject: data.h1 })} />

      <ProblemSection
        title="Why this guide matters"
        description="Use the guide to move faster through setup, validation, or technical orientation without guessing which platform steps matter most."
        points={data.problemPoints || []}
      />

      <section className="space-y-12 rounded-[2rem] border border-border/60 bg-card/90 p-7 shadow-[0_22px_60px_-40px_rgba(0,0,0,0.45)] sm:p-10">
        {(data.sections || []).map((section) => (
          <div key={section.title} className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
            {(section.paragraphs || []).map((paragraph) => (
              <p key={paragraph} className="text-base leading-7 text-muted-foreground">{paragraph}</p>
            ))}
            {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
              <ul className="list-disc space-y-2 pl-6 text-base leading-7 text-muted-foreground">
                {section.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </section>

      <RevenueOperatingSystemExplanationSection />

      <ComparisonStatementsSection />

      <UseCasesSection
        title="Use this guide when"
        description="These are the situations where this documentation page is most useful."
        useCases={data.useCases || []}
      />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(data.faqs || [])}
        pagePath={pagePath}
        description="Short answers to the practical questions operators usually have while following this guide."
      />

      {Array.isArray(data.nextLinks) && data.nextLinks.length > 0 ? (
        <div className="mt-16 rounded-[1.5rem] border border-border/60 bg-muted/30 p-6 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.35)]">
          <h2 className="mb-4 text-xl font-bold text-foreground">Next steps</h2>
          <div className="flex flex-col gap-3">
            {data.nextLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-primary hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title="Ready to put this workflow into production?"
        description="Use the documentation as the implementation reference, then validate the workflow in a live trial workspace before rollout."
        primaryCtaText="Start implementation trial"
        secondaryCtaText="Book implementation demo"
      />
    </SeoPageLayout>
  );
}
