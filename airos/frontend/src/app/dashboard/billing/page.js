'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Download,
  Lock,
  Receipt,
  RefreshCcw,
  ShieldAlert,
  Users,
} from 'lucide-react';

import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const CHANNEL_OPTIONS = [
  { key: 'livechat', label: 'Live Chat' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'messenger', label: 'Messenger' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

const PLAN_OPTIONS = [
  { key: 'starter', label: 'Starter', description: 'Single-seat operational baseline', price: '€49 / mo' },
  { key: 'growth', label: 'Growth', description: 'Multi-channel ops with exports and AI triggers', price: '€99 / mo' },
  { key: 'pro', label: 'Pro', description: 'Advanced automation with WhatsApp access', price: '€199 / mo' },
  { key: 'enterprise', label: 'Enterprise', description: 'Large teams, contracts, and scale controls', price: '€399 / mo' },
];

function formatDate(value) {
  if (!value) return 'Not scheduled';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return 'Not available';
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMoney(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: String(currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusTone(status) {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (status === 'trialing') return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
  if (status === 'payment_due' || status === 'overdue') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  return 'bg-red-500/10 text-red-500 border-red-500/20';
}

function featureTone(allowed) {
  return allowed
    ? 'border-emerald-500/20 bg-emerald-500/5'
    : 'border-border bg-muted/30';
}

function SummaryCard({ icon: Icon, label, value, sub }) {
  return (
    <Card className="border shadow-sm bg-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardBillingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [billing, setBilling] = useState(null);
  const [form, setForm] = useState({
    billingCycle: 'monthly',
    billingCurrency: 'EUR',
    region: 'EU',
    seatCount: 1,
    selectedChannels: ['livechat'],
  });

  const loadBilling = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/api/billing');
      setBilling(data);
      setForm({
        billingCycle: data?.summary?.billingCycle || 'monthly',
        billingCurrency: data?.summary?.billingCurrency || 'EUR',
        region: data?.summary?.region || 'EU',
        seatCount: data?.summary?.seatCount || 1,
        selectedChannels: Array.isArray(data?.summary?.selectedChannels) && data.summary.selectedChannels.length
          ? data.summary.selectedChannels
          : ['livechat'],
      });
    } catch (err) {
      toast.error(err.message || 'Could not load billing center');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const billingState = params.get('billing');
    if (billingState === 'success') toast.success('Billing update received. Refreshing workspace status.');
    if (billingState === 'cancelled') toast('Billing checkout was cancelled.');
    if (billingState) {
      window.history.replaceState({}, '', '/dashboard/billing');
    }
  }, []);

  const summary = billing?.summary || null;
  const history = billing?.history || [];
  const invoices = useMemo(() => (
    history.filter((entry) => String(entry.event_type || '').includes('invoice') || entry.event_type === 'payment_succeeded')
  ), [history]);
  const payments = useMemo(() => (
    history.filter((entry) => String(entry.event_type || '').includes('payment') || entry.event_type === 'trial_converted')
  ), [history]);
  const lockedFeatures = summary?.featureAccess?.filter((entry) => entry.allowed === false) || [];
  const activeFeatures = summary?.featureAccess?.filter((entry) => entry.allowed === true) || [];

  async function savePreferences() {
    setSaving(true);
    try {
      const data = await api.patch('/api/billing/preferences', form);
      setBilling((current) => ({ ...(current || {}), summary: data.summary }));
      toast.success('Billing preferences updated');
      await loadBilling();
    } catch (err) {
      toast.error(err.message || 'Could not save billing preferences');
    } finally {
      setSaving(false);
    }
  }

  async function launchCheckout(path, payload = {}) {
    setActionLoading(path);
    try {
      const data = await api.post(path, {
        plan: payload.plan || summary?.plan || 'pro',
        seatCount: payload.seatCount || form.seatCount,
        billingCycle: payload.billingCycle || form.billingCycle,
      });
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      toast.error(data?.error || 'Billing action failed');
    } catch (err) {
      toast.error(err.message || 'Billing action failed');
    } finally {
      setActionLoading('');
    }
  }

  async function openPortal() {
    setActionLoading('portal');
    try {
      const data = await api.post('/api/billing/portal-session', {});
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      toast.error('Billing portal is unavailable for this workspace');
    } catch (err) {
      toast.error(err.message || 'Could not open billing portal');
    } finally {
      setActionLoading('');
    }
  }

  function toggleChannel(channel) {
    setForm((current) => {
      const next = current.selectedChannels.includes(channel)
        ? current.selectedChannels.filter((entry) => entry !== channel)
        : [...current.selectedChannels, channel];
      return { ...current, selectedChannels: next.length ? next : ['livechat'] };
    });
  }

  if (loading && !summary) {
    return <div className="p-8 text-sm text-muted-foreground">Loading billing center…</div>;
  }

  return (
    <div className="p-8 pb-20 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Billing & Subscription</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage your trial lifecycle, payment status, seats, channels, invoices, and operational locks from one control surface.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={cn('border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider', statusTone(summary?.subscriptionStatus))}>
            {summary?.subscriptionStatus || 'trialing'}
          </Badge>
          <Button variant="outline" onClick={loadBilling} className="gap-2" disabled={loading}>
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {summary?.trialBanner ? (
        <Card className={cn(
          'border shadow-sm',
          summary.trialBanner.tone === 'critical'
            ? 'border-red-500/20 bg-red-500/5'
            : summary.trialBanner.tone === 'warning'
              ? 'border-amber-500/20 bg-amber-500/5'
              : 'border-primary/20 bg-primary/5',
        )}>
          <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              {summary.trialBanner.tone === 'critical' ? (
                <ShieldAlert className="mt-0.5 h-5 w-5 text-red-500" />
              ) : (
                <CalendarClock className="mt-0.5 h-5 w-5 text-primary" />
              )}
              <div>
                <p className="text-sm font-semibold">{summary.trialBanner.headline}</p>
                <p className="mt-1 text-sm text-muted-foreground">{summary.trialBanner.body}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => launchCheckout('/api/billing/checkout-session')} disabled={!!actionLoading}>
                {actionLoading === '/api/billing/checkout-session' ? 'Opening…' : summary?.upgradeCta?.label || 'Pay now'}
              </Button>
              <Button variant="outline" onClick={openPortal} disabled={!!actionLoading}>
                Manage payment method
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <SummaryCard
          icon={CreditCard}
          label="Current Plan"
          value={String(summary?.plan || 'starter').replace(/\b\w/g, (char) => char.toUpperCase())}
          sub={`${summary?.billingCycle || 'monthly'} billing`}
        />
        <SummaryCard
          icon={Users}
          label="Seats"
          value={`${summary?.seatUsage || 0} / ${summary?.seatCount || 1}`}
          sub={`${summary?.seatAvailable || 0} available`}
        />
        <SummaryCard
          icon={CalendarClock}
          label="Trial"
          value={summary?.trialStatus === 'active' ? `${summary?.trialDaysRemaining ?? 0} days left` : String(summary?.trialStatus || 'none').replace('_', ' ')}
          sub={`Ends ${formatDate(summary?.trialEndsAt)}`}
        />
        <SummaryCard
          icon={Receipt}
          label="Next Billing"
          value={formatDate(summary?.nextBillingDate || summary?.renewalDate)}
          sub={`${summary?.billingCurrency || 'EUR'} • ${summary?.invoiceStatus || 'none'} invoice status`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Subscription Overview</CardTitle>
            <CardDescription>
              Real account state used by backend enforcement, trial logic, and billing operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Current Status', summary?.subscriptionStatus],
              ['Selected Channels', (summary?.selectedChannels || []).join(', ') || 'None selected'],
              ['Payment Method', summary?.paymentMethodStatus],
              ['Invoice Status', summary?.invoiceStatus],
              ['Renewal Date', formatDate(summary?.renewalDate)],
              ['Last Payment', formatDate(summary?.lastPaymentAt)],
              ['Last Invoice', formatDate(summary?.lastInvoiceAt)],
              ['Currency', summary?.billingCurrency],
              ['Region', summary?.region],
              ['Feature Package', summary?.featurePackage],
              ['Failed Payments', String(summary?.failedPayments || 0)],
              ['Enterprise Contract', summary?.enterpriseContract ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-muted/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-2 text-sm font-medium capitalize">{value || 'Not set'}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Locked Features</CardTitle>
            <CardDescription>
              Features remain locked because of plan limits or the current billing lifecycle state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary?.restrictions?.reason ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
                {summary.restrictions.reason}
              </div>
            ) : null}
            {lockedFeatures.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-600 dark:text-emerald-400">
                All subscribed features are currently operational.
              </div>
            ) : (
              lockedFeatures.map((feature) => (
                <div key={feature.key} className={cn('rounded-xl border p-4', featureTone(false))}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{feature.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{feature.reason || 'Unavailable on the current configuration.'}</p>
                      {feature.upgradePath ? (
                        <p className="mt-2 text-xs font-medium text-primary">{feature.upgradePath}</p>
                      ) : null}
                    </div>
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payment-center" className="space-y-6">
        <TabsList className="inline-flex h-auto flex-wrap gap-2 rounded-xl bg-muted/40 p-1">
          <TabsTrigger value="payment-center">Payment Center</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="payment-center" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Plan & Billing Controls</CardTitle>
                <CardDescription>
                  Update billing cycle, seats, and channel package before checkout or renewal.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <Select value={form.billingCycle} onValueChange={(value) => setForm((current) => ({ ...current, billingCycle: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Currency</Label>
                    <Select value={form.billingCurrency} onValueChange={(value) => setForm((current) => ({ ...current, billingCurrency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="EGP">EGP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Seats Purchased</Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.seatCount}
                      onChange={(event) => setForm((current) => ({
                        ...current,
                        seatCount: Math.max(Number.parseInt(event.target.value || '1', 10) || 1, 1),
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label>Selected Channels</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Channels are enforced by plan eligibility and backend lifecycle rules.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {CHANNEL_OPTIONS.map((channel) => {
                      const active = form.selectedChannels.includes(channel.key);
                      return (
                        <button
                          key={channel.key}
                          type="button"
                          onClick={() => toggleChannel(channel.key)}
                          className={cn(
                            'rounded-xl border px-4 py-3 text-left transition-colors',
                            active
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-background hover:bg-muted/30',
                          )}
                        >
                          <p className="text-sm font-medium">{channel.label}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{active ? 'Enabled for checkout' : 'Not selected'}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={savePreferences} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Billing Preferences'}
                  </Button>
                  <Button variant="outline" onClick={openPortal} disabled={!!actionLoading}>
                    {actionLoading === 'portal' ? 'Opening…' : 'Add Payment Method'}
                  </Button>
                  <Button variant="outline" onClick={() => launchCheckout('/api/billing/retry-payment')} disabled={!!actionLoading}>
                    {actionLoading === '/api/billing/retry-payment' ? 'Opening…' : 'Retry Failed Payment'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Upgrade Paths</CardTitle>
                <CardDescription>
                  Pick a target plan, then start checkout from the dashboard without admin involvement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {PLAN_OPTIONS.map((plan) => {
                  const isCurrent = summary?.plan === plan.key;
                  return (
                    <div key={plan.key} className={cn('rounded-xl border p-4', isCurrent ? 'border-primary/20 bg-primary/5' : 'bg-muted/20')}>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{plan.label}</p>
                            {isCurrent ? <Badge variant="outline">Current</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{plan.price}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          size="sm"
                          onClick={() => launchCheckout('/api/billing/checkout-session', { plan: plan.key })}
                          disabled={!!actionLoading}
                        >
                          {actionLoading === '/api/billing/checkout-session' ? 'Opening…' : isCurrent ? 'Update Subscription' : 'Upgrade Plan'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={openPortal} disabled={!!actionLoading}>
                          Billing Portal
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Available During Trial</CardTitle>
                <CardDescription>
                  The current workspace can use these capabilities right now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeFeatures.map((feature) => (
                  <div key={feature.key} className={cn('rounded-xl border p-4', featureTone(true))}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{feature.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {feature.metadata?.selectedChannels
                            ? `Enabled channels: ${feature.metadata.selectedChannels.join(', ')}`
                            : 'Operational under the current plan and lifecycle state.'}
                        </p>
                      </div>
                      <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle>Operational Restriction Preview</CardTitle>
                <CardDescription>
                  Restricted states continue to allow login and billing visibility, while blocking sending, integrations, and advanced AI.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-xl border p-4">
                  <p className="font-medium text-foreground">Trial expired</p>
                  <p className="mt-1">Login remains available. Messaging sends, integrations, and advanced AI stay restricted until payment is completed.</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="font-medium text-foreground">Payment overdue</p>
                  <p className="mt-1">Retry payment to exit restricted mode and restore automation, exports, and operational writes.</p>
                </div>
                <div className="rounded-xl border p-4">
                  <p className="font-medium text-foreground">Suspended or cancelled</p>
                  <p className="mt-1">Workspace enters a stronger freeze mode. Billing history remains visible for recovery and support.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Invoices & Receipts</CardTitle>
              <CardDescription>
                Recent billing documents and payment records tied to your workspace lifecycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoices.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No invoices are recorded yet. Once billing begins, documents will appear here and in the billing portal.
                </div>
              ) : (
                invoices.map((entry) => (
                  <div key={entry.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold capitalize">{String(entry.event_type || '').replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="capitalize">{entry.status || 'recorded'}</Badge>
                      <span className="text-sm font-medium">
                        {entry.amount ? formatMoney(entry.amount, entry.currency || summary?.billingCurrency) : 'Amount pending'}
                      </span>
                      {entry.metadata?.hosted_invoice_url ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={entry.metadata.hosted_invoice_url} target="_blank" rel="noreferrer">
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={openPortal} disabled={!!actionLoading}>
                          <ArrowUpRight className="mr-2 h-4 w-4" />
                          Open Portal
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Audit trail for trial conversion, payment retries, invoice actions, seat changes, and billing operations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {history.length === 0 ? (
                <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No billing activity has been recorded yet.
                </div>
              ) : (
                payments.concat(history.filter((entry) => !payments.some((payment) => payment.id === entry.id))).map((entry) => (
                  <div key={entry.id} className="rounded-xl border p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold capitalize">{String(entry.event_type || '').replace(/_/g, ' ')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">{entry.status || 'recorded'}</Badge>
                        {entry.amount ? (
                          <span className="text-sm font-medium">{formatMoney(entry.amount, entry.currency || summary?.billingCurrency)}</span>
                        ) : null}
                      </div>
                    </div>
                    {entry.metadata && Object.keys(entry.metadata).length ? (
                      <pre className="mt-3 overflow-x-auto rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
