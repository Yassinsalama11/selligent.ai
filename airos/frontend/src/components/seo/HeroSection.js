import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeoSection, SEO_PAGE_NARROW } from '@/components/seo/SeoPageLayout';

export function HeroSection({
  eyebrow,
  title,
  description,
  supportingParagraph,
  primaryCtaText = 'Start free trial',
  primaryHref = '/signup',
  secondaryCtaText = 'Book demo',
  secondaryHref = '/demo',
  showActions = true,
  proof,
  variant = 'default',
}) {
  const sectionSpacing =
    variant === 'compact'
      ? 'relative overflow-hidden py-4 sm:py-6'
      : 'relative overflow-hidden pt-28 sm:pt-32 lg:pt-40';

  return (
    <SeoSection className={sectionSpacing} containerClassName={SEO_PAGE_NARROW}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 via-primary/4 to-transparent" />
        <div className="absolute left-1/2 top-16 h-56 w-56 -translate-x-[130%] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-1/2 top-24 h-48 w-48 translate-x-[140%] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative text-center">
        {eyebrow ? (
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            {eyebrow}
          </div>
        ) : null}

        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.04]">
          {title}
        </h1>

        <div className="mt-8 space-y-4">
          <p className="text-lg leading-8 text-foreground/90 sm:text-xl">
            {description}
          </p>
          {supportingParagraph ? (
            <p className="text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              {supportingParagraph}
            </p>
          ) : null}
        </div>

        {showActions ? (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 rounded-xl px-7 text-base font-semibold shadow-[0_18px_45px_-22px_hsl(var(--primary)/0.65)]"
              asChild
            >
              <Link href={primaryHref}>
                {primaryCtaText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-border/70 px-7 text-base font-semibold shadow-none"
              asChild
            >
              <Link href={secondaryHref}>{secondaryCtaText}</Link>
            </Button>
          </div>
        ) : null}

        {proof ? (
          <p className="mt-8 text-sm font-medium text-muted-foreground">{proof}</p>
        ) : null}
      </div>
    </SeoSection>
  );
}
