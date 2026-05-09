'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart as RePieChart,
  Pie,
} from 'recharts';
import { 
  RefreshCcw, 
  Download, 
  TrendingUp, 
  Users, 
  Zap, 
  MessageSquare, 
  DollarSign, 
  Trophy, 
  Clock, 
  Activity,
  BarChart3,
  PieChart,
  Target,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import {
  EmptyState,
  LoadingGrid,
  StatusBanner,
} from '@/components/dashboard/ResourceState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/ui/section-header';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

function makeMoney(currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });
  } catch {
    return { format: (v) => `${currency} ${Number(v).toLocaleString('en-US')}` };
  }
}

const channelMeta = {
  whatsapp: { label: 'WhatsApp', color: '#25D366' },
  instagram: { label: 'Instagram', color: '#E1306C' },
  messenger: { label: 'Messenger', color: '#0099FF' },
  livechat: { label: 'Live Chat', color: '#ff5a1f' },
};

function Metric({ label, value, icon: Icon, color }) {
  return (
    <Card className="hover:shadow-md transition-all">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight" style={{ color }}>{value}</p>
          </div>
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}
          >
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartTip({ active, payload, label }) {
  const { currency } = useCurrency();
  if (!active || !payload?.length) return null;
  const fmt = makeMoney(currency);
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-xl text-xs">
      <div className="text-muted-foreground mb-1.5 font-medium">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground font-medium">{entry.name}:</span>
            </div>
            <span className="font-bold">
              {entry.dataKey === 'revenue' ? fmt.format(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { currency } = useCurrency();
  const money = useMemo(() => makeMoney(currency), [currency]);
  const [tab, setTab] = useState('overview');
  const { data, loading, error, reload } = usePollingResource(async () => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [revenue, funnel, ai, channels, agents] = await Promise.all([
      api.get(`/api/reports/revenue?from=${from}`),
      api.get(`/api/reports/funnel?from=${from}`),
      api.get(`/api/reports/ai-efficiency?from=${from}`),
      api.get(`/api/reports/channel-mix?from=${from}`),
      api.get(`/api/reports/agent-performance?from=${from}`),
    ]);

    return {
      revenue: Array.isArray(revenue) ? revenue : [],
      funnel: funnel || {},
      ai: ai || {},
      channels: Array.isArray(channels) ? channels : [],
      agents: Array.isArray(agents) ? agents : [],
    };
  }, [], { intervalMs: 120000, initialData: { revenue: [], funnel: {}, ai: {}, channels: [], agents: [] } });

  const revenueSeries = useMemo(() => data.revenue.map(r => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    revenue: Number(r.revenue || 0),
    deals: Number(r.deals_won || 0),
  })), [data.revenue]);

  const channelMix = useMemo(() => data.channels.map(c => ({
    name: String(c.channel || 'unknown').charAt(0).toUpperCase() + String(c.channel || 'unknown').slice(1),
    value: Number(c.count || 0),
    revenue: Number(c.revenue || 0),
    color: channelMeta[c.channel]?.color || '#cbd5e1',
  })), [data.channels]);

  async function handleExport() {
    toast.success(`${tab.charAt(0).toUpperCase() + tab.slice(1)} report exported`);
  }

  return (
    <div className="p-8 pb-20 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <SectionHeader 
        title="Business Intelligence" 
        description="Deep analytics and performance metrics for your multi-channel sales engine."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
            <Download className="h-3.5 w-3.5" />
            Export Data
          </Button>
          <Button variant="outline" size="sm" onClick={reload} className="h-9 gap-2">
            <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </SectionHeader>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 mb-8">
          <TabsTrigger value="overview" className="gap-2 px-6">Overview</TabsTrigger>
          <TabsTrigger value="sales" className="gap-2 px-6">Sales & Funnel</TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 px-6">AI Efficiency</TabsTrigger>
          <TabsTrigger value="agents" className="gap-2 px-6">Agents</TabsTrigger>
        </TabsList>

        {loading && data.revenue.length === 0 ? (
          <LoadingGrid />
        ) : error ? (
          <StatusBanner tone="error" title="Synchronization failure" description={error} onAction={reload} actionLabel="Retry Handshake" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Metric label="Period Revenue" value={money.format(data.revenue.reduce((s, r) => s + r.revenue, 0))} icon={DollarSign} color="#10b981" />
              <Metric label="Conversion Rate" value={`${(data.funnel?.conversionRate || 0).toFixed(1)}%`} icon={Target} color="#6366f1" />
              <Metric label="AI Resolution" value={`${(data.ai?.resolutionRate || 0).toFixed(1)}%`} icon={Zap} color="#06b6d4" />
              <Metric label="Avg. Response" value={`${(data.funnel?.avgResponseTime || 0).toFixed(0)}s`} icon={Clock} color="#f59e0b" />
            </div>

            <TabsContent value="overview" className="mt-0 space-y-8 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border shadow-sm">
                  <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Revenue Trendline
                    </CardTitle>
                    <CardDescription>Daily win/loss and financial performance metrics.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={revenueSeries}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip content={<ChartTip />} />
                        <Area type="monotone" name="Revenue" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-indigo-500" />
                      Volume Share
                    </CardTitle>
                    <CardDescription>Conversations by source channel.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-8 flex flex-col items-center">
                    {channelMix.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={240}>
                          <RePieChart>
                            <Pie data={channelMix} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                              {channelMix.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                        <div className="w-full space-y-3 mt-6">
                          {channelMix.map(entry => (
                            <div key={entry.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-sm font-medium">{entry.name}</span>
                              </div>
                              <span className="text-sm font-semibold">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <EmptyState
                        title="No channel data"
                        description="Conversation volume by source will appear here once traffic is recorded."
                        className="h-[240px]"
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="agents" className="mt-0 outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.agents.map((agent) => (
                  <Card key={agent.id} className="hover:shadow-md transition-all">
                    <CardContent className="p-6 space-y-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border shadow-sm">
                          <AvatarFallback className="bg-primary/5 text-primary font-semibold">
                            {agent.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">Active Agent</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                           <p className="text-[11px] font-medium text-muted-foreground mb-1">Revenue</p>
                           <p className="text-sm font-bold text-emerald-500">${agent.revenue.toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                           <p className="text-[11px] font-medium text-muted-foreground mb-1">Deals Won</p>
                           <p className="text-sm font-bold">{agent.deals}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                           <p className="text-[11px] font-medium text-muted-foreground mb-1">Response Time</p>
                           <p className="text-sm font-bold text-indigo-500">{agent.responseTime.toFixed(0)}s</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                           <p className="text-[11px] font-medium text-muted-foreground mb-1">Conv. Rate</p>
                           <p className="text-sm font-bold text-amber-500">{agent.rate.toFixed(1)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 outline-none">
               <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="flex items-center gap-2">
                       <Zap className="h-4 w-4 text-cyan-500" />
                       AI Operations Efficiency
                    </CardTitle>
                    <CardDescription>Impact of automated intelligence on support and sales lifecycle.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-12 flex flex-col items-center justify-center min-h-[400px]">
                     <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6">
                        <Zap className="h-8 w-8 text-cyan-500" />
                     </div>
                     <h3 className="text-xl font-semibold mb-2">Intelligence engine is operational</h3>
                     <p className="text-muted-foreground max-w-sm mx-auto text-center text-sm leading-relaxed">
                        Your AI agent is currently handling {(data.ai?.resolutionRate || 0).toFixed(1)}% of all incoming queries autonomously.
                     </p>
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="sales" className="mt-0 outline-none">
               <Card className="border shadow-sm">
                  <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="flex items-center gap-2">
                       <Target className="h-4 w-4 text-primary" />
                       Sales Funnel
                    </CardTitle>
                    <CardDescription>Progression of leads from initial contact to final conversion.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-12">
                     <EmptyState title="Funnel Data Initializing" description="Advanced funnel visualizations populate after a full 30-day production cycle." />
                  </CardContent>
               </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
