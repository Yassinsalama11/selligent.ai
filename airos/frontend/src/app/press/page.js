'use client';

import Link from 'next/link';
import { CheckCircle2, Copy, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Logo from '@/components/Logo';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const BOILERPLATE = 'ChatOrAI is an AI Revenue Operating System for businesses worldwide. The platform unifies WhatsApp, Instagram, Messenger, and Live Chat into a single inbox, using AI to detect customer intent, score leads in real-time, and generate replies in 50+ languages.';

const FACTS = [
  'AI Revenue Operating System for eCommerce',
  'Unified inbox: WhatsApp, Instagram, Messenger, Live Chat',
  'AI intent detection, lead scoring 0-100, reply generation',
  'Multilingual AI supporting 50+ languages',
  'Plans from $49/month, 7-day free trial',
  'Shopify, WooCommerce, Salla, and WordPress integration',
];

export default function PressPage() {
  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
              Press & Media
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Press Kit</h1>
            <p className="text-base text-muted-foreground">
              Resources for journalists, analysts, and media partners covering ChatOrAI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Boilerplate */}
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h2 className="text-sm font-bold mb-3">Company Boilerplate</h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{BOILERPLATE}</p>
              <Button
                variant="outline"
                onClick={() => navigator.clipboard?.writeText(BOILERPLATE)}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold"
              >
                <Copy className="h-3 w-3 mr-1.5" /> Copy
              </Button>
            </div>

            {/* Key facts */}
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h2 className="text-sm font-bold mb-3">Key Facts</h2>
              <ul className="space-y-2.5">
                {FACTS.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[13px] text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Logo */}
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h2 className="text-sm font-bold mb-3">Logo & Brand Assets</h2>
              <div className="space-y-3">
                <div className="p-6 rounded-xl bg-white flex items-center justify-center">
                  <Logo size="xl" />
                </div>
                <div className="p-6 rounded-xl bg-[#08080f] border border-white/5 flex items-center justify-center">
                  <Logo size="xl" />
                </div>
                <p className="text-[11px] text-muted-foreground/60">Logo files available on request. Contact press@chatorai.com.</p>
              </div>
            </div>

            {/* Contact */}
            <div className="p-6 rounded-2xl bg-card border border-border/40">
              <h2 className="text-sm font-bold mb-4">Media Contact</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Press Inquiries</p>
                  <a href="mailto:press@chatorai.com" className="text-[13px] text-primary font-semibold hover:underline">press@chatorai.com</a>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Partnerships</p>
                  <a href="mailto:partnerships@chatorai.com" className="text-[13px] text-primary font-semibold hover:underline">partnerships@chatorai.com</a>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Response Time</p>
                  <p className="text-[13px] text-muted-foreground">Within 24 hours on business days</p>
                </div>
                <Link href="/contact">
                  <Button className="h-9 px-5 rounded-xl text-[13px] font-bold bg-primary text-white border-none shadow-sm mt-1">
                    Send a message <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
