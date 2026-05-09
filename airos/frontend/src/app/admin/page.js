'use client';

import * as React from 'react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { 
  Users, 
  TrendingUp, 
  MessageSquare, 
  MessageCircle, 
  UserCircle2, 
  Zap, 
  ArrowRight,
  RefreshCcw,
  Globe,
  Bot,
  Shield,
  Clock
} from 'lucide-react';
import { adminApi } from '@/lib/adminApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

function formatMoney(value) {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'No activity yet';
  return new Date(value).toLocaleString('en-US', {
    month:'short',
    day:'numeric',
    year:'numeric',
  });
}

function AdminMetricCard({ label, value, sub, color, icon: Icon, loading }) {
  return (
    <Card className="relative overflow-hidden group">
      <div 
        className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
        style={{ color }}
      >
        <Icon className="w-full h-full" />
      </div>
      <CardHeader className="pb-2">
        <CardDescription className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-9 w-24 bg-muted animate-pulse rounded-md" />
        ) : (
          <div className="text-3xl font-black tracking-tighter" style={{ color }}>{value}</div>
        )}
        <p className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-tight">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  async function load() {
    let cancelled = false;
    try {
      setLoading(true);
      setError('');
      const next = await adminApi.get('/api/admin/overview');
      if (!cancelled) setData(next);
    } catch (err) {
      if (!cancelled) setError(err.message || 'Could not load admin overview');
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => { cancelled = true; };
  }

  useEffect(() => {
    load();
  }, []);

  const totals = data?.totals || {
    totalClients: 0,
    monthlyRevenue: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalCustomers: 0,
    connectedChannels: 0,
    byStatus: { active: 0, trialing: 0, payment_due: 0, overdue: 0, suspended: 0, cancelled: 0 },
  };

  return (
    <div className="p-8 pb-12 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">Platform Control</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Consolidated real-time operational data across all live tenant workspaces.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={load} className="gap-2 h-9">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Sync
          </Button>
          <Button asChild className="h-9 bg-primary group">
            <Link href="/admin/clients" className="gap-2">
              Manage Clients
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive font-medium flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AdminMetricCard 
          label="Tenants" 
          value={totals.totalClients} 
          sub={`${totals.byStatus.active || 0} paid • ${totals.byStatus.trialing || 0} trialing`} 
          color="#6366f1" 
          icon={Users} 
          loading={loading}
        />
        <AdminMetricCard 
          label="MRR" 
          value={formatMoney(totals.monthlyRevenue)} 
          sub="Subscription Value" 
          color="#f59e0b" 
          icon={TrendingUp} 
          loading={loading}
        />
        <AdminMetricCard 
          label="Threads" 
          value={Number(totals.totalConversations || 0).toLocaleString()} 
          sub="Inbound volume" 
          color="#06b6d4" 
          icon={MessageSquare} 
          loading={loading}
        />
        <AdminMetricCard 
          label="Messages" 
          value={Number(totals.totalMessages || 0).toLocaleString()} 
          sub="Processed events" 
          color="#10b981" 
          icon={MessageCircle} 
          loading={loading}
        />
        <AdminMetricCard 
          label="Customers" 
          value={Number(totals.totalCustomers || 0).toLocaleString()} 
          sub="Live CRM records" 
          color="#8b5cf6" 
          icon={UserCircle2} 
          loading={loading}
        />
        <AdminMetricCard 
          label="Integrations" 
          value={Number(totals.connectedChannels || 0).toLocaleString()} 
          sub="Active webhooks" 
          color="#f43f5e" 
          icon={Zap} 
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> Custom AI</CardTitle>
            <CardDescription>Tenant AI config status and prompt risk signals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.enterpriseFeatures?.customAi || []).slice(0, 5).map((item) => (
              <div key={item.tenantId} className="rounded-xl border bg-background/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold truncate">{item.tenantName}</p>
                  {item.unsafePromptWarning && <Badge variant="destructive">Prompt warning</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{item.agentName || 'No agent name'} · {formatDate(item.lastUpdated)}</p>
              </div>
            ))}
            {!loading && (data?.enterpriseFeatures?.customAi || []).length === 0 && <p className="text-sm text-muted-foreground">No custom AI configurations.</p>}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> SSO</CardTitle>
            <CardDescription>Enabled tenants, providers, domains, and last login.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.enterpriseFeatures?.sso || []).slice(0, 5).map((item) => (
              <div key={item.tenantId} className="rounded-xl border bg-background/50 p-3">
                <p className="text-sm font-bold truncate">{item.tenantName}</p>
                <p className="text-xs text-muted-foreground">{item.provider} · {(item.domains || []).join(', ') || 'No domains'} · {formatDate(item.lastLoginAt)}</p>
                {item.lastError && <p className="text-xs text-destructive mt-1">{item.lastError}</p>}
              </div>
            ))}
            {!loading && (data?.enterpriseFeatures?.sso || []).length === 0 && <p className="text-sm text-muted-foreground">No SSO-enabled tenants.</p>}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Priority Support</CardTitle>
            <CardDescription>Priority tickets, SLA due dates, and escalation queue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.enterpriseFeatures?.prioritySupport || []).slice(0, 5).map((ticket) => (
              <div key={ticket.id} className="rounded-xl border bg-background/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold truncate">{ticket.subject}</p>
                  {ticket.escalationState === 'escalated' && <Badge variant="destructive">Escalated</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{ticket.tenantName} · {ticket.status} · SLA {formatDate(ticket.slaDueAt)}</p>
              </div>
            ))}
            {!loading && (data?.enterpriseFeatures?.prioritySupport || []).length === 0 && <p className="text-sm text-muted-foreground">No priority tickets.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Newest Clients */}
        <Card className="border-none shadow-xl bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Registration Timeline</CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest opacity-60">Latest onboarding activity</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold border-muted">Chronological</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.recentClients || []).length === 0 && !loading && (
                <div className="py-12 text-center text-muted-foreground text-sm italic">No recent registrations.</div>
              )}
              {(data?.recentClients || []).map((client) => (
                <div key={client.id} className="group flex items-center justify-between p-4 rounded-xl border bg-background/50 hover:bg-muted/50 transition-all border-transparent hover:border-muted">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs font-bold uppercase tracking-tighter">
                      {client.name?.[0] || 'T'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate group-hover:text-primary transition-colors">{client.name}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="uppercase font-black">{client.plan}</span>
                        <span>•</span>
                        <span className="truncate">{client.owner?.email || client.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[11px] font-bold text-foreground mb-1 flex items-center justify-end gap-1.5">
                      <Globe className="h-3 w-3 opacity-30" />
                      {client.country || 'Global'}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter opacity-50">
                      {formatDate(client.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card className="border-none shadow-xl bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between pb-6">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Performance Leaders</CardTitle>
              <CardDescription className="text-xs font-medium uppercase tracking-widest opacity-60">Sorted by processing load</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-bold border-muted">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(data?.topClients || []).length === 0 && !loading && (
                <div className="py-12 text-center text-muted-foreground text-sm italic">No workload data available.</div>
              )}
              {(data?.topClients || []).map((client) => (
                <div key={client.id} className="group flex items-center gap-6 p-4 rounded-xl border bg-background/50 hover:bg-muted/50 transition-all border-transparent hover:border-muted">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate group-hover:text-primary transition-colors">{client.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">{client.owner?.email || client.email}</div>
                  </div>
                  
                  <div className="flex items-center gap-8 shrink-0">
                    <div className="text-right w-24">
                      <div className="text-sm font-black text-emerald-500">{Number(client.messagesCount || 0).toLocaleString()}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Messages</div>
                    </div>
                    <div className="text-right w-24">
                      <div className="text-sm font-black text-indigo-500">{Number(client.conversationsCount || 0).toLocaleString()}</div>
                      <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Threads</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
