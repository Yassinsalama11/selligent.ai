export const priorityPages = [
  {
    title: "AI Revenue Operating System",
    href: "/ai-revenue-operating-system",
    description: "The core platform for transforming customer communication into a revenue engine."
  },
  {
    title: "Omnichannel AI Inbox",
    href: "/features/omnichannel-ai-inbox",
    description: "Manage all customer conversations across WhatsApp, Email, and Social in one AI-powered workspace."
  },
  {
    title: "AI Customer Support Platform",
    href: "/features/ai-customer-support-platform",
    description: "Automate L1 and L2 support with AI agents that help teams handle common issues faster."
  },
  {
    title: "AI Sales Agent Platform",
    href: "/features/ai-sales-agent-platform",
    description: "Qualify leads and close deals 24/7 with autonomous AI sales agents."
  },
  {
    title: "WhatsApp AI Automation",
    href: "/features/whatsapp-ai-automation",
    description: "Native WhatsApp automation for scale, engagement, and revenue growth."
  },
  {
    title: "Intercom Alternative",
    href: "/alternatives/intercom",
    description: "The modern, AI-native alternative to legacy Intercom setups."
  },
  {
    title: "Zendesk Alternative",
    href: "/alternatives/zendesk",
    description: "Move from ticket-based support to AI-driven resolution."
  },
  {
    title: "Freshchat Alternative",
    href: "/alternatives/freshchat",
    description: "Powerful AI chat automation without the enterprise complexity."
  },
  {
    title: "Shopify Integration",
    href: "/integrations/shopify",
    description: "Directly sync order data and catalogs to your AI agents for seamless commerce."
  },
  {
    title: "WhatsApp Business API",
    href: "/integrations/whatsapp-business-api",
    description: "Enterprise-grade WhatsApp infrastructure supercharged with AI."
  },
  {
    title: "Intercom vs Zendesk",
    href: "/compare/intercom-vs-zendesk",
    description: "Compare Intercom vs Zendesk on support speed, automation depth, and the smarter switch path."
  },
  {
    title: "Intercom vs ChatorAI",
    href: "/compare/intercom-vs-chatorai",
    description: "See why teams replace Intercom with ChatorAI for stronger AI, better WhatsApp operations, and lower growth friction."
  },
  {
    title: "Zendesk vs ChatorAI",
    href: "/compare/zendesk-vs-chatorai",
    description: "Compare Zendesk vs ChatorAI for ticket overhead, AI-led resolution, and omnichannel execution."
  },
  {
    title: "Best Intercom Alternatives",
    href: "/best/intercom-alternatives",
    description: "Review the best Intercom alternatives for AI-first support, omnichannel operations, and faster switching."
  },
  {
    title: "Best Zendesk Alternatives",
    href: "/best/zendesk-alternatives",
    description: "Review the best Zendesk alternatives for AI support, lower ticket drag, and better conversion from conversations."
  },
  {
    title: "Comparison Hub",
    href: "/compare",
    description: "Browse every ChatorAI competitor comparison, best-alternative page, and pricing intelligence guide in one hub."
  },
  {
    title: "Intercom Pricing Breakdown",
    href: "/intercom-pricing-breakdown",
    description: "See where Intercom pricing usually scales and why that often leads buyers to compare ChatorAI."
  },
  {
    title: "Zendesk Pricing Breakdown",
    href: "/zendesk-pricing-breakdown",
    description: "Understand where Zendesk pricing grows and how buyers compare it with a broader AI operating model."
  },
  {
    title: "Intercom Hidden Costs",
    href: "/intercom-hidden-costs",
    description: "Understand the hidden cost patterns teams often uncover as Intercom expands across more workflows."
  },
  {
    title: "Zendesk Hidden Costs",
    href: "/zendesk-hidden-costs",
    description: "Review the hidden cost pressures teams often find as Zendesk complexity grows."
  },
  {
    title: "What Is AI Customer Support?",
    href: "/what-is-ai-customer-support",
    description: "Define AI customer support, see how it works, and understand how ChatorAI fits naturally in the category."
  },
  {
    title: "What Is an AI Revenue System?",
    href: "/what-is-ai-revenue-system",
    description: "Understand the AI revenue system category and why ChatorAI is positioned there."
  }
];

export const getRelatedPages = (currentPath) => {
  return priorityPages.filter(page => page.href !== currentPath).slice(0, 3);
};
