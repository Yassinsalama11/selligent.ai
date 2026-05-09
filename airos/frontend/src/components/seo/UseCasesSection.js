import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';

export const UseCasesSection = ({ title = 'Use Cases', description, useCases = [] }) => {
  if (!Array.isArray(useCases) || useCases.length === 0) return null;

  const normalizedUseCases = useCases
    .map((item) => (typeof item === 'string' ? { title: item, description: '' } : item))
    .filter(Boolean);

  return (
    <SeoSection tone="muted">
      <SeoSectionHeading title={title} description={description} />

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {normalizedUseCases.map((useCase, index) => (
          <Card
            key={`${useCase.title}-${index}`}
            className="border-border/60 bg-card/95 shadow-[0_18px_45px_-32px_rgba(0,0,0,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_22px_56px_-34px_hsl(var(--primary)/0.3)]"
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold leading-tight text-foreground">
                {useCase.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {useCase.description ? (
                <p className="text-base leading-7 text-muted-foreground">
                  {useCase.description}
                </p>
              ) : null}
            </CardContent>
          </Card>
          ))}
      </div>
    </SeoSection>
  );
};
