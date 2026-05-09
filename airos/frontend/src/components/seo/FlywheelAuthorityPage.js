import React from 'react';
import {
  AnswerBlocksSection,
  CanonicalDefinitionSection,
  CategoryPositioningSection,
  DecisionLockSection,
  DemandLayerSection,
  DirectAnswerSection,
  RevenueOperatingSystemExplanationSection,
  SimpleExplainerSection,
  TalkableSection,
} from '@/components/seo/AuthorityContentSections';
import { CTASection } from '@/components/seo/CTASection';
import { FAQSection } from '@/components/seo/FAQSection';
import { FeatureGrid } from '@/components/seo/FeatureGrid';
import { HeroSection } from '@/components/seo/HeroSection';
import { ProblemSection } from '@/components/seo/ProblemSection';
import { RelatedPages } from '@/components/seo/RelatedPages';
import { SeoPageLayout } from '@/components/seo/SeoPageLayout';
import { UseCasesSection } from '@/components/seo/UseCasesSection';
import { ComparisonTableSection } from '@/components/seo/ComparisonTableSection';
import { buildJsonLdGraph, buildWebPageNode } from '@/lib/site-schema';
import { prependDefinitionFaq } from '@/lib/seo-authority';

export function FlywheelAuthorityPage({ page, structuredType = 'WebPage', mainEntityId }) {
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: page.path,
      name: page.title,
      description: page.description,
      type: structuredType,
      mainEntityId: mainEntityId || `https://chatorai.com${page.path}#webpage`,
      aboutIds: ['https://chatorai.com/#software', 'https://chatorai.com/#product'],
    }),
  ]);

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: page.pageTitle, href: page.path },
  ];

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={page.path}
      structuredData={graph}
      structuredDataId={`flywheel-schema-${page.path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}`}
    >
      <HeroSection
        eyebrow={page.eyebrow}
        title={page.pageTitle}
        description={page.categoryDefinition}
        supportingParagraph={page.supportingParagraph}
        primaryCtaText="Start your replacement trial"
        secondaryCtaText="See how switching works"
        proof={page.proof || 'Built for teams comparing support stacks against a broader AI Revenue Operating System.'}
      />

      <CanonicalDefinitionSection />

      <DirectAnswerSection
        title={page.directAnswerTitle}
        answer={page.directAnswer}
        supportingPoints={page.answerSupportPoints || []}
      />

      <AnswerBlocksSection answers={page.answerBlocks || []} />

      <ProblemSection
        title={page.problemTitle}
        description={page.problemDescription}
        points={page.problemPoints || []}
      />

      <ComparisonTableSection
        title={page.comparisonTitle}
        description={page.comparisonDescription}
        columns={page.comparisonColumns || []}
        rows={page.comparisonRows || []}
        highlightColumn={typeof page.highlightColumn === 'number' ? page.highlightColumn : undefined}
      />

      {page.decisionTitle ? (
        <DecisionLockSection
          title={page.decisionTitle}
          choices={page.decisionChoices || []}
        />
      ) : null}

      <FeatureGrid
        title={page.featuresTitle}
        description={page.featuresDescription}
        features={page.capabilities || []}
      />

      <DemandLayerSection
        switchingItems={page.demandSwitchingItems || []}
        replacementItems={page.demandReplacementItems || []}
      />

      <RevenueOperatingSystemExplanationSection />

      <CategoryPositioningSection />

      <TalkableSection items={page.talkableItems || []} />

      <SimpleExplainerSection
        oneSentence={page.oneSentence}
        thirtySeconds={page.thirtySeconds}
      />

      <UseCasesSection
        title={page.useCasesTitle || 'Real-world usage scenarios'}
        description={page.useCasesDescription || 'These are the situations where this page is most useful during evaluation or replacement planning.'}
        useCases={page.useCases || []}
      />

      <FAQSection
        faqs={prependDefinitionFaq(page.faqs || [])}
        pagePath={page.path}
        description={page.faqDescription || 'Short answers to the decision-stage questions buyers usually ask on this topic.'}
      />

      <RelatedPages currentPath={page.path} />

      <CTASection
        title={page.ctaTitle}
        description={page.ctaDescription}
        primaryCtaText={page.primaryCtaText || 'Start your replacement trial'}
        secondaryCtaText={page.secondaryCtaText || 'See how switching works'}
      />
    </SeoPageLayout>
  );
}
