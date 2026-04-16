'use client';

import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import {
  EmptyState,
  LoadingGrid,
  StatusBanner,
} from '@/components/dashboard/ResourceState';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const channelMeta = {
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: '📱' },
  instagram: { label: 'Instagram', color: '#E1306C', icon: '📸' },
  messenger: { label: 'Messenger', color: '#0099FF', icon: '💬' },
  livechat: { label: 'Live Chat', color: '#6366f1', icon: '⚡' },
};

function buildRange(days) {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return `?from=${from.toISOString().slice(0, 10)}`;
}

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: 'var(--bg4)',
      border: '1px solid var(--b2)',
      borderRadius: 12,
      padding: '10px 12px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--t3)', marginBottom: 4 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color, fontWeight: 700 }}>
          {entry.dataKey === 'revenue'
            ? money.format(Number(entry.value || 0))
            : `${entry.value} deals`}
        </div>
      ))}
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          background: `${color}18`,
          border: `1px solid ${color}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}>
          {icon}
        </div>
        <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Live
        </div>
      </div>
      <div>
        <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--t1)' }}>
          {value}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', marginTop: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error, loading, lastUpdated, reload } = usePollingResource(async () => {
    const rangeQuery = buildRange(6);
    const [revenue, deals, conversations] = await Promise.all([
      api.get(`/api/reports/revenue${rangeQuery}`),
      api.get('/api/deals'),
      api.get('/api/conversations?limit=100'),
    ]);

    return {
      revenue: Array.isArray(revenue) ? revenue : [],
      deals: Array.isArray(deals) ? deals : [],
      conversations: Array.isArray(conversations) ? conversations : [],
    };
  }, [], { intervalMs: 45000, initialData: { revenue: [], deals: [], conversations: [] } });

  const revenueSeries = useMemo(() => {
    const rows = data?.revenue || [];
    return rows.map((row) => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Number(row.revenue || 0),
      dealsWon: Number(row.deals_won || 0),
    }));
  }, [data]);

  const stageSeries = useMemo(() => {
    const counts = new Map();
    for (const deal of data?.deals || []) {
      const stage = String(deal.stage || 'new_lead');
      counts.set(stage, (counts.get(stage) || 0) + 1);
    }

    return [
      ['new_lead', '#6366f1'],
      ['engaged', '#8b5cf6'],
      ['negotiation', '#06b6d4'],
      ['closing', '#10b981'],
      ['won', '#22c55e'],
      ['lost', '#f97316'],
    ].map(([stage, color]) => ({
      stage,
      label: stage.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      total: counts.get(stage) || 0,
      color,
    }));
  }, [data]);

  const channelSeries = useMemo(() => {
    const counts = new Map();
    for (const conversation of data?.conversations || []) {
      const channel = String(conversation.channel || 'unknown');
      counts.set(channel, (counts.get(channel) || 0) + 1);
    }

    return [...counts.entries()]
      .map(([channel, total]) => ({
        channel,
        total,
        ...channelMeta[channel],
      }))
      .sort((left, right) => right.total - left.total);
  }, [data]);

  const recentConversations = useMemo(() => (
    [...(data?.conversations || [])]
      .sort((left, right) => new Date(right.updated_at) - new Date(left.updated_at))
      .slice(0, 6)
  ), [data]);

  const totals = useMemo(() => {
    const deals = data?.deals || [];
    const conversations = data?.conversations || [];
    return {
      revenue: revenueSeries.reduce((sum, row) => sum + row.revenue, 0),
      activeDeals: deals.filter((deal) => !['won', 'lost'].includes(deal.stage)).length,
      wonDeals: deals.filter((deal) => deal.stage === 'won').length,
      openConversations: conversations.filter((conversation) => conversation.status === 'open').length,
      pipelineValue: deals
        .filter((deal) => !['won', 'lost'].includes(deal.stage))
        .reduce((sum, deal) => sum + Number(deal.estimated_value || 0), 0),
    };
  }, [data, revenueSeries]);

  return (
    <div style={{ padding: '28px 28px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Revenue Control Center</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            Real dashboard data from deals, conversations, and revenue reports.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdated && (
            <div style={{ fontSize: 12, color: 'var(--t4)' }}>
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>
        </div>
      </div>

      {error && (
        <StatusBanner
          tone="error"
          title="Overview data could not be loaded"
          description={error}
          actionLabel="Retry"
          onAction={reload}
        />
      )}

      {loading ? (
        <LoadingGrid />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          <MetricCard
            label="Revenue"
            value={money.format(totals.revenue)}
            sub="Last 7 days"
            color="#10b981"
            icon="💰"
          />
          <MetricCard
            label="Open Conversations"
            value={totals.openConversations.toLocaleString()}
            sub="Current inbox load"
            color="#6366f1"
            icon="💬"
          />
          <MetricCard
            label="Active Deals"
            value={totals.activeDeals.toLocaleString()}
            sub={`Pipeline ${money.format(totals.pipelineValue)}`}
            color="#8b5cf6"
            icon="🎯"
          />
          <MetricCard
            label="Deals Won"
            value={totals.wonDeals.toLocaleString()}
            sub="Closed successfully"
            color="#06b6d4"
            icon="🏁"
          />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(280px,1fr)', gap: 16 }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>Revenue Trend</div>
              <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>
                /api/reports/revenue over the last 7 days
              </div>
            </div>
          </div>

          {revenueSeries.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="overviewRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#overviewRevenue)" />
                <Area type="monotone" dataKey="dealsWon" stroke="#06b6d4" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No revenue data yet"
              description="Once report rows are generated, the 7-day revenue trend will appear here."
            />
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 18 }}>Deal Stages</div>
          {stageSeries.some((entry) => entry.total > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stageSeries}>
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {stageSeries.map((entry) => (
                    <Cell key={entry.stage} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No deals available"
              description="As new conversations are qualified, the live stage mix will populate here."
            />
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(280px,0.8fr)', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 18 }}>Recent Conversations</div>
          {recentConversations.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  style={{
                    border: '1px solid var(--b1)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                      {conversation.customer_name || 'Unknown customer'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>
                      {conversation.last_message || 'No messages yet'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 700 }}>
                      {channelMeta[conversation.channel]?.icon || '💬'} {channelMeta[conversation.channel]?.label || conversation.channel}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 4 }}>
                      {new Date(conversation.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No conversations found"
              description="Connected channels will start feeding this list as soon as messages arrive."
            />
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', marginBottom: 18 }}>Channel Mix</div>
          {channelSeries.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {channelSeries.map((channel) => (
                <div key={channel.channel}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>
                      {channel.icon} {channel.label || channel.channel}
                    </div>
                    <div style={{ fontSize: 12.5, color: channel.color || '#94a3b8', fontWeight: 800 }}>
                      {channel.total}
                    </div>
                  </div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--s2)' }}>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        width: `${(channel.total / Math.max(channelSeries[0]?.total || 1, 1)) * 100}%`,
                        background: channel.color || '#94a3b8',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No channel activity yet"
              description="Conversation channel distribution appears after the first synced messages."
            />
          )}
        </div>
      </div>
    </div>
  );
}
