import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeoSection, SEO_PAGE_NARROW } from '@/components/seo/SeoPageLayout';

export function CTASection({
  title = 'Ready to move faster with ChatorAI?',
  description = 'Launch a trial workspace, validate the workflow, and see how ChatorAI fits your support and revenue operations.',
  primaryCtaText = 'Start free trial',
  primaryHref = '/signup',
  secondaryCtaText = 'Schedule a demo',
  secondaryHref = '/demo',
}) {
  return (
    <SeoSection tone="accent" containerClassName={SEO_PAGE_NARROW}>
      <div className="rounded-[2rem] border border-primary/15 bg-primary/[0.06] px-6 py-12 text-center shadow-[0_30px_90px_-60px_hsl(var(--primary)/0.55)] sm:px-10">
        <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="h-12 rounded-xl px-7 text-base font-semibold" asChild>
            <Link href={primaryHref}>
              {primaryCtaText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 rounded-xl px-7 text-base font-semibold" asChild>
            <Link href={secondaryHref}>{secondaryCtaText}</Link>
          </Button>
        </div>
      </div>
    </SeoSection>
  );
}
