'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { api } from '@/lib/api';
import { usePollingResource } from '@/lib/usePollingResource';
import {
  EmptyState,
  LoadingGrid,
  StatusBanner,
} from '@/components/dashboard/ResourceState';

const TABS = ['Revenue', 'Conversion', 'AI Performance', 'Agents', 'Channels'];
const channelColors = {
  whatsapp: '#25D366',
  instagram: '#E1306C',
  messenger: '#0099FF',
  livechat: '#6366f1',
};

function buildRangeQuery(range) {
  const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return `?from=${from.toISOString().slice(0, 10)}`;
}

function exportCsv(filename, headers, rows) {
  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Tip({ active, payload, label }) {
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
        <div key={entry.name} style={{ color: entry.color || entry.fill, fontWeight: 700 }}>
          {entry.name}: {Number(entry.value || 0).toLocaleString()}
        </div>
      ))}
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="card">
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

export default function ReportsPage() {
  const [tab, setTab] = useState('Revenue');
  const [range, setRange] = useState('7d');

  const { data, error, loading, reload } = usePollingResource(async () => {
    const query = buildRangeQuery(range);
    const [revenue, conversion, aiPerformance, agents, channels] = await Promise.all([
      api.get(`/api/reports/revenue${query}`),
      api.get(`/api/reports/conversion${query}`),
      api.get(`/api/reports/ai-performance${query}`),
      api.get(`/api/reports/agents${query}`),
      api.get(`/api/reports/channels${query}`),
    ]);

    return {
      revenue: Array.isArray(revenue) ? revenue : [],
      conversion: conversion || {},
      aiPerformance: aiPerformance || {},
      agents: Array.isArray(agents) ? agents : [],
      channels: Array.isArray(channels) ? channels : [],
    };
  }, [range], { intervalMs: 60000, initialData: {
    revenue: [],
    conversion: {},
    aiPerformance: {},
    agents: [],
    channels: [],
  } });

  const revenueData = useMemo(() => (
    (data?.revenue || []).map((row) => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      Revenue: Number(row.revenue || 0),
      Won: Number(row.deals_won || 0),
      Lost: Number(row.deals_lost || 0),
    }))
  ), [data]);

  const funnelData = useMemo(() => {
    const total = Number(data?.conversion?.total_conversations || 0);
    const leads = Number(data?.conversion?.new_leads || 0);
    const won = Number(data?.conversion?.deals_won || 0);
    const lost = Number(data?.conversion?.deals_lost || 0);
    const activeDeals = Math.max(leads - won - lost, 0);

    return [
      { name: 'Conversations', value: total, color: '#6366f1' },
      { name: 'Qualified Leads', value: leads, color: '#8b5cf6' },
      { name: 'Active Deals', value: activeDeals, color: '#06b6d4' },
      { name: 'Won', value: won, color: '#22c55e' },
      { name: 'Lost', value: lost, color: '#f97316' },
    ];
  }, [data]);

  const aiData = useMemo(() => ([
    { name: 'Sent', value: Number(data?.aiPerformance?.sent || 0), color: '#6366f1' },
    { name: 'Used', value: Number(data?.aiPerformance?.used || 0), color: '#10b981' },
    { name: 'Edited', value: Number(data?.aiPerformance?.edited || 0), color: '#f59e0b' },
    { name: 'Ignored', value: Number(data?.aiPerformance?.ignored || 0), color: '#94a3b8' },
  ]), [data]);

  const agentData = useMemo(() => (
    (data?.agents || []).map((entry) => ({
      name: entry.agent_name || 'Unknown agent',
      revenue: Number(entry.revenue_closed || 0),
      deals: Number(entry.deals_closed || 0),
      rate: Number(entry.conversion_rate || 0),
      responseTime: Number(entry.avg_response_time || 0),
    }))
  ), [data]);

  const channelData = useMemo(() => (
    (data?.channels || []).map((entry) => ({
      name: String(entry.channel || 'unknown').replace(/^\w/, (char) => char.toUpperCase()),
      value: Number(entry.conversations || 0),
      revenue: Number(entry.revenue || 0),
      color: channelColors[entry.channel] || '#94a3b8',
    }))
  ), [data]);

  function handleExport() {
    if (tab === 'Revenue') {
      exportCsv(
        `airos-revenue-${range}.csv`,
        ['Date', 'Revenue', 'Won', 'Lost'],
        revenueData.map((row) => [row.date, row.Revenue, row.Won, row.Lost])
      );
    } else if (tab === 'Conversion') {
      exportCsv(
        `airos-conversion-${range}.csv`,
        ['Stage', 'Count'],
        funnelData.map((row) => [row.name, row.value])
      );
    } else if (tab === 'AI Performance') {
      exportCsv(
        `airos-ai-performance-${range}.csv`,
        ['Metric', 'Value'],
        aiData.map((row) => [row.name, row.value])
      );
    } else if (tab === 'Agents') {
      exportCsv(
        `airos-agents-${range}.csv`,
        ['Agent', 'Revenue', 'Deals', 'Conversion Rate', 'Avg Response Seconds'],
        agentData.map((row) => [row.name, row.revenue, row.deals, row.rate, row.responseTime])
      );
    } else {
      exportCsv(
        `airos-channels-${range}.csv`,
        ['Channel', 'Conversations', 'Revenue'],
        channelData.map((row) => [row.name, row.value, row.revenue])
      );
    }

    toast.success(`${tab} exported`);
  }

  return (
    <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Reports & Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            Revenue, conversion, AI, agent, and channel reporting from backend report endpoints.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select className="input" value={range} onChange={(event) => setRange(event.target.value)} style={{ width: 120 }}>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={reload}>Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={handleExport}>Export</button>
        </div>
      </div>

      {error && (
        <StatusBanner
          tone="error"
          title="Report data could not be loaded"
          description={error}
          actionLabel="Retry"
          onAction={reload}
        />
      )}

      <div className="tabs">
        {TABS.map((entry) => (
          <button key={entry} className={`tab${tab === entry ? ' active' : ''}`} onClick={() => setTab(entry)}>
            {entry}
          </button>
        ))}
      </div>

      {loading ? <LoadingGrid /> : null}

      {!loading && tab === 'Revenue' && (
        <Card title="Revenue Trend" subtitle="/api/reports/revenue">
          {revenueData.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="reportRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} fill="url(#reportRevenue)" />
                <Area type="monotone" dataKey="Won" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No revenue rows returned"
              description="Populate `report_daily` to see trend lines here."
            />
          )}
        </Card>
      )}

      {!loading && tab === 'Conversion' && (
        <Card title="Conversion Funnel" subtitle="/api/reports/conversion">
          {funnelData.some((row) => row.value > 0) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {funnelData.map((row) => (
                <div key={row.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>{row.name}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: row.color }}>{row.value.toLocaleString()}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 999, background: 'var(--s2)' }}>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 999,
                        width: `${(row.value / Math.max(funnelData[0]?.value || 1, 1)) * 100}%`,
                        background: row.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No conversion metrics yet"
              description="Daily report generation needs conversation and deal activity before this fills in."
            />
          )}
        </Card>
      )}

      {!loading && tab === 'AI Performance' && (
        <Card title="AI Suggestion Usage" subtitle="/api/reports/ai-performance">
          {aiData.some((row) => row.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={aiData}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {aiData.map((row) => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No AI usage recorded"
              description="AI usage will appear after suggestions are generated and tracked in `report_daily`."
            />
          )}
        </Card>
      )}

      {!loading && tab === 'Agents' && (
        <Card title="Agent Performance" subtitle="/api/reports/agents">
          {agentData.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
              {agentData.map((agent) => (
                <div key={agent.name} style={{ border: '1px solid var(--b1)', borderRadius: 16, padding: '16px 18px' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>{agent.name}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Revenue</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>${agent.revenue.toLocaleString()}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Deals</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#6366f1' }}>{agent.deals}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Conversion</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#8b5cf6' }}>{agent.rate.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 4 }}>Avg response</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#06b6d4' }}>{agent.responseTime.toFixed(0)}s</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No agent report rows yet"
              description="Once `report_agent_daily` starts filling, each agent summary will appear here."
            />
          )}
        </Card>
      )}

      {!loading && tab === 'Channels' && (
        <Card title="Channel Distribution" subtitle="/api/reports/channels">
          {channelData.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(280px,0.8fr)', gap: 16 }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={channelData} dataKey="value" nameKey="name" innerRadius={64} outerRadius={92}>
                    {channelData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<Tip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {channelData.map((entry) => (
                  <div key={entry.name} style={{ border: '1px solid var(--b1)', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)' }}>{entry.name}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: entry.color }}>{entry.value.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t4)' }}>
                      Revenue ${entry.revenue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              title="No channel report rows yet"
              description="Channel splits appear after report aggregation is running for inbound conversations."
            />
          )}
        </Card>
      )}
    </div>
  );
}
