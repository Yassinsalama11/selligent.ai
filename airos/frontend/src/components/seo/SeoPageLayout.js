import React from 'react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { BreadcrumbSchema } from '@/components/seo/BreadcrumbSchema';
import { StructuredData } from '@/components/seo/StructuredData';
import { cn } from '@/lib/utils';

export const SEO_PAGE_CONTAINER = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';
export const SEO_PAGE_NARROW = 'mx-auto w-full max-w-3xl';
export const SEO_PAGE_READING = 'mx-auto w-full max-w-4xl';
export const SEO_SECTION_SPACE = 'py-20 sm:py-24 lg:py-28';

export function SeoPageLayout({
  breadcrumbs,
  pagePath = '/',
  structuredData,
  structuredDataId,
  children,
  sidebar,
  mobileSidebar,
  contentClassName,
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {Array.isArray(breadcrumbs) && breadcrumbs.length > 0 ? (
        <BreadcrumbSchema items={breadcrumbs} pagePath={pagePath} />
      ) : null}
      {structuredData ? (
        <StructuredData id={structuredDataId || `seo-layout-${pagePath}`} data={structuredData} />
      ) : null}
      <PublicNav />

      {sidebar ? (
        <div className={cn(SEO_PAGE_CONTAINER, 'pt-24 pb-20 sm:pt-28 lg:pt-32')}>
          {mobileSidebar ? <div className="mb-8 lg:hidden">{mobileSidebar}</div> : null}
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
            <aside className="hidden w-full max-w-[17rem] shrink-0 lg:block">{sidebar}</aside>
            <main className={cn('min-w-0 flex-1', contentClassName)}>{children}</main>
          </div>
        </div>
      ) : (
        children
      )}

      <PublicFooter />
    </div>
  );
}

export function SeoSection({
  children,
  className,
  containerClassName,
  tone = 'default',
  id,
}) {
  const toneClasses = {
    default: 'bg-background',
    muted: 'bg-muted/30',
    subtle: 'bg-background',
    accent: 'bg-primary/[0.035]',
  };

  return (
    <section id={id} className={cn(SEO_SECTION_SPACE, toneClasses[tone] || toneClasses.default, className)}>
      <div className={cn(SEO_PAGE_CONTAINER, containerClassName)}>{children}</div>
    </section>
  );
}

export function SeoSectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}) {
  const alignment = align === 'left' ? 'text-left' : 'text-center';
  const maxWidth = align === 'left' ? 'max-w-3xl' : 'max-w-3xl mx-auto';

  return (
    <div className={cn(maxWidth, alignment, className)}>
      {eyebrow ? (
        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {description}
        </p>
      ) : null}
    </div>
  );
}
