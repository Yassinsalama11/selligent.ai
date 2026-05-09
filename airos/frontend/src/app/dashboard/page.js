'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'recharts';
import { RefreshCcw, DollarSign, MessageSquare, Target, CheckCircle2, TrendingUp, History, PieChart, Activity as LucideActivity, Smartphone, Camera, MessageCircle, Monitor } from 'lucide-react';

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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/ui/section-header';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const channelMeta = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', Icon: Smartphone },
  instagram: { label: 'Instagram', color: '#E1306C', Icon: Camera },
  messenger: { label: 'Messenger', color: '#0099FF', Icon: MessageCircle },
  livechat:  { label: 'Live Chat', color: '#ff5a1f', Icon: Monitor },
};

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
      <div className="text-muted-foreground mb-1.5 font-bold uppercase tracking-widest text-[9px] opacity-70">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground capitalize">{entry.name}:</span>
            </div>
            <span style={{ color: entry.color }}>
              {entry.dataKey === 'revenue'
                ? money.format(Number(entry.value || 0))
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon: Icon, href }) {
  const router = useRouter();
  return (
    <Card
      className={cn('group transition-all duration-300 relative overflow-hidden bg-card', href && 'hover:shadow-md cursor-pointer')}
      onClick={href ? () => router.push(href) : undefined}
    >
      <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity" style={{ color }}>
        <Icon className="w-full h-full" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: color }} />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="text-[13px] font-medium text-muted-foreground/80 mt-1">{label}</p>
        <p className="text-[11px] text-muted-foreground/40 mt-1.5 flex items-center gap-1">
          <LucideActivity className="h-3 w-3" />
          {sub}
        </p>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height = 280 }) {
  return <Skeleton className="w-full rounded-lg" style={{ height }} />;
}

const EMPTY_DATA = {
  openConversations: 0,
  activeDeals: 0,
  pipelineValue: 0,
  wonDeals: 0,
  revenueSeries: [],
  stageBreakdown: {},
  channelBreakdown: [],
  recentConversations: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const { data, error, loading, refreshing, lastUpdated, reload } = usePollingResource(
    () => api.get('/api/dashboard'),
    [],
    { intervalMs: 90000, initialData: EMPTY_DATA },
  );

  const revenueSeries = useMemo(() => {
    return (data?.revenueSeries || []).map((row) => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Number(row.revenue || 0),
      dealsWon: Number(row.deals_won || 0),
    }));
  }, [data]);

  const stageSeries = useMemo(() => {
    const stageMap = data?.stageBreakdown || {};
    return [
      ['new_lead', '#6366f1'],
      ['engaged', '#8b5cf6'],
      ['negotiation', '#f59e0b'],
      ['closing', '#10b981'],
      ['won', '#22c55e'],
      ['lost', '#f97316'],
    ].map(([stage, color]) => ({
      stage,
      label: stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      total: stageMap[stage] || 0,
      color,
    }));
  }, [data]);

  const channelSeries = useMemo(() => {
    return (data?.channelBreakdown || []).map((row) => ({
      channel: row.channel,
      total: Number(row.total || 0),
      ...channelMeta[row.channel],
    }));
  }, [data]);

  const recentConversations = useMemo(() => data?.recentConversations || [], [data]);

  return (
    <div className="p-8 pb-20 flex flex-col gap-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <SectionHeader
        title="Overview"
        description="Real-time performance metrics from deals, active conversations, and consolidated revenue reports."
      >
        {refreshing && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Refreshing…
          </div>
        )}
        {lastUpdated && !refreshing && (
          <div className="text-[11px] font-medium text-muted-foreground/50 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
            Synced {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={reload} className="gap-2 h-10 shadow-sm bg-background border-input hover:border-primary/20 transition-all font-medium">
          <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh Data
        </Button>
      </SectionHeader>

      {error && (
        <StatusBanner
          tone="error"
          title="Overview data synchronization failed"
          description={error}
          actionLabel="Retry"
          onAction={reload}
        />
      )}

      {loading ? (
        <LoadingGrid />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            label="Gross Revenue"
            value={money.format(data?.revenueSeries?.reduce((s, r) => s + Number(r.revenue || 0), 0) || 0)}
            sub="Trailing 7-day period"
            color="#10b981"
            icon={DollarSign}
            href="/dashboard/reports"
          />
          <MetricCard
            label="Open Conversations"
            value={(data?.open_conversations || data?.openConversations || 0).toLocaleString()}
            sub="Pending human replies"
            color="#6366f1"
            icon={MessageSquare}
            href="/dashboard/conversations"
          />
          <MetricCard
            label="Active Pipeline"
            value={(data?.activeDeals || 0).toLocaleString()}
            sub={`Volume ${money.format(data?.pipelineValue || 0)}`}
            color="#8b5cf6"
            icon={Target}
            href="/dashboard/deals"
          />
          <MetricCard
            label="Deals Won"
            value={(data?.wonDeals || 0).toLocaleString()}
            sub="Total closed deals"
            color="#06b6d4"
            icon={CheckCircle2}
            href="/dashboard/deals"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 overflow-hidden border shadow-sm bg-card">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                  <CardTitle>Revenue Velocity</CardTitle>
                </div>
                <CardDescription>
                  Performance tracking over the last 7 days
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-semibold bg-muted border-border text-muted-foreground px-2 shrink-0">
                Aggregated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            {loading ? (
              <ChartSkeleton height={280} />
            ) : revenueSeries.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="overviewRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    dy={12}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(1) + 'k' : v}`}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Area
                    type="monotone"
                    name="revenue"
                    dataKey="revenue"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#overviewRevenue)"
                    activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--primary)' }}
                  />
                  <Area
                    type="monotone"
                    name="deals"
                    dataKey="dealsWon"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    fillOpacity={0}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No revenue data yet"
                description="Once revenue events populate, the trend analysis will appear here."
              />
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border shadow-sm bg-card">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <CardTitle>Funnel Distribution</CardTitle>
              </div>
              <CardDescription>
                Live status of qualified pipeline leads
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            {loading ? (
              <ChartSkeleton height={280} />
            ) : stageSeries.some((entry) => entry.total > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stageSeries} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={88}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                  />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="total" name="Count" radius={[0, 4, 4, 0]} barSize={24}>
                    {stageSeries.map((entry) => (
                      <Cell key={entry.stage} fill={entry.color} opacity={0.7} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No active pipeline"
                description="Qualified leads populate this distribution."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <Card className="lg:col-span-3 overflow-hidden border shadow-sm bg-card">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <CardTitle>Recent Conversations</CardTitle>
              </div>
              <CardDescription>
                Latest activity across all enabled messaging channels
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[45%]" />
                      <Skeleton className="h-3 w-[70%] opacity-60" />
                    </div>
                    <div className="space-y-1.5 items-end flex flex-col">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-2.5 w-10 opacity-60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentConversations.length ? (
              <div className="space-y-2">
                {recentConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="group flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all cursor-pointer shadow-sm"
                    onClick={() => router.push('/dashboard/conversations')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push('/dashboard/conversations'); }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                        {conversation.customer_name || 'Anonymous Customer'}
                      </div>
                      <div className="text-[13px] text-muted-foreground/70 mt-0.5 truncate max-w-[90%] leading-relaxed">
                        {conversation.last_message || 'No events recorded.'}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[11px] font-medium text-muted-foreground/60 uppercase flex items-center justify-end gap-2">
                        {(() => { const M = channelMeta[conversation.channel]; return M ? <M.Icon className="h-3.5 w-3.5 shrink-0" style={{ color: M.color }} /> : <MessageSquare className="h-3.5 w-3.5" />; })()}
                        {channelMeta[conversation.channel]?.label || conversation.channel}
                      </div>
                      <div className="text-[10px] text-muted-foreground/40 mt-1 font-medium tracking-tight">
                        {new Date(conversation.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="No recent conversations"
                description="Incoming messages will appear here once channels are active."
              />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden border shadow-sm bg-card">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                <CardTitle>Channel Breakdown</CardTitle>
              </div>
              <CardDescription>
                Volume distribution by messaging source
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-8">
            {loading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-8 rounded-md" />
                    </div>
                    <Skeleton className="h-1.5 rounded-full" style={{ width: `${70 - i * 20}%` }} />
                  </div>
                ))}
              </div>
            ) : channelSeries.length ? (
              <div className="space-y-6">
                {channelSeries.map((channel) => (
                  <div key={channel.channel} className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2.5 text-muted-foreground">
                        {channel.Icon && (
                          <channel.Icon className="h-4 w-4 shrink-0" style={{ color: channel.color }} />
                        )}
                        <span className="font-semibold">{channel.label || channel.channel}</span>
                      </div>
                      <div className="text-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/30">{channel.total}</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden border border-border/10">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${(channel.total / Math.max(channelSeries[0]?.total || 1, 1)) * 100}%`,
                          backgroundColor: channel.color || 'var(--primary)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={PieChart}
                title="No channels active"
                description="Connect messaging channels to see volume distribution."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
