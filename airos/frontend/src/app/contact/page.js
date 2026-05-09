'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Send, Mail, Wrench, Briefcase, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const CHANNELS = [
  { icon: Mail, label: 'General', value: 'hello@chatorai.com', desc: 'General inquiries and partnerships' },
  { icon: Wrench, label: 'Support', value: 'support@chatorai.com', desc: 'Platform issues and technical help' },
  { icon: Briefcase, label: 'Sales', value: 'sales@chatorai.com', desc: 'Pricing, plans, and enterprise' },
  { icon: Lock, label: 'Security', value: 'security@chatorai.com', desc: 'Vulnerabilities and security reports' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', subject: 'General inquiry', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); }, 1200);
  }

  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/15 font-bold text-[10px] uppercase tracking-widest px-3 h-6 mb-6">
              Contact
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Get in touch</h1>
            <p className="text-sm text-muted-foreground">We typically reply within a few hours during business days.</p>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            {/* Left: channels */}
            <div className="md:col-span-2 space-y-3">
              {CHANNELS.map((ch, i) => (
                <div key={i} className="flex gap-3 p-4 rounded-xl bg-card border border-border/40 hover:border-primary/15 transition-colors">
                  <ch.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">{ch.label}</p>
                    <p className="text-[13px] font-semibold text-primary">{ch.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ch.desc}</p>
                  </div>
                </div>
              ))}

              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">All systems operational</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Check our <Link href="/status" className="text-primary hover:underline">Status page</Link> for real-time uptime.
                </p>
              </div>
            </div>

            {/* Right: form */}
            <Card className="md:col-span-3 border-border/40 shadow-lg rounded-2xl">
              <CardContent className="p-7">
                {sent ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                      <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">Message sent!</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      We&apos;ll get back to you at <strong>{form.email}</strong> shortly.
                    </p>
                    <Button variant="outline" onClick={() => { setSent(false); setForm({ name: '', email: '', company: '', subject: 'General inquiry', message: '' }); }} className="rounded-xl h-9 px-5 text-[13px]">
                      Send another
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-base font-bold mb-4">Send us a message</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Name *</label>
                        <input className="input" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Email *</label>
                        <input className="input" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Company</label>
                      <input className="input" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Your company" />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Subject</label>
                      <select className="input cursor-pointer" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}>
                        {['General inquiry', 'Sales & pricing', 'Technical support', 'Partnership', 'Press & media', 'Security report'].map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5">Message *</label>
                      <textarea className="input resize-y" rows={4} required value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder="Tell us how we can help..." />
                    </div>
                    <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl text-sm font-bold bg-primary text-white border-none shadow-md shadow-primary/15">
                      {loading ? 'Sending...' : <><Send className="h-3.5 w-3.5 mr-2" /> Send Message</>}
                    </Button>
                  </form>
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
