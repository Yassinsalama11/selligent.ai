import React from 'react';
import { ShieldCheck, Lock, ShieldAlert, Globe } from 'lucide-react';
import { SeoSection, SeoSectionHeading } from '@/components/seo/SeoPageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const TrustSignals = () => {
  const signals = [
    {
      title: 'Enterprise security foundations',
      description: 'Role-based access, audit trails, and provider-managed credentials support safer day-to-day operations.',
      icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    },
    {
      title: 'Privacy-ready workflows',
      description: 'Consent handling, opt-out paths, and workspace-level controls help teams operate responsibly across channels.',
      icon: <Lock className="h-6 w-6 text-primary" />,
    },
    {
      title: 'Encrypted data handling',
      description: 'Platform traffic and stored business data are handled with modern encrypted transport and storage patterns.',
      icon: <ShieldAlert className="h-6 w-6 text-primary" />,
    },
    {
      title: 'Operational visibility',
      description: 'Status checks, logs, and internal monitoring help teams investigate issues before they affect live workflows.',
      icon: <Globe className="h-6 w-6 text-primary" />,
    },
  ];

  return (
    <SeoSection>
      <SeoSectionHeading
        title="Built for responsible rollout"
        description="Operational controls and visibility designed for teams moving from trial to production."
      />

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal, index) => (
            <Card key={index} className="border-border/60 bg-card/95 shadow-[0_18px_46px_-34px_rgba(0,0,0,0.45)]">
              <CardHeader className="pb-3">
                <div className="mb-1">{signal.icon}</div>
                <CardTitle className="text-lg font-bold text-foreground">{signal.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                {signal.description}
                </p>
              </CardContent>
            </Card>
          ))}
      </div>
    </SeoSection>
  );
};
