'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    adminApi.get('/api/admin/logs')
      .then((data) => {
        if (!cancelled) setLogs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load logs');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
          Activity Logs
        </h1>
        <p style={{ fontSize:13, color:'var(--t3)' }}>
          Real platform admin audit events from `audit_log`.
        </p>
      </div>

      {error && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
          {error}
        </div>
      )}

      <section style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
        {logs.length === 0 && !error && (
          <div style={{ padding:'18px 16px', color:'var(--t4)', fontSize:13 }}>No admin audit events yet.</div>
        )}
        {logs.map((log) => (
          <div key={log.id} style={{ display:'grid', gridTemplateColumns:'180px 1fr 180px', gap:14, padding:'14px 16px', borderTop:'1px solid var(--b1)', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:12.5, color:'#f59e0b', fontWeight:800 }}>{log.action}</p>
              <p style={{ fontSize:11, color:'var(--t4)' }}>{log.actor_id}</p>
            </div>
            <div>
              <p style={{ fontSize:13, color:'var(--t1)', fontWeight:700 }}>{log.entity_type}: {log.entity_id}</p>
              <p style={{ fontSize:11.5, color:'var(--t4)' }}>{JSON.stringify(log.metadata || {})}</p>
            </div>
            <p style={{ fontSize:11.5, color:'var(--t4)', textAlign:'right' }}>
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
