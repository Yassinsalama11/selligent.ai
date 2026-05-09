'use client';

import Link from 'next/link';
import { Lock, Server, Key, FileCheck, TestTube, Eye, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const PILLARS = [
  {
    icon: Lock, title: 'Encryption', color: 'text-primary',
    items: ['All data in transit encrypted with TLS 1.3', 'Data at rest encrypted with AES-256', 'JWT tokens signed with HS256 and rotated regularly', 'API keys stored encrypted, never logged'],
  },
  {
    icon: Server, title: 'Infrastructure', color: 'text-violet-500',
    items: ['Hosted on Railway with isolated containers', 'CDN and DDoS protection via Cloudflare', 'Automatic backups every 24 hours', 'Zero-downtime deployments'],
  },
  {
    icon: Key, title: 'Access Control', color: 'text-cyan-500',
    items: ['Role-based access control (RBAC) across all accounts', 'Each client\'s data is tenant-isolated', 'Admin access requires MFA', 'All access events are logged and auditable'],
  },
  {
    icon: FileCheck, title: 'Compliance', color: 'text-emerald-500',
    items: ['GDPR-aligned data handling practices', 'Data Processing Agreements available on request', 'Meta platform policies strictly followed', 'Regular internal security reviews'],
  },
  {
    icon: TestTube, title: 'Testing & Monitoring', color: 'text-amber-500',
    items: ['Continuous monitoring for anomalies and threats', 'Automated vulnerability scanning in CI/CD pipeline', 'Incident response plan with <2h SLA', 'Security patches applied within 24 hours of disclosure'],
  },
  {
    icon: Eye, title: 'Transparency', color: 'text-pink-500',
    items: ['Public status page at chatorai.com/status', 'Incident postmortems published within 48 hours', 'Security changelog maintained', 'Responsible disclosure program active'],
  },
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-12 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/[0.04] blur-[160px] rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
            Security
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">Security at ChatOrAI</h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            We take the security of your business data and your customers&apos; conversations seriously. Here&apos;s how we protect everything entrusted to us.
          </p>
        </div>
      </section>

      <section className="py-12 px-6 md:px-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {PILLARS.map((p, i) => (
            <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 hover:border-primary/15 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <p.icon className={cn('h-5 w-5', p.color)} />
                </div>
                <h3 className="text-base font-bold">{p.title}</h3>
              </div>
              <ul className="space-y-2.5">
                {p.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5 text-[13px] text-muted-foreground">
                    <CheckCircle2 className={cn('h-3.5 w-3.5 shrink-0 mt-0.5', p.color)} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          <div className="p-7 rounded-2xl bg-primary/5 border border-primary/15">
            <h2 className="text-lg font-bold mb-3">Responsible Disclosure</h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              Found a security vulnerability? We appreciate responsible disclosure. Please email us at <strong className="text-primary">security@chatorai.com</strong> with a description of the issue.
            </p>
            <p className="text-[12px] text-muted-foreground/60">
              We commit to: acknowledging your report within 24 hours &middot; providing a timeline for a fix within 72 hours &middot; not pursuing legal action against good-faith researchers.
            </p>
          </div>

          <p className="text-[13px] text-muted-foreground mt-6">
            For security concerns or questions, contact us at <strong>security@chatorai.com</strong>. For general privacy questions, see our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
