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
import { Shield, Headphones, Zap, Clock, Smile, BarChart } from 'lucide-react';
import {
  buildFeatureServiceNode,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

export const metadata = {
  title: 'AI Customer Support Platform: 24/7 Support Automation That Resolves Faster | ChatorAI',
  description: 'Use an AI customer support platform to automate triage, grounded replies, and human handoff. Reduce repetitive support load without losing control.',
  alternates: {
    canonical: 'https://chatorai.com/features/ai-customer-support-platform',
  },
};

const supportingParagraph =
  'Teams evaluating AI customer support software and Zendesk alternatives are usually trying to do three things at once: reduce repetitive volume, protect support quality, and keep humans focused on the conversations that actually need judgment.';

const problemPoints = [
  'Repetitive L1 questions keep filling the queue even though the answer already exists in help docs and policy pages.',
  'Support quality drops when customers ask outside business hours or across languages the team cannot cover consistently.',
  'Escalations become expensive because humans still have to reconstruct context before they can handle the real issue.',
];

const capabilities = [
  {
    title: "Instant Resolution Engine",
    description: "Resolve repetitive L1 questions like order status, password resets, and policy checks in seconds so agents stop spending hours on answers customers needed immediately.",
    icon: <Zap className="h-6 w-6" />
  },
  {
    title: "Dynamic Knowledge Ingestion",
    description: "Turn help centers, PDFs, and internal docs into a support knowledge layer the AI can actually use, without months of content reformatting or bot-tree maintenance.",
    icon: <Shield className="h-6 w-6" />
  },
  {
    title: "Sentiment-Aware Responses",
    description: "Detect frustration early and adapt tone, escalation, or handoff so sensitive conversations do not get stuck in a cold automation loop.",
    icon: <Smile className="h-6 w-6" />
  },
  {
    title: "Proactive Issue Detection",
    description: "Spot repeated incidents and emerging product issues before they overwhelm the queue, giving support leads earlier visibility into risk.",
    icon: <BarChart className="h-6 w-6" />
  },
  {
    title: "Seamless Human Handover",
    description: "Route complex cases to the right human with conversation summary, prior context, and intent already prepared so escalation does not reset the customer experience.",
    icon: <Headphones className="h-6 w-6" />
  },
  {
    title: "Global 24/7 Availability",
    description: "Maintain a consistent support standard across time zones and languages without staffing every queue around the clock.",
    icon: <Clock className="h-6 w-6" />
  }
];

const steps = [
  {
    title: "Import the support knowledge your team already uses",
    description: "Sync help articles, PDFs, internal notes, and policy docs so the AI answers from real support material instead of generic model guesses."
  },
  {
    title: "Set support guardrails and escalation rules",
    description: "Define brand voice, refund boundaries, escalation triggers, and approval rules before the AI starts replying at scale."
  },
  {
    title: "Deploy support automation where customers already ask for help",
    description: "Launch on web chat, WhatsApp, and social channels so the AI can resolve common support volume before tickets pile up."
  }
];

const useCases = [
  {
    title: 'Deflect repetitive order, billing, and policy questions',
    description: 'Automate high-volume support questions so human agents spend time on the exceptions that actually need judgment.',
  },
  {
    title: 'Keep support quality consistent across time zones',
    description: 'Use grounded AI replies to keep quality high outside business hours and across multilingual support queues.',
  },
  {
    title: 'Escalate only the conversations humans need to handle',
    description: 'Route complex, emotional, or account-specific cases to human agents with AI summaries already prepared.',
  },
];

const faqs = [
  {
    question: "Can ChatorAI really replace human support agents?",
    answer: "ChatorAI is designed to augment your team, not replace it. It can reduce repetitive support load and give human agents more time for complex conversations, but the exact impact depends on your content quality, routing logic, and operating model."
  },
  {
    question: "How accurate is the AI in answering technical questions?",
    answer: "ChatorAI uses RAG (Retrieval-Augmented Generation) to ensure it only answers based on the documentation you provide. It is significantly more accurate than standard LLMs as it is grounded in your specific business data."
  },
  {
    question: "What is the typical reduction in resolution time?",
    answer: "Response-time improvements vary by channel coverage, documentation quality, and escalation design. The best way to validate impact is to compare pilot traffic against your current baseline after rollout."
  }
];

export default function AiSupportPlatformPage() {
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'AI Customer Support', href: '/features/ai-customer-support-platform' }
  ];
  const pagePath = '/features/ai-customer-support-platform';
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
      title: 'AI Customer Support Platform',
      description:
        'AI-assisted support workflows for triage, grounded replies, escalations, and knowledge-aware resolution.',
      capabilities,
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId="feature-schema-ai-customer-support"
    >
      <HeroSection
        eyebrow="Autonomous resolution"
        title="AI Customer Support Platform"
        description="Automate repetitive support, route complex issues faster, and keep every answer grounded in real business context before a human ever needs to step in."
        supportingParagraph={withCanonicalDefinition(supportingParagraph)}
        proof="Built for teams that want lower support load without sacrificing quality or control."
      />

      <CanonicalDefinitionSection />

      <AnswerBlocksSection answers={buildAnswerBlocks({ type: 'feature', subject: 'an AI customer support platform' })} />

      <ProblemSection
        title="Why support teams hit a ceiling"
        description="Most support operations do not fail because teams lack effort. They fail because the queue, the knowledge layer, and the escalation path are still too manual."
        points={problemPoints}
      />

      <FeatureGrid
        title="Support automation with operator-grade control"
        description="Resolve more, route faster, and keep complex conversations ready for human takeover when needed."
        features={capabilities}
      />

      <WorkflowSection
        title="How the support automation flow works"
        description="Ground the AI in real support knowledge, define the rules, and deploy it where customers already ask for help."
        steps={steps}
      />

      <RevenueOperatingSystemExplanationSection />

      <ComparisonStatementsSection />

      <TalkableSection items={buildTalkablePoints({ type: 'feature', subject: 'AI customer support' })} />

      <SimpleExplainerSection {...buildSimpleExplainers('ChatorAI')} />

      <UseCasesSection
        title="Support use cases this platform is built for"
        description="These are the workflows where AI support usually creates the fastest operational payoff."
        useCases={useCases}
      />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(faqs)}
        pagePath={pagePath}
        description="Answers to the practical support-automation questions teams ask before rollout."
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title="Ready to automate more of your support queue?"
        description="Roll out AI-assisted support that cuts repetitive volume, improves response speed, and gives your team reviewable control over every escalation path."
      />
    </SeoPageLayout>
  );
}
