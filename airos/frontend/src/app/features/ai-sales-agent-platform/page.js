import React from 'react';
import { SeoPageLayout } from '@/components/seo/SeoPageLayout';
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
  CanonicalDefinitionSection,
  ComparisonStatementsSection,
  RevenueOperatingSystemExplanationSection,
  SemanticReferenceSection,
  SimpleExplainerSection,
  TalkableSection,
} from '@/components/seo/AuthorityContentSections';
import { buildAnswerBlocks, buildSimpleExplainers, buildTalkablePoints, prependDefinitionFaq, withCanonicalDefinition } from '@/lib/seo-authority';
import { Target, Users, Calendar, ShoppingCart, TrendingUp, Sparkles } from 'lucide-react';
import {
  buildFeatureServiceNode,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

export const metadata = {
  title: 'AI Sales Agent Platform: Qualify Leads and Book More Meetings | ChatorAI',
  description: 'Deploy AI sales agents that qualify leads, answer objections, route pipeline, and recover revenue around the clock.',
  alternates: {
    canonical: 'https://chatorai.com/features/ai-sales-agent-platform',
  },
};

const supportingParagraph =
  'Teams comparing AI SDR tools and sales automation platforms are usually trying to solve the same commercial problem: too much inbound interest reaches the team, but too little of it turns into qualified pipeline fast enough.';

const problemPoints = [
  'Inbound demand goes cold because the first useful response still depends on human speed and SDR availability.',
  'Sales teams spend time qualifying low-fit conversations instead of focusing on buyers with real intent.',
  'Product questions, objections, and booking logistics create friction exactly where momentum should be strongest.'
];

const capabilities = [
  {
    title: "Instant Lead Qualification",
    description: "Qualify inbound visitors in real time against your ICP, buying signals, or custom criteria so reps spend time on real opportunities instead of early filtering.",
    icon: <Target className="h-6 w-6" />
  },
  {
    title: "Autonomous Meeting Booking",
    description: "Let qualified buyers book the next step directly in chat, removing the email back-and-forth that usually slows pipeline creation.",
    icon: <Calendar className="h-6 w-6" />
  },
  {
    title: "Abandoned Cart Recovery",
    description: "Recover stalled buying intent by resolving objections on web chat or WhatsApp before the prospect disappears or the cart goes cold.",
    icon: <ShoppingCart className="h-6 w-6" />
  },
  {
    title: "Personalized Product Recs",
    description: "Use live behavior and business context to recommend the right offer, product, or plan at the moment the customer is most likely to act.",
    icon: <Sparkles className="h-6 w-6" />
  },
  {
    title: "Dynamic Lead Routing",
    description: "Push qualified opportunities into your CRM and route them to the right rep instantly so handoff speed no longer kills momentum.",
    icon: <Users className="h-6 w-6" />
  },
  {
    title: "Conversational Upselling",
    description: "Turn live conversations into higher order value by surfacing timely upgrade and cross-sell moments while intent is already active.",
    icon: <TrendingUp className="h-6 w-6" />
  }
];

const steps = [
  {
    title: "Define what a qualified lead looks like",
    description: "Set the buying signals, qualification criteria, routing rules, and meeting-booking conditions your sales agent should use."
  },
  {
    title: "Map the conversation path from first question to booked pipeline",
    description: "Design the objection handling, product explanation, follow-up, and CTA flow the AI should use in live conversations."
  },
  {
    title: "Launch on live channels and keep routing pipeline automatically",
    description: "Deploy the AI on your site, WhatsApp, and social channels so qualified demand reaches reps or checkout faster."
  }
];

const useCases = [
  {
    title: 'Qualify inbound leads before reps respond',
    description: 'Use AI to score intent, collect fit information, and route only real opportunities to human sales teams.',
  },
  {
    title: 'Recover revenue from abandoned or stalled conversations',
    description: 'Re-engage shoppers and prospects who asked questions but never finished checkout or booked a meeting.',
  },
  {
    title: 'Book meetings without manual back-and-forth',
    description: 'Let qualified buyers schedule a conversation from chat instead of waiting for email follow-up from an SDR.',
  },
];

const faqs = [
  {
    question: "Can an AI sales agent really close deals?",
    answer: "Yes, especially for transactional or mid-market sales. For high-ticket enterprise deals, the AI acts as a 24/7 SDR, qualifying leads and booking meetings for your human account executives."
  },
  {
    question: "How does the AI handle objections?",
    answer: "ChatorAI is trained on your specific product data and sales playbooks. It can address common pricing, feature, and implementation objections with high accuracy and a persuasive tone."
  },
  {
    question: "Does it work with my CRM?",
    answer: "Absolutely. ChatorAI syncs lead data, conversation transcripts, and qualification scores directly to HubSpot, Salesforce, Pipedrive, and other major CRM platforms."
  }
];

export default function AiSalesAgentPage() {
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'AI Sales Agent', href: '/features/ai-sales-agent-platform' }
  ];
  const pagePath = '/features/ai-sales-agent-platform';
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: metadata.title,
      description: metadata.description,
      mainEntityId: `https://chatorai.com${pagePath}#service`,
      aboutIds: ['https://chatorai.com/#product'],
    }),
    buildFeatureServiceNode({
      path: pagePath,
      title: 'AI Sales Agent Platform',
      description:
        'AI sales workflows for lead qualification, meeting booking, abandoned cart recovery, and pipeline routing.',
      capabilities,
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId="feature-schema-ai-sales-agent"
    >
      <HeroSection
        eyebrow="Proactive conversion"
        title="AI Sales Agent Platform"
        description="Deploy AI sales agents that qualify inbound demand, answer objections, and move real buying intent toward meetings or checkout before momentum fades."
        supportingParagraph={withCanonicalDefinition(supportingParagraph)}
        proof="Built for teams that want more qualified pipeline, not more unworked leads."
      />

      <CanonicalDefinitionSection />

      <AnswerBlocksSection answers={buildAnswerBlocks({ type: 'feature', subject: 'the AI Sales Agent Platform' })} />

      <ProblemSection
        title="Why inbound demand slips away"
        description="The conversion gap usually appears between first interest and the first meaningful sales response. That is where the workflow needs automation."
        points={problemPoints}
      />

      <FeatureGrid
        title="Sales automation designed for real buying intent"
        description="Let AI handle the repetitive qualification work while human sellers focus on the conversations that actually need closing."
        features={capabilities}
      />

      <WorkflowSection
        title="How the AI sales workflow operates"
        description="Define the qualification logic, map the buying conversation, and let the system route pipeline automatically."
        steps={steps}
      />

      <RevenueOperatingSystemExplanationSection />

      <ComparisonStatementsSection />

      <TalkableSection items={buildTalkablePoints({ type: 'feature', subject: 'AI sales automation' })} />

      <SimpleExplainerSection {...buildSimpleExplainers('ChatorAI')} />

      <UseCasesSection
        title="Sales use cases this platform is built for"
        description="These are the commercial workflows where AI sales agents usually create the clearest conversion lift."
        useCases={useCases}
      />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(faqs)}
        pagePath={pagePath}
        description="Short answers to the core evaluation questions buyers ask about AI sales agents."
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title="Ready to qualify and convert more demand?"
        description="Use ChatorAI to qualify inbound demand, shorten time to first action, and move more buyers toward meetings or checkout while intent is still high."
      />
    </SeoPageLayout>
  );
}
