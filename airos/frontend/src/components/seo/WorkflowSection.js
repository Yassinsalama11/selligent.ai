import React from 'react';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';

export const WorkflowSection = ({ title, description, steps }) => {
  if (!Array.isArray(steps) || !steps.length) return null;

  return (
    <SeoSection>
      <SeoSectionHeading title={title} description={description} />
      <div className={`mt-14 grid gap-6 ${steps.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
        {steps.map((step, index) => (
          <div
            key={`${step.title}-${index}`}
            className="relative rounded-[1.75rem] border border-border/60 bg-card/95 p-7 shadow-[0_20px_50px_-36px_rgba(0,0,0,0.48)]"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-base font-bold shadow-[0_14px_34px_-16px_hsl(var(--primary)/0.6)]">
              {index + 1}
            </div>
            <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              {step.description}
            </p>
          </div>
          ))}
      </div>
    </SeoSection>
  );
};
