'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

const statusColors = {
  draft: '#64748b',
  scheduled: '#f59e0b',
  sending: '#3b82f6',
  sent: '#10b981',
  paused: '#8b5cf6',
  canceled: '#ef4444',
  failed: '#ef4444',
};

function Field({ label, children }) {
  return (
    <label style={{ display:'grid', gap:6, fontSize:13, color:'var(--t2)' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function inputStyle() {
  return {
    width:'100%',
    border:'1px solid var(--border)',
    borderRadius:12,
    background:'var(--panel)',
    color:'var(--text)',
    padding:'11px 12px',
    outline:'none',
  };
}

function parseCsv(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    templateName: '',
    templateLanguage: 'ar',
    body: '',
    tags: '',
    conversationStatus: '',
    channels: 'whatsapp',
    scheduledAt: '',
  });

  async function loadCampaigns() {
    setLoading(true);
    try {
      const data = await api.get('/api/campaigns');
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || 'Could not load campaigns');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  function buildPayload() {
    return {
      name: form.name,
      channel: 'whatsapp',
      messageType: 'template',
      templateName: form.templateName,
      templateLanguage: form.templateLanguage,
      body: form.body,
      variables: { 1: '{{customer.name}}' },
      scheduledAt: form.scheduledAt || null,
      audienceFilter: {
        tags: parseCsv(form.tags),
        channels: parseCsv(form.channels),
        conversationStatus: form.conversationStatus || undefined,
      },
    };
  }

  async function previewAudience() {
    try {
      const payload = buildPayload();
      const data = await api.post('/api/campaigns/preview', {
        channel: payload.channel,
        audienceFilter: payload.audienceFilter,
      });
      setPreview(data);
    } catch (err) {
      toast.error(err.message || 'Audience preview failed');
    }
  }

  async function createCampaign(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/campaigns', buildPayload());
      toast.success('Campaign saved');
      setForm((current) => ({ ...current, name:'', templateName:'', body:'' }));
      setPreview(null);
      await loadCampaigns();
    } catch (err) {
      toast.error(err.message || 'Could not create campaign');
    } finally {
      setSubmitting(false);
    }
  }

  async function sendCampaign(id) {
    try {
      const result = await api.post(`/api/campaigns/${id}/send`, { batchSize: 25 });
      toast.success(`Batch complete: ${result.sent} sent, ${result.failed} failed`);
      await loadCampaigns();
    } catch (err) {
      toast.error(err.message || 'Send failed');
    }
  }

  return (
    <main style={{ padding:28, display:'grid', gap:22 }}>
      <header style={{ display:'flex', justifyContent:'space-between', gap:16, alignItems:'end' }}>
        <div>
          <p style={{ margin:0, color:'var(--t3)', fontSize:13 }}>Marketing automation</p>
          <h1 style={{ margin:'4px 0 0', fontSize:34, letterSpacing:-1 }}>Outbound Campaigns</h1>
        </div>
        <button onClick={loadCampaigns} style={{ ...inputStyle(), width:'auto', cursor:'pointer' }}>
          Refresh
        </button>
      </header>

      <section style={{
        display:'grid',
        gridTemplateColumns:'minmax(320px, 420px) 1fr',
        gap:22,
        alignItems:'start',
      }}>
        <form onSubmit={createCampaign} style={{
          display:'grid',
          gap:14,
          padding:20,
          border:'1px solid var(--border)',
          borderRadius:22,
          background:'linear-gradient(160deg, rgba(20,184,166,0.12), rgba(15,23,42,0.02))',
        }}>
          <h2 style={{ margin:0, fontSize:20 }}>Create Campaign</h2>

          <Field label="Campaign name">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name:e.target.value })} style={inputStyle()} />
          </Field>

          <Field label="WhatsApp template name">
            <input required value={form.templateName} onChange={(e) => setForm({ ...form, templateName:e.target.value })} style={inputStyle()} placeholder="seasonal_sale" />
          </Field>

          <Field label="Message body preview">
            <textarea required value={form.body} onChange={(e) => setForm({ ...form, body:e.target.value })} style={{ ...inputStyle(), minHeight:96 }} placeholder="Hi {{customer.name}}, your offer is ready." />
          </Field>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Tags CSV">
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags:e.target.value })} style={inputStyle()} placeholder="VIP, Loyal" />
            </Field>
            <Field label="Conversation status">
              <select value={form.conversationStatus} onChange={(e) => setForm({ ...form, conversationStatus:e.target.value })} style={inputStyle()}>
                <option value="">Any</option>
                <option value="open">Open</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
            </Field>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Channels CSV">
              <input value={form.channels} onChange={(e) => setForm({ ...form, channels:e.target.value })} style={inputStyle()} />
            </Field>
            <Field label="Schedule">
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt:e.target.value })} style={inputStyle()} />
            </Field>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={previewAudience} style={{ ...inputStyle(), cursor:'pointer' }}>
              Preview audience
            </button>
            <button disabled={submitting} style={{ ...inputStyle(), cursor:'pointer', background:'#14b8a6', color:'#021' }}>
              {submitting ? 'Saving...' : 'Save campaign'}
            </button>
          </div>

          {preview && (
            <div style={{ border:'1px solid var(--border)', borderRadius:16, padding:14, fontSize:13 }}>
              Audience: <strong>{preview.count}</strong> customers
              <div style={{ color:'var(--t3)', marginTop:4 }}>
                Sample: {(preview.sample || []).slice(0, 3).map((entry) => entry.name || entry.phone).join(', ') || 'No matches'}
              </div>
            </div>
          )}
        </form>

        <section style={{ display:'grid', gap:12 }}>
          {loading ? <p style={{ color:'var(--t3)' }}>Loading campaigns...</p> : campaigns.map((campaign) => (
            <article key={campaign.id} style={{
              border:'1px solid var(--border)',
              borderRadius:18,
              padding:18,
              background:'var(--panel)',
              display:'grid',
              gap:10,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                <div>
                  <h3 style={{ margin:0 }}>{campaign.name}</h3>
                  <p style={{ margin:'5px 0 0', color:'var(--t3)', fontSize:13 }}>
                    {campaign.channel} · {campaign.template_name || 'body only'} · {campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : 'manual trigger'}
                  </p>
                </div>
                <span style={{ color:statusColors[campaign.status] || '#64748b', fontWeight:800 }}>
                  {campaign.status}
                </span>
              </div>
              <p style={{ margin:0, color:'var(--t2)' }}>{campaign.body}</p>
              <div style={{ display:'flex', gap:14, color:'var(--t3)', fontSize:13 }}>
                <span>Total {campaign.stats?.total || 0}</span>
                <span>Sent {campaign.stats?.sent || 0}</span>
                <span>Failed {campaign.stats?.failed || 0}</span>
                <span>Pending {campaign.stats?.pending || 0}</span>
              </div>
              <div>
                <button
                  disabled={['sent', 'canceled', 'paused'].includes(campaign.status)}
                  onClick={() => sendCampaign(campaign.id)}
                  style={{ ...inputStyle(), width:'auto', cursor:'pointer', opacity:['sent', 'canceled', 'paused'].includes(campaign.status) ? 0.5 : 1 }}
                >
                  Send next batch
                </button>
              </div>
            </article>
          ))}
          {!loading && campaigns.length === 0 && (
            <p style={{ color:'var(--t3)' }}>No campaigns yet. Create the first tenant-scoped campaign.</p>
          )}
        </section>
      </section>
    </main>
  );
}
