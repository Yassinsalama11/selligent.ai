'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { adminApi } from '@/lib/adminApi';

const EMPTY_FORM = {
  name: '',
  ownerName: '',
  ownerEmail: '',
  password: '',
  plan: 'starter',
  status: 'active',
  country: '',
  domain: '',
  phone: '',
  notes: '',
};

function money(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function dateTime(value) {
  if (!value) return 'No activity yet';
  return new Date(value).toLocaleString('en-US', {
    month:'short',
    day:'numeric',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit',
  });
}

export default function AdminClientsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [clients, setClients] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [lastGeneratedPassword, setLastGeneratedPassword] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.get('/api/admin/clients');
      setClients(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load clients');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClient() {
    if (!form.name.trim() || !form.ownerName.trim() || !form.ownerEmail.trim()) {
      toast.error('Company name, owner name, and owner email are required');
      return;
    }

    setSaving(true);
    try {
      const data = await adminApi.post('/api/admin/clients', form);
      setClients((current) => [data.client, ...current]);
      setLastGeneratedPassword(data.generatedPassword || '');
      setModalOpen(false);
      setForm(EMPTY_FORM);
      toast.success(`${data.client.name} created successfully`);
      if (data.generatedPassword) {
        window.alert(`Client created.\nTemporary owner password: ${data.generatedPassword}`);
      }
    } catch (err) {
      toast.error(err.message || 'Could not create client');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(client, nextStatus) {
    try {
      const data = await adminApi.patch(`/api/admin/clients/${client.id}`, {
        name: client.name,
        plan: client.plan,
        status: nextStatus,
        country: client.country,
        domain: client.domain,
        phone: client.phone,
        notes: client.notes,
      });
      setClients((current) => current.map((entry) => entry.id === client.id ? data.client : entry));
      toast.success(`${client.name} is now ${nextStatus}`);
    } catch (err) {
      toast.error(err.message || 'Could not update client');
    }
  }

  const visibleClients = useMemo(() => {
    return clients.filter((client) => {
      if (statusFilter !== 'all' && client.status !== statusFilter) return false;
      if (planFilter !== 'all' && client.plan !== planFilter) return false;
      if (!search.trim()) return true;

      const query = search.trim().toLowerCase();
      return (
        String(client.name || '').toLowerCase().includes(query) ||
        String(client.owner?.email || client.email || '').toLowerCase().includes(query) ||
        String(client.domain || '').toLowerCase().includes(query)
      );
    });
  }, [clients, planFilter, search, statusFilter]);

  const summary = useMemo(() => {
    return visibleClients.reduce((acc, client) => {
      acc.total += 1;
      acc.active += client.status === 'active' ? 1 : 0;
      acc.trial += client.status === 'trial' ? 1 : 0;
      acc.suspended += client.status === 'suspended' ? 1 : 0;
      acc.mrr += client.status === 'active' ? Number(client.monthlyValue || 0) : 0;
      return acc;
    }, { total: 0, active: 0, trial: 0, suspended: 0, mrr: 0 });
  }, [visibleClients]);

  const inputStyle = {
    width:'100%',
    padding:'10px 13px',
    borderRadius:9,
    fontSize:13,
    background:'rgba(255,255,255,0.04)',
    border:'1px solid rgba(255,255,255,0.1)',
    color:'var(--t1)',
    outline:'none',
    boxSizing:'border-box',
  };

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
            Clients
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            Real tenants only. Create and manage live client workspaces manually.
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary" style={{ minWidth:170 }}>
          + Add Client
        </button>
      </div>

      {error && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
          {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'Visible Clients', value: summary.total, color:'#818cf8' },
          { label:'Active', value: summary.active, color:'#34d399' },
          { label:'Trial', value: summary.trial, color:'#fbbf24' },
          { label:'MRR', value: money(summary.mrr), color:'#f59e0b' },
        ].map((card) => (
          <div key={card.label} style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', borderTop:`2px solid ${card.color}` }}>
            <p style={{ fontSize:24, fontWeight:800, color:card.color, marginBottom:3, fontFamily:'Space Grotesk, sans-serif' }}>
              {card.value}
            </p>
            <p style={{ fontSize:12, color:'var(--t2)' }}>{card.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 150px 150px auto', gap:10 }}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, owner email, or domain…" style={inputStyle} />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)} style={inputStyle}>
          <option value="all">All Plans</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <button onClick={loadClients} className="btn btn-ghost">Refresh</button>
      </div>

      <div style={{ borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)', overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1.1fr 110px 110px 120px 150px 150px', gap:12, padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
          <span>Client</span>
          <span>Owner</span>
          <span style={{ textAlign:'right' }}>Plan</span>
          <span style={{ textAlign:'right' }}>Status</span>
          <span style={{ textAlign:'right' }}>Channels</span>
          <span style={{ textAlign:'right' }}>Messages</span>
          <span style={{ textAlign:'right' }}>Last Activity</span>
        </div>

        {loading && (
          <div style={{ padding:'20px 16px', fontSize:13, color:'var(--t4)' }}>Loading live client data…</div>
        )}

        {!loading && visibleClients.length === 0 && (
          <div style={{ padding:'20px 16px', fontSize:13, color:'var(--t4)' }}>No live clients match your filters.</div>
        )}

        {!loading && visibleClients.map((client) => (
          <div key={client.id} style={{ display:'grid', gridTemplateColumns:'1.6fr 1.1fr 110px 110px 120px 150px 150px', gap:12, padding:'14px 16px', alignItems:'center', borderTop:'1px solid var(--b1)' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)', marginBottom:4 }}>{client.name}</p>
              <p style={{ fontSize:11.5, color:'var(--t4)' }}>
                {client.domain || 'No domain'}{client.country ? ` · ${client.country}` : ''}
              </p>
            </div>

            <div>
              <p style={{ fontSize:12.5, color:'var(--t2)', marginBottom:3 }}>{client.owner?.name || 'No owner'}</p>
              <p style={{ fontSize:11.5, color:'var(--t4)' }}>{client.owner?.email || client.email}</p>
            </div>

            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:12.5, fontWeight:700, color:'#818cf8', textTransform:'capitalize' }}>{client.plan}</p>
              <p style={{ fontSize:10.5, color:'var(--t4)' }}>{money(client.monthlyValue)}</p>
            </div>

            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:99, background: client.status === 'active' ? 'rgba(52,211,153,0.12)' : client.status === 'trial' ? 'rgba(251,191,36,0.12)' : 'rgba(248,113,113,0.12)', color: client.status === 'active' ? '#34d399' : client.status === 'trial' ? '#fbbf24' : '#f87171', textTransform:'capitalize' }}>
                {client.status}
              </span>
            </div>

            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{client.channelsConnected}</p>
              <p style={{ fontSize:10.5, color:'var(--t4)' }}>connected</p>
            </div>

            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{Number(client.messagesCount || 0).toLocaleString()}</p>
              <p style={{ fontSize:10.5, color:'var(--t4)' }}>{Number(client.conversationsCount || 0).toLocaleString()} conversations</p>
            </div>

            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
              <p style={{ fontSize:11.5, color:'var(--t4)', textAlign:'right' }}>{dateTime(client.lastSeen || client.createdAt)}</p>
              <div style={{ display:'flex', gap:6 }}>
                {client.status !== 'active' && (
                  <button onClick={() => updateStatus(client, 'active')} style={{ padding:'5px 9px', borderRadius:8, cursor:'pointer', border:'1px solid rgba(52,211,153,0.2)', background:'rgba(52,211,153,0.08)', color:'#34d399', fontSize:11.5, fontWeight:700 }}>
                    Activate
                  </button>
                )}
                {client.status === 'active' && (
                  <button onClick={() => updateStatus(client, 'suspended')} style={{ padding:'5px 9px', borderRadius:8, cursor:'pointer', border:'1px solid rgba(248,113,113,0.2)', background:'rgba(248,113,113,0.08)', color:'#f87171', fontSize:11.5, fontWeight:700 }}>
                    Suspend
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!!lastGeneratedPassword && (
        <div style={{ padding:'14px 16px', borderRadius:12, background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', color:'#fde68a', fontSize:13 }}>
          Last generated owner password: <span style={{ fontFamily:'monospace', color:'#fff' }}>{lastGeneratedPassword}</span>
        </div>
      )}

      <Modal open={modalOpen} title="Add Client Manually" onClose={() => !saving && setModalOpen(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Company name" style={inputStyle} />
            <input value={form.domain} onChange={(event) => setForm((current) => ({ ...current, domain: event.target.value }))} placeholder="Domain" style={inputStyle} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <input value={form.ownerName} onChange={(event) => setForm((current) => ({ ...current, ownerName: event.target.value }))} placeholder="Owner full name" style={inputStyle} />
            <input value={form.ownerEmail} onChange={(event) => setForm((current) => ({ ...current, ownerEmail: event.target.value }))} placeholder="Owner email" style={inputStyle} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <select value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value }))} style={inputStyle}>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} style={inputStyle}>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
            <input value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} placeholder="Country code" style={inputStyle} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" style={inputStyle} />
            <input value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} placeholder="Owner password (optional)" style={inputStyle} />
          </div>
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Internal notes" rows={3} style={{ ...inputStyle, resize:'vertical' }} />
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
            <button onClick={() => setModalOpen(false)} className="btn btn-ghost" disabled={saving}>Cancel</button>
            <button onClick={handleCreateClient} className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Client'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
