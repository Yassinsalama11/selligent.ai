'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function AdminSystemPage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminApi.get('/api/admin/system/health')
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load system health');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = health ? [
    ['Database', health.databaseConfigured ? 'Configured' : 'Missing DATABASE_URL', health.databaseConfigured],
    ['Redis', health.redisConfigured ? 'Configured' : 'Not configured', health.redisConfigured],
    ['Stripe', health.stripeConfigured ? 'Configured' : 'Not configured', health.stripeConfigured],
  ] : [];

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
          System
        </h1>
        <p style={{ fontSize:13, color:'var(--t3)' }}>
          Live backend configuration and dependency readiness.
        </p>
      </div>

      {error && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
          {error}
        </div>
      )}

      <section style={{ maxWidth:760, padding:'22px 24px', borderRadius:16, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
        {rows.length === 0 && <p style={{ fontSize:13, color:'var(--t4)' }}>Loading system status…</p>}
        {rows.map(([label, value, ok]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:'1px solid var(--b1)' }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{label}</span>
            <span style={{ fontSize:12.5, fontWeight:800, color:ok ? '#34d399' : '#fbbf24' }}>{value}</span>
          </div>
        ))}
        {health?.timestamp && (
          <p style={{ fontSize:11.5, color:'var(--t4)', marginTop:14 }}>
            Checked {new Date(health.timestamp).toLocaleString()}
          </p>
        )}
      </section>
    </div>
  );
}
