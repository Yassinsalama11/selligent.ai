'use client';

import Link from 'next/link';
import Logo from '@/components/Logo';
import { Separator } from '@/components/ui/separator';

const SEO_COLUMNS = [
  {
    title: 'Features',
    links: [
      { label: 'Omnichannel Inbox', href: '/features/omnichannel-ai-inbox' },
      { label: 'AI Support', href: '/features/ai-customer-support-platform' },
      { label: 'AI Sales Agent', href: '/features/ai-sales-agent-platform' },
      { label: 'WhatsApp AI', href: '/features/whatsapp-ai-automation' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'E-commerce', href: '/solutions/ecommerce' },
      { label: 'SaaS', href: '/solutions/saas' },
      { label: 'Real Estate', href: '/solutions/real-estate' },
      { label: 'Marketing Agencies', href: '/solutions/agencies' },
    ],
  },
  {
    title: 'Alternatives',
    links: [
      { label: 'Intercom', href: '/alternatives/intercom' },
      { label: 'Zendesk', href: '/alternatives/zendesk' },
      { label: 'Freshchat', href: '/alternatives/freshchat' },
      { label: 'HubSpot', href: '/alternatives/hubspot' },
    ],
  },
  {
    title: 'Ecosystem',
    links: [
      { label: 'Shopify', href: '/integrations/shopify' },
      { label: 'WhatsApp API', href: '/integrations/whatsapp-business-api' },
      { label: 'HubSpot Sync', href: '/integrations/hubspot' },
      { label: 'Salesforce Sync', href: '/integrations/salesforce' },
    ],
  },
];

const FOOTER_COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Book Demo', href: '/demo' },
      { label: 'Documentation', href: '/docs/quickstart' },
      { label: 'Status', href: '/status' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Blog', href: '/blog' },
      { label: 'Careers', href: '/careers' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Security', href: '/security' },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="bg-muted/30 border-t border-border/50">
      <div className="border-b border-border/40 bg-[radial-gradient(circle_at_top_left,rgba(255,90,31,0.10),transparent_32%),linear-gradient(to_bottom,rgba(255,90,31,0.05),transparent_55%)]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-14 md:py-16">
          <div className="max-w-2xl mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary mb-3">
              Explore ChatorAI
            </p>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
              Find the right feature, solution, or integration path
            </h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Browse the core product surface, vertical playbooks, and ecosystem pages without losing the main branded footer structure.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {SEO_COLUMNS.map((col) => (
              <div key={col.title} className="rounded-2xl border border-border/50 bg-background/90 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_16px_32px_-20px_rgba(255,90,31,0.45)]">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/55 mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-[13px] font-medium text-muted-foreground hover:text-primary transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-12 mb-14">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Logo size="lg" />
              <div className="h-8 w-px bg-border/50" />
              <div className="dark:bg-white dark:rounded-xl dark:px-2.5 dark:py-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/meta-business-partner.png"
                  alt="Meta Business Partner"
                  style={{ height: 32, width: 'auto', display: 'block' }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              ChatorAI is the AI-powered revenue operating system for teams that need one workspace for support, sales, and live customer communication.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground/70">
              <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-foreground/75">WhatsApp</span>
              <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-foreground/75">Instagram</span>
              <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-foreground/75">Messenger</span>
              <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-foreground/75">Web Chat</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="space-y-4">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-foreground/50">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <Separator className="opacity-30 mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            &copy; {new Date().getFullYear()} ChatorAI. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/contact" className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors">Contact</Link>
            <Link href="/privacy" className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
