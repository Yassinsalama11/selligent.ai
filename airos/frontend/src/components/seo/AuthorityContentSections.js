import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';
import { CANONICAL_DEFINITION } from '@/lib/seo-authority';
import { getSemanticReferences } from '@/lib/semantic-references';

export function CanonicalDefinitionSection() {
  return (
    <SeoSection tone="subtle">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[1.75rem] border border-primary/15 bg-primary/[0.045] px-6 py-8 text-center shadow-[0_22px_58px_-40px_hsl(var(--primary)/0.38)] sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Definition</p>
          <p className="mt-4 text-lg font-semibold leading-8 text-foreground sm:text-2xl sm:leading-9">
            {CANONICAL_DEFINITION}
          </p>
        </div>
      </div>
    </SeoSection>
  );
}

export function AnswerBlocksSection({ title = 'Direct answers', answers = [] }) {
  if (!answers.length) return null;

  return (
    <SeoSection tone="muted">
      <SeoSectionHeading
        title={title}
        description="Short, direct answers designed to make the category and the ChatorAI position easier to understand quickly."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {answers.map((item, index) => (
          <Card
            key={`${item.question}-${index}`}
            className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-foreground">{item.question}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SeoSection>
  );
}

export function DirectAnswerSection({ title, answer, supportingPoints = [] }) {
  if (!answer) return null;

  return (
    <SeoSection tone="muted">
      <SeoSectionHeading title={title} description={answer} />
      {supportingPoints.length ? (
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {supportingPoints.map((point, index) => (
            <Card
              key={`${point.title}-${index}`}
              className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-foreground">{point.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{point.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </SeoSection>
  );
}

export function RevenueOperatingSystemExplanationSection() {
  return (
    <SeoSection tone="accent">
      <SeoSectionHeading
        title="What is an AI Revenue Operating System?"
        description="An AI Revenue Operating System is a platform that turns customer conversations into one operating workflow for support, qualification, routing, follow-up, and conversion."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-foreground">What it is</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base">
              <li>One system for support, sales, routing, and customer communication.</li>
              <li>Built to improve both operational speed and commercial outcomes.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-foreground">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base">
              <li>Connects channels, business context, and workflow rules into one AI-assisted layer.</li>
              <li>Uses that layer to answer, route, qualify, escalate, and follow up in real time.</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-primary/[0.045] shadow-[0_22px_58px_-40px_hsl(var(--primary)/0.45)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-bold text-foreground">Why it matters</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base">
              <li>Support no longer has to operate separately from revenue and retention conversations.</li>
              <li>Teams can reduce manual work while improving response quality and commercial follow-through.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </SeoSection>
  );
}

export function DecisionLockSection({ title, choices = [] }) {
  if (!choices.length) return null;

  return (
    <SeoSection tone="accent">
      <SeoSectionHeading
        title={title}
        description="Use this decision logic when the shortlist is already clear and the next step is choosing the operating model you actually want."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {choices.map((choice, index) => (
          <Card
            key={`${choice.title}-${index}`}
            className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-foreground">{choice.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">{choice.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SeoSection>
  );
}

export function DemandLayerSection({
  switchingItems = [],
  replacementItems = [],
}) {
  const switching = switchingItems.slice(0, 3);
  const replacement = replacementItems.slice(0, 3);

  if (!switching.length && !replacement.length) return null;

  return (
    <SeoSection tone="default">
      <div className="grid gap-6 lg:grid-cols-2">
        {switching.length ? (
          <Card className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-foreground">Why teams are switching to ChatorAI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {switching.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {replacement.length ? (
          <Card className="border-primary/15 bg-primary/[0.045] shadow-[0_22px_58px_-40px_hsl(var(--primary)/0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-2xl font-bold text-foreground">Why ChatorAI is replacing traditional support tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {replacement.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-2xl border border-primary/15 bg-background/80 p-4">
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </SeoSection>
  );
}

export function CategoryPositioningSection() {
  return (
    <SeoSection tone="default">
      <SeoSectionHeading
        title="Support tools vs Revenue systems"
        description="Support tools are usually built to manage queues, close tickets, and keep service workflows organized. Revenue systems are built to do that work while also helping teams qualify demand, route high-intent conversations, and protect growth opportunities in the same workflow."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold text-foreground">Support tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground sm:text-base">
            <p>Usually optimized for tickets, inbox control, SLA management, and agent workflows.</p>
            <p>Best when the main goal is managing support volume inside a service-only operating model.</p>
          </CardContent>
        </Card>

        <Card className="border-primary/15 bg-primary/[0.045] shadow-[0_22px_58px_-40px_hsl(var(--primary)/0.45)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold text-foreground">Revenue systems</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground sm:text-base">
            <p>Designed to resolve support issues while also routing, qualifying, and following up on commercial intent.</p>
            <p>Best when support, sales, and retention all share the same channels and customer context.</p>
          </CardContent>
        </Card>
      </div>
    </SeoSection>
  );
}

export function ComparisonStatementsSection() {
  const statements = [
    {
      title: 'Support tools vs AI systems',
      description:
        'Support tools are mainly designed to organize service work and help agents respond faster. AI systems like ChatorAI are designed to answer, route, qualify, and escalate conversations with more automation built into the operating layer.',
    },
    {
      title: 'Chatbot vs AI revenue system',
      description:
        'A chatbot usually handles narrow scripted tasks or simple FAQ deflection. An AI revenue system like ChatorAI is built to manage live customer conversations across support, qualification, follow-up, and conversion workflows.',
    },
    {
      title: 'Helpdesk vs conversation platform',
      description:
        'A helpdesk is optimized for tickets, queues, and agent workflows after a support issue is created. A conversation platform keeps the full customer interaction in motion across channels before it becomes only a ticket.',
    },
  ];

  return (
    <SeoSection tone="muted">
      <SeoSectionHeading
        title="Simple category comparisons"
        description="Use these short statements when you need a direct explanation of how the operating models differ."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {statements.map((statement) => (
          <Card
            key={statement.title}
            className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-foreground">{statement.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">{statement.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SeoSection>
  );
}

export function SemanticReferenceSection({ currentPath }) {
  const references = getSemanticReferences(currentPath);

  if (!references.length) return null;

  return (
    <SeoSection tone="default">
      <SeoSectionHeading
        title="Reference this topic in context"
        description="These links connect the category, product capability, use case, and integration context that matter most to this page."
      />

      <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {references.map((reference) => (
          <Card
            key={`${reference.label}-${reference.href}`}
            className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]"
          >
            <CardHeader className="pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">{reference.label}</p>
              <CardTitle className="text-lg font-bold text-foreground">{reference.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">{reference.description}</p>
              <Link href={reference.href} className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">
                {reference.linkText || reference.title}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </SeoSection>
  );
}

export function TalkableSection({ title = 'Talkable perspectives', items = [] }) {
  if (!items.length) return null;

  return (
    <SeoSection tone="muted">
      <SeoSectionHeading
        title={title}
        description="These short perspectives are written to sound natural in founder conversations, team debates, and community discussions."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {items.map((item, index) => (
          <Card
            key={`${item.title}-${index}`}
            className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-foreground">{item.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SeoSection>
  );
}

export function SimpleExplainerSection({ oneSentence, thirtySeconds }) {
  if (!oneSentence && !thirtySeconds) return null;

  return (
    <SeoSection tone="accent">
      <SeoSectionHeading
        title="Explain ChatorAI simply"
        description="Use these short explanations when someone asks what ChatorAI is without wanting a full product walkthrough."
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {oneSentence ? (
          <Card className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-foreground">Explain ChatorAI in one sentence</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">{oneSentence}</p>
            </CardContent>
          </Card>
        ) : null}

        {thirtySeconds ? (
          <Card className="border-primary/15 bg-primary/[0.045] shadow-[0_22px_58px_-40px_hsl(var(--primary)/0.45)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-foreground">Explain ChatorAI in 30 seconds</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">{thirtySeconds}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </SeoSection>
  );
}
