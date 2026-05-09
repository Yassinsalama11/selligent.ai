'use client';

import { Badge } from '@/components/ui/badge';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export default function PublicPageShell({ badge, title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />
      <section className="pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            {badge && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
                {badge}
              </Badge>
            )}
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="prose-sm text-[15px] text-muted-foreground leading-relaxed space-y-5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:text-primary [&_a:hover]:underline">
            {children}
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
