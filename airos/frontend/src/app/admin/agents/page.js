'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { adminApi } from '@/lib/adminApi';

export default function AdminAgentsPage() {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState({ chator: null, tenants: [] });

  useEffect(() => {
    let cancelled = false;

    adminApi.get('/api/admin/ai-agents')
      .then((data) => {
        if (!cancelled) {
          setPayload({
            chator: data?.chator || null,
            tenants: Array.isArray(data?.tenants) ? data.tenants : [],
          });
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.message || 'Could not load AI agents');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totals = useMemo(() => (
    payload.tenants.reduce((acc, tenant) => {
      acc.tenants += 1;
      acc.messages += Number(tenant.messagesHandled || 0);
      acc.conversations += Number(tenant.usageStats?.conversations || 0);
      return acc;
    }, { tenants: 0, messages: 0, conversations: 0 })
  ), [payload.tenants]);

  if (loading) {
    return <div style={{ padding:'28px', color:'var(--t4)', fontSize:13 }}>Loading AI agents…</div>;
  }

  return (
    <div style={{ padding:'28px', display:'grid', gap:18 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
          AI Agents
        </h1>
        <p style={{ fontSize:13, color:'var(--t4)' }}>
          Platform-wide AI hierarchy across Chator and every tenant-scoped agent.
        </p>
      </div>

      <section style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:14 }}>
        <MetricCard label="Tenant agents" value={totals.tenants} tone="#6366f1" />
        <MetricCard label="AI messages" value={totals.messages} tone="#10b981" />
        <MetricCard label="AI conversations" value={totals.conversations} tone="#06b6d4" />
        <MetricCard label="Global model" value={payload.chator?.activeModel || 'Not set'} tone="#f59e0b" />
      </section>

      <section style={cardStyle}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, marginBottom:14 }}>
          <div>
            <h2 style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>Chator</h2>
            <p style={{ fontSize:12.5, color:'var(--t4)', marginTop:4 }}>Global AI parent configuration</p>
          </div>
          <div style={{ fontSize:12, color:'#f59e0b', fontWeight:700 }}>
            {payload.chator?.provider || 'unknown'} · {payload.chator?.hierarchyMode || 'platform-defaults'}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:12 }}>
          <InfoBox label="Name" value={payload.chator?.name || 'Chator'} />
          <InfoBox label="Provider" value={payload.chator?.provider || 'Unknown'} />
          <InfoBox label="Active model" value={payload.chator?.activeModel || 'Unknown'} />
          <InfoBox label="Fallback model" value={payload.chator?.fallbackModel || 'None'} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ marginBottom:14 }}>
          <h2 style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>Tenant Agents</h2>
          <p style={{ fontSize:12.5, color:'var(--t4)', marginTop:4 }}>
            Company-level AI runtime, usage, and mode visibility.
          </p>
        </div>

        {payload.tenants.length === 0 ? (
          <div style={{ color:'var(--t4)', fontSize:13 }}>No tenant agents found.</div>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {payload.tenants.map((tenant) => (
              <div key={tenant.tenantId} style={{
                padding:'14px 16px',
                borderRadius:12,
                background:'var(--s1)',
                border:'1px solid var(--b1)',
                display:'grid',
                gridTemplateColumns:'1.5fr repeat(5,minmax(0,0.7fr))',
                gap:12,
                alignItems:'center',
              }}>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:800, color:'var(--t1)' }}>{tenant.agentName}</div>
                  <div style={{ fontSize:11.5, color:'var(--t4)', marginTop:4 }}>{tenant.companyName}</div>
                </div>
                <Cell label="Type" value={tenant.agentType} />
                <Cell label="AI mode" value={tenant.aiMode} />
                <Cell label="Messages" value={Number(tenant.messagesHandled || 0).toLocaleString()} />
                <Cell label="Usage" value={Number(tenant.usageStats?.messages || 0).toLocaleString()} />
                <Cell label="Created" value={new Date(tenant.createdAt).toLocaleDateString()} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <div style={{ ...cardStyle, padding:'16px 18px', gap:6 }}>
      <div style={{ fontSize:11.5, color:'var(--t4)' }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:900, color:tone }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--b1)', background:'rgba(255,255,255,0.02)' }}>
      <div style={{ fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{value}</div>
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize:10.5, color:'var(--t4)', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:12.5, fontWeight:700, color:'var(--t2)', textTransform:'capitalize' }}>{value}</div>
    </div>
  );
}

const cardStyle = {
  padding:'20px',
  borderRadius:16,
  background:'var(--bg2)',
  border:'1px solid var(--b1)',
  display:'flex',
  flexDirection:'column',
};
