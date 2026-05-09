'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Play, MessageSquare, Target, BarChart3, Package, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { API_BASE } from '@/lib/api';

const DEMO_FEATURES = [
  { icon: Zap, title: 'AI in action', desc: 'Watch ChatOrAI detect purchase intent and generate replies in real-time across multiple languages.' },
  { icon: Target, title: 'Live deal pipeline', desc: 'See leads automatically scored and progressed through conversion stages.' },
  { icon: MessageSquare, title: 'Unified inbox', desc: 'Messages from WhatsApp, Instagram, Messenger, and Live Chat in one place.' },
  { icon: Package, title: 'Product context', desc: 'AI replies with real prices, stock levels, and shipping info from your connected catalog.' },
  { icon: BarChart3, title: 'Revenue analytics', desc: 'Conversion funnels, agent performance dashboards, and AI accuracy reports.' },
];

export default function DemoPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', phone: '', size: 'small', comments: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/demo/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not submit demo request');
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not submit demo request');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-20 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-primary/[0.04] blur-[160px] rounded-full" />
          <div className="absolute bottom-[0%] right-[10%] w-[400px] h-[400px] bg-violet-500/[0.03] blur-[140px] rounded-full" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-14">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
              Live Demo
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
              See ChatOrAI in <span className="text-primary">action</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              Book a personalized 30-minute walkthrough with our team. We&apos;ll show you exactly how ChatOrAI can work for your business.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Left: Benefits */}
            <div className="md:col-span-2 space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 mb-4">What you&apos;ll see</h3>
              {DEMO_FEATURES.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex gap-3 items-start p-3.5 rounded-xl bg-card border border-border/40 hover:border-primary/15 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                    <f.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold">{f.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Right: Form */}
            <Card className="md:col-span-3 border-border/40 shadow-xl rounded-2xl">
              <CardContent className="p-7 md:p-9">
                {submitted ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 border border-emerald-500/20">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Request received!</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      We&apos;ll reach out within 24 hours to schedule your personalized demo.
                    </p>
                    <Link href="/">
                      <Button variant="outline" className="rounded-xl h-10 px-6 text-sm font-semibold">
                        Back to home
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <h3 className="text-lg font-bold mb-1">Book your demo</h3>
                    <p className="text-[13px] text-muted-foreground mb-6">No obligation &middot; Usually available within 2 business days</p>
                    {error ? (
                      <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
                        {error}
                      </div>
                    ) : null}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Full Name *</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="Your name"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Work Email *</label>
                          <input
                            type="email"
                            className="input"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Company Name *</label>
                          <input
                            type="text"
                            className="input"
                            placeholder="Your company"
                            value={form.company}
                            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Phone (WhatsApp)</label>
                          <input
                            type="tel"
                            className="input"
                            placeholder="+1 234 567 8900"
                            value={form.phone}
                            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Team Size</label>
                        <select
                          className="input cursor-pointer"
                          value={form.size}
                          onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                        >
                          <option value="small">1-5 agents</option>
                          <option value="medium">6-20 agents</option>
                          <option value="large">21-50 agents</option>
                          <option value="enterprise">50+ agents</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Comments / Questions</label>
                        <textarea
                          className="input"
                          rows={6}
                          style={{ resize: 'vertical', minHeight: 140 }}
                          placeholder="Tell us about your use case, goals, or anything you'd like us to prepare for..."
                          value={form.comments}
                          onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                        />
                      </div>
                      <Button type="submit" disabled={submitting} className="w-full h-11 rounded-xl text-sm font-bold bg-primary text-white border-none shadow-md shadow-primary/15 mt-2">
                        {submitting ? 'Submitting...' : 'Book my demo'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
