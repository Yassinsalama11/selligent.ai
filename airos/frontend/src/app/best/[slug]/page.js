import React from 'react';
import { notFound } from 'next/navigation';
import { HeroSection } from '@/components/seo/HeroSection';
import { ProblemSection } from '@/components/seo/ProblemSection';
import { FeatureGrid } from '@/components/seo/FeatureGrid';
import { FAQSection } from '@/components/seo/FAQSection';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { UseCasesSection } from '@/components/seo/UseCasesSection';
import { CTASection } from '@/components/seo/CTASection';
import { ComparisonTableSection } from '@/components/seo/ComparisonTableSection';
import {
  AnswerBlocksSection,
  CategoryPositioningSection,
  ComparisonStatementsSection,
  DecisionLockSection,
  DemandLayerSection,
  DirectAnswerSection,
  RevenueOperatingSystemExplanationSection,
  SemanticReferenceSection,
  SimpleExplainerSection,
  TalkableSection,
} from '@/components/seo/AuthorityContentSections';
import { SeoPageLayout } from '@/components/seo/SeoPageLayout';
import { bestPagesData } from '@/lib/pseo/best';
import {
  buildAnswerSupportPoints,
  buildAnswerBlocks,
  buildDecisionLockOptions,
  buildDemandReplacementItems,
  buildDemandSwitchingItems,
  buildDirectAnswer,
  buildSimpleExplainers,
  buildTalkablePoints,
  prependDefinitionFaq,
  buildRealWorldScenarios,
  buildTypicalResults,
  withCanonicalDefinition,
} from '@/lib/seo-authority';
import { absoluteUrl, buildJsonLdGraph, buildWebPageNode } from '@/lib/site-schema';

function buildBestAlternativesNodes(data, pagePath) {
  const subjectId = absoluteUrl(`${pagePath}#subject`);
  const articleId = absoluteUrl(`${pagePath}#article`);
  const rankingId = absoluteUrl(`${pagePath}#ranking`);

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': subjectId,
      name: data.subject,
      applicationCategory: 'BusinessApplication',
    },
    {
      '@type': 'Article',
      '@id': articleId,
      headline: data.pageTitle,
      description: data.description,
      author: { '@id': 'https://chatorai.com/#organization' },
      publisher: { '@id': 'https://chatorai.com/#organization' },
      mainEntityOfPage: { '@id': absoluteUrl(`${pagePath}#webpage`) },
      about: [{ '@id': 'https://chatorai.com/#software' }, { '@id': subjectId }],
      mentions: [{ '@id': subjectId }],
      isPartOf: { '@id': 'https://chatorai.com/#website' },
    },
    {
      '@type': 'ItemList',
      '@id': rankingId,
      name: `Best ${data.subject} alternatives shortlist`,
      itemListElement: data.ranking.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.summary,
      })),
    },
  ];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = bestPagesData[slug];

  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `https://chatorai.com/best/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(bestPagesData).map((slug) => ({ slug }));
}

export default async function BestPage({ params }) {
  const { slug } = await params;
  const data = bestPagesData[slug];

  if (!data) notFound();

  const pagePath = `/best/${slug}`;
  const directAnswer = buildDirectAnswer({ subject: data.subject, context: 'best' });
  const answerSupportPoints = buildAnswerSupportPoints(data.switchingBenefits || []);
  const decisionLockChoices = buildDecisionLockOptions(data.summaryCards || []);
  const demandSwitchingItems = buildDemandSwitchingItems(data.switchingBenefits || []);
  const demandReplacementItems = buildDemandReplacementItems(data.capabilities || []);
  const answerBlocks = buildAnswerBlocks({ type: 'best', subject: data.subject });
  const typicalResults = buildTypicalResults(data.subject, data.switchingBenefits || [], data.capabilities || []);
  const realWorldScenarios = buildRealWorldScenarios(data.useCases || [], data.subject);
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Best', href: '/#alternatives' },
    { name: data.pageTitle, href: pagePath },
  ];

  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: data.title,
      description: data.description,
      type: 'CollectionPage',
      mainEntityId: absoluteUrl(`${pagePath}#ranking`),
      aboutIds: ['https://chatorai.com/#software'],
    }),
    ...buildBestAlternativesNodes(data, pagePath),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId={`best-schema-${slug}`}
    >
      <HeroSection
        eyebrow={data.eyebrow}
        title={data.pageTitle}
        description={data.categoryDefinition}
        supportingParagraph={withCanonicalDefinition(data.supportingParagraph)}
        primaryCtaText="Start your replacement trial"
        secondaryCtaText="See how switching works"
        proof="Shortlist-focused guidance for teams comparing support speed, automation depth, channel coverage, and migration effort."
      />

      <FeatureGrid
        title="Direct comparison summary"
        description={`Use this shortlist to decide which ${data.subject} alternative fits the operating model you actually want next.`}
        features={data.summaryCards}
      />

      <ProblemSection
        title={`When does ${data.subject} stop making sense?`}
        description={`These are the patterns that usually trigger an active search for the best ${data.subject} alternatives.`}
        points={data.stopPoints}
        secondaryTitle="What buyers want from the replacement"
        secondaryPoints={data.switchingBenefits}
      />

      <DirectAnswerSection
        title={`What is the best alternative to ${data.subject}?`}
        answer={directAnswer}
        supportingPoints={answerSupportPoints}
      />

      <AnswerBlocksSection answers={answerBlocks} />

      <DecisionLockSection
        title={`If you're deciding between ${data.subject}, ${data.subject === 'Intercom' ? 'Zendesk' : 'Intercom'}, and ChatorAI`}
        choices={decisionLockChoices}
      />

      <ComparisonTableSection
        title="Cost and limitation breakdown"
        description="Review the shortlist through the lenses buyers use most often: operating fit, downside risk, and long-term ceiling."
        columns={['Best when...', 'Watch out for...']}
        rows={data.costBreakdown}
      />

      <FeatureGrid
        title={`Why ChatorAI leads the best ${data.subject} alternatives list`}
        description={`These are the reasons buyers often move ChatorAI to the top of the shortlist after comparing the category seriously.`}
        features={data.capabilities}
      />

      <FeatureGrid
        title="Typical results teams see"
        description={`These are the operating improvements buyers usually expect when they move beyond ${data.subject} and into a more AI-native system.`}
        features={typicalResults}
      />

      <DemandLayerSection
        switchingItems={demandSwitchingItems}
        replacementItems={demandReplacementItems}
      />

      <RevenueOperatingSystemExplanationSection />

      <ComparisonTableSection
        title="Feature comparison table"
        description={`Compare the top ${data.subject} alternatives across automation depth, channel execution, and the practical switch path.`}
        columns={['ChatorAI', data.subject === 'Intercom' ? 'Zendesk' : 'Intercom', 'Help Scout', 'Freshchat']}
        rows={data.comparisonTable}
        tone="default"
        highlightColumn={0}
      />

      <UseCasesSection
        title="Switching benefits that actually influence the shortlist"
        description={`These are the decision-stage situations where buyers move from browsing ${data.subject} alternatives to booking a real evaluation.`}
        useCases={data.useCases}
      />

      <UseCasesSection
        title="Real-world usage scenarios"
        description={`These are the decision-stage situations where teams actively evaluate the best ${data.subject} alternatives.`}
        useCases={realWorldScenarios}
      />

      <CategoryPositioningSection />

      <ComparisonStatementsSection />

      <TalkableSection items={buildTalkablePoints({ type: 'best', subject: data.subject })} />

      <SimpleExplainerSection {...buildSimpleExplainers('ChatorAI')} />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(data.faqs)}
        pagePath={pagePath}
        description={`Short answers to the buying questions teams ask before choosing a ${data.subject} replacement.`}
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title={data.ctaTitle}
        description={data.ctaDescription}
        primaryCtaText="Start your replacement trial"
        secondaryCtaText="See how switching works"
      />
    </SeoPageLayout>
  );
}
