'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  FileText,
  Globe2,
  HandCoins,
  Landmark,
  RefreshCcw,
  ShieldAlert,
  Users,
} from 'lucide-react';

import { adminApi } from '@/lib/adminApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

function money(value, currency = 'EUR') {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: String(currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusTone(status) {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
  if (status === 'trialing') return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
  if (status === 'payment_due' || status === 'overdue') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
  return 'bg-red-500/10 text-red-500 border-red-500/20';
}

function Metric({ label, value, icon: Icon, tone = 'text-primary' }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-muted/40">
          <Icon className={cn('h-4 w-4', tone)} />
        </div>
      </CardContent>
    </Card>
  );
}

const INITIAL_ACTION_FORM = {
  trialDays: 3,
  plan: 'pro',
  billingCycle: 'monthly',
  currency: 'EUR',
  seatCount: 1,
  discountPercent: 0,
  invoiceAmount: 0,
  invoiceNote: '',
  subscriptionStatus: 'active',
};

export default function AdminBillingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billing, setBilling] = useState(null);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [actionForm, setActionForm] = useState(INITIAL_ACTION_FORM);
  const [actionLoading, setActionLoading] = useState('');

  const loadBilling = React.useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.get('/api/admin/billing');
      setBilling(data);
      setSelectedTenantId((current) => current || data?.tenantPlans?.[0]?.tenantId || '');
    } catch (err) {
      setError(err.message || 'Could not load billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  const tenantPlans = billing?.tenantPlans || [];
  const selectedTenant = useMemo(
    () => tenantPlans.find((tenant) => tenant.tenantId === selectedTenantId) || tenantPlans[0] || null,
    [selectedTenantId, tenantPlans],
  );

  useEffect(() => {
    if (!selectedTenant) return;
    setActionForm((current) => ({
      ...current,
      plan: selectedTenant.plan || 'pro',
      billingCycle: selectedTenant.billingCycle || 'monthly',
      currency: selectedTenant.currency || 'EUR',
      seatCount: selectedTenant.seatsPurchased || 1,
      subscriptionStatus: selectedTenant.paymentStatus || 'active',
    }));
  }, [selectedTenant]);

  async function runAction(action, body = {}) {
    if (!selectedTenant) return;
    try {
      setActionLoading(action);
      const data = await adminApi.post(`/api/admin/billing/${selectedTenant.tenantId}/actions`, {
        action,
        ...body,
      });
      setBilling((current) => {
        if (!current) return current;
        return {
          ...current,
          tenantPlans: current.tenantPlans.map((tenant) => (
            tenant.tenantId === selectedTenant.tenantId
              ? {
                  ...tenant,
                  plan: data.summary?.plan || tenant.plan,
                  billingCycle: data.summary?.billingCycle || tenant.billingCycle,
                  currency: data.summary?.billingCurrency || tenant.currency,
                  region: data.summary?.region || tenant.region,
                  trialStatus: data.summary?.trialStatus || tenant.trialStatus,
                  trialStart: data.summary?.trialStartedAt || tenant.trialStart,
                  trialEnd: data.summary?.trialEndsAt || tenant.trialEnd,
                  paymentStatus: data.summary?.subscriptionStatus || tenant.paymentStatus,
                  renewalDate: data.summary?.renewalDate || tenant.renewalDate,
                  nextBillingDate: data.summary?.nextBillingDate || tenant.nextBillingDate,
                  seatsPurchased: data.summary?.seatCount || tenant.seatsPurchased,
                  seatsUsed: data.summary?.seatUsage || tenant.seatsUsed,
                  featurePackage: data.summary?.featurePackage || tenant.featurePackage,
                  enterpriseContract: data.summary?.enterpriseContract ?? tenant.enterpriseContract,
                  discountPercent: data.summary?.discountPercent ?? tenant.discountPercent,
                  lastPayment: data.summary?.lastPaymentAt || tenant.lastPayment,
                  failedPayments: data.summary?.failedPayments ?? tenant.failedPayments,
                  paymentMethodStatus: data.summary?.paymentMethodStatus || tenant.paymentMethodStatus,
                  invoiceStatus: data.summary?.invoiceStatus || tenant.invoiceStatus,
                  restrictions: data.summary?.restrictions || tenant.restrictions,
                }
              : tenant
          )),
        };
      });
      toast.success(`Action completed: ${action.replace(/_/g, ' ')}`);
    } catch (err) {
      toast.error(err.message || 'Billing action failed');
    } finally {
      setActionLoading('');
    }
  }

  return (
    <div className="p-8 pb-12 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Billing Operations</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Trial-first lifecycle control for every tenant: subscription state, trial timing, payment recovery, seat expansion, and account enforcement visibility.
          </p>
        </div>
        <Button variant="outline" onClick={loadBilling} disabled={loading} className="gap-2">
          <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 text-sm text-red-500">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="MRR" value={money(billing?.totals?.projectedMrr || 0)} icon={BadgeDollarSign} tone="text-amber-500" />
        <Metric label="ARR" value={money(billing?.totals?.arr || 0)} icon={Landmark} tone="text-primary" />
        <Metric label="Trialing" value={billing?.totals?.trialingTenants || 0} icon={CalendarClock} tone="text-sky-500" />
        <Metric label="Overdue / Due" value={billing?.totals?.overdueTenants || 0} icon={ShieldAlert} tone="text-amber-500" />
        <Metric label="Conversion" value={`${billing?.metrics?.trialToPaidConversion || 0}%`} icon={HandCoins} tone="text-emerald-500" />
        <Metric label="Recovery Rate" value={`${billing?.metrics?.paymentRecoveryRate || 0}%`} icon={FileText} tone="text-indigo-500" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader>
            <CardTitle>Customer Billing Table</CardTitle>
            <CardDescription>
              Real lifecycle state for plan, seats, trial, payment, feature package, and operational restrictions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">Loading tenant billing truth…</TableCell>
                  </TableRow>
                ) : tenantPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">No tenant billing data found.</TableCell>
                  </TableRow>
                ) : tenantPlans.map((tenant) => (
                  <TableRow
                    key={tenant.tenantId}
                    className={cn('cursor-pointer', selectedTenant?.tenantId === tenant.tenantId && 'bg-primary/5')}
                    onClick={() => setSelectedTenantId(tenant.tenantId)}
                  >
                    <TableCell>
                      <div>
                        <p className="text-sm font-semibold">{tenant.companyName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{tenant.region} • {tenant.currency}</p>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">
                      <div className="text-sm font-medium">{tenant.plan}</div>
                      <div className="text-xs text-muted-foreground capitalize">{tenant.billingCycle}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium capitalize">{tenant.trialStatus}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(tenant.trialEnd)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium capitalize">{tenant.paymentMethodStatus}</div>
                      <div className="text-xs text-muted-foreground">{tenant.invoiceStatus}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{tenant.seatsUsed} / {tenant.seatsPurchased}</div>
                      <div className="text-xs text-muted-foreground">{tenant.featurePackage}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{formatDate(tenant.renewalDate || tenant.nextBillingDate)}</div>
                      <div className="text-xs text-muted-foreground">{tenant.failedPayments || 0} failed</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('border capitalize', statusTone(tenant.paymentStatus))}>
                        {tenant.paymentStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Admin Billing Actions</CardTitle>
            <CardDescription>
              All actions are persisted as billing events and audit records. Select a tenant to control its lifecycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedTenant ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select a tenant from the billing table to manage trial and payment state.
              </div>
            ) : (
              <>
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{selectedTenant.companyName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedTenant.plan} • {selectedTenant.seatsUsed}/{selectedTenant.seatsPurchased} seats • {selectedTenant.featurePackage}
                      </p>
                    </div>
                    <Badge className={cn('border capitalize', statusTone(selectedTenant.paymentStatus))}>
                      {selectedTenant.paymentStatus}
                    </Badge>
                  </div>
                  {selectedTenant.restrictions?.reason ? (
                    <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{selectedTenant.restrictions.reason}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Force Plan</Label>
                    <Select value={actionForm.plan} onValueChange={(value) => setActionForm((current) => ({ ...current, plan: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['starter', 'growth', 'pro', 'enterprise'].map((plan) => (
                          <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Lifecycle Status</Label>
                    <Select value={actionForm.subscriptionStatus} onValueChange={(value) => setActionForm((current) => ({ ...current, subscriptionStatus: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['trialing', 'payment_due', 'active', 'overdue', 'suspended', 'cancelled'].map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <Select value={actionForm.billingCycle} onValueChange={(value) => setActionForm((current) => ({ ...current, billingCycle: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">monthly</SelectItem>
                        <SelectItem value="yearly">yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Input value={actionForm.currency} onChange={(event) => setActionForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Seats Purchased</Label>
                    <Input type="number" min={1} value={actionForm.seatCount} onChange={(event) => setActionForm((current) => ({ ...current, seatCount: Math.max(Number.parseInt(event.target.value || '1', 10) || 1, 1) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Trial Days Adjustment</Label>
                    <Input type="number" min={1} value={actionForm.trialDays} onChange={(event) => setActionForm((current) => ({ ...current, trialDays: Math.max(Number.parseInt(event.target.value || '1', 10) || 1, 1) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount Percent</Label>
                    <Input type="number" min={0} max={100} value={actionForm.discountPercent} onChange={(event) => setActionForm((current) => ({ ...current, discountPercent: Math.max(Number.parseFloat(event.target.value || '0') || 0, 0) }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Manual Invoice Amount</Label>
                    <Input type="number" min={0} value={actionForm.invoiceAmount} onChange={(event) => setActionForm((current) => ({ ...current, invoiceAmount: Math.max(Number.parseFloat(event.target.value || '0') || 0, 0) }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Manual Invoice Note</Label>
                  <Input value={actionForm.invoiceNote} onChange={(event) => setActionForm((current) => ({ ...current, invoiceNote: event.target.value }))} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button onClick={() => runAction('extend_trial', { days: actionForm.trialDays })} disabled={!!actionLoading}>
                    {actionLoading === 'extend_trial' ? 'Running…' : 'Extend Trial'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('shorten_trial', { days: actionForm.trialDays })} disabled={!!actionLoading}>
                    {actionLoading === 'shorten_trial' ? 'Running…' : 'Shorten Trial'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('force_upgrade', { plan: actionForm.plan })} disabled={!!actionLoading}>
                    {actionLoading === 'force_upgrade' ? 'Running…' : 'Force Upgrade'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('change_billing_cycle', { billingCycle: actionForm.billingCycle })} disabled={!!actionLoading}>
                    {actionLoading === 'change_billing_cycle' ? 'Running…' : 'Change Billing Cycle'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('override_currency', { currency: actionForm.currency })} disabled={!!actionLoading}>
                    {actionLoading === 'override_currency' ? 'Running…' : 'Override Currency'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('adjust_seats', { seatCount: actionForm.seatCount, delta: actionForm.seatCount - (selectedTenant.seatsPurchased || 0) })} disabled={!!actionLoading}>
                    {actionLoading === 'adjust_seats' ? 'Running…' : 'Adjust Seats'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('apply_discount', { discountPercent: actionForm.discountPercent })} disabled={!!actionLoading}>
                    {actionLoading === 'apply_discount' ? 'Running…' : 'Apply Discount'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('issue_manual_invoice', { amount: actionForm.invoiceAmount, currency: actionForm.currency, note: actionForm.invoiceNote })} disabled={!!actionLoading}>
                    {actionLoading === 'issue_manual_invoice' ? 'Running…' : 'Issue Manual Invoice'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('trigger_payment_reminder')} disabled={!!actionLoading}>
                    {actionLoading === 'trigger_payment_reminder' ? 'Running…' : 'Trigger Payment Reminder'}
                  </Button>
                  <Button variant="outline" onClick={() => runAction('mark_enterprise_contract', { enterpriseContract: !selectedTenant.enterpriseContract })} disabled={!!actionLoading}>
                    {actionLoading === 'mark_enterprise_contract' ? 'Running…' : 'Mark Enterprise Contract'}
                  </Button>
                  <Button
                    variant={selectedTenant.paymentStatus === 'suspended' ? 'default' : 'outline'}
                    onClick={() => runAction(selectedTenant.paymentStatus === 'suspended' ? 'reactivate_account' : 'suspend_account', selectedTenant.paymentStatus === 'suspended' ? { subscriptionStatus: actionForm.subscriptionStatus } : {})}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === 'reactivate_account' || actionLoading === 'suspend_account'
                      ? 'Running…'
                      : selectedTenant.paymentStatus === 'suspended'
                        ? 'Reactivate Account'
                        : 'Suspend Account'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Conversion Metrics</CardTitle>
            <CardDescription>Reporting for trial-to-paid and recovery operations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span>Trial → Paid</span><strong>{billing?.metrics?.trialToPaidConversion || 0}%</strong></div>
            <div className="flex items-center justify-between"><span>Avg Trial Length</span><strong>{billing?.metrics?.averageTrialDurationDays || 0} days</strong></div>
            <div className="flex items-center justify-between"><span>Recovery Rate</span><strong>{billing?.metrics?.paymentRecoveryRate || 0}%</strong></div>
            <div className="flex items-center justify-between"><span>Failed Payment Rate</span><strong>{billing?.metrics?.failedPaymentRate || 0}%</strong></div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Expansion Signals</CardTitle>
            <CardDescription>Seat growth and high-value account motion.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span>Seat Expansion Events</span><strong>{billing?.metrics?.seatExpansionRate || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Enterprise Contracts</span><strong>{billing?.metrics?.ltvSignals?.enterpriseContracts || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Expansion Events Logged</span><strong>{billing?.metrics?.ltvSignals?.expansionEvents || 0}</strong></div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Churn Risk</CardTitle>
            <CardDescription>Accounts that currently need intervention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span>Churn Risk Accounts</span><strong>{billing?.metrics?.churnRisk || 0}</strong></div>
            <div className="flex items-center justify-between"><span>Overdue Accounts</span><strong>{billing?.metrics?.ltvSignals?.overdueAccounts || 0}</strong></div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              Why blocked is surfaced directly on each tenant row through the restrictions reason.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
