'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Check, Minus, ArrowRight, Zap, Users, Globe, MessageSquare,
  BarChart3, ShieldCheck, Sparkles,
} from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';

/* ─── Types ─────────────────────────────────────────────────────────────────── */

const PLAN_KEYS = ['starter', 'growth', 'pro', 'enterprise'];

const PLAN_META = {
  starter:    { color: 'text-slate-500',   ring: 'ring-slate-200 dark:ring-slate-700' },
  growth:     { color: 'text-blue-500',    ring: 'ring-blue-200 dark:ring-blue-800' },
  pro:        { color: 'text-primary',     ring: 'ring-primary/40', popular: true },
  enterprise: { color: 'text-amber-500',   ring: 'ring-amber-200 dark:ring-amber-800' },
};

const FALLBACK_PLANS = [
  { key: 'starter',    name: 'Starter',    priceEur: 19, includedSeats: 1, metadata: {} },
  { key: 'growth',     name: 'Growth',     priceEur: 29, includedSeats: 3, metadata: {} },
  { key: 'pro',        name: 'Pro',        priceEur: 49, includedSeats: 5, metadata: {} },
  { key: 'enterprise', name: 'Enterprise', priceEur: 89, includedSeats: 15, metadata: {} },
];

const FEATURE_MATRIX = [
  {
    category: 'Channels',
    icon: MessageSquare,
    rows: [
      { label: 'Live Chat',  key: 'livechat' },
      { label: 'Instagram',  key: 'instagram' },
      { label: 'Messenger',  key: 'messenger' },
      { label: 'WhatsApp',   key: 'whatsapp' },
    ],
  },
  {
    category: 'AI Features',
    icon: Zap,
    rows: [
      { label: 'AI Auto-Replies',       key: 'aiAutoReplies' },
      { label: 'AI Scoring + Routing',  key: 'aiScoringRouting' },
      { label: 'AI Triggers',           key: 'aiTriggers' },
      { label: 'AI Reply Suggestions',  key: 'aiSuggestions' },
    ],
  },
  {
    category: 'Workspace',
    icon: BarChart3,
    rows: [
      { label: 'Deal Pipeline',  key: 'dealPipeline' },
      { label: 'Service Desk',   key: 'serviceDesk' },
      { label: 'Catalog Sync',   key: 'catalogSync' },
      { label: 'Exports',        key: 'exports' },
      { label: 'Extra Agents',   key: 'extraAgents' },
    ],
  },
  {
    category: 'Advanced',
    icon: ShieldCheck,
    rows: [
      { label: 'Custom AI',        key: 'customAi' },
      { label: 'SSO',              key: 'sso' },
      { label: 'Priority Support', key: 'prioritySupport' },
    ],
  },
];

const DEFAULT_FLAGS = {
  starter: {
    livechat: true, instagram: true, messenger: false, whatsapp: false,
    aiAutoReplies: true, aiScoringRouting: false, aiTriggers: false, aiSuggestions: true,
    dealPipeline: false, serviceDesk: false, catalogSync: false, exports: false, extraAgents: false,
    customAi: false, sso: false, prioritySupport: false, supportSlaHours: 48, dedicatedSuccessManager: false,
  },
  growth: {
    livechat: true, instagram: true, messenger: true, whatsapp: false,
    aiAutoReplies: true, aiScoringRouting: true, aiTriggers: true, aiSuggestions: true,
    dealPipeline: true, serviceDesk: false, catalogSync: true, exports: true, extraAgents: true,
    customAi: false, sso: false, prioritySupport: true, supportSlaHours: 12, dedicatedSuccessManager: false,
  },
  pro: {
    livechat: true, instagram: true, messenger: true, whatsapp: true,
    aiAutoReplies: true, aiScoringRouting: true, aiTriggers: true, aiSuggestions: true,
    dealPipeline: true, serviceDesk: true, catalogSync: true, exports: true, extraAgents: true,
    customAi: false, sso: false, prioritySupport: true, supportSlaHours: 8, dedicatedSuccessManager: false,
  },
  enterprise: {
    livechat: true, instagram: true, messenger: true, whatsapp: true,
    aiAutoReplies: true, aiScoringRouting: true, aiTriggers: true, aiSuggestions: true,
    dealPipeline: true, serviceDesk: true, catalogSync: true, exports: true, extraAgents: true,
    customAi: true, sso: true, prioritySupport: true, supportSlaHours: 4, dedicatedSuccessManager: true,
  },
};

function resolveFlags(plan) {
  const saved = plan.metadata?.featureFlags;
  if (saved && typeof saved === 'object') {
    return { ...DEFAULT_FLAGS[plan.key], ...saved };
  }
  return DEFAULT_FLAGS[plan.key] || DEFAULT_FLAGS.starter;
}

function formatPrice(amount, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function PricingComparePage() {
  const [country, setCountry] = useState('EU');
  const [apiPlans, setApiPlans] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/stripe/location`, { credentials: 'omit' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.country) setCountry(data.country); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/stripe/plans?country=${country}&seats=1`, { credentials: 'omit' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (Array.isArray(data?.plans)) setApiPlans(data.plans); })
      .catch(() => {});
  }, [country]);

  const displayPlans = PLAN_KEYS.map((key) => {
    const api = apiPlans?.find((p) => p.key === key);
    const fallback = FALLBACK_PLANS.find((p) => p.key === key);
    const base = api || fallback;
    return {
      ...base,
      displayPrice: api ? (api.discountedSeatPrice ?? api.seatPrice) : fallback.priceEur,
      currency: api?.currency || 'EUR',
      popular: key === 'pro',
      isEnterprise: key === 'enterprise',
      flags: resolveFlags(base),
    };
  });

  return (
    <main className="min-h-screen bg-background">
      <PublicNav />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6 md:px-10 text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Full feature comparison
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Every feature, every plan
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Compare what's included across Starter, Growth, Pro, and Enterprise so you pick the right fit for your team.
          </p>
          <Link href="/#pricing" className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to pricing
          </Link>
        </div>
      </section>

      {/* Plan headers — sticky on desktop */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-5 gap-0">
            <div className="py-4 pr-4" />
            {displayPlans.map((plan) => (
              <PlanHeaderCell key={plan.key} plan={plan} />
            ))}
          </div>
        </div>
      </div>

      {/* Feature matrix */}
      <div className="max-w-6xl mx-auto px-4 pb-24">
        {FEATURE_MATRIX.map((group, gi) => (
          <motion.div
            key={group.category}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: gi * 0.06 }}
          >
            {/* Category header */}
            <div className="grid grid-cols-5 gap-0 mt-10 mb-1">
              <div className="col-span-5 flex items-center gap-2.5 py-3 px-4 rounded-xl bg-muted/40 border border-border/30">
                <group.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold tracking-tight">{group.category}</span>
              </div>
            </div>

            {/* Rows */}
            {group.rows.map((row, ri) => (
              <div
                key={row.key}
                className={cn(
                  'grid grid-cols-5 gap-0 border-b border-border/20',
                  ri % 2 === 0 ? 'bg-transparent' : 'bg-muted/10',
                )}
              >
                <div className="py-3.5 px-4 text-sm text-muted-foreground font-medium">{row.label}</div>
                {displayPlans.map((plan) => (
                  <FeatureCell key={plan.key} enabled={Boolean(plan.flags[row.key])} planKey={plan.key} />
                ))}
              </div>
            ))}
          </motion.div>
        ))}

        {/* Seats row */}
        <div className="mt-10">
          <div className="grid grid-cols-5 gap-0 mb-1">
            <div className="col-span-5 flex items-center gap-2.5 py-3 px-4 rounded-xl bg-muted/40 border border-border/30">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold tracking-tight">Seats & Limits</span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-0 border-b border-border/20">
            <div className="py-3.5 px-4 text-sm text-muted-foreground font-medium">Included seats</div>
            {displayPlans.map((plan) => (
              <div key={plan.key} className="flex justify-center items-center py-3.5">
                <span className="text-sm font-semibold">
                  {plan.key === 'enterprise' ? 'Unlimited' : plan.includedSeats}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-0">
            <div className="py-3.5 px-4 text-sm text-muted-foreground font-medium">Extra agent seats</div>
            {displayPlans.map((plan) => (
              <FeatureCell key={plan.key} enabled={Boolean(plan.flags?.extraAgents)} planKey={plan.key} />
            ))}
          </div>
        </div>

        {/* CTA row */}
        <div className="grid grid-cols-5 gap-4 mt-10 pt-6 border-t border-border/30">
          <div className="flex items-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              7-day free trial · No credit card required
            </p>
          </div>
          {displayPlans.map((plan) => (
            <div key={plan.key} className="flex justify-center">
              <Link href={plan.isEnterprise ? '/demo' : `/signup?country=${country}`}>
                <Button
                  size="sm"
                  className={cn(
                    'rounded-xl text-xs font-bold border-none',
                    plan.popular
                      ? 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90'
                      : 'bg-muted/60 hover:bg-muted text-foreground',
                  )}
                >
                  {plan.isEnterprise ? 'Talk to sales' : 'Get started'}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <PublicFooter />
    </main>
  );
}

function PlanHeaderCell({ plan }) {
  const meta = PLAN_META[plan.key] || {};
  const price = formatPrice(plan.displayPrice, plan.currency);

  return (
    <div className={cn('relative py-4 px-3 text-center', plan.popular && 'bg-primary/5')}>
      {plan.popular && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <Badge className="text-[10px] py-0 px-2 font-bold">Most popular</Badge>
        </div>
      )}
      <p className={cn('text-[11px] font-black uppercase tracking-[0.18em]', meta.color)}>{plan.name}</p>
      <p className="mt-1 text-xl font-black tracking-tight">{plan.isEnterprise ? 'Custom' : price}</p>
      {!plan.isEnterprise && (
        <p className="text-[10px] text-muted-foreground">/ agent / mo</p>
      )}
    </div>
  );
}

function FeatureCell({ enabled, planKey }) {
  const meta = PLAN_META[planKey] || {};
  return (
    <div className="flex justify-center items-center py-3.5">
      {enabled ? (
        <Check className={cn('h-4 w-4', meta.color || 'text-primary')} strokeWidth={2.5} />
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground/30" strokeWidth={2} />
      )}
    </div>
  );
}
