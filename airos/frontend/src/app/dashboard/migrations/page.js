'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';

function countSummary(counts = {}) {
  return ['customers', 'conversations', 'messages', 'macros', 'tags', 'teams']
    .map((key) => `${counts[key] || 0} ${key}`)
    .join(' · ');
}

function ProviderCard({ provider, title, description, children, onStart, busy }) {
  return (
    <section style={{ padding:22, borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)', display:'flex', flexDirection:'column', gap:14 }}>
      <div>
        <p style={{ fontSize:12, color:'#818cf8', fontWeight:900, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{provider}</p>
        <h2 style={{ fontSize:18, fontWeight:900, marginBottom:6 }}>{title}</h2>
        <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>{description}</p>
      </div>
      {children}
      <button className="btn btn-primary" onClick={onStart} disabled={busy}>
        {busy ? 'Starting import...' : `Start ${title} Import`}
      </button>
    </section>
  );
}

export default function MigrationsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [intercom, setIntercom] = useState({ accessToken:'', workspace:'', maxPages:3 });
  const [zendesk, setZendesk] = useState({ subdomain:'', email:'', apiToken:'', maxPages:3 });

  async function loadJobs() {
    try {
      const data = await api.get('/api/migrations');
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || 'Could not load migration jobs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
    const timer = setInterval(loadJobs, 10000);
    return () => clearInterval(timer);
  }, []);

  async function start(provider, payload) {
    setBusy(provider);
    try {
      await api.post(`/api/migrations/${provider}/start`, payload);
      toast.success(`${provider} import queued`);
      await loadJobs();
    } catch (err) {
      toast.error(err.message || `Could not start ${provider} import`);
    } finally {
      setBusy('');
    }
  }

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:22, maxWidth:1180 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:900, marginBottom:6 }}>Migration Wizard</h1>
        <p style={{ fontSize:13, color:'var(--t3)' }}>
          Import customers, conversations, tags, teams, and macros from legacy helpdesks.
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        <ProviderCard
          provider="Intercom"
          title="Intercom"
          description="Use an Intercom access token to import contacts and conversation transcripts into ChatOrAI."
          busy={busy === 'intercom'}
          onStart={() => start('intercom', intercom)}
        >
          <input className="input" placeholder="Workspace label" value={intercom.workspace} onChange={(event) => setIntercom((current) => ({ ...current, workspace:event.target.value }))} />
          <input className="input" type="password" placeholder="Intercom access token" value={intercom.accessToken} onChange={(event) => setIntercom((current) => ({ ...current, accessToken:event.target.value }))} />
          <input className="input" type="number" min="1" max="20" placeholder="Pages to import" value={intercom.maxPages} onChange={(event) => setIntercom((current) => ({ ...current, maxPages:Number(event.target.value || 3) }))} />
        </ProviderCard>

        <ProviderCard
          provider="Zendesk"
          title="Zendesk"
          description="Provide a Zendesk subdomain, admin email, and API token to import end users, tickets, comments, macros, tags, and groups."
          busy={busy === 'zendesk'}
          onStart={() => start('zendesk', zendesk)}
        >
          <input className="input" placeholder="Subdomain, e.g. mystore" value={zendesk.subdomain} onChange={(event) => setZendesk((current) => ({ ...current, subdomain:event.target.value }))} />
          <input className="input" type="email" placeholder="Admin email" value={zendesk.email} onChange={(event) => setZendesk((current) => ({ ...current, email:event.target.value }))} />
          <input className="input" type="password" placeholder="Zendesk API token" value={zendesk.apiToken} onChange={(event) => setZendesk((current) => ({ ...current, apiToken:event.target.value }))} />
          <input className="input" type="number" min="1" max="20" placeholder="Pages to import" value={zendesk.maxPages} onChange={(event) => setZendesk((current) => ({ ...current, maxPages:Number(event.target.value || 3) }))} />
        </ProviderCard>
      </div>

      <section style={{ borderRadius:18, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
        <div style={{ padding:'15px 18px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--b1)' }}>
          <h2 style={{ fontSize:16, fontWeight:900 }}>Migration Status</h2>
          <button className="btn btn-ghost btn-sm" onClick={loadJobs}>Refresh</button>
        </div>
        {loading && <p style={{ padding:18, color:'var(--t4)', fontSize:13 }}>Loading migration jobs...</p>}
        {!loading && jobs.length === 0 && <p style={{ padding:18, color:'var(--t4)', fontSize:13 }}>No migration jobs yet.</p>}
        {jobs.map((job) => (
          <div key={job.id} style={{ display:'grid', gridTemplateColumns:'120px 110px 1fr 160px', gap:14, alignItems:'center', padding:'15px 18px', borderTop:'1px solid var(--b1)' }}>
            <span style={{ fontSize:13, fontWeight:900, color:'#818cf8', textTransform:'capitalize' }}>{job.provider}</span>
            <span style={{ fontSize:12, fontWeight:900, color:job.status === 'completed' ? '#34d399' : job.status === 'failed' ? '#f87171' : '#fbbf24', textTransform:'capitalize' }}>{job.status}</span>
            <span style={{ fontSize:12, color:'var(--t3)' }}>
              {job.error || countSummary(job.imported_counts)}
            </span>
            <span style={{ fontSize:11.5, color:'var(--t4)', textAlign:'right' }}>{new Date(job.created_at).toLocaleString()}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
