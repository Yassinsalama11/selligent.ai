import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getRelatedPages } from '@/lib/internal-links';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';

export const RelatedPages = ({ currentPath }) => {
  const pages = getRelatedPages(currentPath);

  if (!pages.length) return null;

  return (
    <SeoSection tone="subtle">
      <SeoSectionHeading
        title="Explore More"
        description="Follow the next best pages in the ChatorAI ecosystem based on the workflow or buying question you are already researching."
        align="left"
      />
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="group rounded-[1.5rem] border border-border/60 bg-card/95 p-6 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_24px_64px_-36px_hsl(var(--primary)/0.34)]"
          >
            <h3 className="text-lg font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
              {page.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-2">
              {page.description}
            </p>
            <div className="mt-5 flex items-center text-sm font-semibold text-primary">
              {page.title}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </SeoSection>
  );
};
