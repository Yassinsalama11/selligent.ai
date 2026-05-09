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
  CanonicalDefinitionSection,
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
import { comparePagesData } from '@/lib/pseo/compare';
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
import {
  absoluteUrl,
  buildAlternativeNodes,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

function buildIntercomVsZendeskNodes(data, pagePath) {
  const intercomId = absoluteUrl(`${pagePath}#intercom`);
  const zendeskId = absoluteUrl(`${pagePath}#zendesk`);
  const articleId = absoluteUrl(`${pagePath}#comparison`);
  const criteriaId = absoluteUrl(`${pagePath}#criteria`);

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': intercomId,
      name: 'Intercom',
      applicationCategory: 'BusinessApplication',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': zendeskId,
      name: 'Zendesk',
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
      about: [{ '@id': 'https://chatorai.com/#software' }, { '@id': intercomId }, { '@id': zendeskId }],
      mentions: [{ '@id': intercomId }, { '@id': zendeskId }],
      isPartOf: { '@id': 'https://chatorai.com/#website' },
    },
    {
      '@type': 'ItemList',
      '@id': criteriaId,
      name: 'Intercom vs Zendesk vs ChatorAI comparison criteria',
      itemListElement: data.comparisonTable.map((row, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: row.feature,
        additionalProperty: [
          { '@type': 'PropertyValue', name: 'Intercom', value: row.values[0] },
          { '@type': 'PropertyValue', name: 'Zendesk', value: row.values[1] },
          { '@type': 'PropertyValue', name: 'ChatorAI', value: row.values[2] },
        ],
      })),
    },
  ];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = comparePagesData[slug];

  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `https://chatorai.com/compare/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(comparePagesData).map((slug) => ({ slug }));
}

export default async function ComparePage({ params }) {
  const { slug } = await params;
  const data = comparePagesData[slug];

  if (!data) notFound();

  const pagePath = `/compare/${slug}`;
  const directAnswer = buildDirectAnswer({
    subject: slug.startsWith('intercom') ? 'Intercom' : 'Zendesk',
    context: 'comparison',
    competitor: slug === 'intercom-vs-zendesk' ? 'Intercom or Zendesk' : undefined,
  });
  const answerSupportPoints = buildAnswerSupportPoints(data.switchingBenefits || []);
  const decisionLockChoices = buildDecisionLockOptions(data.summaryCards || []);
  const demandSwitchingItems = buildDemandSwitchingItems(data.switchingBenefits || []);
  const demandReplacementItems = buildDemandReplacementItems(data.capabilities || []);
  const answerBlocks = buildAnswerBlocks({
    type: 'comparison',
    subject: slug === 'intercom-vs-zendesk' ? 'Intercom and Zendesk' : slug.startsWith('intercom') ? 'Intercom' : 'Zendesk',
  });
  const typicalResults = buildTypicalResults(
    slug === 'intercom-vs-zendesk' ? 'Intercom and Zendesk' : slug.startsWith('intercom') ? 'Intercom' : 'Zendesk',
    data.switchingBenefits || [],
    data.capabilities || [],
  );
  const realWorldScenarios = buildRealWorldScenarios(
    data.useCases || [],
    slug === 'intercom-vs-zendesk' ? 'Intercom or Zendesk' : slug.startsWith('intercom') ? 'Intercom' : 'Zendesk',
  );
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Compare', href: '/#alternatives' },
    { name: data.pageTitle, href: pagePath },
  ];

  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: data.title,
      description: data.description,
      type: 'CollectionPage',
      mainEntityId: absoluteUrl(`${pagePath}#comparison`),
      aboutIds: ['https://chatorai.com/#software'],
    }),
    ...(slug === 'intercom-vs-zendesk'
      ? buildIntercomVsZendeskNodes(data, pagePath)
      : buildAlternativeNodes({
          path: pagePath,
          title: data.pageTitle,
          description: data.description,
          competitorName: slug.startsWith('intercom') ? 'Intercom' : 'Zendesk',
          comparisonTable: data.comparisonTable.map((row) => ({
            feature: row.feature,
            chatorai: row.values[1],
            competitor: row.values[0],
          })),
        })),
  ]);

  const columns =
    slug === 'intercom-vs-zendesk'
      ? ['Intercom', 'Zendesk', 'ChatorAI']
      : [slug.startsWith('intercom') ? 'Intercom' : 'Zendesk', 'ChatorAI'];

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId={`compare-schema-${slug}`}
    >
      <HeroSection
        eyebrow={data.eyebrow}
        title={data.pageTitle}
        description={data.categoryDefinition}
        supportingParagraph={withCanonicalDefinition(data.supportingParagraph)}
        primaryCtaText="Start your replacement trial"
        secondaryCtaText="See how switching works"
        proof="Decision-focused guidance for teams comparing cost, rollout speed, automation depth, and commercial upside."
      />

      <CanonicalDefinitionSection />

      <FeatureGrid
        title="Direct comparison summary"
        description="Use the shortlist below to decide which platform aligns with the workflow you actually want next."
        features={data.summaryCards}
      />

      <ProblemSection
        title={
          slug === 'intercom-vs-zendesk'
            ? 'When do Intercom and Zendesk stop making sense?'
            : `When does ${slug.startsWith('intercom') ? 'Intercom' : 'Zendesk'} stop making sense?`
        }
        description="These are the decision points that usually trigger a serious replacement process."
        points={data.stopPoints}
        secondaryTitle="What changes with ChatorAI"
        secondaryPoints={data.switchingBenefits}
      />

      <DirectAnswerSection
        title={
          slug === 'intercom-vs-zendesk'
            ? 'What is the best alternative to Intercom or Zendesk?'
            : `What is the best alternative to ${slug.startsWith('intercom') ? 'Intercom' : 'Zendesk'}?`
        }
        answer={directAnswer}
        supportingPoints={answerSupportPoints}
      />

      <AnswerBlocksSection answers={answerBlocks} />

      <ComparisonTableSection
        title="Cost and limitation breakdown"
        description="Compare the trade-offs that buyers usually care about before they commit to a switch path."
        columns={columns}
        rows={data.costBreakdown}
        highlightColumn={columns.indexOf('ChatorAI')}
      />

      <DecisionLockSection
        title={
          slug === 'intercom-vs-zendesk'
            ? "If you're deciding between Intercom, Zendesk, and ChatorAI"
            : `If you're deciding between ${slug.startsWith('intercom') ? 'Intercom' : 'Zendesk'}, ChatorAI, and keeping a support-first stack`
        }
        choices={decisionLockChoices}
      />

      <FeatureGrid
        title="Why ChatorAI wins this decision"
        description="These are the platform advantages that usually matter most once buyers compare day-to-day operating reality instead of feature lists."
        features={data.capabilities}
      />

      <FeatureGrid
        title="Typical results teams see"
        description="These are the practical improvements buyers usually want once they move beyond a support-only stack and into a revenue-aware operating layer."
        features={typicalResults}
      />

      <DemandLayerSection
        switchingItems={demandSwitchingItems}
        replacementItems={demandReplacementItems}
      />

      <RevenueOperatingSystemExplanationSection />

      <ComparisonTableSection
        title="Feature comparison table"
        description="See the operational differences side by side across support, automation, channels, and rollout."
        columns={columns}
        rows={data.comparisonTable}
        tone="default"
        highlightColumn={columns.indexOf('ChatorAI')}
      />

      <UseCasesSection
        title="Switching situations where this comparison matters most"
        description="These are the real buying moments where teams usually move from research into active replacement planning."
        useCases={data.useCases}
      />

      <UseCasesSection
        title="Real-world usage scenarios"
        description="These are common environments where buyers move from comparison research into an active replacement decision."
        useCases={realWorldScenarios}
      />

      <CategoryPositioningSection />

      <ComparisonStatementsSection />

      <TalkableSection
        items={buildTalkablePoints({
          type: 'comparison',
          subject: slug === 'intercom-vs-zendesk' ? 'Intercom, Zendesk, and ChatorAI' : data.pageTitle,
        })}
      />

      <SimpleExplainerSection {...buildSimpleExplainers('ChatorAI')} />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(data.faqs)}
        pagePath={pagePath}
        description="Short answers to the decision-stage questions buyers ask before switching."
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
