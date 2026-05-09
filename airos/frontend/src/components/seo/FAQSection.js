import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { StructuredData } from '@/components/seo/StructuredData';
import { buildFaqNode } from '@/lib/site-schema';
import { SeoSection, SeoSectionHeading, SEO_PAGE_READING } from '@/components/seo/SeoPageLayout';

export function FAQSection({
  faqs = [],
  pagePath = '/',
  title = 'Frequently Asked Questions',
  description,
}) {
  if (!Array.isArray(faqs) || !faqs.length) return null;

  return (
    <SeoSection tone="muted" containerClassName={SEO_PAGE_READING}>
      <SeoSectionHeading title={title} description={description} />

      <Accordion type="single" collapsible className="mt-12 space-y-4">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={`${faq.question}-${index}`}
            value={`faq-${index}`}
            className="rounded-2xl border border-border/60 bg-card px-5 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.45)]"
          >
            <AccordionTrigger className="py-5 text-left text-base font-semibold text-foreground hover:no-underline sm:text-lg">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground sm:text-base">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <StructuredData
        id={`faq-json-ld-${pagePath.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'home'}`}
        data={buildFaqNode(faqs, pagePath)}
      />
    </SeoSection>
  );
}
