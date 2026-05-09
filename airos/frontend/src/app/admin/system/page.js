'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, BrainCircuit, Database, Mail, RefreshCcw, ShieldCheck, Workflow } from 'lucide-react';

import { adminApi } from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function readinessTone(ok) {
  return ok
    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500'
    : 'border-amber-500/20 bg-amber-500/5 text-amber-500';
}

export default function AdminSystemPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.get('/api/admin/system/health');
      setHealth(data);
    } catch (err) {
      setError(err.message || 'Could not load system health');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const checks = useMemo(() => {
    if (!health) return [];
    return [
      {
        label: 'Database',
        description: 'Primary tenant and platform control-plane storage',
        ok: health.databaseConfigured,
        value: health.databaseConfigured ? 'Configured' : 'Missing DATABASE_URL',
        icon: Database,
      },
      {
        label: 'Redis',
        description: 'Queue, cache, and background task transport',
        ok: health.redisConfigured,
        value: health.redisConfigured ? 'Configured' : 'Not configured',
        icon: Workflow,
      },
      {
        label: 'Billing',
        description: 'Stripe runtime used for checkout, retry, and portal flows',
        ok: health.stripeConfigured,
        value: health.stripeConfigured ? 'Configured' : 'Not configured',
        icon: ShieldCheck,
      },
      {
        label: 'Email',
        description: 'Transactional sender readiness for lifecycle automation',
        ok: health.emailConfigured,
        value: health.emailConfigured ? 'Configured' : 'Sender missing',
        icon: Mail,
      },
      {
        label: 'Platform AI',
        description: 'Global provider routing and model orchestration',
        ok: Boolean(health.ai?.configured),
        value: health.ai?.configured ? `Configured · ${health.ai.provider}` : 'Missing provider key',
        icon: BrainCircuit,
      },
    ];
  }, [health]);

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Activity className="h-3.5 w-3.5" />
            Runtime Health
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">System Readiness</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Live dependency status for the backend control plane, billing runtime, email delivery, and AI provider configuration.
          </p>
        </div>

        <Button variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          Refresh health
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <Card key={check.label} className="border shadow-sm">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/30">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <Badge className={cn('border', readinessTone(check.ok))}>
                    {check.ok ? 'Ready' : 'Attention'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold">{check.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{check.description}</p>
                </div>
                <p className="mt-auto text-sm font-semibold">{check.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Platform AI Control Plane</CardTitle>
            <CardDescription>
              Tenant API keys remain disabled. Provider configuration is managed centrally here and applied across all workspaces.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {health?.ai ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryItem label="Provider" value={health.ai.provider || 'Unknown'} />
                  <SummaryItem label="Source" value={health.ai.source || 'environment'} />
                  <SummaryItem label="Managed by platform" value={health.ai.managedByPlatform ? 'Yes' : 'No'} />
                  <SummaryItem label="Tenant keys allowed" value={health.ai.tenantApiKeysAllowed ? 'Yes' : 'No'} />
                </div>
                <div className="grid gap-3">
                  {Object.entries(health.ai.providers || {}).map(([provider, status]) => (
                    <div key={provider} className="flex items-center justify-between rounded-2xl border bg-muted/20 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold capitalize">{provider}</p>
                        <p className="text-xs text-muted-foreground">
                          {status.configured ? `Model: ${status.model}` : 'Provider credentials missing'}
                        </p>
                      </div>
                      <Badge className={cn('border', readinessTone(status.configured))}>
                        {status.configured ? 'Configured' : 'Unavailable'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Loading AI provider state…</p>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Operator Notes</CardTitle>
            <CardDescription>
              Quick interpretation of the current runtime before approving deployments or running lifecycle automations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Insight
              tone={health?.databaseConfigured ? 'emerald' : 'amber'}
              title="Control-plane storage"
              body={health?.databaseConfigured
                ? 'Database connectivity is configured for tenant and platform operations.'
                : 'Database configuration is missing. Admin actions and tenant lifecycle operations cannot be trusted.'}
            />
            <Insight
              tone={health?.emailConfigured ? 'emerald' : 'amber'}
              title="Lifecycle email automation"
              body={health?.emailConfigured
                ? 'Sender variables are present for payment reminders and trial lifecycle messaging.'
                : 'Transactional sender configuration is incomplete. Billing reminders and automated lifecycle mail will fail.'}
            />
            <Insight
              tone={health?.ai?.configured ? 'emerald' : 'amber'}
              title="AI provider routing"
              body={health?.ai?.configured
                ? 'Platform-level AI provider configuration is available for enrichment and reply orchestration.'
                : 'AI provider keys are missing, so onboarding enrichment and runtime AI orchestration are degraded.'}
            />
            <p className="text-xs text-muted-foreground">
              Last checked {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'just now'}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-2xl border bg-muted/20 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Insight({ title, body, tone }) {
  const className = tone === 'emerald'
    ? 'border-emerald-500/20 bg-emerald-500/5'
    : 'border-amber-500/20 bg-amber-500/5';

  return (
    <div className={cn('rounded-2xl border p-4', className)}>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
