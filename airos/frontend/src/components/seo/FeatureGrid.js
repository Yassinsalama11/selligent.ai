import React from 'react';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';

export function FeatureGrid({ title, description, features = [] }) {
  if (!Array.isArray(features) || !features.length) return null;

  return (
    <SeoSection>
      <SeoSectionHeading title={title} description={description} />

      <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature, index) => (
          <Card
            key={feature.title || index}
            className="group border-border/60 bg-card/95 shadow-[0_22px_55px_-40px_rgba(0,0,0,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_28px_70px_-38px_hsl(var(--primary)/0.35)]"
          >
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {feature.icon || <Check className="h-5 w-5" />}
              </div>
              <CardTitle className="text-xl font-bold leading-tight text-foreground">
                {feature.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-7 text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SeoSection>
  );
}
