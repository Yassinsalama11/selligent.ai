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
import { solutionsData } from '@/lib/pseo/solutions';
import {
  buildJsonLdGraph,
  buildSolutionServiceNode,
  buildWebPageNode,
} from '@/lib/site-schema';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = solutionsData[slug];

  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `https://chatorai.com/solutions/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(solutionsData).map((slug) => ({
    slug: slug,
  }));
}

export default async function SolutionPseoPage({ params }) {
  const { slug } = await params;
  const data = solutionsData[slug];

  if (!data) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Solutions', href: '/#solutions' },
    { name: `${data.name} Solution`, href: `/solutions/${slug}` }
  ];
  const pagePath = `/solutions/${slug}`;
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: data.title,
      description: data.description,
      mainEntityId: `https://chatorai.com${pagePath}#service`,
      aboutIds: ['https://chatorai.com/#product'],
    }),
    buildSolutionServiceNode({
      path: pagePath,
      title: data.pageTitle,
      description: data.categoryDefinition,
      capabilities: data.capabilities || [],
      industryName: data.name,
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId={`solution-schema-${slug}`}
    >
      <HeroSection
        eyebrow={data.eyebrow}
        title={data.pageTitle}
        description={data.categoryDefinition}
        supportingParagraph={data.supportingParagraph}
        primaryCtaText="Start industry trial"
        secondaryCtaText="Book industry demo"
        proof={`Built for ${data.name.toLowerCase()} operators who need measurable support, routing, and revenue outcomes in one system.`}
      />

      <ProblemSection
        title={`Why ${data.name} teams need a better operating layer`}
        description={`Industry-specific AI only matters when it solves the repeated operational bottlenecks that keep revenue, support, and follow-up teams slower than they should be.`}
        points={data.problemPoints || []}
      />

      <FeatureGrid
        title={`What ChatorAI changes for ${data.name}`}
        description={`Use AI to remove friction from the workflows that matter most in the ${data.name.toLowerCase()} operating model.`}
        features={data.capabilities}
      />

      <WorkflowSection
        title={`How ChatorAI works for ${data.name}`}
        description="Connect the context, define the operating rules, and launch AI workflows where the industry needs the fastest response."
        steps={data.steps}
      />

      <UseCasesSection
        title={`${data.name} use cases ChatorAI is built for`}
        description={`These are the workflows where ${data.name.toLowerCase()} teams usually need the strongest mix of AI support, routing, and conversion.`}
        useCases={data.useCases || []}
      />

      <FAQSection
        faqs={data.faqs}
        pagePath={pagePath}
        description={`Answers to the questions ${data.name.toLowerCase()} teams ask most often when evaluating ChatorAI.`}
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title={`Ready to improve ${data.name.toLowerCase()} operations?`}
        description={`See how ChatorAI improves ${data.name.toLowerCase()} workflows with faster response, better qualification, and more automation from one premium workspace.`}
        secondaryCtaText="Talk through your use case"
      />
    </SeoPageLayout>
  );
}
