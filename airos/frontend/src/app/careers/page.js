'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, DollarSign, Zap, Brain, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const ROLES = [
  {
    title: 'Senior Full-Stack Engineer',
    team: 'Engineering', location: 'Remote (Global)', type: 'Full-time',
    desc: 'Own end-to-end features across our Next.js frontend and Node.js backend. You\'ll work on AI pipelines, real-time WebSocket systems, and Meta API integrations.',
    skills: ['Node.js', 'React / Next.js', 'PostgreSQL', 'Redis', 'WebSockets'],
  },
  {
    title: 'AI / ML Engineer',
    team: 'AI', location: 'Remote (Global)', type: 'Full-time',
    desc: 'Improve our intent detection models, lead scoring engine, and multilingual NLP pipeline. Work with GPT-4o, fine-tuning, and production inference at scale.',
    skills: ['Python', 'PyTorch', 'Multilingual NLP', 'OpenAI API', 'LangChain'],
  },
  {
    title: 'Customer Success Manager',
    team: 'Growth', location: 'Remote', type: 'Full-time',
    desc: 'Onboard new clients, drive activation and retention, and serve as the voice of the customer internally.',
    skills: ['Multilingual', 'eCommerce knowledge', 'CRM tools', 'Strong communication'],
  },
  {
    title: 'Sales Development Rep (SDR)',
    team: 'Sales', location: 'Remote', type: 'Full-time',
    desc: 'Identify and qualify leads across global eCommerce markets. Run outbound sequences, qualify opportunities, and book demos.',
    skills: ['English + additional languages', 'eCommerce ecosystem', 'CRM / outbound tools', 'Target-driven'],
  },
];

const PERKS = [
  { icon: Globe, title: 'Fully remote', desc: 'Work from anywhere. Async-first culture.' },
  { icon: DollarSign, title: 'Competitive pay', desc: 'Top-of-market salaries + equity.' },
  { icon: Zap, title: 'Move fast', desc: 'Ship to production daily. No red tape.' },
  { icon: Brain, title: 'Learn deeply', desc: 'AI, Meta APIs, eCommerce — a rich domain.' },
];

export default function CareersPage() {
  const [open, setOpen] = useState(null);

  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-12 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[30%] w-[500px] h-[500px] bg-primary/[0.04] blur-[160px] rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
            Careers
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-[0.95]">
            Build the future of <span className="text-primary">conversational commerce</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-lg mx-auto">
            We&apos;re a small team building software used daily by thousands of businesses worldwide. Every hire has a massive impact.
          </p>
        </div>
      </section>

      {/* Perks */}
      <section className="py-12 px-6 md:px-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {PERKS.map((p, i) => (
            <div key={i} className="p-5 rounded-2xl bg-card border border-border/40 text-center hover:border-primary/15 transition-colors">
              <p.icon className="h-6 w-6 text-primary mx-auto mb-3" />
              <h3 className="text-sm font-bold mb-1">{p.title}</h3>
              <p className="text-[12px] text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="py-12 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight mb-6">Open Roles</h2>
          <div className="space-y-3">
            {ROLES.map((role, i) => (
              <div key={i} className={cn(
                'rounded-2xl border transition-all overflow-hidden',
                open === i ? 'border-primary/30 bg-primary/[0.02]' : 'border-border/40 bg-card',
              )}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full p-5 flex items-center justify-between gap-4 text-left"
                >
                  <div>
                    <p className="text-sm font-bold mb-2">{role.title}</p>
                    <div className="flex gap-2 flex-wrap">
                      {[role.team, role.location, role.type].map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] h-5 px-2 bg-primary/5 text-primary border-primary/15 font-semibold">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', open === i && 'rotate-180')} />
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="px-5 pb-5 space-y-4">
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{role.desc}</p>
                        <div className="flex gap-2 flex-wrap">
                          {role.skills.map((s) => (
                            <Badge key={s} variant="secondary" className="text-[11px] h-6 px-2.5 font-medium">
                              {s}
                            </Badge>
                          ))}
                        </div>
                        <a href={`mailto:careers@chatorai.com?subject=Application: ${role.title}`}>
                          <Button className="h-9 px-5 rounded-xl text-[13px] font-bold bg-primary text-white border-none shadow-sm">
                            Apply <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                          </Button>
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-muted/30 border border-border/40 text-center">
            <p className="text-sm text-muted-foreground mb-2">Don&apos;t see your role? We hire exceptional people regardless.</p>
            <a href="mailto:careers@chatorai.com" className="text-sm text-primary font-semibold hover:underline">
              Send your CV &rarr; careers@chatorai.com
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
