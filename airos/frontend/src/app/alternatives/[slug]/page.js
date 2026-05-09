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
import { SeoPageLayout, SeoSection } from '@/components/seo/SeoPageLayout';
import { alternativesData } from '@/lib/pseo/alternatives';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  buildAlternativeNodes,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = alternativesData[slug];

  if (!data) return {};

  return {
    title: data.title,
    description: data.description,
    alternates: {
      canonical: `https://chatorai.com/alternatives/${slug}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(alternativesData).map((slug) => ({
    slug: slug,
  }));
}

export default async function AlternativePseoPage({ params }) {
  const { slug } = await params;
  const data = alternativesData[slug];

  if (!data) {
    notFound();
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Alternatives', href: '/#alternatives' },
    { name: `${data.name} Alternative`, href: `/alternatives/${slug}` }
  ];
  const pagePath = `/alternatives/${slug}`;
  const directAnswer = buildDirectAnswer({ subject: data.name, context: 'alternative' });
  const answerSupportPoints = buildAnswerSupportPoints(data.switchingBenefits || []);
  const decisionLockChoices = buildDecisionLockOptions([
    { title: `Choose ${data.name} if you want the closest support-first fit`, description: data.competitorPainPoints?.[0] || '' },
    { title: 'Choose ChatorAI if you want the stronger AI-native upgrade', description: data.switchingBenefits?.[0] || '' },
    { title: 'Choose a broader replacement path if support and revenue now overlap', description: data.switchingBenefits?.[1] || '' },
  ]);
  const demandSwitchingItems = buildDemandSwitchingItems(data.switchingBenefits || []);
  const demandReplacementItems = buildDemandReplacementItems(data.capabilities || []);
  const answerBlocks = buildAnswerBlocks({ type: 'alternative', subject: data.name });
  const typicalResults = buildTypicalResults(data.name, data.switchingBenefits || [], data.capabilities || []);
  const realWorldScenarios = buildRealWorldScenarios(data.useCases || [], data.name);
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: data.title,
      description: data.description,
      type: 'CollectionPage',
      mainEntityId: `https://chatorai.com${pagePath}#comparison`,
      aboutIds: ['https://chatorai.com/#software', `https://chatorai.com${pagePath}#competitor`],
      mentionIds: [`https://chatorai.com${pagePath}#competitor`],
    }),
    ...buildAlternativeNodes({
      path: pagePath,
      title: data.pageTitle,
      description: data.description,
      competitorName: data.name,
      comparisonTable: data.comparisonTable || [],
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId={`alternative-schema-${slug}`}
    >
      <HeroSection
        eyebrow={data.eyebrow}
        title={data.pageTitle}
        description={data.categoryDefinition}
        supportingParagraph={withCanonicalDefinition(data.supportingParagraph)}
        primaryCtaText="Start your replacement trial"
        secondaryCtaText="Book switch-over demo"
        proof={`Built for teams running a serious ${data.name} replacement evaluation.`}
      />

      <ProblemSection
        title={`Why teams switch from ${data.name}`}
        description={`High-buy-intent evaluations usually start when ${data.name} still works, but no longer fits the speed, pricing, or automation depth the team needs next.`}
        points={data.competitorPainPoints || []}
        secondaryTitle="What improves with ChatorAI"
        secondaryPoints={data.switchingBenefits || []}
      />

      <DirectAnswerSection
        title={`What is the best alternative to ${data.name}?`}
        answer={directAnswer}
        supportingPoints={answerSupportPoints}
      />

      <AnswerBlocksSection answers={answerBlocks} />

      <DecisionLockSection
        title={`If you're deciding between ${data.name}, other support tools, and ChatorAI`}
        choices={decisionLockChoices}
      />

      {data.comparisonTable ? (
        <SeoSection tone="muted">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                ChatorAI vs {data.name}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
                Compare the operational, pricing, and AI workflow differences buyers usually care about before switching.
              </p>
            </div>
            <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-[0_26px_70px_-46px_rgba(0,0,0,0.45)]">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-1/3">Criteria</TableHead>
                    <TableHead className="font-bold text-primary">ChatorAI</TableHead>
                    <TableHead>{data.name}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.comparisonTable.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                      <TableCell>{row.chatorai}</TableCell>
                      <TableCell>{row.competitor}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </SeoSection>
      ) : null}

      <FeatureGrid
        title={`Why ChatorAI wins against ${data.name}`}
        description={`These are the advantages buyers usually care about when they move away from ${data.name} and into a faster, more automation-driven operating layer.`}
        features={data.capabilities}
      />

      <FeatureGrid
        title="Typical results teams see"
        description={`These are the operational improvements buyers usually want when they replace ${data.name} with a more automation-driven system.`}
        features={typicalResults}
      />

      <DemandLayerSection
        switchingItems={demandSwitchingItems}
        replacementItems={demandReplacementItems}
      />

      <RevenueOperatingSystemExplanationSection />

      <WorkflowSection
        title={`How switching from ${data.name} works`}
        description="Use the evaluation process to migrate knowledge, validate workflows, and roll out a cleaner live operation without re-platforming blindly."
        steps={data.steps}
      />

      <UseCasesSection
        title={`Where ${data.name} alternatives matter most`}
        description={`These are the buying situations that usually trigger a serious search for a better ${data.name} alternative.`}
        useCases={data.useCases || []}
      />

      <UseCasesSection
        title="Real-world usage scenarios"
        description={`These are common situations where teams move beyond ${data.name} and validate a different operating model.`}
        useCases={realWorldScenarios}
      />

      <CategoryPositioningSection />

      <ComparisonStatementsSection />

      <TalkableSection items={buildTalkablePoints({ type: 'alternative', subject: data.name })} />

      <SimpleExplainerSection {...buildSimpleExplainers('ChatorAI')} />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(data.faqs)}
        pagePath={pagePath}
        description={`Short answers to the questions teams ask most often before replacing ${data.name}.`}
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title={`Ready to replace ${data.name}?`}
        description={`Validate ChatorAI against your current ${data.name} workflow, compare automation depth side by side, and see how quickly your team can switch to a cleaner operating model.`}
        primaryCtaText="Start replacement trial"
        secondaryCtaText="Talk through migration"
      />
    </SeoPageLayout>
  );
}
