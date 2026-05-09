'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Globe, Zap, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

export default function AboutPage() {
  const values = [
    { icon: Globe, title: 'Global first', desc: 'We build for businesses everywhere — supporting 50+ languages, local commerce patterns, and regional platform integrations.' },
    { icon: Brain, title: 'AI with context', desc: 'Our AI understands conversation history, product catalogs, and brand voice — not just keywords.' },
    { icon: Zap, title: 'Speed above all', desc: 'Every second of delay costs deals. We obsess over response time at every layer of the stack.' },
  ];

  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/[0.04] blur-[160px] rounded-full" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
            About Us
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[0.95]">
            Built to help businesses <span className="text-primary">sell more</span> through conversations
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            ChatOrAI was born from a simple frustration: businesses were losing sales every day because they couldn&apos;t keep up with the volume of messages from customers across WhatsApp, Instagram, and other channels.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-6 md:px-10">
        <div className="max-w-3xl mx-auto space-y-8 text-[15px] text-muted-foreground leading-relaxed">
          <blockquote className="border-l-2 border-primary pl-6 py-2">
            <p className="text-lg text-foreground italic leading-relaxed">
              &ldquo;Every morning, store owners woke up to hundreds of unanswered messages. Deals were dying in their inboxes. We knew AI could fix this — if it actually understood how people buy.&rdquo;
            </p>
            <p className="text-sm text-muted-foreground mt-3">— Yassin, Founder</p>
          </blockquote>

          <p>
            We started by interviewing hundreds of eCommerce founders across the world. The problem was universal: customers message on WhatsApp at 2am asking about prices, stock, and shipping. By morning, the lead is cold. The sale is gone.
          </p>
          <p>
            Existing tools weren&apos;t built for conversational commerce at scale. They didn&apos;t understand multilingual conversations, didn&apos;t know how to handle price negotiations, and had no concept of the real buying journey that happens over messaging.
          </p>
          <p>
            So we built ChatOrAI — an AI that understands the intent behind every message, supports 50+ languages natively, and helps sales teams close deals in real-time across WhatsApp, Instagram, Messenger, and Live Chat from one unified workspace.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 md:px-10 bg-muted/5 border-y border-border/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {values.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-card border border-border/40 hover:border-primary/15 transition-colors"
              >
                <v.icon className="h-6 w-6 text-primary mb-4" />
                <h3 className="text-base font-bold mb-2">{v.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 md:px-10">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Join us on the mission</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;re a focused team building the future of conversational commerce. If you&apos;re passionate about AI and helping businesses grow, we&apos;d love to hear from you.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/careers">
              <Button className="h-10 px-6 rounded-xl text-sm font-bold bg-primary text-white border-none shadow-md shadow-primary/15">
                View Open Roles
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" className="h-10 px-6 rounded-xl text-sm font-semibold">
                Get in Touch
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
