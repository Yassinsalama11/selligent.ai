'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/adminApi';

function statusColor(status) {
  if (status === 'completed') return '#34d399';
  if (status === 'failed') return '#f87171';
  if (status === 'running') return '#38bdf8';
  return '#fbbf24';
}

export default function AdminIngestionPage() {
  const [data, setData] = useState({ totals:{}, jobs:[] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const result = await adminApi.get('/api/admin/ingestion');
      setData(result || { totals:{}, jobs:[] });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load ingestion jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const totals = data.totals || {};
  const jobs = data.jobs || [];

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:6 }}>
            Knowledge Ingestion
          </h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>
            Tenant website crawl status, pages processed, and chunks stored.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
      </div>

      {error && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
          {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
        {[
          ['Jobs', totals.total || 0, '#818cf8'],
          ['Pages Seen', totals.pagesSeen || 0, '#38bdf8'],
          ['Chunks Stored', totals.chunksStored || 0, '#34d399'],
          ['Failures', totals.byStatus?.failed || 0, '#f87171'],
        ].map(([label, value, color]) => (
          <div key={label} style={{ padding:'20px 22px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', borderTop:`2px solid ${color}`, opacity:loading ? 0.65 : 1 }}>
            <p style={{ fontSize:28, fontWeight:800, color, marginBottom:4 }}>{value}</p>
            <p style={{ fontSize:12, color:'var(--t2)' }}>{label}</p>
          </div>
        ))}
      </div>

      <section style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', fontSize:12, fontWeight:800, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          Latest Jobs
        </div>
        {loading && <div style={{ padding:'18px 16px', color:'var(--t4)', fontSize:13 }}>Loading ingestion jobs...</div>}
        {!loading && jobs.length === 0 && <div style={{ padding:'18px 16px', color:'var(--t4)', fontSize:13 }}>No ingestion jobs yet.</div>}
        {jobs.map((job) => (
          <div key={job.id} style={{ display:'grid', gridTemplateColumns:'1.2fr 1.4fr 100px 90px 90px 150px', gap:12, padding:'14px 16px', borderTop:'1px solid var(--b1)', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{job.tenant_name}</p>
              <p style={{ fontSize:11.5, color:'var(--t4)' }}>{job.tenant_email}</p>
            </div>
            <span style={{ fontSize:12, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{job.source_url}</span>
            <span style={{ textTransform:'capitalize', color:statusColor(job.status), fontSize:12.5, fontWeight:800 }}>{job.status}</span>
            <span style={{ fontSize:12.5, color:'var(--t2)' }}>{job.pages_seen || 0} pages</span>
            <span style={{ fontSize:12.5, color:'var(--t2)' }}>{job.chunks_stored || 0} chunks</span>
            <span style={{ fontSize:11.5, color:'var(--t4)', textAlign:'right' }}>{new Date(job.created_at).toLocaleString()}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
