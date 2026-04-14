'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

export default function AdminTeamPage() {
  const [admin, setAdmin] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await adminApi.get('/api/admin/auth/me');
        if (!cancelled) setAdmin(data.admin);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load admin profile');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding:'28px' }}>
      <div style={{ maxWidth:760, padding:'22px 24px', borderRadius:16, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:8 }}>
          Team
        </h1>
        {error && (
          <p style={{ fontSize:13, color:'#fca5a5', marginBottom:12 }}>{error}</p>
        )}
        <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.7, marginBottom:14 }}>
          Fake admin team members have been removed from this screen.
        </p>
        {admin && (
          <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>{admin.name}</p>
            <p style={{ fontSize:12, color:'var(--t4)' }}>{admin.email} · {admin.role}</p>
          </div>
        )}
        <p style={{ fontSize:12.5, color:'var(--t4)', lineHeight:1.7, marginTop:14 }}>
          Add a dedicated live admin-team backend before turning this page into an operational staff-management tool.
        </p>
      </div>
    </div>
  );
}
