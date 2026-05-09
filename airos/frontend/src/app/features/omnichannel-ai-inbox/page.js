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
import { MessageSquare, Layout, Cpu, Share2, Layers, Search } from 'lucide-react';
import {
  buildFeatureServiceNode,
  buildJsonLdGraph,
  buildWebPageNode,
} from '@/lib/site-schema';

export const metadata = {
  title: 'Omnichannel AI Inbox: Unified WhatsApp, Instagram, Email, and Web Chat | ChatorAI',
  description: 'Replace fragmented inboxes with one omnichannel AI inbox for WhatsApp, Instagram, Messenger, email, and web chat. Resolve faster and keep full customer context.',
  alternates: {
    canonical: 'https://chatorai.com/features/omnichannel-ai-inbox',
  },
};

const supportingParagraph =
  'For teams comparing shared inbox software, AI support platforms, and omnichannel tools, the goal is not another inbox. The goal is faster replies, cleaner handoffs, and one customer record across every revenue and support channel.';

const problemPoints = [
  'Support, sales, and success teams still reply from separate tools, so customer context gets lost between channels.',
  'Agents waste time switching tabs just to rebuild the same conversation history before they can answer.',
  'AI routing stays shallow when channel data, notes, and knowledge are not centralized in one operating layer.',
];

const capabilities = [
  {
    title: "Unified Customer Context",
    description: "Give every agent one timeline across WhatsApp, email, social, and web chat so customers do not have to repeat themselves and teams reply with full context immediately.",
    icon: <Layers className="h-6 w-6" />
  },
  {
    title: "AI-Powered Triage",
    description: "Automatically sort, prioritize, and route inbound volume by intent, urgency, or revenue value so the queue moves faster without manual sorting.",
    icon: <Cpu className="h-6 w-6" />
  },
  {
    title: "Real-time Collaboration",
    description: "Hand conversations between AI and human operators with notes, context, and ownership already attached, reducing reply delay during escalation.",
    icon: <Share2 className="h-6 w-6" />
  },
  {
    title: "Universal Search",
    description: "Search conversations, documents, and customer details from one workspace so answers are found in seconds instead of across five tabs.",
    icon: <Search className="h-6 w-6" />
  },
  {
    title: "Custom Workspace Views",
    description: "Create role-specific queues and views so support, sales, and operations teams each see the conversations that matter most to their outcomes.",
    icon: <Layout className="h-6 w-6" />
  },
  {
    title: "Multi-Language Support",
    description: "Serve multilingual customers without adding separate language queues by using AI translation that preserves tone and operational accuracy.",
    icon: <MessageSquare className="h-6 w-6" />
  }
];

const steps = [
  {
    title: "Connect your live channels",
    description: "Link WhatsApp, Instagram, Messenger, email, and web chat so every message lands in the same operational inbox."
  },
  {
    title: "Ground the inbox with AI context",
    description: "Add your knowledge base, tone, routing rules, and team logic so the AI can triage conversations before a human jumps in."
  },
  {
    title: "Operate one queue instead of five",
    description: "Go live with a single queue, shared customer timeline, and AI suggestions so your team can answer faster without tab switching."
  }
];

const useCases = [
  {
    title: 'Unify support across all inbound channels',
    description: 'Use one inbox for WhatsApp, Instagram, Messenger, email, and web chat instead of assigning agents to disconnected tools.',
  },
  {
    title: 'Give sales and support the same customer timeline',
    description: 'Let commercial and support teams see the same customer context before they reply, escalate, or hand conversations over.',
  },
  {
    title: 'Reduce response lag during peak volume',
    description: 'Use AI triage and routing to keep SLA-sensitive conversations moving during launches, campaign spikes, or seasonal traffic.',
  },
];

const faqs = [
  {
    question: "What channels are supported in the ChatorAI Omnichannel Inbox?",
    answer: "ChatorAI currently supports WhatsApp (via Official API), Email (Gmail, Outlook, IMAP), Instagram DM, Facebook Messenger, and our own customizable Web Chat widget."
  },
  {
    question: "How does the AI hand over to a human agent?",
    answer: "The AI can be configured to trigger a human handover based on sentiment, specific keywords, or when a customer explicitly asks for a person. Human agents are notified quickly and can see the full AI interaction history before jumping in."
  },
  {
    question: "Is there a limit to how many conversations we can manage?",
    answer: "No. ChatorAI is built on an elastic cloud infrastructure designed to handle thousands of concurrent conversations without any performance degradation."
  }
];

export default function OmnichannelInboxPage() {
  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'Omnichannel AI Inbox', href: '/features/omnichannel-ai-inbox' }
  ];
  const pagePath = '/features/omnichannel-ai-inbox';
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
      title: 'Omnichannel AI Inbox',
      description:
        'Unified AI communication workspace across WhatsApp, email, Instagram, Messenger, and web chat.',
      capabilities,
    }),
  ]);

  return (
    <SeoPageLayout
      breadcrumbs={breadcrumbs}
      pagePath={pagePath}
      structuredData={graph}
      structuredDataId="feature-schema-omnichannel-ai-inbox"
    >
      <HeroSection
        eyebrow="Communication consolidated"
        title="Omnichannel AI Inbox"
        description="Bring WhatsApp, email, social, and web chat into one AI-assisted inbox so your team resolves more conversations with less switching, less delay, and less lost context."
        supportingParagraph={withCanonicalDefinition(supportingParagraph)}
        proof="Built for teams that need one inbox to increase response speed and operational clarity."
      />

      <CanonicalDefinitionSection />

      <AnswerBlocksSection answers={buildAnswerBlocks({ type: 'feature', subject: 'the Omnichannel AI Inbox' })} />

      <ProblemSection
        title="Why fragmented inboxes stop scaling"
        description="Commercial and support operations break down when every channel becomes its own queue, context source, and handoff problem."
        points={problemPoints}
      />

      <FeatureGrid
        title="One workspace, complete customer context"
        description="Give operators one place to route, resolve, search, and review every customer conversation that affects support quality or revenue."
        features={capabilities}
      />

      <WorkflowSection
        title="How the omnichannel inbox works"
        description="Connect the channels, ground the AI, and run one conversation queue instead of five separate channel workflows."
        steps={steps}
      />

      <RevenueOperatingSystemExplanationSection />

      <ComparisonStatementsSection />

      <TalkableSection items={buildTalkablePoints({ type: 'feature', subject: 'the omnichannel inbox' })} />

      <SimpleExplainerSection {...buildSimpleExplainers('ChatorAI')} />

      <UseCasesSection
        title="Where the omnichannel inbox helps most"
        description="These are the workflows where a unified AI inbox usually outperforms disconnected channel tools."
        useCases={useCases}
      />

      <SemanticReferenceSection currentPath={pagePath} />

      <FAQSection
        faqs={prependDefinitionFaq(faqs)}
        pagePath={pagePath}
        description="Short answers to the common evaluation questions teams ask before replacing a shared inbox stack."
      />

      <RelatedPages currentPath={pagePath} />

      <CTASection
        title="Ready to replace fragmented inboxes?"
        description="Centralize support and revenue conversations in one inbox built to shorten response time, reduce operational drag, and improve customer context."
      />
    </SeoPageLayout>
  );
}
