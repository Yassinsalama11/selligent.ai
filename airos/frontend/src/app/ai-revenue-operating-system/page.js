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
import { TrustSignals } from '@/components/seo/TrustSignals';
import {
  AnswerBlocksSection,
  CanonicalDefinitionSection,
  RevenueOperatingSystemExplanationSection,
} from '@/components/seo/AuthorityContentSections';
import { BarChart3, ShieldCheck, Zap, Globe, MessageSquare, TrendingUp } from 'lucide-react';
import { buildAnswerBlocks, prependDefinitionFaq, withCanonicalDefinition } from '@/lib/seo-authority';
import {
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

export const metadata = {
  title: 'AI Revenue Operating System: Turn Support and Sales Conversations Into Revenue | ChatorAI',
  description: 'ChatorAI is an AI revenue operating system that unifies support, sales, and messaging workflows into one commercial operating layer.',
  alternates: {
    canonical: 'https://chatorai.com/ai-revenue-operating-system',
  },
  openGraph: {
    title: 'AI Revenue Operating System | ChatorAI',
    description: 'The core platform for transforming customer communication into a revenue engine.',
    url: 'https://chatorai.com/ai-revenue-operating-system',
    type: 'website',
  },
};

const capabilities = [
  {
    title: "Autonomous Revenue Agents",
    description: "Qualify inbound demand, surface upsell intent, and move buyers toward meetings or checkout without waiting for manual follow-up.",
    icon: <TrendingUp className="h-6 w-6" />
  },
  {
    title: "Omnichannel Intelligence",
    description: "Keep support, sales, and follow-up decisions consistent across WhatsApp, email, web chat, and social from one shared customer context.",
    icon: <Globe className="h-6 w-6" />
  },
  {
    title: "Real-time Attribution",
    description: "See which conversations create pipeline, recover revenue, or prevent churn so automation can be tied to business outcomes instead of vanity metrics.",
    icon: <BarChart3 className="h-6 w-6" />
  },
  {
    title: "Enterprise Governance",
    description: "Use approval paths, audit visibility, and workspace controls so automation stays reviewable while volume scales.",
    icon: <ShieldCheck className="h-6 w-6" />
  },
  {
    title: "Instant Integration",
    description: "Connect CRM, catalog, support, and billing context quickly so the AI works from real customer data instead of generic prompts.",
    icon: <Zap className="h-6 w-6" />
  },
  {
    title: "Neural Conversation Engine",
    description: "Handle nuanced buying and support conversations with grounded replies, sharper intent detection, and better handoff decisions than rule-based bots.",
    icon: <MessageSquare className="h-6 w-6" />
  }
];

const steps = [
  {
    title: "Connect the systems that define customer context",
    description: "Bring in catalog, CRM, channel, and help-center data so the AI can work from the same commercial context as your team."
  },
  {
    title: "Define the support and revenue outcomes you want to automate",
    description: "Set goals for lead qualification, support deflection, order handling, escalation, and conversion before launch."
  },
  {
    title: "Deploy, review, and improve the live workflow",
    description: "Operate the AI in production, review outcomes, and tune routing and knowledge until the workflow supports revenue instead of just volume handling."
  }
];

const problemPoints = [
  'Support, sales, and messaging still operate in separate systems, so customer conversations never become a unified commercial workflow.',
  'Leadership wants automation and attribution, but the current stack only measures tickets, seats, or disconnected campaign metrics.',
  'AI projects stall when knowledge, routing, escalation, and channel operations are spread across multiple vendor surfaces.'
];

const useCases = [
  {
    title: 'Replace fragmented support and sales tooling',
    description: 'Use one operating layer for messaging, knowledge, AI routing, and human escalation instead of stitching together separate chat, CRM, and automation tools.',
  },
  {
    title: 'Turn support demand into commercial insight',
    description: 'Use live conversations to detect demand patterns, product issues, objections, and upsell opportunities instead of treating support like a cost-only function.',
  },
  {
    title: 'Scale multilingual operations without adding equivalent headcount',
    description: 'Let AI handle first-response, qualification, and routing across global channels while human teams focus on high-value decisions.',
  },
];

const faqs = [
  {
    question: "What is an AI Revenue Operating System?",
    answer: "An AI Revenue Operating System (ROS) is a comprehensive platform that uses artificial intelligence to manage and optimize every customer touchpoint with the primary goal of driving revenue. Unlike traditional helpdesks that focus on cost-reduction, an AI ROS like ChatorAI treats every conversation as a commercial opportunity."
  },
  {
    question: "How does ChatorAI differ from a standard chatbot?",
    answer: "Standard chatbots follow rigid decision trees and often frustrate users. ChatorAI uses an 'AI-native' architecture with advanced LLM orchestration, allowing it to understand complex human intent, process live data from your business systems, and take autonomous actions like booking meetings or processing refunds."
  },
  {
    question: "Can ChatorAI integrate with my existing CRM?",
    answer: "Yes. ChatorAI is designed to sit on top of your existing tech stack. We offer native integrations for Salesforce, HubSpot, Shopify, and more, as well as a robust API for custom enterprise deployments."
  }
];

export default function AiRevenueOSPage() {
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'AI Revenue Operating System', href: '/ai-revenue-operating-system' }
  ];
  const pagePath = '/ai-revenue-operating-system';
  const graph = buildJsonLdGraph([
    buildWebPageNode({
      path: pagePath,
      name: metadata.title,
      description: metadata.description,
      mainEntityId: 'https://chatorai.com/#software',
      aboutIds: ['https://chatorai.com/#organization', 'https://chatorai.com/#software', 'https://chatorai.com/#product'],
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId="ai-revenue-os-schema"
    >
      <HeroSection
        eyebrow="The operating layer"
        title="The AI Revenue Operating System"
        description="ChatorAI turns support, sales, and messaging into one revenue system so your team resolves faster, qualifies better, and converts more without adding matching headcount."
        supportingParagraph={withCanonicalDefinition("For operators comparing AI support platforms, AI sales agents, omnichannel inbox tools, and revenue automation software, the real question is simple: which system can turn live conversations into measurable commercial outcomes fastest?")}
        primaryCtaText="Start free trial"
        secondaryCtaText="Book platform demo"
        proof="Built for operators who need revenue lift, not another disconnected AI layer."
      />

      <CanonicalDefinitionSection />

      <AnswerBlocksSection answers={buildAnswerBlocks({ type: 'feature', subject: 'an AI Revenue Operating System' })} />

      <ProblemSection
        title="Why the current communication stack underperforms"
        description="Most teams already have the tools to answer messages. They do not have one system that turns those messages into faster resolution, cleaner routing, and attributable revenue."
        points={problemPoints}
      />

      <FeatureGrid
        title="Built for the enterprise revenue stack"
        description="Deploy AI across the customer lifecycle with the orchestration, controls, and attribution required to improve revenue and efficiency at the same time."
        features={capabilities}
      />

      <WorkflowSection
        title="How the AI revenue operating system works"
        description="Connect the right systems, define the outcomes, and operate one workflow that turns conversations into measurable business movement."
        steps={steps}
      />

      <TrustSignals />

      <RevenueOperatingSystemExplanationSection />

      <UseCasesSection
        title="Where teams use an AI revenue operating system"
        description="These are the operating scenarios where ChatorAI typically replaces disconnected support and sales workflows."
        useCases={useCases}
      />

      <FAQSection
        faqs={prependDefinitionFaq(faqs)}
        pagePath={pagePath}
        description="Short answers to the questions buyers ask when evaluating an AI revenue operating system."
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection />
    </SeoPageLayout>
  );
}
