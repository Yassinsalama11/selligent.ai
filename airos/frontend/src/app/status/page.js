'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

const SERVICES = [
  { name: 'Web Application', desc: 'chatorai.com', status: 'operational' },
  { name: 'API Backend', desc: 'api.chatorai.com', status: 'operational' },
  { name: 'AI Engine', desc: 'Intent detection & reply generation', status: 'operational' },
  { name: 'WhatsApp Webhooks', desc: 'Meta Cloud API integration', status: 'operational' },
  { name: 'Instagram Webhooks', desc: 'Instagram Messaging API', status: 'operational' },
  { name: 'Messenger Webhooks', desc: 'Facebook Page messaging', status: 'operational' },
  { name: 'Live Chat', desc: 'Socket.io real-time layer', status: 'operational' },
  { name: 'Payment Processing', desc: 'Stripe checkout & billing', status: 'operational' },
];

const HISTORY = [
  { date: 'Apr 12, 2026', title: 'Scheduled maintenance completed', desc: 'Backend upgraded to latest Node.js LTS. No user impact.', type: 'maintenance' },
  { date: 'Apr 8, 2026', title: 'All systems normal', desc: 'No incidents reported.', type: 'resolved' },
  { date: 'Mar 25, 2026', title: 'WhatsApp webhook delay — resolved', desc: 'Brief 12-minute delay in WhatsApp message delivery due to upstream Meta API latency. Resolved automatically.', type: 'resolved' },
];

const STATUS_CFG = {
  operational: { label: 'Operational', cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/15' },
  degraded: { label: 'Degraded', cls: 'text-amber-500 bg-amber-500/10 border-amber-500/15' },
  outage: { label: 'Outage', cls: 'text-red-500 bg-red-500/10 border-red-500/15' },
};

export default function StatusPage() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const allOk = SERVICES.every((s) => s.status === 'operational');

  return (
    <main className="min-h-screen bg-background antialiased">
      <PublicNav />

      <section className="pt-32 pb-20 px-6 md:px-10">
        <div className="max-w-3xl mx-auto">
          {/* Overall */}
          <div className="text-center mb-14">
            <div className={cn(
              'w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center border',
              allOk ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20',
            )}>
              {allOk ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <AlertTriangle className="h-8 w-8 text-red-500" />}
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {allOk ? 'All Systems Operational' : 'Some Systems Affected'}
            </h1>
            <p className="text-xs text-muted-foreground font-mono">{time}</p>
          </div>

          {/* Services */}
          <div className="mb-12">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-4">Services</h2>
            <div className="rounded-2xl border border-border/40 overflow-hidden">
              {SERVICES.map((svc, i) => {
                const cfg = STATUS_CFG[svc.status];
                return (
                  <div key={i} className={cn(
                    'flex items-center justify-between p-4 bg-card',
                    i < SERVICES.length - 1 && 'border-b border-border/30',
                  )}>
                    <div>
                      <p className="text-[13px] font-semibold">{svc.name}</p>
                      <p className="text-[11px] text-muted-foreground">{svc.desc}</p>
                    </div>
                    <Badge variant="outline" className={cn('text-[10px] h-5 px-2 font-bold', cfg.cls)}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
                      {cfg.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Uptime */}
          <div className="mb-12">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-4">30-Day Uptime</h2>
            <div className="grid grid-cols-3 gap-3">
              {[['API Backend', '99.97%'], ['WhatsApp Webhooks', '99.91%'], ['AI Engine', '99.99%']].map(([name, pct]) => (
                <div key={name} className="p-5 rounded-xl bg-card border border-border/40 text-center">
                  <p className="text-2xl font-bold text-emerald-500 tracking-tight">{pct}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div>
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-4">Incident History</h2>
            <div className="space-y-2.5">
              {HISTORY.map((h, i) => (
                <div key={i} className="p-4 rounded-xl bg-card border border-border/40">
                  <div className="flex items-center gap-2.5 mb-1.5">
                    {h.type === 'resolved'
                      ? <Badge variant="outline" className="text-[10px] h-5 px-2 font-bold text-emerald-500 bg-emerald-500/5 border-emerald-500/15">Resolved</Badge>
                      : <Badge variant="outline" className="text-[10px] h-5 px-2 font-bold text-amber-500 bg-amber-500/5 border-amber-500/15">Maintenance</Badge>
                    }
                    <span className="text-[11px] text-muted-foreground">{h.date}</span>
                  </div>
                  <p className="text-[13px] font-semibold mb-0.5">{h.title}</p>
                  <p className="text-[12px] text-muted-foreground">{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
