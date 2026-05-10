'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Bot, BrainCircuit, CheckCircle2, FlaskConical, KeyRound, RefreshCcw, Save, ShieldCheck, Sparkles } from 'lucide-react';

import { adminApi } from '@/lib/adminApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

function summarizeConfig(config) {
  return {
    ...config,
    enabledModelsText: Array.isArray(config.enabledModels) ? config.enabledModels.join('\n') : '',
    starterModel: config.defaultModelByPlan?.starter || '',
    growthModel: config.defaultModelByPlan?.growth || '',
    proModel: config.defaultModelByPlan?.pro || '',
    enterpriseModel: config.defaultModelByPlan?.enterprise || '',
    chatorName: config.chator?.name || 'Chator',
    hierarchyMode: config.chator?.hierarchyMode || 'platform-defaults',
    tenantIsolation: config.chator?.tenantIsolation !== false,
    openaiApiKey: '',
    anthropicApiKey: '',
  };
}

export default function AdminAiPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [config, setConfig] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [tenantUsage, setTenantUsage] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);

  async function load() {
    try {
      setLoading(true);
      const [data, diag] = await Promise.allSettled([
        adminApi.get('/api/admin/ai-control'),
        adminApi.get('/api/admin/ai/diagnostics'),
      ]);
      if (data.status === 'fulfilled') {
        setConfig(data.value?.config ? summarizeConfig(data.value.config) : null);
        setProviderStatus(data.value?.providerStatus || null);
        setTenantUsage(Array.isArray(data.value?.tenantUsage) ? data.value.tenantUsage : []);
        setAvailableModels(Array.isArray(data.value?.availableModels) ? data.value.availableModels : []);
      } else {
        toast.error(data.reason?.message || 'Could not load AI control plane');
      }
      if (diag.status === 'fulfilled') setDiagnostics(diag.value);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => tenantUsage.reduce((acc, tenant) => {
    acc.tenants += 1;
    acc.messages += Number(tenant.messagesCount || 0);
    acc.seats += Number(tenant.purchasedSeats || 0);
    return acc;
  }, { tenants: 0, messages: 0, seats: 0 }), [tenantUsage]);

  function setField(field, value) {
    setConfig((current) => ({ ...current, [field]: value }));
  }

  async function testProvider() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminApi.post('/api/admin/ai/test-provider', {});
      setTestResult({ ok: true, provider: result.provider, model: result.model, reply: result.reply, latencyMs: result.latencyMs });
      toast.success(`Provider OK — ${result.provider}/${result.model} (${result.latencyMs}ms)`);
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
      toast.error(`Provider test failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      const providerCredentials = {};
      if (String(config.openaiApiKey || '').trim()) providerCredentials.openaiApiKey = String(config.openaiApiKey).trim();
      if (String(config.anthropicApiKey || '').trim()) providerCredentials.anthropicApiKey = String(config.anthropicApiKey).trim();

      const payload = {
        provider: config.provider,
        activeModel: config.activeModel,
        fallbackModel: config.fallbackModel,
        enabledModels: String(config.enabledModelsText || '')
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        safetyMode: config.safetyMode,
        responseMode: config.responseMode,
        temperature: Number(config.temperature || 0),
        topP: Number(config.topP || 1),
        providerCredentials,
        defaultModelByPlan: {
          starter: config.starterModel || '',
          growth: config.growthModel || '',
          pro: config.proModel || '',
          enterprise: config.enterpriseModel || '',
        },
        chator: {
          ...(config.chator || {}),
          name: config.chatorName || 'Chator',
          hierarchyMode: config.hierarchyMode || 'platform-defaults',
          tenantIsolation: config.tenantIsolation !== false,
        },
      };

      const response = await adminApi.patch('/api/admin/ai-control', payload);
      setConfig(response?.config ? summarizeConfig(response.config) : null);
      setProviderStatus(response?.providerStatus || providerStatus);
      toast.success('AI control plane updated');
    } catch (err) {
      toast.error(err.message || 'Could not update AI settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="px-5 py-8 text-sm text-muted-foreground md:px-8">Loading AI control plane…</div>;
  }

  if (!config) return null;

  return (
    <div className="mx-auto flex max-w-[1680px] flex-col gap-8 px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            <Bot className="h-3.5 w-3.5" />
            AI Operations
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Platform AI Control</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Control provider routing, model defaults, and tenant isolation from a single platform surface.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={load} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={testProvider} disabled={testing} className="gap-2">
            <FlaskConical className="h-4 w-4" />
            {testing ? 'Testing…' : 'Test provider'}
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save controls'}
          </Button>
        </div>
      </div>

      {providerStatus && !providerStatus.configured && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-4 text-sm text-red-600 dark:text-red-400">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">No AI provider configured — AI auto-replies will not work</p>
            <p className="mt-1 text-xs opacity-80">
              Enter an Anthropic or OpenAI API key in the fields below, then click &quot;Save controls&quot;.
              Alternatively set <code className="rounded bg-red-500/10 px-1">PLATFORM_ANTHROPIC_API_KEY</code> or{' '}
              <code className="rounded bg-red-500/10 px-1">PLATFORM_OPENAI_API_KEY</code> in your environment variables.
            </p>
          </div>
        </div>
      )}

      {testResult && (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-4 text-sm ${testResult.ok ? 'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400' : 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400'}`}>
          {testResult.ok
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
          <div>
            {testResult.ok
              ? <p className="font-semibold">Provider OK — {testResult.provider} / {testResult.model} ({testResult.latencyMs}ms)</p>
              : <p className="font-semibold">Provider test failed: {testResult.error}</p>}
            {testResult.reply && <p className="mt-1 text-xs opacity-70 font-mono">{testResult.reply}</p>}
          </div>
        </div>
      )}

      {diagnostics && (
        <div className="rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Provider diagnostics</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Configured</span>
              <span className={`font-semibold ${diagnostics.platform?.configured ? 'text-green-600' : 'text-red-500'}`}>
                {diagnostics.platform?.configured ? 'Yes' : 'No — key missing'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Provider</span>
              <span className="font-medium capitalize">{diagnostics.platform?.provider || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Active model</span>
              <span className="font-mono text-xs">{diagnostics.platform?.model || '—'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">BYOK tenants</span>
              <span className="font-medium">{diagnostics.byok?.tenantCount ?? '—'}</span>
            </div>
          </div>
          {Array.isArray(diagnostics.recentFailures) && diagnostics.recentFailures.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-orange-600">Recent AI failures (24h)</p>
              <div className="flex flex-wrap gap-2">
                {diagnostics.recentFailures.map((f) => (
                  <span key={f.reason} className="rounded-full border border-orange-500/20 bg-orange-500/5 px-2.5 py-0.5 text-[11px] font-mono text-orange-700 dark:text-orange-400">
                    {f.reason} × {f.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Provider" value={diagnostics?.platform?.provider || providerStatus?.provider || config.provider || 'Unknown'} icon={Sparkles} />
        <MetricCard label="Active model" value={diagnostics?.platform?.model || config.activeModel || '—'} icon={BrainCircuit} />
        <MetricCard label="Observed messages" value={totals.messages.toLocaleString()} icon={ShieldCheck} />
        <MetricCard label="Allocated seats" value={totals.seats.toLocaleString()} icon={KeyRound} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Provider and runtime configuration</CardTitle>
            <CardDescription>
              Centralize provider credentials, active routing model, safety posture, and plan-specific defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Provider">
                <Select value={config.provider} onValueChange={(value) => setField('provider', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Active model">
                <Select value={config.activeModel} onValueChange={(value) => setField('activeModel', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {availableModels.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fallback model">
                <Select value={config.fallbackModel || '__none__'} onValueChange={(value) => setField('fallbackModel', value === '__none__' ? '' : value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {availableModels.map((model) => <SelectItem key={model} value={model}>{model}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Safety mode">
                <Select value={config.safetyMode} onValueChange={(value) => setField('safetyMode', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strict">Strict</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="Enabled model allowlist">
                <Textarea
                  rows={7}
                  value={config.enabledModelsText}
                  onChange={(event) => setField('enabledModelsText', event.target.value)}
                  className="min-h-[170px]"
                />
              </Field>
              <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Temperature">
                    <Input type="number" step="0.1" min="0" max="2" value={config.temperature} onChange={(event) => setField('temperature', event.target.value)} />
                  </Field>
                  <Field label="Top P">
                    <Input type="number" step="0.1" min="0" max="1" value={config.topP} onChange={(event) => setField('topP', event.target.value)} />
                  </Field>
                </div>
                <Field label="Response mode">
                  <Select value={config.responseMode} onValueChange={(value) => setField('responseMode', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                      <SelectItem value="high-accuracy">High accuracy</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="OpenAI key override">
                    <Input type="password" placeholder="Leave blank to keep current secret" value={config.openaiApiKey} onChange={(event) => setField('openaiApiKey', event.target.value)} />
                  </Field>
                  <Field label="Anthropic key override">
                    <Input type="password" placeholder="Leave blank to keep current secret" value={config.anthropicApiKey} onChange={(event) => setField('anthropicApiKey', event.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ProviderBadge
                    label="OpenAI"
                    configured={providerStatus?.providers?.openai?.configured}
                    model={providerStatus?.providers?.openai?.model}
                  />
                  <ProviderBadge
                    label="Anthropic"
                    configured={providerStatus?.providers?.anthropic?.configured}
                    model={providerStatus?.providers?.anthropic?.model}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {['starter', 'growth', 'pro', 'enterprise'].map((plan) => (
                <Field key={plan} label={`${plan} default`}>
                  <Select value={config[`${plan}Model`] || '__inherit__'} onValueChange={(value) => setField(`${plan}Model`, value === '__inherit__' ? '' : value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__inherit__">Inherit active model</SelectItem>
                      {availableModels.map((model) => <SelectItem key={`${plan}-${model}`} value={model}>{model}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Chator hierarchy</CardTitle>
              <CardDescription>
                Platform-wide parent-agent identity and tenant isolation behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Master AI name">
                <Input value={config.chatorName} onChange={(event) => setField('chatorName', event.target.value)} />
              </Field>
              <Field label="Hierarchy mode">
                <Select value={config.hierarchyMode} onValueChange={(value) => setField('hierarchyMode', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="platform-defaults">Platform defaults</SelectItem>
                    <SelectItem value="tenant-overrides">Tenant overrides allowed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-center justify-between rounded-2xl border bg-muted/20 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Strict tenant isolation</p>
                  <p className="text-xs text-muted-foreground">Keep tenant model policy isolated from other workspaces.</p>
                </div>
                <Button
                  type="button"
                  variant={config.tenantIsolation !== false ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setField('tenantIsolation', config.tenantIsolation === false)}
                >
                  {config.tenantIsolation !== false ? 'Strict' : 'Loose'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Tenant AI visibility</CardTitle>
              <CardDescription>
                Live snapshot of plan, seat footprint, and message load across tenant-scoped agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tenantUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tenant AI activity found.</p>
              ) : tenantUsage.map((tenant) => (
                <div key={tenant.tenantId} className="flex items-start justify-between gap-4 rounded-2xl border bg-muted/20 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{tenant.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tenant.plan} · {tenant.aiAgentName || 'Default agent'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold">{Number(tenant.messagesCount || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{tenant.purchasedSeats} seats</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted/30">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderBadge({ label, configured, model }) {
  return (
    <div className="rounded-2xl border bg-background/80 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <Badge className={cn('border', configured ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-amber-500/20 bg-amber-500/5 text-amber-500')}>
          {configured ? 'Configured' : 'Missing'}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{configured ? model : 'Provider credentials unavailable'}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
