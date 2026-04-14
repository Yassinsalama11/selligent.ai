'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return 'No activity yet';
  return new Date(value).toLocaleString('en-US', {
    month:'short',
    day:'numeric',
    year:'numeric',
  });
}

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = data?.totals || {
    totalClients: 0,
    monthlyRevenue: 0,
    totalConversations: 0,
    totalMessages: 0,
    totalCustomers: 0,
    connectedChannels: 0,
    byStatus: { active: 0, trial: 0, suspended: 0 },
  };

  const cards = [
    { label:'Clients', value: totals.totalClients, sub:`${totals.byStatus.active || 0} active`, color:'#818cf8' },
    { label:'MRR', value: formatMoney(totals.monthlyRevenue), sub:'Active client plans', color:'#f59e0b' },
    { label:'Conversations', value: Number(totals.totalConversations || 0).toLocaleString(), sub:'Across all tenants', color:'#06b6d4' },
    { label:'Messages', value: Number(totals.totalMessages || 0).toLocaleString(), sub:'Persisted messages', color:'#34d399' },
    { label:'Customers', value: Number(totals.totalCustomers || 0).toLocaleString(), sub:'Live customer records', color:'#a78bfa' },
    { label:'Channels', value: Number(totals.connectedChannels || 0).toLocaleString(), sub:'Connected integrations', color:'#fb7185' },
  ];

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
            Platform Overview
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            Real tenant data only. No seeded dashboard content.
          </p>
        </div>
        <Link href="/admin/clients" style={{ padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)', color:'#f59e0b', textDecoration:'none' }}>
          Manage Clients →
        </Link>
      </div>

      {error && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
          {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {cards.map((card) => (
          <div key={card.label} style={{ padding:'20px 22px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', borderTop:`2px solid ${card.color}`, opacity: loading ? 0.65 : 1 }}>
            <p style={{ fontSize:28, fontWeight:800, color:card.color, fontFamily:'Space Grotesk, sans-serif', letterSpacing:'-0.02em', marginBottom:4 }}>
              {card.value}
            </p>
            <p style={{ fontSize:12, color:'var(--t2)', marginBottom:2 }}>{card.label}</p>
            <p style={{ fontSize:11, color:'var(--t4)' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <section style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Newest Clients</h2>
            <span style={{ fontSize:11.5, color:'var(--t4)' }}>{(data?.recentClients || []).length} shown</span>
          </div>

          {(data?.recentClients || []).length === 0 && !loading && (
            <p style={{ fontSize:13, color:'var(--t4)' }}>No clients have been created yet.</p>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(data?.recentClients || []).map((client) => (
              <div key={client.id} style={{ padding:'12px 14px', borderRadius:10, background:'var(--s1)', border:'1px solid var(--b1)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', gap:12, marginBottom:4 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{client.name}</span>
                  <span style={{ fontSize:11, color:'var(--t4)', textTransform:'uppercase' }}>{client.plan}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--t4)' }}>
                  {client.owner?.email || client.email} · {client.country || 'No country'} · {formatDate(client.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Top Clients</h2>
            <span style={{ fontSize:11.5, color:'var(--t4)' }}>By message volume</span>
          </div>

          {(data?.topClients || []).length === 0 && !loading && (
            <p style={{ fontSize:13, color:'var(--t4)' }}>No live tenant activity yet.</p>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(data?.topClients || []).map((client) => (
              <div key={client.id} style={{ padding:'12px 14px', borderRadius:10, background:'var(--s1)', border:'1px solid var(--b1)', display:'grid', gridTemplateColumns:'1.4fr 90px 90px', gap:12, alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{client.name}</p>
                  <p style={{ fontSize:11.5, color:'var(--t4)' }}>{client.owner?.email || client.email}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#34d399' }}>{Number(client.messagesCount || 0).toLocaleString()}</p>
                  <p style={{ fontSize:10.5, color:'var(--t4)' }}>messages</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'#818cf8' }}>{Number(client.conversationsCount || 0).toLocaleString()}</p>
                  <p style={{ fontSize:10.5, color:'var(--t4)' }}>conversations</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
