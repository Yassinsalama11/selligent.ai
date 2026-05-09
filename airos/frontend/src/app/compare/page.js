import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SeoPageLayout, SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';
import { HeroSection } from '@/components/seo/HeroSection';
import { FeatureGrid } from '@/components/seo/FeatureGrid';
import { DecisionLockSection, CanonicalDefinitionSection } from '@/components/seo/AuthorityContentSections';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { CTASection } from '@/components/seo/CTASection';
import { comparePagesData } from '@/lib/pseo/compare';
import { bestPagesData } from '@/lib/pseo/best';
import { buildJsonLdGraph, buildWebPageNode } from '@/lib/site-schema';
import { withCanonicalDefinition } from '@/lib/seo-authority';

export const metadata = {
  title: 'Compare ChatorAI Against Intercom, Zendesk, and More | ChatorAI',
  description:
    'Use the ChatorAI comparison hub to evaluate Intercom, Zendesk, pricing pressure, hidden costs, and the cleanest switch path for support and revenue teams.',
  alternates: {
    canonical: 'https://chatorai.com/compare',
  },
};

const comparisonResources = [
  ...Object.values(comparePagesData).map((page) => ({
    href: `/compare/${page.slug}`,
    title: page.pageTitle,
    description: page.description,
  })),
  ...Object.values(bestPagesData).map((page) => ({
    href: `/best/${page.slug}`,
    title: page.pageTitle,
    description: page.description,
  })),
  {
    href: '/intercom-pricing-breakdown',
    title: 'Intercom Pricing Breakdown',
    description: 'Understand how Intercom pricing usually scales and why renewal discussions often lead to a ChatorAI comparison.',
  },
  {
    href: '/zendesk-pricing-breakdown',
    title: 'Zendesk Pricing Breakdown',
    description: 'See where Zendesk cost pressure usually grows and how buyers compare it with a broader AI operating model.',
  },
];

const decisionChoices = [
  {
    title: 'Start with direct comparisons if the shortlist is already clear',
    description:
      'Use the compare pages when the team is actively choosing between Intercom, Zendesk, and ChatorAI and needs decision logic fast.',
  },
  {
    title: 'Start with best-of pages if the buyer still wants a broader shortlist',
    description:
      'Use the best pages when the team still wants to compare a few categories of replacement paths before locking the switch decision.',
  },
  {
    title: 'Use pricing and hidden-cost pages when the real friction is economic',
    description:
      'If the argument is really about cost scaling, renewal pressure, or complexity, start with the pricing guides before moving into platform comparison.',
  },
];

const hubCards = [
  {
    title: 'Direct switch comparisons',
    description: 'Compare ChatorAI against Intercom or Zendesk when the replacement shortlist is already in motion.',
  },
  {
    title: 'Best replacement shortlists',
    description: 'Review broader category choices when the team still wants to compare more than one replacement path.',
  },
  {
    title: 'Pricing and hidden-cost intelligence',
    description: 'Use the cost pages when the real pressure behind the decision is scaling economics or support-stack complexity.',
  },
];

export default function CompareHubPage() {
  const pagePath = '/compare';
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: metadata.title,
      description: metadata.description,
      type: 'CollectionPage',
      mainEntityId: 'https://chatorai.com/compare#webpage',
      aboutIds: ['https://chatorai.com/#software', 'https://chatorai.com/#product'],
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Compare', href: '/compare' },
      ]}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId="compare-hub-schema"
    >
      <HeroSection
        eyebrow="Comparison hub"
        title="Compare ChatorAI against the tools buyers evaluate most"
        description="Use one hub to review competitor comparisons, best-alternative shortlists, pricing pressure guides, and hidden-cost pages before the switch decision is locked."
        supportingParagraph={withCanonicalDefinition('Start here when the real question is which support or revenue system gives the cleanest path to better automation, better economics, and better conversation outcomes.')}
        primaryCtaText="Start your replacement trial"
        secondaryCtaText="See how switching works"
        proof="Built for teams making active support-stack and revenue-system decisions."
      />

      <CanonicalDefinitionSection />

      <FeatureGrid
        title="How to use the comparison hub"
        description="Choose the path that matches the decision stage your team is actually in."
        features={hubCards}
      />

      <DecisionLockSection
        title="How to choose between tools"
        choices={decisionChoices}
      />

      <SeoSection tone="muted">
        <SeoSectionHeading
          title="All comparison resources"
          description="Every page below helps a different stage of the evaluation, from direct competitor choice to pricing and hidden-cost review."
        />
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {comparisonResources.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="group rounded-[1.5rem] border border-border/60 bg-card/95 p-6 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_64px_-36px_hsl(var(--primary)/0.34)]"
            >
              <h3 className="text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                {resource.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{resource.description}</p>
              <div className="mt-5 flex items-center text-sm font-semibold text-primary">
                Open comparison
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </SeoSection>

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title="Ready to compare the live workflow instead of just reading about it?"
        description="Use the comparison hub to narrow the shortlist, then validate ChatorAI in a trial workspace before making the final switch decision."
        primaryCtaText="Start your replacement trial"
        secondaryCtaText="See how switching works"
      />
    </SeoPageLayout>
  );
}
