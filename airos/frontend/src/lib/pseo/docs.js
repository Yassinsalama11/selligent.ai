export const docsData = {
  'quickstart': {
    title: 'Quickstart Guide | ChatorAI Documentation',
    description: 'Get ChatorAI live with a real trial workspace, connected channels, and a reviewable AI business profile.',
    h1: 'Quickstart',
    intro: 'This guide walks through the shortest production path: create a workspace, run onboarding scan, connect one live channel, and review the AI settings before launch.',
    supportingParagraph: 'Use this quickstart when you want the fastest path from account creation to a live, reviewable workspace. It is written for operators who need practical setup steps, not marketing overview copy.',
    problemPoints: [
      'New teams need a safe path from account creation to a usable workspace without guessing which setup steps actually matter first.',
      'Onboarding, channel connection, and AI review can feel disconnected unless there is a clear launch order.'
    ],
    sections: [
      {
        title: 'Before you begin',
        bullets: [
          'Prepare the business website URL you want ChatorAI to scan during onboarding.',
          'Have one owner email ready for the workspace plus any channels you want to connect first.',
          'Decide which plan, seat count, and billing cycle you want to start with during the free trial.',
        ],
      },
      {
        title: '1. Create the workspace',
        paragraphs: [
          'Start from /signup, choose the initial plan, seat count, and monthly or yearly billing preference, then create the account without payment.',
          'A new tenant is created in trialing status so the workspace can enter the dashboard immediately.',
        ],
      },
      {
        title: '2. Run the onboarding scan',
        paragraphs: [
          'Add the company name, website, industry context, channels, and any business details the AI should understand.',
          'ChatorAI will crawl the website, extract visible business context, and prefill the company profile, suggested departments, FAQ seeds, and AI tone where available.',
          'If enrichment is unavailable, the flow should show a safe warning and let you continue with partial crawl data instead of fake AI output.',
        ],
      },
      {
        title: '3. Connect the first channel',
        paragraphs: [
          'From the dashboard, open Channels and connect the first live surface you want to automate, such as WhatsApp, Instagram, Messenger, or web chat.',
          'After connection, verify the channel status and send a test message through the dashboard before going live.',
        ],
      },
      {
        title: '4. Review AI and knowledge settings',
        paragraphs: [
          'Open Business Profile and Settings to review the generated company description, FAQs, routing suggestions, and assistant tone.',
          'Edit anything that is incomplete or too generic before enabling the channel in production.',
        ],
      },
    ],
    nextLinks: [
      { label: 'Shopify integration guide', href: '/docs/integrations/shopify' },
      { label: 'WhatsApp onboarding guide', href: '/docs/integrations/whatsapp' },
      { label: 'API overview', href: '/docs/api/overview' },
    ],
    useCases: [
      'Launching the first trial workspace and reaching a usable dashboard quickly.',
      'Validating onboarding scan output before connecting live customer channels.',
      'Preparing operations, support, or growth teams for the first production pilot.'
    ],
    faqs: [
      { question: 'Do I need to add a payment method before starting ChatorAI?', answer: 'No. The current onboarding flow is trial-first, so you can create the workspace, review the setup, and connect channels before paying.' },
      { question: 'What should I validate before launching the first channel?', answer: 'Review the business profile, AI tone, routing logic, and one live test conversation so you know the workspace is grounded in the right company context.' }
    ],
  },
  'concepts': {
    title: 'Core Concepts | ChatorAI Documentation',
    description: 'Understand the main objects in ChatorAI: tenants, channels, AI context, knowledge ingestion, and billing lifecycle.',
    h1: 'Core Concepts',
    intro: 'ChatorAI uses a few core platform concepts across onboarding, channel automation, reporting, and lifecycle management.',
    supportingParagraph: 'Read this page when you need the mental model behind the platform before working through setup, troubleshooting, or operational handoff.',
    problemPoints: [
      'Implementation and operations work slows down when teams do not share the same mental model of tenants, channels, AI context, and billing.',
      'Without core concepts, troubleshooting turns into route-by-route guessing instead of system-level understanding.'
    ],
    sections: [
      {
        title: 'Tenant and workspace',
        paragraphs: [
          'A tenant is the workspace boundary for users, channels, AI settings, billing status, and operational data.',
          'Each workspace owns its own company profile, integrations, message history, and billing lifecycle.',
        ],
      },
      {
        title: 'AI context and knowledge',
        paragraphs: [
          'AI context includes the company profile, approved tone, FAQs, routing logic, and any website or document-derived knowledge.',
          'Knowledge ingestion jobs crawl websites or content sources, chunk usable text, and make that information available for response generation and onboarding suggestions.',
        ],
      },
      {
        title: 'Billing lifecycle',
        paragraphs: [
          'Trial-first billing means a workspace can operate before payment, then later moves through states such as trialing, payment_due, active, overdue, suspended, or cancelled.',
          'Backend access enforcement uses that lifecycle state to decide which actions stay available and which move into restricted mode.',
        ],
      },
    ],
    nextLinks: [
      { label: 'Quickstart', href: '/docs/quickstart' },
      { label: 'API overview', href: '/docs/api/overview' },
    ],
    useCases: [
      'Understanding how tenant, channel, AI context, and billing concepts fit together.',
      'Orienting new operators before they start configuration or implementation work.'
    ],
    faqs: [
      { question: 'What is the difference between a tenant and a user in ChatorAI?', answer: 'A tenant is the workspace boundary for configuration, channels, billing, and data. Users are the people who access that workspace with role-based permissions.' }
    ],
  },
  'integrations/shopify': {
    title: 'Shopify Integration Guide | ChatorAI Documentation',
    description: 'Connect a Shopify store to ChatorAI so agents can use catalog and order context inside conversations.',
    h1: 'Connecting Shopify to ChatorAI',
    intro: 'Use the Shopify integration when you want order-aware support, product-aware selling, and cleaner conversation context for store teams.',
    supportingParagraph: 'This guide is for operators who need a practical Shopify setup path and a clear validation checklist before customer-facing launch.',
    problemPoints: [
      'Store teams need an integration path that covers connection and validation, not just a button click with no operational checklist.',
      'AI launch quality suffers when order and product context are connected but never tested against real store scenarios.'
    ],
    sections: [
      {
        title: 'What the integration is used for',
        bullets: [
          'Expose catalog, order, and customer data to support and sales agents.',
          'Answer order-status and product questions with live store context.',
          'Route store conversations into one inbox instead of handling them across disconnected tools.',
        ],
      },
      {
        title: 'Connection flow',
        paragraphs: [
          'Open Integrations or Channels in the dashboard and start the Shopify connection from the workspace that owns the store.',
          'Approve the requested store access, then wait for the initial catalog and order sync to complete before testing live conversations.',
        ],
      },
      {
        title: 'Recommended validation',
        bullets: [
          'Search for a known order and verify the timeline loads the correct order status.',
          'Ask the AI about a real product and confirm the answer matches the store catalog.',
          'Review any pricing, shipping, and return language before customer-facing launch.',
        ],
      },
    ],
    nextLinks: [
      { label: 'Quickstart', href: '/docs/quickstart' },
      { label: 'WhatsApp onboarding guide', href: '/docs/integrations/whatsapp' },
    ],
    useCases: [
      'Preparing a store support workflow that can answer order and product questions with live context.',
      'Validating Shopify-connected AI before exposing it to real shoppers.'
    ],
    faqs: [
      { question: 'What should I test first after connecting Shopify?', answer: 'Test one known order lookup and one real product question so you can confirm both operational and catalog context are available in the inbox.' }
    ],
  },
  'integrations/whatsapp': {
    title: 'WhatsApp Business API Setup | ChatorAI Documentation',
    description: 'Set up WhatsApp Business API access inside ChatorAI and prepare the workspace for customer-facing automation.',
    h1: 'WhatsApp Business API onboarding',
    intro: 'This guide focuses on the operational setup steps inside ChatorAI after you decide to use WhatsApp as a live support or sales channel.',
    supportingParagraph: 'Use it when you already know WhatsApp matters to your workflow and you need a clean sequence for connection, verification, and launch checks.',
    problemPoints: [
      'WhatsApp rollout is easy to mis-sequence when connection, number readiness, and message-flow validation are handled ad hoc.',
      'Teams need an operational checklist before opening the channel to real customers.'
    ],
    sections: [
      {
        title: 'Prerequisites',
        bullets: [
          'A Meta Business account and a number that can be prepared for WhatsApp Business API use.',
          'A ChatorAI workspace with the business profile reviewed and AI replies checked before launch.',
        ],
      },
      {
        title: 'Connection flow',
        paragraphs: [
          'Open the WhatsApp channel connection flow from the dashboard, authenticate the Meta business account, and follow the number verification steps shown in the UI.',
          'Once connected, verify the channel status, webhook health, and test message flow before opening the number to customers.',
        ],
      },
      {
        title: 'Operational checks before launch',
        bullets: [
          'Review the assistant tone and handoff rules for sensitive or high-value conversations.',
          'Confirm that opt-in, opt-out, and escalation messaging matches your internal policy.',
          'Run one inbound test and one agent handoff test from the same workspace.',
        ],
      },
    ],
    nextLinks: [
      { label: 'Quickstart', href: '/docs/quickstart' },
      { label: 'API overview', href: '/docs/api/overview' },
    ],
    useCases: [
      'Rolling out WhatsApp as a support or sales channel with AI routing and handoff.',
      'Verifying template, webhook, and message flow health before production launch.'
    ],
    faqs: [
      { question: 'Can I launch WhatsApp before reviewing the AI profile?', answer: 'You can connect the channel first, but you should still review tone, escalation logic, and operational messaging before exposing the number to customers.' }
    ],
  },
  'api/overview': {
    title: 'API Overview | ChatorAI Documentation',
    description: 'Understand the current ChatorAI API surface for auth, billing, onboarding, channels, and reporting.',
    h1: 'API overview',
    intro: 'ChatorAI exposes a REST API used by the dashboard and by internal platform flows such as onboarding, billing, channel management, and reporting.',
    supportingParagraph: 'This page is informational by design. It helps technical teams understand the current API surface and where platform workflows live before they inspect implementation details.',
    problemPoints: [
      'Engineers and operators need to know which endpoint groups exist before they start tracing requests through the dashboard runtime.',
      'Without an overview, platform behavior can feel opaque because onboarding, billing, channels, and admin routes live in separate areas.'
    ],
    sections: [
      {
        title: 'Authentication model',
        paragraphs: [
          'The user dashboard API uses bearer-token auth for tenant-scoped requests.',
          'The admin control plane uses a separate cookie-based session and role-restricted admin endpoints under /api/admin.',
        ],
      },
      {
        title: 'Main endpoint groups',
        bullets: [
          '/api/auth for user authentication, invitations, and password reset flows.',
          '/api/billing for self-serve billing and subscription actions.',
          '/api/channels for integration and channel connection flows.',
          '/api/settings and /api/business-profile for AI and workspace configuration.',
          '/api/admin for platform operations, billing controls, AI control, logs, and system health.',
        ],
      },
      {
        title: 'Implementation notes',
        paragraphs: [
          'The API surface is still product-facing rather than public-developer polished, so treat endpoint availability and payload shape as implementation-level docs for now.',
          'Use the dashboard runtime as the reference for current request and response behavior until a dedicated public API reference is expanded.',
        ],
      },
    ],
    nextLinks: [
      { label: 'Quickstart', href: '/docs/quickstart' },
      { label: 'Core concepts', href: '/docs/concepts' },
    ],
    useCases: [
      'Reviewing which endpoint groups power onboarding, billing, channels, and admin operations.',
      'Orienting engineers before they inspect requests in the dashboard runtime.'
    ],
    faqs: [
      { question: 'Is the API overview a public developer reference?', answer: 'Not yet. It documents the current product-facing API surface so teams can understand how the dashboard and platform flows work today.' }
    ],
  },
  'ai-customer-support': {
    title: 'What Is AI Customer Support? | ChatorAI Documentation',
    description: 'Define AI customer support, understand how it works, when to use it, and how ChatorAI applies it in real customer operations.',
    h1: 'What is AI customer support?',
    intro: 'AI customer support uses AI to answer common questions, route conversations, and prepare better human handoff inside live support workflows.',
    supportingParagraph:
      'Use this definition page when you need a direct explanation of the category before evaluating tools, workflows, or rollout decisions.',
    problemPoints: [
      'Many teams use the term AI customer support loosely, which makes platform evaluation harder because chatbot features, helpdesk automation, and full conversation systems get mixed together.',
      'Without a clear definition, buyers often compare tools by surface features instead of understanding the operating model behind them.'
    ],
    answerBlocks: [
      {
        question: 'What is AI customer support?',
        answer:
          'AI customer support is the use of AI to answer routine questions, route conversations, and help teams resolve issues faster without losing context. ChatorAI applies that model inside an AI Revenue Operating System so support quality and business outcomes improve together.',
      },
      {
        question: 'How does AI automate customer conversations?',
        answer:
          'AI automates customer conversations by using business context, knowledge sources, and workflow rules to decide what should be answered, routed, or escalated. ChatorAI uses that structure to keep automation grounded instead of relying on generic replies.',
      },
      {
        question: 'When should a team use AI customer support?',
        answer:
          'Teams should use AI customer support when repetitive questions, after-hours volume, or cross-channel demand are slowing response quality. It is most useful when humans need to stay focused on exceptions, escalations, and high-value conversations.',
      },
    ],
    sections: [
      {
        title: 'Definition',
        paragraphs: [
          'AI customer support is a support operating model where AI handles repetitive answers, routing, and conversation preparation before a human needs to step in.',
          'The goal is not only deflection. The goal is to keep service quality high while reducing manual effort and improving response speed.',
        ],
      },
      {
        title: 'How it works',
        paragraphs: [
          'The system is grounded in company knowledge such as help articles, policy pages, product information, and escalation rules.',
          'When a customer starts a conversation, the AI uses that context to answer simple questions, route the request, or prepare a handoff summary for a human operator.',
        ],
      },
      {
        title: 'When to use it',
        bullets: [
          'When support teams are overloaded with repetitive questions.',
          'When customers expect faster answers across web, WhatsApp, or social channels.',
          'When human agents need better context before they take over complex cases.',
        ],
      },
      {
        title: 'How it relates to ChatorAI',
        paragraphs: [
          'ChatorAI treats AI customer support as one part of a broader operating system, not as an isolated bot layer.',
          'That means support conversations can also connect to routing, qualification, follow-up, and revenue-aware workflows when needed.',
        ],
      },
    ],
    nextLinks: [
      { label: 'AI customer support feature page', href: '/features/ai-customer-support-platform' },
      { label: 'What is an AI revenue system?', href: '/what-is-ai-revenue-system' },
      { label: 'Conversation routing definition', href: '/docs/conversation-routing' },
    ],
    useCases: [
      'Support teams reducing repetitive queue volume without sacrificing answer quality.',
      'Operators preparing a support automation rollout across multiple channels.',
      'Buyers comparing helpdesks, chatbots, and broader AI support systems.'
    ],
    faqs: [
      {
        question: 'Is AI customer support only for large support teams?',
        answer:
          'No. Smaller teams often benefit first because repetitive volume creates more pressure when headcount is limited.',
      },
      {
        question: 'Does AI customer support replace human agents?',
        answer:
          'It is usually most effective as a way to handle routine work and prepare better human takeover, not as a full replacement for judgment-heavy conversations.',
      },
    ],
  },
  'ai-sales-automation': {
    title: 'What Is AI Sales Automation? | ChatorAI Documentation',
    description: 'Define AI sales automation, understand how it works, when to use it, and how ChatorAI applies it in revenue workflows.',
    h1: 'What is AI sales automation?',
    intro: 'AI sales automation uses AI to qualify demand, route leads, follow up faster, and reduce the manual delay between interest and action.',
    supportingParagraph:
      'Use this definition page when the evaluation is no longer about simple chat automation and the real question is how conversations influence pipeline and revenue.',
    problemPoints: [
      'Sales automation is often confused with email sequencing alone, even though many buying signals now start in live conversations.',
      'Without a clear definition, teams underestimate how much qualification and follow-up speed depends on real-time routing and context.'
    ],
    answerBlocks: [
      {
        question: 'What is AI sales automation?',
        answer:
          'AI sales automation uses AI to qualify, route, and follow up on customer conversations that may turn into pipeline. ChatorAI applies that automation inside a conversation-driven operating layer instead of treating sales follow-up as a separate system.',
      },
      {
        question: 'How does AI improve revenue conversations?',
        answer:
          'AI improves revenue conversations by responding faster, capturing more context, and moving high-intent leads into the right follow-up path with less delay. ChatorAI uses that structure to reduce manual qualification lag.',
      },
      {
        question: 'When should a team use AI sales automation?',
        answer:
          'Teams should use AI sales automation when leads arrive across support, chat, WhatsApp, or social channels and manual follow-up is slowing conversion or qualification quality.',
      },
    ],
    sections: [
      {
        title: 'Definition',
        paragraphs: [
          'AI sales automation is the use of AI to handle early qualification, fast follow-up, and routing decisions inside revenue-related conversations.',
          'It becomes more valuable when the first buying signal shows up in a support, product, or messaging workflow rather than a clean inbound form.',
        ],
      },
      {
        title: 'How it works',
        paragraphs: [
          'The system reads business context, qualification rules, and customer inputs to decide whether a conversation should be answered, qualified, routed, or escalated.',
          'That workflow can then connect to CRM context, human ownership rules, and channel-specific messaging sequences.',
        ],
      },
      {
        title: 'When to use it',
        bullets: [
          'When lead response time is inconsistent.',
          'When sales and support conversations overlap in the same inbox or channel.',
          'When operators need more qualified routing before human sales teams step in.',
        ],
      },
      {
        title: 'How it relates to ChatorAI',
        paragraphs: [
          'ChatorAI treats AI sales automation as part of an AI Revenue Operating System, so qualification and support do not live in disconnected layers.',
          'That matters when the same conversation can include support questions, buying signals, and follow-up opportunities.',
        ],
      },
    ],
    nextLinks: [
      { label: 'AI sales agent platform', href: '/features/ai-sales-agent-platform' },
      { label: 'What is an AI revenue system?', href: '/what-is-ai-revenue-system' },
      { label: 'HubSpot integration', href: '/integrations/hubspot' },
    ],
    useCases: [
      'Qualifying leads that arrive in chat, messaging, or support channels.',
      'Reducing manual delay between first inquiry and sales follow-up.',
      'Routing commercial conversations with better context before a human rep joins.'
    ],
    faqs: [
      {
        question: 'Is AI sales automation only for outbound teams?',
        answer:
          'No. It is also useful for inbound and conversational workflows where the first buying signals appear in real-time support or messaging channels.',
      },
      {
        question: 'Can AI sales automation work with human reps?',
        answer:
          'Yes. The most common model is AI handling qualification and preparation first, then handing the conversation to a human with context already attached.',
      },
    ],
  },
  'omnichannel-communication': {
    title: 'What Is Omnichannel Communication? | ChatorAI Documentation',
    description: 'Define omnichannel communication, understand how it works, when to use it, and how ChatorAI unifies live customer channels.',
    h1: 'What is omnichannel communication?',
    intro: 'Omnichannel communication means managing customer conversations across multiple channels in one coordinated workflow instead of treating each channel as a separate queue.',
    supportingParagraph:
      'Use this definition page when you need to explain why channel sprawl creates operational drag and why unified conversation context matters.',
    problemPoints: [
      'Teams often say they are omnichannel when they are really just present on multiple channels with no shared context or routing logic.',
      'Without a unified definition, inbox, handoff, and measurement decisions become channel-by-channel rather than system-level.'
    ],
    answerBlocks: [
      {
        question: 'What is omnichannel communication?',
        answer:
          'Omnichannel communication means customer conversations across web, WhatsApp, social, and other channels are handled in one coordinated workflow. ChatorAI applies that model inside a single AI-assisted operating layer instead of splitting each channel into a separate tool.',
      },
      {
        question: 'Why does omnichannel communication matter?',
        answer:
          'It matters because customers do not care which internal queue owns the conversation. Teams need one context layer so support, sales, and routing decisions do not reset every time the channel changes.',
      },
      {
        question: 'When should a team unify channels?',
        answer:
          'A team should unify channels when support quality, follow-up speed, or routing clarity starts to break because web chat, messaging apps, and social replies are handled separately.',
      },
    ],
    sections: [
      {
        title: 'Definition',
        paragraphs: [
          'Omnichannel communication is not only about being present on multiple channels. It is about keeping conversation context, ownership, and workflow logic connected across those channels.',
          'That makes it easier to respond consistently and to protect both service quality and commercial follow-through.',
        ],
      },
      {
        title: 'How it works',
        paragraphs: [
          'Channels are connected into one workspace, then routing rules, AI context, and operator workflows are applied consistently across all of them.',
          'This lets a team answer faster, escalate with more context, and track conversations without rebuilding the story every time a customer changes channel.',
        ],
      },
      {
        title: 'When to use it',
        bullets: [
          'When customers message from more than one channel during the same journey.',
          'When the team is switching tabs between web chat, social, and messaging apps to keep up.',
          'When escalation quality suffers because context is fragmented across tools.',
        ],
      },
      {
        title: 'How it relates to ChatorAI',
        paragraphs: [
          'ChatorAI uses omnichannel communication as a foundation for support, qualification, and routing in one AI-assisted layer.',
          'That means the channel system supports both service workflows and revenue-sensitive conversations instead of only message collection.',
        ],
      },
    ],
    nextLinks: [
      { label: 'Omnichannel AI Inbox', href: '/features/omnichannel-ai-inbox' },
      { label: 'WhatsApp automation definition', href: '/docs/whatsapp-automation' },
      { label: 'What is AI customer support?', href: '/what-is-ai-customer-support' },
    ],
    useCases: [
      'Unifying web chat, WhatsApp, and social conversations into one operator workflow.',
      'Improving handoff quality when customers move between channels.',
      'Reducing channel-by-channel routing and reporting fragmentation.'
    ],
    faqs: [
      {
        question: 'Is omnichannel communication the same as multi-channel support?',
        answer:
          'Not exactly. Multi-channel means the business is present on multiple surfaces, while omnichannel means those surfaces share context, routing, and workflow continuity.',
      },
      {
        question: 'Does omnichannel communication require AI?',
        answer:
          'No, but AI makes it much more useful because it helps answer, route, and summarize conversations consistently across channels.',
      },
    ],
  },
  'whatsapp-automation': {
    title: 'What Is WhatsApp Automation? | ChatorAI Documentation',
    description: 'Define WhatsApp automation, understand how it works, when to use it, and how ChatorAI uses it for support and revenue workflows.',
    h1: 'What is WhatsApp automation?',
    intro: 'WhatsApp automation uses workflow rules and AI to answer, route, follow up, and escalate customer conversations inside WhatsApp without relying on fully manual handling.',
    supportingParagraph:
      'Use this definition page when you need a clean explanation of WhatsApp automation before discussing templates, support workflows, or AI routing.',
    problemPoints: [
      'WhatsApp automation is often reduced to message templates alone, even though the real value usually comes from routing, follow-up, and context-aware handling.',
      'Without a precise definition, teams either under-automate the channel or overestimate what basic messaging tools can do.'
    ],
    answerBlocks: [
      {
        question: 'What is WhatsApp automation?',
        answer:
          'WhatsApp automation is the use of workflow rules and AI to handle parts of the customer conversation inside WhatsApp. ChatorAI uses WhatsApp automation to answer, route, qualify, and escalate conversations in one operating layer.',
      },
      {
        question: 'How does AI automate customer conversations on WhatsApp?',
        answer:
          'AI uses business context, knowledge, and routing rules to decide what should be answered immediately, what should be escalated, and what should move into a sales or support workflow. That matters because WhatsApp often carries both service questions and high-intent buying signals.',
      },
      {
        question: 'When should a team automate WhatsApp?',
        answer:
          'A team should automate WhatsApp when response speed, routing quality, or conversation volume starts to depend too heavily on manual operator handling.',
      },
    ],
    sections: [
      {
        title: 'Definition',
        paragraphs: [
          'WhatsApp automation is a conversation workflow model where common responses, qualification, and routing logic are handled automatically inside the channel.',
          'It becomes especially valuable when WhatsApp is used for support, pre-sales questions, booking requests, or high-frequency follow-up.',
        ],
      },
      {
        title: 'How it works',
        paragraphs: [
          'The channel is connected through the WhatsApp Business API, then the AI uses approved business context, knowledge, and workflow rules to decide how each conversation should move.',
          'That can include instant answers, lead qualification, human handoff, or post-conversation follow-up.',
        ],
      },
      {
        title: 'When to use it',
        bullets: [
          'When WhatsApp is already a high-volume support or sales channel.',
          'When the team needs faster first response without staffing every conversation manually.',
          'When support and revenue conversations overlap in the same message flow.',
        ],
      },
      {
        title: 'How it relates to ChatorAI',
        paragraphs: [
          'ChatorAI treats WhatsApp as part of a broader conversation system, not as a one-off automation channel.',
          'That means WhatsApp activity can stay connected to routing, support, qualification, and broader customer context.',
        ],
      },
    ],
    nextLinks: [
      { label: 'WhatsApp AI automation feature', href: '/features/whatsapp-ai-automation' },
      { label: 'WhatsApp integration docs', href: '/docs/integrations/whatsapp' },
      { label: 'Omnichannel communication definition', href: '/docs/omnichannel-communication' },
    ],
    useCases: [
      'Automating support and buying questions in one messaging channel.',
      'Reducing delay in high-intent WhatsApp lead follow-up.',
      'Creating a cleaner handoff path when a human needs to join the conversation.'
    ],
    faqs: [
      {
        question: 'Is WhatsApp automation only for support?',
        answer:
          'No. Many teams use it for support, qualification, follow-up, and other workflows that carry direct revenue impact.',
      },
      {
        question: 'Does WhatsApp automation always require a human takeover path?',
        answer:
          'In serious production use, yes. Teams usually need a clear path for human review when the conversation becomes sensitive, complex, or commercially important.',
      },
    ],
  },
  'conversation-routing': {
    title: 'What Is Conversation Routing? | ChatorAI Documentation',
    description: 'Define conversation routing, understand how it works, when to use it, and how ChatorAI uses routing to control support and revenue workflows.',
    h1: 'What is conversation routing?',
    intro: 'Conversation routing is the process of sending a customer conversation to the right AI path, team, or human owner based on intent, context, channel, and priority.',
    supportingParagraph:
      'Use this definition page when routing quality is becoming a real operational problem and the team needs a direct explanation of what “good routing” actually means.',
    problemPoints: [
      'Routing is often treated as a simple assignment rule, even though modern conversation flows depend on intent, urgency, commercial value, and channel context together.',
      'Without clear routing logic, automation either sends too much to humans or keeps sensitive conversations stuck in the wrong AI path.'
    ],
    answerBlocks: [
      {
        question: 'What is conversation routing?',
        answer:
          'Conversation routing is the logic that decides where a customer conversation should go next based on intent, context, and priority. ChatorAI uses routing to decide whether AI should answer, which team should own the case, and when a human should take over.',
      },
      {
        question: 'Why does conversation routing matter?',
        answer:
          'It matters because the quality of the next step often determines whether a conversation gets resolved, qualified, or mishandled. Strong routing reduces manual triage and helps teams respond with the right context faster.',
      },
      {
        question: 'When should a team improve routing?',
        answer:
          'A team should improve routing when operators spend too much time reassigning conversations, rebuilding context, or correcting weak handoffs between AI and humans.',
      },
    ],
    sections: [
      {
        title: 'Definition',
        paragraphs: [
          'Conversation routing is the system that determines what should happen next after a message arrives.',
          'That next step might be an AI answer, a department assignment, a human escalation, or a follow-up path tied to a support or revenue workflow.',
        ],
      },
      {
        title: 'How it works',
        paragraphs: [
          'The routing layer uses intent, business rules, customer context, and channel signals to decide the next owner or automation step.',
          'That means routing can be based on more than a queue. It can respond to urgency, customer value, or the type of outcome the conversation needs.',
        ],
      },
      {
        title: 'When to use it',
        bullets: [
          'When the wrong team often receives the conversation first.',
          'When AI should answer some messages but not others.',
          'When support and commercial conversations need different ownership rules in the same channel.',
        ],
      },
      {
        title: 'How it relates to ChatorAI',
        paragraphs: [
          'ChatorAI uses conversation routing as a core control layer for support, qualification, escalation, and handoff.',
          'That makes routing part of the revenue operating model instead of a separate admin task handled after the fact.',
        ],
      },
    ],
    nextLinks: [
      { label: 'AI customer support definition', href: '/docs/ai-customer-support' },
      { label: 'AI sales automation definition', href: '/docs/ai-sales-automation' },
      { label: 'AI customer support feature', href: '/features/ai-customer-support-platform' },
    ],
    useCases: [
      'Routing support questions, sales intent, and escalations to the right path faster.',
      'Reducing manual reassignment inside shared inboxes.',
      'Improving AI-to-human handoff quality in live customer workflows.'
    ],
    faqs: [
      {
        question: 'Is conversation routing only a support function?',
        answer:
          'No. Routing also matters for qualification, follow-up, and other workflows where the next owner or next action affects revenue, not only service resolution.',
      },
      {
        question: 'Can AI routing work without human control?',
        answer:
          'It still needs human-defined rules and review paths. AI makes routing faster and smarter, but operators still decide where guardrails and handoff boundaries should exist.',
      },
    ],
  },
};
