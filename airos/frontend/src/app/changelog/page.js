'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const RELEASES = [
  {
    version: 'v1.3.0', date: 'April 12, 2026', type: 'major',
    changes: [
      { tag: 'new', text: 'AI Brand Scan — auto-configure account from website URL during onboarding' },
      { tag: 'new', text: '7-day free trial — start immediately, no credit card required' },
      { tag: 'new', text: 'Trial expiry overlay with one-click upgrade flow' },
      { tag: 'new', text: 'User profile card in sidebar with company name' },
      { tag: 'improved', text: 'Signup flow redesigned to 5 steps: Account -> Presence -> AI Scan -> Review -> Plan' },
      { tag: 'improved', text: 'Dashboard title now shows company name from registration' },
      { tag: 'improved', text: 'Settings profile pre-filled from JWT data' },
      { tag: 'fixed', text: 'Pricing page buttons now route through trial signup instead of direct Stripe' },
    ],
  },
  {
    version: 'v1.2.0', date: 'March 28, 2026', type: 'major',
    changes: [
      { tag: 'new', text: 'Stripe payment integration — EUR subscriptions for Starter, Pro, Enterprise plans' },
      { tag: 'new', text: 'OpenAI GPT-4o-mini brand scan API (/api/scan/brand)' },
      { tag: 'new', text: 'Admin team management — add, edit, suspend ChatOrAI team members' },
      { tag: 'new', text: 'Admin login page with role-based access (Super Admin, Admin, Support, Developer)' },
      { tag: 'improved', text: 'CORS updated to allow all Cloudflare Pages deployments' },
      { tag: 'fixed', text: 'Admin client modals not opening (missing open prop)' },
    ],
  },
  {
    version: 'v1.1.0', date: 'March 10, 2026', type: 'minor',
    changes: [
      { tag: 'new', text: 'Live Chat channel integration with Socket.io' },
      { tag: 'new', text: 'Broadcast messaging — send bulk messages to contact segments' },
      { tag: 'new', text: 'Deal pipeline Kanban board with 5 stages' },
      { tag: 'new', text: 'Support ticket system with priority and SLA tracking' },
      { tag: 'improved', text: 'Conversations page — AI suggestion panel with canned replies' },
      { tag: 'improved', text: 'Revenue reports — conversion funnel and AI performance metrics' },
    ],
  },
  {
    version: 'v1.0.0', date: 'February 20, 2026', type: 'major',
    changes: [
      { tag: 'new', text: 'Initial release — unified inbox for WhatsApp, Instagram, Messenger' },
      { tag: 'new', text: 'AI intent detection (ready_to_buy, interested, price_objection, inquiry)' },
      { tag: 'new', text: 'Lead scoring engine 0-100' },
      { tag: 'new', text: 'Contact CRM with tags, filters, and bulk operations' },
      { tag: 'new', text: 'Product catalog management' },
      { tag: 'new', text: 'Admin platform dashboard' },
      { tag: 'new', text: 'Cloudflare Pages frontend + Railway backend deployment' },
    ],
  },
];

const TAG_STYLES = {
  new: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/15',
  improved: 'text-primary bg-primary/5 border-primary/15',
  fixed: 'text-amber-500 bg-amber-500/5 border-amber-500/15',
  deprecated: 'text-red-500 bg-red-500/5 border-red-500/15',
};

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
              Changelog
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">What&apos;s New</h1>
            <p className="text-base text-muted-foreground">Every release, every fix, every improvement — documented.</p>
          </div>

          <div className="space-y-0">
            {RELEASES.map((rel, i) => (
              <div key={i} className="flex gap-0">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center mr-6 shrink-0">
                  <div className={cn(
                    'w-3 h-3 rounded-full mt-1.5 shrink-0 ring-4',
                    rel.type === 'major'
                      ? 'bg-primary ring-primary/10'
                      : 'bg-violet-500 ring-violet-500/10',
                  )} />
                  {i < RELEASES.length - 1 && <div className="w-px flex-1 bg-border/40 mt-2 min-h-[40px]" />}
                </div>

                {/* Content */}
                <div className="pb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg font-bold tracking-tight">{rel.version}</span>
                    <Badge variant="outline" className={cn(
                      'text-[9px] h-5px-2 font-bold uppercase tracking-wider',
                      rel.type === 'major'
                        ? 'text-primary bg-primary/5 border-primary/15'
                        : 'text-violet-500 bg-violet-500/5 border-violet-500/15',
                    )}>
                      {rel.type}
                    </Badge>
                    <span className="text-[12px] text-muted-foreground">{rel.date}</span>
                  </div>
                  <div className="space-y-2">
                    {rel.changes.map((ch, j) => (
                      <div key={j} className="flex gap-2.5 items-start">
                        <Badge variant="outline" className={cn('text-[9px] h-5px-1.5 font-bold uppercase tracking-wider shrink-0 mt-0.5', TAG_STYLES[ch.tag])}>
                          {ch.tag}
                        </Badge>
                        <span className="text-[13px] text-muted-foreground leading-relaxed">{ch.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
