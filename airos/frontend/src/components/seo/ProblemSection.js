import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function normalizeItems(items = []) {
  return items
    .map((item) => (typeof item === 'string' ? { title: item, description: '' } : item))
    .filter(Boolean);
}

export function ProblemSection({
  title = 'Why it matters',
  description,
  points = [],
  secondaryTitle,
  secondaryPoints = [],
}) {
  const primaryItems = normalizeItems(points);
  const secondaryItemsNormalized = normalizeItems(secondaryPoints);

  if (!primaryItems.length && !secondaryItemsNormalized.length) return null;

  return (
    <SeoSection tone="muted">
      <SeoSectionHeading title={title} description={description} />

      <div className={`mt-14 grid gap-6 ${secondaryItemsNormalized.length ? 'lg:grid-cols-2' : 'max-w-4xl mx-auto'}`}>
        {primaryItems.length ? (
          <Card className="border-border/60 bg-card/95 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.45)]">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {secondaryItemsNormalized.length ? 'What slows teams down today' : title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {primaryItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                  {item.description ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {secondaryItemsNormalized.length ? (
          <Card className="border-primary/15 bg-primary/[0.045] shadow-[0_24px_60px_-42px_hsl(var(--primary)/0.55)]">
            <CardHeader className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {secondaryTitle || 'What improves with ChatorAI'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {secondaryItemsNormalized.map((item) => (
                <div key={item.title} className="rounded-2xl border border-primary/15 bg-background/80 p-4">
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
