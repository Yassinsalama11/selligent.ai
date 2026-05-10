'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Coins, Globe2, PackagePlus, RefreshCcw, Save, Sparkles, Users } from 'lucide-react';

import { adminApi } from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const REGIONS = ['EU', 'US', 'GB', 'SA', 'AE', 'EG'];
const REGION_CURRENCY = {
  EU: 'EUR',
  US: 'USD',
  GB: 'GBP',
  SA: 'SAR',
  AE: 'AED',
  EG: 'EGP',
};

const FEATURE_GROUPS = [
  {
    label: 'Channels',
    features: [
      { key: 'livechat', label: 'Live Chat' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'messenger', label: 'Messenger' },
      { key: 'whatsapp', label: 'WhatsApp' },
    ],
  },
  {
    label: 'AI Features',
    features: [
      { key: 'aiAutoReplies', label: 'AI Auto-Replies' },
      { key: 'aiScoringRouting', label: 'AI Scoring + Routing' },
      { key: 'aiTriggers', label: 'AI Triggers' },
      { key: 'aiSuggestions', label: 'AI Suggestions' },
    ],
  },
  {
    label: 'Workspace',
    features: [
      { key: 'dealPipeline', label: 'Deal Pipeline' },
      { key: 'serviceDesk', label: 'Service Desk' },
      { key: 'catalogSync', label: 'Catalog Sync' },
      { key: 'exports', label: 'Exports' },
      { key: 'extraAgents', label: 'Extra Agents' },
    ],
  },
  {
    label: 'Advanced',
    features: [
      { key: 'customAi', label: 'Custom AI' },
      { key: 'customAiByokEnabled', label: 'BYOK (Bring Your Own Key)' },
      { key: 'sso', label: 'SSO' },
      { key: 'prioritySupport', label: 'Priority Support' },
      { key: 'dedicatedSuccessManager', label: 'Dedicated Success Manager' },
    ],
  },
];

const CHANNEL_KEYS = ['livechat', 'instagram', 'messenger', 'whatsapp'];

const DEFAULT_FLAGS_BY_PLAN = {
  starter: {
    livechat: true, instagram: true, messenger: false, whatsapp: false,
    aiAutoReplies: true, aiScoringRouting: false, aiTriggers: false, aiSuggestions: true,
    dealPipeline: false, serviceDesk: false, catalogSync: false, exports: false, extraAgents: false,
    customAi: false, customAiByokEnabled: false, sso: false, prioritySupport: false, supportSlaHours: 48, dedicatedSuccessManager: false,
  },
  growth: {
    livechat: true, instagram: true, messenger: true, whatsapp: false,
    aiAutoReplies: true, aiScoringRouting: true, aiTriggers: true, aiSuggestions: true,
    dealPipeline: true, serviceDesk: false, catalogSync: true, exports: true, extraAgents: true,
    customAi: false, customAiByokEnabled: false, sso: false, prioritySupport: true, supportSlaHours: 12, dedicatedSuccessManager: false,
  },
  pro: {
    livechat: true, instagram: true, messenger: true, whatsapp: true,
    aiAutoReplies: true, aiScoringRouting: true, aiTriggers: true, aiSuggestions: true,
    dealPipeline: true, serviceDesk: true, catalogSync: true, exports: true, extraAgents: true,
    customAi: false, customAiByokEnabled: false, sso: false, prioritySupport: true, supportSlaHours: 8, dedicatedSuccessManager: false,
  },
  enterprise: {
    livechat: true, instagram: true, messenger: true, whatsapp: true,
    aiAutoReplies: true, aiScoringRouting: true, aiTriggers: true, aiSuggestions: true,
    dealPipeline: true, serviceDesk: true, catalogSync: true, exports: true, extraAgents: true,
    customAi: true, customAiByokEnabled: true, sso: true, prioritySupport: true, supportSlaHours: 4, dedicatedSuccessManager: true,
  },
};

function getDefaultFlags(planKey) {
  return DEFAULT_FLAGS_BY_PLAN[planKey] || DEFAULT_FLAGS_BY_PLAN.starter;
}

function resolveFlags(plan) {
  const saved = plan.metadata?.featureFlags;
  if (saved && typeof saved === 'object') return { ...getDefaultFlags(plan.key), ...saved };
  return getDefaultFlags(plan.key);
}

function flagsToChannelArray(flags) {
  return CHANNEL_KEYS.filter((ch) => flags[ch]);
}

function emptyPlan() {
  return {
    key: '',
    name: '',
    description: '',
    priceEur: 0,
    includedSeats: 1,
    visible: true,
    sortOrder: 100,
    features: [],
    limits: {},
    countryOverrides: {},
    metadata: {},
    _isNew: true,
  };
}

function toFeatureText(features) {
  return Array.isArray(features) ? features.join('\n') : '';
}

function fromFeatureText(value) {
  return String(value || '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function AdminPricingPage() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    let cancelled = false;
    adminApi.get('/api/admin/plans')
      .then((data) => {
        if (!cancelled) setPlans(Array.isArray(data?.plans) ? data.plans : []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Could not load plans');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updatePlan(index, field, value) {
    setPlans((current) => current.map((plan, planIndex) => (
      planIndex === index ? { ...plan, [field]: value } : plan
    )));
  }

  function updateRegion(index, region, seatPrice) {
    setPlans((current) => current.map((plan, planIndex) => {
      if (planIndex !== index) return plan;
      const nextOverrides = { ...(plan.countryOverrides || {}) };
      if (seatPrice === '' || seatPrice === null || seatPrice === undefined) {
        delete nextOverrides[region];
      } else {
        nextOverrides[region] = {
          currency: REGION_CURRENCY[region] || 'EUR',
          seatPrice: Number(seatPrice || 0),
        };
      }
      return { ...plan, countryOverrides: nextOverrides };
    }));
  }

  function updateFlag(index, flagKey, enabled) {
    setPlans((current) => current.map((plan, planIndex) => {
      if (planIndex !== index) return plan;
      const currentFlags = resolveFlags(plan);
      const nextFlags = { ...currentFlags, [flagKey]: enabled };
      return {
        ...plan,
        metadata: {
          ...(plan.metadata || {}),
          featureFlags: {
            ...nextFlags,
            channels: flagsToChannelArray(nextFlags),
          },
        },
      };
    }));
  }

  function updateFlagValue(index, flagKey, value) {
    setPlans((current) => current.map((plan, planIndex) => {
      if (planIndex !== index) return plan;
      const currentFlags = resolveFlags(plan);
      const nextFlags = { ...currentFlags, [flagKey]: value };
      return {
        ...plan,
        metadata: {
          ...(plan.metadata || {}),
          featureFlags: {
            ...nextFlags,
            channels: flagsToChannelArray(nextFlags),
          },
        },
      };
    }));
  }

  async function savePlan(plan) {
    if (!String(plan.key || '').trim()) {
      toast.error('Plan key is required');
      return;
    }

    setSavingKey(plan.key);
    try {
      const flags = resolveFlags(plan);
      const payload = {
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : fromFeatureText(plan.featuresText),
        metadata: {
          ...(plan.metadata || {}),
          featureFlags: {
            ...flags,
            channels: flagsToChannelArray(flags),
          },
        },
      };
      const response = plan._isNew
        ? await adminApi.post('/api/admin/plans', payload)
        : await adminApi.put(`/api/admin/plans/${encodeURIComponent(plan.key)}`, payload);

      setPlans((current) => current.map((entry) => (
        (entry.key === plan.key || entry === plan)
          ? { ...response.plan }
          : entry
      )));
      toast.success(`${response.plan.name} saved`);
    } catch (err) {
      toast.error(err.message || 'Could not save plan');
    } finally {
      setSavingKey('');
    }
  }

  const stats = useMemo(() => plans.reduce((acc, plan) => {
    acc.total += 1;
    acc.visible += plan.visible ? 1 : 0;
    acc.seats += Number(plan.includedSeats || 0);
    acc.avgPrice += Number(plan.priceEur || 0);
    return acc;
  }, { total: 0, visible: 0, seats: 0, avgPrice: 0 }), [plans]);

  const averagePlanPrice = stats.total ? stats.avgPrice / stats.total : 0;

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Revenue Controls
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Plan Catalog</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage pricing, included seats, feature copy, regional overrides, and per-plan feature flags without shipping code.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Reload
          </Button>
          <Button
            onClick={() => setPlans((current) => [...current, emptyPlan()])}
            className="gap-2"
          >
            <PackagePlus className="h-4 w-4" />
            Add Plan
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Plans" value={stats.total} sub="Catalog rows" icon={PackagePlus} />
        <MetricCard label="Visible" value={stats.visible} sub="Shown publicly" icon={Globe2} />
        <MetricCard label="Avg. seat price" value={formatMoney(averagePlanPrice)} sub="EUR basis" icon={Coins} />
        <MetricCard label="Included seats" value={stats.seats} sub="Across all plans" icon={Users} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-8 text-sm text-muted-foreground">Loading plan catalog…</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-2">
        {plans.map((plan, index) => {
          const flags = resolveFlags(plan);
          return (
            <Card key={`${plan.key || 'new'}-${index}`} className="overflow-hidden border shadow-sm">
              <CardHeader className="border-b bg-muted/30">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl font-black tracking-tight">
                        {plan.name || 'New plan'}
                      </CardTitle>
                      <Badge variant={plan.visible ? 'default' : 'secondary'} className={cn(!plan.visible && 'text-muted-foreground')}>
                        {plan.visible ? 'Visible' : 'Hidden'}
                      </Badge>
                      {plan._isNew ? <Badge variant="outline">Draft</Badge> : null}
                    </div>
                    <CardDescription className="mt-2">
                      {plan.description || 'No description set yet.'}
                    </CardDescription>
                  </div>
                  <div className="grid min-w-[220px] grid-cols-2 gap-3">
                    <StatPill label="Seat price" value={formatMoney(plan.priceEur)} />
                    <StatPill label="Included seats" value={plan.includedSeats || 1} />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {/* ── Basic fields ── */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <FormField label="Plan key">
                    <Input
                      value={plan.key}
                      disabled={!plan._isNew}
                      onChange={(event) => updatePlan(index, 'key', event.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    />
                  </FormField>
                  <FormField label="Plan name">
                    <Input
                      value={plan.name}
                      onChange={(event) => updatePlan(index, 'name', event.target.value)}
                    />
                  </FormField>
                  <FormField label="EUR / seat">
                    <Input
                      type="number"
                      value={plan.priceEur}
                      onChange={(event) => updatePlan(index, 'priceEur', Number(event.target.value || 0))}
                    />
                  </FormField>
                  <FormField label="Included seats">
                    <Input
                      type="number"
                      min="1"
                      value={plan.includedSeats}
                      onChange={(event) => updatePlan(index, 'includedSeats', Number(event.target.value || 1))}
                    />
                  </FormField>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                  <FormField label="Description">
                    <Textarea
                      rows={4}
                      value={plan.description}
                      onChange={(event) => updatePlan(index, 'description', event.target.value)}
                      className="min-h-[110px]"
                    />
                  </FormField>
                  <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">Publishing</p>
                        <p className="text-xs text-muted-foreground">Public pricing visibility and order.</p>
                      </div>
                      <Button
                        type="button"
                        variant={plan.visible !== false ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updatePlan(index, 'visible', plan.visible === false)}
                      >
                        {plan.visible !== false ? 'Visible' : 'Hidden'}
                      </Button>
                    </div>
                    <FormField label="Sort order">
                      <Input
                        type="number"
                        value={plan.sortOrder}
                        onChange={(event) => updatePlan(index, 'sortOrder', Number(event.target.value || 100))}
                      />
                    </FormField>
                  </div>
                </div>

                {/* ── Feature flags ── */}
                <div>
                  <p className="mb-4 text-sm font-semibold">Feature Access</p>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {FEATURE_GROUPS.map((group) => (
                      <div key={group.label} className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {group.label}
                        </p>
                        <div className="space-y-2">
                          {group.features.map(({ key, label }) => (
                            <label
                              key={key}
                              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1 py-1 hover:bg-muted/30 transition-colors"
                            >
                              <span className="text-xs font-medium">{label}</span>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={flags[key]}
                                onClick={() => updateFlag(index, key, !flags[key])}
                                className={cn(
                                  'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                  flags[key] ? 'bg-primary' : 'bg-muted-foreground/30',
                                )}
                              >
                                <span
                                  className={cn(
                                    'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform',
                                    flags[key] ? 'translate-x-4' : 'translate-x-0',
                                  )}
                                />
                              </button>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 max-w-xs">
                    <FormField label="Support SLA hours">
                      <Input
                        type="number"
                        min={1}
                        max={168}
                        value={flags.supportSlaHours ?? 48}
                        onChange={(event) => updateFlagValue(index, 'supportSlaHours', Number(event.target.value || 48))}
                      />
                    </FormField>
                  </div>
                </div>

                {/* ── Features text + regional overrides ── */}
                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <FormField label="Features and included limits">
                    <Textarea
                      rows={8}
                      value={toFeatureText(plan.features)}
                      onChange={(event) => updatePlan(index, 'features', fromFeatureText(event.target.value))}
                      className="min-h-[190px]"
                    />
                  </FormField>

                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="mb-4">
                      <p className="text-sm font-semibold">Regional seat overrides</p>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use the FX-based fallback from the public catalog.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {REGIONS.map((region) => (
                        <FormField key={region} label={`${region} (${REGION_CURRENCY[region]})`}>
                          <Input
                            type="number"
                            placeholder="Use fallback"
                            value={plan.countryOverrides?.[region]?.seatPrice || ''}
                            onChange={(event) => updateRegion(index, region, event.target.value)}
                          />
                        </FormField>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Feature flags take effect immediately after save — no deploy required.
                  </p>
                  <Button
                    onClick={() => savePlan(plan)}
                    disabled={savingKey === plan.key}
                    className="gap-2 sm:min-w-[160px]"
                  >
                    <Save className="h-4 w-4" />
                    {savingKey === plan.key ? 'Saving…' : 'Save plan'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/30">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-black tracking-tight">{value}</p>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
