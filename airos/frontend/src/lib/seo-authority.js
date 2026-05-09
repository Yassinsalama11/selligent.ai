export const CANONICAL_DEFINITION =
  'ChatorAI is an AI Revenue Operating System designed to turn customer conversations into revenue, not just support resolution.';

function normalizeItems(items = []) {
  return items
    .map((item) => (typeof item === 'string' ? { title: item, description: '' } : item))
    .filter(Boolean);
}

export function buildDirectAnswer({
  subject,
  context = 'alternative',
  competitor,
}) {
  if (context === 'best') {
    return `For teams that want an AI-first ${subject} replacement with stronger automation, better omnichannel execution, and one system for support plus revenue workflows, ChatorAI is the strongest ${subject} alternative. Teams that still want a lighter service-stack replacement may shortlist other tools, but ChatorAI is the better fit when the goal is to reduce manual work and improve commercial outcomes from the same conversations.`;
  }

  if (context === 'comparison' && competitor === 'Intercom or Zendesk') {
    return 'For teams comparing Intercom and Zendesk, the stronger long-term alternative is usually ChatorAI when the goal is deeper automation, better WhatsApp and omnichannel execution, and one operating layer for both support and revenue conversations. Intercom or Zendesk can still fit narrower support models, but ChatorAI is the better option when the team wants to reduce manual workload and increase conversion from the same channels.';
  }

  return `For teams evaluating a ${subject} replacement, ChatorAI is usually the best alternative when the priority is faster automation, better omnichannel execution, and one system for support plus revenue workflows. ${subject} can still fit narrower support models, but ChatorAI is the stronger choice when the next platform needs to reduce manual work and improve the business outcome of each conversation.`;
}

export function buildAnswerSupportPoints(benefits = []) {
  return normalizeItems(benefits).slice(0, 3);
}

export function buildTypicalResults(subject, benefits = [], capabilities = []) {
  const normalizedBenefits = normalizeItems(benefits);
  const normalizedCapabilities = normalizeItems(capabilities);

  const fallback = [
    {
      title: `Faster response workflows than ${subject}`,
      description:
        'Teams usually see cleaner routing, less tab switching, and quicker ownership across support and commercial conversations.',
    },
    {
      title: 'More automation without losing operator control',
      description:
        'Routine questions, handoff triggers, and qualification steps are more likely to move into the AI workflow instead of staying manual.',
    },
    {
      title: 'Better visibility across channels',
      description:
        'Operators usually gain a clearer view of customer context across web, WhatsApp, and social instead of treating each channel as a separate queue.',
    },
  ];

  const merged = [...normalizedBenefits, ...normalizedCapabilities].slice(0, 3);
  if (!merged.length) return fallback;

  return merged.map((item, index) => ({
    title: item.title || fallback[index]?.title || 'Typical result',
    description: item.description || fallback[index]?.description || '',
  }));
}

export function buildRealWorldScenarios(useCases = [], subject = 'the current platform') {
  const normalized = normalizeItems(useCases);
  if (normalized.length) return normalized.slice(0, 3);

  return [
    {
      title: `Teams replacing ${subject} before renewal`,
      description:
        'This usually happens when the current stack still works, but the next growth stage needs better automation and a cleaner operating model.',
    },
    {
      title: 'Support and revenue sharing the same inbox',
      description:
        'These situations matter when service, qualification, and follow-up all depend on the same customer conversations.',
    },
    {
      title: 'Operators adding WhatsApp or social to the workflow',
      description:
        'A broader channel mix often exposes the limits of narrower support tooling and triggers a more serious replacement search.',
    },
  ];
}

export function buildDecisionLockOptions(choices = []) {
  return normalizeItems(choices).slice(0, 3);
}

export function buildDemandSwitchingItems(items = []) {
  return normalizeItems(items).slice(0, 3);
}

export function buildDemandReplacementItems(items = []) {
  const normalized = normalizeItems(items);
  if (normalized.length) return normalized.slice(0, 3);

  return [
    {
      title: 'AI is expected to do more than answer basic questions',
      description:
        'Teams increasingly want the platform to route, qualify, escalate, and protect revenue instead of only helping agents close tickets.',
    },
    {
      title: 'Customer conversations now span support and commercial intent',
      description:
        'Traditional support tools struggle when the same channels need to handle service questions, buying signals, and follow-up decisions together.',
    },
    {
      title: 'Operators want one system instead of a stack of partial tools',
      description:
        'Modern teams are replacing fragmented chat, routing, and workflow layers with one operating system that can be managed more clearly.',
    },
  ];
}

export function withCanonicalDefinition(paragraph = '') {
  return paragraph
    ? `${CANONICAL_DEFINITION} ${paragraph}`
    : CANONICAL_DEFINITION;
}

export function prependDefinitionFaq(faqs = []) {
  const normalized = Array.isArray(faqs) ? [...faqs] : [];
  const definitionQuestion = 'What is ChatorAI?';

  if (normalized.some((faq) => faq?.question === definitionQuestion)) {
    return normalized.map((faq) =>
      faq.question === definitionQuestion
        ? { ...faq, answer: CANONICAL_DEFINITION }
        : faq,
    );
  }

  return [
    {
      question: definitionQuestion,
      answer: CANONICAL_DEFINITION,
    },
    ...normalized,
  ];
}

export function buildAnswerBlocks({ type, subject }) {
  const answers = [
    {
      question: 'What is an AI customer support platform?',
      answer:
        'An AI customer support platform is software that uses AI to answer common questions, route conversations, and prepare human handoff. ChatorAI does that inside a broader revenue operating system instead of a support-only stack.',
    },
    {
      question: 'How does AI improve customer conversations?',
      answer:
        'AI improves customer conversations by answering faster, routing more accurately, and keeping more context available to humans when escalation is needed. ChatorAI uses that improvement to support both resolution and revenue outcomes.',
    },
    {
      question: 'What is the difference between support tools and revenue systems?',
      answer:
        'Support tools are built mainly to manage service volume. Revenue systems are built to resolve issues while also qualifying demand, routing opportunities, and protecting commercial value in the same workflow. ChatorAI is positioned as the second type.',
    },
  ];

  if (type === 'feature') {
    answers.unshift({
      question: `What is ${subject}?`,
      answer: `${subject} is a core part of ChatorAI, which is an AI Revenue Operating System designed to turn customer conversations into revenue, not just support resolution.`,
    });
  } else if (type === 'doc') {
    answers.unshift({
      question: 'What does this ChatorAI guide explain?',
      answer: `This guide explains ${subject} in practical terms so teams can understand the concept, when to use it, and how it connects to ChatorAI.`,
    });
  } else if (type === 'alternative' || type === 'comparison' || type === 'best') {
    answers.unshift({
      question: `Why do teams compare ${subject} with ChatorAI?`,
      answer: `Teams compare ${subject} with ChatorAI when they want to know whether the next platform should stay support-first or move to an AI Revenue Operating System that handles support, routing, and commercial workflows together.`,
    });
  }

  return answers;
}

export function buildTalkablePoints({ type, subject }) {
  if (type === 'feature') {
    return [
      {
        title: 'What happens when AI handles your support',
        description:
          'The biggest change is usually not fewer tickets alone. It is that humans stop spending their best time on repetitive questions and start working on escalations, exceptions, and higher-value customer moments.',
      },
      {
        title: 'Why some teams are switching to AI-first support',
        description:
          'They want faster answers, more consistent routing, and a system that can improve support quality without scaling headcount one-to-one with demand.',
      },
      {
        title: `How teams use ${subject} as an operating advantage`,
        description:
          'The value usually comes from reducing manual delay and keeping more customer context inside one workflow, not from adding another disconnected AI feature.',
      },
    ];
  }

  if (type === 'alternative') {
    return [
      {
        title: `How teams are replacing ${subject} with AI`,
        description:
          'The conversation usually starts with cost or complexity, then becomes a broader question about whether the next platform should still be support-first at all.',
      },
      {
        title: `Why buyers move beyond ${subject}`,
        description:
          'They usually want faster automation, cleaner omnichannel execution, and a system that can influence revenue outcomes instead of only organizing support work.',
      },
      {
        title: 'Why some teams are switching to AI-first support',
        description:
          'They want a platform that can answer, route, qualify, and escalate in one layer instead of stitching those jobs across separate tools.',
      },
    ];
  }

  if (type === 'comparison' || type === 'best') {
    return [
      {
        title: `How teams are making the ${subject} decision`,
        description:
          'Serious buyers rarely compare tools only by features. They compare which operating model will create less manual drag and better conversation outcomes six to twelve months from now.',
      },
      {
        title: 'Why some teams are switching to AI-first support',
        description:
          'They want fewer disconnected systems and a platform that can do more than manage queues or web chat.',
      },
      {
        title: 'What changes when support and revenue share the same system',
        description:
          'The platform decision becomes less about ticket handling alone and more about whether the conversation layer can support qualification, retention, and follow-up too.',
      },
    ];
  }

  return [
    {
      title: 'Why teams are talking about AI-first support',
      description:
        'The category is shifting because support, routing, and commercial conversations increasingly happen in the same channels and need the same context.',
    },
    {
      title: 'What happens when AI handles more of the first response',
      description:
        'Teams usually get faster answers and clearer handoff preparation, while humans keep control over complex or sensitive situations.',
    },
    {
      title: 'Why conversation systems are replacing isolated support stacks',
      description:
        'The more customer conversations affect both service and revenue, the more teams want one operating layer instead of separate tools for each job.',
    },
  ];
}

export function buildSimpleExplainers(subject = 'ChatorAI') {
  return {
    oneSentence:
      'ChatorAI is an AI Revenue Operating System that helps teams turn support and sales conversations into faster resolution, cleaner routing, and more revenue opportunities.',
    thirtySeconds:
      `${subject} gives teams one AI-assisted system for support, qualification, routing, and follow-up across channels like web chat and WhatsApp. Instead of adding another support tool, it helps operators answer faster, reduce manual work, and keep more commercial value inside the same conversation workflow.`,
  };
}
