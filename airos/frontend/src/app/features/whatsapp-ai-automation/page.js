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
import { Phone, MessageCircle, Zap, Shield, Send, BarChart } from 'lucide-react';
import {
  buildFeatureServiceNode,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

export const metadata = {
  title: 'WhatsApp AI Automation: Official Business API Workflows That Convert | ChatorAI',
  description: 'Run WhatsApp AI automation for support, sales, routing, and template-based outreach on the official Business API.',
  alternates: {
    canonical: 'https://chatorai.com/features/whatsapp-ai-automation',
  },
};

const supportingParagraph =
  'Operators comparing WhatsApp automation tools and API providers usually need more than message delivery. They need one system that can handle support, routing, consent-aware follow-up, and revenue workflows on the channel customers actually use most.';

const problemPoints = [
  'WhatsApp becomes operationally messy when support, sales, templates, and escalation rules all live in separate workflows.',
  'Manual triage cannot keep up once WhatsApp turns into a serious inbound support or revenue channel.',
  'Teams need AI assistance and consent-aware operations without losing visibility into what is happening on the official API.'
];

const capabilities = [
  {
    title: "Official WhatsApp Business API",
    description: "Manage template operations, verification steps, and live WhatsApp workflows from one operational layer instead of stitching provider panels into your support process.",
    icon: <Shield className="h-6 w-6" />
  },
  {
    title: "AI-First Response Logic",
    description: "Route every inbound WhatsApp message through AI first so common questions are resolved faster and high-value conversations reach the right human sooner.",
    icon: <Zap className="h-6 w-6" />
  },
  {
    title: "Automated Marketing Broadcasts",
    description: "Send targeted WhatsApp follow-up with clearer segmentation and message control so outreach supports revenue without creating operational chaos.",
    icon: <Send className="h-6 w-6" />
  },
  {
    title: "Interactive Catalog Browsing",
    description: "Turn product questions into conversion opportunities by helping buyers explore catalog options inside the same WhatsApp conversation.",
    icon: <BarChart className="h-6 w-6" />
  },
  {
    title: "2-Way Rich Messaging",
    description: "Use media, documents, and structured replies to resolve conversations faster and reduce the friction of long back-and-forth threads.",
    icon: <MessageCircle className="h-6 w-6" />
  },
  {
    title: "Global Compliance Guardrails",
    description: "Handle opt-ins, opt-outs, and messaging windows with clearer governance so teams can scale WhatsApp without losing control of compliance-sensitive flows.",
    icon: <Phone className="h-6 w-6" />
  }
];

const steps = [
  {
    title: "Connect the official WhatsApp Business API setup",
    description: "Authenticate the Meta business account, complete number readiness steps, and bring the WhatsApp channel into your workspace."
  },
  {
    title: "Sync the context the AI needs to answer and route correctly",
    description: "Connect customer, catalog, and support data so WhatsApp replies are grounded in the same context your team uses."
  },
  {
    title: "Launch support, sales, and follow-up workflows on WhatsApp",
    description: "Go live with AI replies, escalation logic, and approved messaging flows that can scale without manual triage on every message."
  }
];

const useCases = [
  {
    title: 'Handle inbound WhatsApp support without queue overload',
    description: 'Automate common support and order questions on WhatsApp while preserving a clean path to human escalation.',
  },
  {
    title: 'Convert WhatsApp conversations into revenue',
    description: 'Qualify purchase intent, recommend products, and move high-intent buyers toward checkout inside live chat.',
  },
  {
    title: 'Run consent-aware re-engagement and follow-up',
    description: 'Use approved messaging flows for reminders, updates, and reactivation without losing operational visibility.',
  },
];

const faqs = [
  {
    question: "Do I need a separate phone number for WhatsApp AI?",
    answer: "Yes, the WhatsApp Business API requires a clean phone number that is not currently associated with a personal or standard business WhatsApp account."
  },
  {
    question: "How can teams handle privacy requirements with WhatsApp AI?",
    answer: "ChatorAI provides consent-aware messaging flows, opt-out handling, and workspace controls that can support privacy-focused operations. Your legal and compliance team should still review your specific policy requirements."
  },
  {
    question: "How much does the WhatsApp Business API cost?",
    answer: "WhatsApp uses a conversation-based pricing model. ChatorAI passes these costs through transparently, combined with our platform fee for AI orchestration and management."
  }
];

export default function WhatsappAiPage() {
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'WhatsApp AI', href: '/features/whatsapp-ai-automation' }
  ];
  const pagePath = '/features/whatsapp-ai-automation';
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
      title: 'WhatsApp AI Automation',
      description:
        'Operational layer for WhatsApp Business API support, routing, templates, and AI-assisted conversation handling.',
      capabilities,
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId="feature-schema-whatsapp-ai"
    >
      <HeroSection
        eyebrow="Native scale"
        title="WhatsApp AI Automation"
        description="Run WhatsApp support, routing, follow-up, and revenue automation from one AI-assisted workspace on the official Business API."
        supportingParagraph={withCanonicalDefinition(supportingParagraph)}
        proof="Built for teams that want WhatsApp to produce revenue and efficiency, not just message volume."
      />

      <CanonicalDefinitionSection />

      <AnswerBlocksSection answers={buildAnswerBlocks({ type: 'feature', subject: 'WhatsApp AI automation' })} />

      <ProblemSection
        title="Why WhatsApp operations break down"
        description="Serious WhatsApp volume needs more than message delivery. It needs AI routing, operator visibility, and escalation logic that can survive real support and sales traffic."
        points={problemPoints}
      />

      <FeatureGrid
        title="What WhatsApp AI automation should actually unlock"
        description="Turn WhatsApp from a manual chat stream into a governed support and revenue channel with built-in AI workflows."
        features={capabilities}
      />

      <WorkflowSection
        title="How WhatsApp AI automation works"
        description="Complete the official setup, connect the right context, and launch consent-aware automation with live handoff rules."
        steps={steps}
      />

      <RevenueOperatingSystemExplanationSection />

      <ComparisonStatementsSection />

      <TalkableSection items={buildTalkablePoints({ type: 'feature', subject: 'WhatsApp AI automation' })} />

      <SimpleExplainerSection {...buildSimpleExplainers('ChatorAI')} />

      <UseCasesSection
        title="WhatsApp use cases this workflow is built for"
        description="These are the operational and revenue workflows teams usually need when they move serious volume onto WhatsApp."
        useCases={useCases}
      />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(faqs)}
        pagePath={pagePath}
        description="Answers to the practical implementation questions teams ask before running WhatsApp AI in production."
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title="Ready to operationalize WhatsApp at scale?"
        description="Use ChatorAI to turn WhatsApp into a governed support and revenue channel with AI routing, faster handoff, and stronger operational visibility."
      />
    </SeoPageLayout>
  );
}
