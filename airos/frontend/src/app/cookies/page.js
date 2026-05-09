'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import PublicPageShell from '@/components/PublicPageShell';

const COOKIE_TYPES = [
  {
    name: 'Essential', required: true, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15',
    desc: 'Required for the platform to function. Cannot be disabled.',
    examples: ['Session token (airos_token)', 'User preferences', 'CSRF protection'],
  },
  {
    name: 'Functional', required: false, color: 'text-primary bg-primary/10 border-primary/15',
    desc: 'Remember your settings and personalize your experience.',
    examples: ['Sidebar collapsed state', 'Dashboard time range', 'Theme preferences'],
  },
  {
    name: 'Analytics', required: false, color: 'text-amber-500 bg-amber-500/10 border-amber-500/15',
    desc: 'Help us understand how the platform is used to improve it.',
    examples: ['Page views', 'Feature usage', 'Session duration'],
  },
  {
    name: 'Marketing', required: false, color: 'text-pink-500 bg-pink-500/10 border-pink-500/15',
    desc: 'Used to show relevant ads and measure campaign effectiveness.',
    examples: ['Ad conversion tracking', 'Retargeting pixels'],
  },
];

export default function CookiesPage() {
  return (
    <PublicPageShell badge="Legal" title="Cookie Policy" subtitle={`Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>
      <p>This Cookie Policy explains how ChatOrAI uses cookies and similar tracking technologies on our website and platform. By using ChatOrAI, you consent to the use of cookies as described in this policy.</p>

      <h2>What Are Cookies?</h2>
      <p>Cookies are small text files placed on your device when you visit a website. They help websites remember your preferences, keep you logged in, and collect analytics data. We also use localStorage (similar technology) to store session and preference data in your browser.</p>

      <h2>Types of Cookies We Use</h2>
      <div className="space-y-3 not-prose">
        {COOKIE_TYPES.map((ct, i) => (
          <div key={i} className="p-5 rounded-xl bg-card border border-border/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">{ct.name} Cookies</h3>
              <Badge variant="outline" className={cn('text-[10px] h-5 px-2 font-bold', ct.color)}>
                {ct.required ? 'Always Active' : 'Optional'}
              </Badge>
            </div>
            <p className="text-[13px] text-muted-foreground mb-3">{ct.desc}</p>
            <div className="flex gap-2 flex-wrap">
              {ct.examples.map((ex) => (
                <Badge key={ex} variant="secondary" className="text-[11px] h-5.5 px-2 font-medium">{ex}</Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2>Third-Party Cookies</h2>
      <p>Some features on our platform involve third-party services that may set their own cookies:</p>
      <ul>
        <li>Stripe — for secure payment processing</li>
        <li>Cloudflare — for CDN, security, and performance</li>
        <li>Meta (Facebook/Instagram) — when using social channel integrations</li>
      </ul>

      <h2>How to Control Cookies</h2>
      <p>You can control cookies through your browser settings. Most browsers allow you to refuse cookies or delete existing ones. Note that disabling essential cookies will prevent you from using the platform.</p>
      <ul>
        <li>Chrome: Settings &rarr; Privacy and Security &rarr; Cookies</li>
        <li>Firefox: Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data</li>
        <li>Safari: Preferences &rarr; Privacy &rarr; Manage Website Data</li>
        <li>Edge: Settings &rarr; Cookies and Site Permissions</li>
      </ul>

      <h2>Contact</h2>
      <p>For questions about our use of cookies, email us at <strong>privacy@chatorai.com</strong>. See also our <Link href="/privacy">Privacy Policy</Link>.</p>
    </PublicPageShell>
  );
}
