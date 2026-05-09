import React from 'react';
import { notFound } from 'next/navigation';
import { HeroSection } from '@/components/seo/HeroSection';
import { ProblemSection } from '@/components/seo/ProblemSection';
import { FeatureGrid } from '@/components/seo/FeatureGrid';
import { WorkflowSection } from '@/components/seo/WorkflowSection';
import { FAQSection } from '@/components/seo/FAQSection';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { UseCasesSection } from '@/components/seo/UseCasesSection';
import { CTASection } from '@/components/seo/CTASection';
import { SeoPageLayout } from '@/components/seo/SeoPageLayout';
import { integrationsData } from '@/lib/pseo/integrations';
import {
  buildIntegrationNodes,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = integrationsData[slug];

  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `https://chatorai.com/integrations/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(integrationsData).map((slug) => ({
    slug: slug,
  }));
}

export default async function IntegrationPseoPage({ params }) {
  const { slug } = await params;
  const data = integrationsData[slug];

  if (!data) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Integrations', href: '/#integrations' },
    { name: `${data.name} Integration`, href: `/integrations/${slug}` }
  ];
  const pagePath = `/integrations/${slug}`;
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: data.title,
      description: data.description,
      mainEntityId: `https://chatorai.com${pagePath}#service`,
      aboutIds: ['https://chatorai.com/#product', `https://chatorai.com${pagePath}#partner`],
      mentionIds: [`https://chatorai.com${pagePath}#partner`],
    }),
    ...buildIntegrationNodes({
      path: pagePath,
      title: data.pageTitle,
      description: data.description,
      partnerName: data.name,
      capabilities: data.capabilities || [],
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId={`integration-schema-${slug}`}
    >
      <HeroSection
        eyebrow={data.eyebrow}
        title={data.pageTitle}
        description={data.categoryDefinition}
        supportingParagraph={data.supportingParagraph}
        primaryCtaText="Start the integration trial"
        secondaryCtaText="Talk to an integration expert"
        proof={`Built for teams solving real ${data.name} workflow problems, not just adding another connector.`}
      />

      <ProblemSection
        title={`Why teams connect ${data.name} to ChatorAI`}
        description={`The integration matters when live conversations depend on data that already exists in ${data.name}, but your current workflow still cannot use that context fast enough.`}
        points={data.problemPoints || []}
      />

      <FeatureGrid
        title={`What the ${data.name} integration unlocks`}
        description="Use live data, grounded automation, and cleaner routing from the same conversation layer."
        features={data.capabilities}
      />

      <WorkflowSection
        title={`How the ${data.name} integration works`}
        description="Connect the source system, sync the context, and validate the workflow before it touches live customers."
        steps={data.steps}
      />

      <UseCasesSection
        title={`What teams use the ${data.name} integration for`}
        description={`These are the workflows where connecting ${data.name} creates the biggest operational payoff.`}
        useCases={data.useCases || []}
      />

      <FAQSection
        faqs={data.faqs}
        pagePath={pagePath}
        description={`Short answers to the most common operational questions about the ${data.name} integration.`}
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title={`Ready to connect ${data.name} to ChatorAI?`}
        description={`Turn ${data.name} data into faster support, cleaner routing, and better conversion workflows from one AI-assisted workspace.`}
        primaryCtaText="Start integration trial"
        secondaryCtaText="Schedule integration demo"
      />
    </SeoPageLayout>
  );
}
