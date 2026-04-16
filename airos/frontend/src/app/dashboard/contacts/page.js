'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

/* ── Seed data ────────────────────────────────────────────────────────────── */
const SEED_CONTACTS = [
  { id:'1',  name:'Ahmed Mohamed',    phone:'+20 100 123 4567', email:'ahmed.m@gmail.com',       ch:'whatsapp',  orders:12, revenue:4820,  tags:['VIP'],          lastSeen:'2m ago',   country:'EG' },
  { id:'2',  name:'Sara Khalil',      phone:'+20 111 987 6543', email:'sara.k@hotmail.com',      ch:'instagram', orders:5,  revenue:1350,  tags:['Interested'],   lastSeen:'8m ago',   country:'EG' },
  { id:'3',  name:'Omar Hassan',      phone:'+971 50 234 5678', email:'omar.h@company.ae',       ch:'messenger', orders:3,  revenue:740,   tags:['Price Obj.'],   lastSeen:'15m ago',  country:'AE' },
  { id:'4',  name:'Layla Samir',      phone:'+971 55 876 5432', email:'layla.s@gmail.com',       ch:'livechat',  orders:8,  revenue:2960,  tags:['Follow Up'],    lastSeen:'22m ago',  country:'AE' },
  { id:'5',  name:'Youssef Ali',      phone:'+20 122 456 7890', email:'youssef.ali@store.com',   ch:'whatsapp',  orders:21, revenue:9100,  tags:['VIP','Loyal'],  lastSeen:'35m ago',  country:'EG' },
  { id:'6',  name:'Nour Adel',        phone:'+966 50 111 2233', email:'nour.adel@gmail.com',     ch:'instagram', orders:2,  revenue:380,   tags:[],               lastSeen:'1h ago',   country:'SA' },
  { id:'7',  name:'Khaled Mansour',   phone:'+20 100 333 4444', email:'khaled.m@yahoo.com',      ch:'whatsapp',  orders:17, revenue:6540,  tags:['VIP'],          lastSeen:'2h ago',   country:'EG' },
  { id:'8',  name:'Fatima Al-Zahra',  phone:'+966 55 444 5555', email:'fatima.z@business.sa',   ch:'messenger', orders:9,  revenue:3210,  tags:['Regular'],      lastSeen:'3h ago',   country:'SA' },
  { id:'9',  name:'Mostafa Ibrahim',  phone:'+20 115 666 7777', email:'mostafa.i@gmail.com',     ch:'livechat',  orders:4,  revenue:1020,  tags:['New Lead'],     lastSeen:'5h ago',   country:'EG' },
  { id:'10', name:'Rania Fouad',      phone:'+971 52 888 9999', email:'rania.f@work.ae',         ch:'whatsapp',  orders:14, revenue:5600,  tags:['VIP','Loyal'],  lastSeen:'1d ago',   country:'AE' },
  { id:'11', name:'Tarek Saleh',      phone:'+20 100 222 3333', email:'tarek.s@mail.com',        ch:'instagram', orders:1,  revenue:199,   tags:[],               lastSeen:'2d ago',   country:'EG' },
  { id:'12', name:'Dina Kamal',       phone:'+966 54 777 8888', email:'dina.k@company.sa',       ch:'whatsapp',  orders:6,  revenue:2100,  tags:['Follow Up'],    lastSeen:'3d ago',   country:'SA' },
  { id:'13', name:'Bassem Naguib',    phone:'+20 111 000 1111', email:'bassem.n@gmail.com',      ch:'messenger', orders:19, revenue:8250,  tags:['VIP'],          lastSeen:'4d ago',   country:'EG' },
  { id:'14', name:'Amira Lotfy',      phone:'+971 56 333 4444', email:'amira.l@hotmail.com',     ch:'livechat',  orders:7,  revenue:2590,  tags:['Regular'],      lastSeen:'5d ago',   country:'AE' },
  { id:'15', name:'Sherif Wahba',     phone:'+20 122 555 6666', email:'sherif.w@business.com',   ch:'whatsapp',  orders:11, revenue:4100,  tags:['Loyal'],        lastSeen:'1w ago',   country:'EG' },
];

const CH_ICON  = { whatsapp:'📱', instagram:'📸', messenger:'💬', livechat:'⚡' };
const CH_COLOR = { whatsapp:'#25D366', instagram:'#E1306C', messenger:'#0099FF', livechat:'#6366f1' };
const FLAG     = { EG:'🇪🇬', AE:'🇦🇪', SA:'🇸🇦' };

const EMPTY_FORM = { name:'', phone:'', email:'', ch:'whatsapp', country:'EG', tags:'', customFields:{} };

function fmtRevenue(n) {
  if (n >= 1000) return `EGP ${(n/1000).toFixed(1)}k`;
  return `EGP ${n}`;
}

function relativeTimeLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h ago`;
  if (diffMinutes < 10080) return `${Math.round(diffMinutes / 1440)}d ago`;
  return `${Math.round(diffMinutes / 10080)}w ago`;
}

function normalizeContact(contact = {}) {
  return {
    ...contact,
    lastSeen: relativeTimeLabel(contact.lastSeen),
    customFields: contact.customFields || {},
  };
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ContactsPage() {
  const [contacts, setContacts]   = useState([]);
  const [search, setSearch]       = useState('');
  const [chFilter, setChFilter]   = useState('all');
  const [sort, setSort]           = useState({ col:'revenue', dir:'desc' });
  const [selected, setSelected]   = useState(new Set());
  const [viewContact, setView]    = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDelModal]= useState(false);
  const [addModal, setAddModal]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [profileFields, setProfileFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      setLoading(true);
      try {
        const [customers, settings] = await Promise.all([
          api.get('/api/customers'),
          api.get('/api/settings'),
        ]);

        if (cancelled) return;

        setContacts(Array.isArray(customers) ? customers.map(normalizeContact) : []);
        setProfileFields(Array.isArray(settings?.profileFields) ? settings.profileFields : []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Could not load contacts');
          setContacts(SEED_CONTACTS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPageData();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── derived list ─────────────────────────────────────────────────────── */
  const displayed = useMemo(() => {
    let list = contacts.filter(c => {
      if (chFilter !== 'all' && c.ch !== chFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
               c.email.toLowerCase().includes(q) ||
               c.phone.includes(q);
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      const mul = sort.dir === 'asc' ? 1 : -1;
      if (sort.col === 'name')    return mul * a.name.localeCompare(b.name);
      if (sort.col === 'orders')  return mul * (a.orders - b.orders);
      if (sort.col === 'revenue') return mul * (a.revenue - b.revenue);
      return 0;
    });
    return list;
  }, [contacts, search, chFilter, sort]);

  /* ── stats ────────────────────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    total:   contacts.length,
    revenue: contacts.reduce((s, c) => s + c.revenue, 0),
    orders:  contacts.reduce((s, c) => s + c.orders, 0),
    vip:     contacts.filter(c => c.tags.includes('VIP')).length,
  }), [contacts]);

  /* ── selection ────────────────────────────────────────────────────────── */
  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    if (selected.size === displayed.length) setSelected(new Set());
    else setSelected(new Set(displayed.map(c => c.id)));
  }

  /* ── sort helper ──────────────────────────────────────────────────────── */
  function toggleSort(col) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
  }
  function SortIcon({ col }) {
    if (sort.col !== col) return <span style={{ opacity:0.3, marginLeft:4 }}>↕</span>;
    return <span style={{ color:'#818cf8', marginLeft:4 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>;
  }

  /* ── add / edit / delete ──────────────────────────────────────────────── */
  function openAdd() {
    setForm(EMPTY_FORM);
    setFormError('');
    setAddModal(true);
  }

  function openEdit(c, e) {
    e?.stopPropagation();
    setForm({
      name:c.name,
      phone:c.phone,
      email:c.email,
      ch:c.ch,
      country:c.country,
      tags:c.tags.join(', '),
      customFields: c.customFields || {},
    });
    setFormError('');
    setView(c);
    setEditModal(true);
  }

  async function saveContact(isNew) {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.phone.trim()) { setFormError('Phone is required'); return; }
    const tagsArr = form.tags.split(',').map(t => t.trim()).filter(Boolean);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      channel: form.ch,
      country: form.country,
      tags: tagsArr,
      customFields: form.customFields || {},
    };

    try {
      if (isNew) {
        const created = await api.post('/api/customers', payload);
        setContacts((current) => [normalizeContact(created), ...current]);
        setAddModal(false);
        toast.success('Contact added');
      } else {
        const updated = await api.patch(`/api/customers/${viewContact.id}`, payload);
        setContacts((current) => current.map((entry) => (
          entry.id === viewContact.id ? normalizeContact(updated) : entry
        )));
        setView((current) => current?.id === viewContact.id ? normalizeContact(updated) : current);
        setEditModal(false);
        toast.success('Contact updated');
      }
      setFormError('');
    } catch (err) {
      setFormError(err.message || 'Could not save contact');
    }
  }

  function confirmDelete(c, e) {
    e?.stopPropagation();
    setView(c);
    setDelModal(true);
  }

  async function deleteContact() {
    try {
      await api.delete(`/api/customers/${viewContact.id}`);
      setContacts(c => c.filter(x => x.id !== viewContact.id));
      setSelected(s => { const n = new Set(s); n.delete(viewContact.id); return n; });
      setDelModal(false);
      toast.success('Contact moved to recycle bin');
    } catch (err) {
      toast.error(err.message || 'Could not delete contact');
    }
  }

  async function deleteSelected() {
    const ids = Array.from(selected);
    try {
      await Promise.all(ids.map((id) => api.delete(`/api/customers/${id}`)));
      setContacts(c => c.filter(x => !selected.has(x.id)));
      setSelected(new Set());
      toast.success(`${ids.length} contacts moved to recycle bin`);
    } catch (err) {
      toast.error(err.message || 'Could not delete selected contacts');
    }
  }

  /* ── contact form ─────────────────────────────────────────────────────── */
  function ContactForm({ isNew }) {
    const customProfileFields = profileFields.filter((field) => !field.system);
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {formError && (
          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)',
            border:'1px solid rgba(239,68,68,0.2)', color:'#fca5a5', fontSize:13 }}>
            {formError}
          </div>
        )}
        {[
          { key:'name',    label:'Full Name',   type:'text',  ph:'Ahmed Mohamed' },
          { key:'phone',   label:'Phone',        type:'text',  ph:'+20 100 123 4567' },
          { key:'email',   label:'Email',        type:'email', ph:'email@example.com' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>{f.label}</label>
            <input className="input" type={f.type} placeholder={f.ph} style={{ fontSize:13 }}
              value={form[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))} />
          </div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>Channel</label>
            <select className="input" style={{ fontSize:13 }}
              value={form.ch} onChange={e => setForm(x => ({ ...x, ch: e.target.value }))}>
              {['whatsapp','instagram','messenger','livechat'].map(c => (
                <option key={c} value={c}>{CH_ICON[c]} {c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>Country</label>
            <select className="input" style={{ fontSize:13 }}
              value={form.country} onChange={e => setForm(x => ({ ...x, country: e.target.value }))}>
              <option value="EG">🇪🇬 Egypt</option>
              <option value="AE">🇦🇪 UAE</option>
              <option value="SA">🇸🇦 Saudi Arabia</option>
            </select>
          </div>
        </div>
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
            Tags <span style={{ fontWeight:400, color:'var(--t4)' }}>(comma-separated)</span>
          </label>
          <input className="input" style={{ fontSize:13 }} placeholder="VIP, Loyal, Follow Up…"
            value={form.tags} onChange={e => setForm(x => ({ ...x, tags: e.target.value }))} />
        </div>
        {customProfileFields.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {customProfileFields.map((field) => (
              <div key={field.id}>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
                  {field.label}{field.required ? ' *' : ''}
                </label>
                <input
                  className="input"
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder={field.label}
                  style={{ fontSize:13 }}
                  value={form.customFields?.[field.label] || ''}
                  onChange={(e) => setForm((current) => ({
                    ...current,
                    customFields: {
                      ...(current.customFields || {}),
                      [field.label]: e.target.value,
                    },
                  }))}
                />
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button className="btn btn-ghost" style={{ flex:1 }}
            onClick={() => isNew ? setAddModal(false) : setEditModal(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:2 }}
            onClick={() => saveContact(isNew)}>
            {isNew ? '+ Add Contact' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    );
  }

  /* ── render ───────────────────────────────────────────────────────────── */
  return (
    <>
      <div style={{ padding:'28px 28px 40px', maxWidth:1200 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
              Contacts
            </h1>
            <p style={{ fontSize:13, color:'var(--t4)' }}>
              {loading ? 'Loading contacts…' : `${contacts.length} contacts · ${displayed.length} shown`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {selected.size > 0 && (
              <button className="btn btn-sm" onClick={deleteSelected}
                style={{ background:'rgba(239,68,68,0.1)', color:'#fca5a5',
                  border:'1px solid rgba(239,68,68,0.2)', fontWeight:600 }}>
                🗑 Delete {selected.size} selected
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Contact</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Total Contacts', value:stats.total,               icon:'👥', color:'#818cf8' },
            { label:'Total Revenue',  value:fmtRevenue(stats.revenue), icon:'💰', color:'#34d399' },
            { label:'Total Orders',   value:stats.orders,              icon:'📦', color:'#38bdf8' },
            { label:'VIP Contacts',   value:stats.vip,                 icon:'⭐', color:'#fbbf24' },
          ].map(s => (
            <div key={s.label} style={{ padding:'18px 20px', borderRadius:14, background:'var(--bg2)',
              border:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:42, height:42, borderRadius:11, background:`${s.color}14`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize:20, fontWeight:800, color:s.color, letterSpacing:'-0.03em',
                  fontFamily:'Space Grotesk', lineHeight:1 }}>{s.value}</p>
                <p style={{ fontSize:12, color:'var(--t4)', marginTop:3 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" style={{ fontSize:13, width:260 }}
            placeholder="Search by name, email or phone…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display:'flex', gap:4 }}>
            {['all','whatsapp','instagram','messenger','livechat'].map(f => (
              <button key={f} onClick={() => setChFilter(f)}
                style={{ fontSize:11, padding:'5px 11px', borderRadius:99, fontWeight:600, cursor:'pointer',
                  background: chFilter===f ? 'rgba(99,102,241,0.15)' : 'var(--s1)',
                  color:       chFilter===f ? '#a5b4fc' : 'var(--t4)',
                  border:      chFilter===f ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--b1)',
                  transition:'all 0.15s' }}>
                {f === 'all' ? 'All channels' : CH_ICON[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background:'var(--bg2)', border:'1px solid var(--b1)', borderRadius:16, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ display:'grid',
            gridTemplateColumns:'40px 2fr 1.4fr 1.5fr 80px 90px 110px 170px',
            gap:0, padding:'0 16px', borderBottom:'1px solid var(--b1)',
            background:'rgba(255,255,255,0.02)' }}>
            {/* Checkbox */}
            <div style={{ display:'flex', alignItems:'center', padding:'12px 0' }}>
              <input type="checkbox" style={{ cursor:'pointer', accentColor:'#6366f1', width:15, height:15 }}
                checked={selected.size === displayed.length && displayed.length > 0}
                onChange={toggleAll} />
            </div>
            {/* Name */}
            <div style={{ padding:'12px 8px', fontSize:11.5, fontWeight:600, color:'var(--t4)',
              textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center' }}>
              Name
            </div>
            {/* Phone */}
            <div style={{ padding:'12px 8px', fontSize:11.5, fontWeight:600, color:'var(--t4)',
              textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center' }}>
              Phone
            </div>
            {/* Email */}
            <div style={{ padding:'12px 8px', fontSize:11.5, fontWeight:600, color:'var(--t4)',
              textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center' }}>
              Email
            </div>
            {/* Channel */}
            <div style={{ padding:'12px 8px', fontSize:11.5, fontWeight:600, color:'var(--t4)',
              textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center' }}>
              Ch.
            </div>
            {/* Orders */}
            <button onClick={() => toggleSort('orders')}
              style={{ padding:'12px 8px', fontSize:11.5, fontWeight:600, color:'var(--t4)',
                textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center',
                background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
              Orders <SortIcon col="orders" />
            </button>
            {/* Revenue */}
            <button onClick={() => toggleSort('revenue')}
              style={{ padding:'12px 8px', fontSize:11.5, fontWeight:600, color:'var(--t4)',
                textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center',
                background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
              Revenue <SortIcon col="revenue" />
            </button>
            {/* Actions */}
            <div style={{ padding:'12px 8px', fontSize:11.5, fontWeight:600, color:'var(--t4)',
              textTransform:'uppercase', letterSpacing:'0.06em', display:'flex', alignItems:'center' }}>
              Actions
            </div>
          </div>

          {/* Rows */}
          {displayed.length === 0 ? (
            <div style={{ padding:'48px', textAlign:'center', color:'var(--t4)', fontSize:14 }}>
              No contacts found
            </div>
          ) : displayed.map((c, i) => (
            <div key={c.id}
              onClick={() => setView(c)}
              style={{ display:'grid',
                gridTemplateColumns:'40px 2fr 1.4fr 1.5fr 80px 90px 110px 170px',
                gap:0, padding:'0 16px', cursor:'pointer',
                borderBottom: i < displayed.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: selected.has(c.id) ? 'rgba(99,102,241,0.06)' : 'transparent',
                transition:'background 0.1s' }}
              onMouseEnter={e => { if (!selected.has(c.id)) e.currentTarget.style.background='var(--s1)'; }}
              onMouseLeave={e => { if (!selected.has(c.id)) e.currentTarget.style.background='transparent'; }}>

              {/* Checkbox */}
              <div style={{ display:'flex', alignItems:'center', padding:'14px 0' }}
                onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}>
                <input type="checkbox" style={{ cursor:'pointer', accentColor:'#6366f1', width:15, height:15 }}
                  checked={selected.has(c.id)} onChange={() => {}} />
              </div>

              {/* Name */}
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 8px' }}>
                <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.18))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:13, color:'var(--t1)' }}>
                  {c.name[0]}
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.name}</p>
                  <p style={{ fontSize:11, color:'var(--t4)', marginTop:1 }}>
                    {FLAG[c.country]} {c.lastSeen}
                    {c.tags.includes('VIP') && (
                      <span style={{ marginLeft:6, color:'#fbbf24', fontSize:10, fontWeight:700 }}>⭐ VIP</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Phone */}
              <div style={{ display:'flex', alignItems:'center', padding:'14px 8px' }}>
                <span style={{ fontSize:13, color:'var(--t2)', fontFamily:'monospace' }}>{c.phone}</span>
              </div>

              {/* Email */}
              <div style={{ display:'flex', alignItems:'center', padding:'14px 8px', minWidth:0 }}>
                <span style={{ fontSize:12.5, color:'var(--t3)', overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</span>
              </div>

              {/* Channel */}
              <div style={{ display:'flex', alignItems:'center', padding:'14px 8px' }}>
                <span style={{ fontSize:16 }} title={c.ch}>{CH_ICON[c.ch]}</span>
              </div>

              {/* Orders */}
              <div style={{ display:'flex', alignItems:'center', padding:'14px 8px' }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)' }}>{c.orders}</span>
              </div>

              {/* Revenue */}
              <div style={{ display:'flex', alignItems:'center', padding:'14px 8px' }}>
                <span style={{ fontSize:13.5, fontWeight:700, color:'#34d399' }}>{fmtRevenue(c.revenue)}</span>
              </div>

              {/* Actions */}
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'14px 8px' }}
                onClick={e => e.stopPropagation()}>
                <Link href={`/dashboard/contacts/timeline?id=${encodeURIComponent(c.id)}`}
                  style={{ fontSize:11, padding:'4px 9px', borderRadius:7, cursor:'pointer', fontWeight:600,
                    background:'rgba(6,182,212,0.09)', color:'#67e8f9',
                    border:'1px solid rgba(6,182,212,0.18)', transition:'all 0.15s' }}>
                  Timeline
                </Link>
                <button onClick={e => openEdit(c, e)}
                  style={{ fontSize:11, padding:'4px 9px', borderRadius:7, cursor:'pointer', fontWeight:600,
                    background:'rgba(99,102,241,0.1)', color:'#a5b4fc',
                    border:'1px solid rgba(99,102,241,0.2)', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(99,102,241,0.1)'}>
                  Edit
                </button>
                <button onClick={e => confirmDelete(c, e)}
                  style={{ fontSize:11, padding:'4px 9px', borderRadius:7, cursor:'pointer', fontWeight:600,
                    background:'rgba(239,68,68,0.07)', color:'#fca5a5',
                    border:'1px solid rgba(239,68,68,0.15)', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.07)'}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer count */}
        {displayed.length > 0 && (
          <p style={{ fontSize:12, color:'var(--t4)', marginTop:12, textAlign:'center' }}>
            Showing {displayed.length} of {contacts.length} contacts
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
        )}
      </div>

      {/* ── Contact Detail Modal ──────────────────────────────────────────── */}
      <Modal open={!!viewContact && !editModal && !deleteModal}
        onClose={() => setView(null)} title="Contact Details" width={460}>
        {viewContact && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Avatar + name */}
            <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:-4 }}>
              <div style={{ width:58, height:58, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.2))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:22, border:'2px solid rgba(99,102,241,0.2)' }}>
                {viewContact.name[0]}
              </div>
              <div>
                <p style={{ fontSize:17, fontWeight:800, color:'var(--t1)' }}>{viewContact.name}</p>
                <p style={{ fontSize:13, color:CH_COLOR[viewContact.ch], marginTop:2 }}>
                  {CH_ICON[viewContact.ch]} {viewContact.ch} · {FLAG[viewContact.country]}
                </p>
                <div style={{ display:'flex', gap:5, marginTop:6, flexWrap:'wrap' }}>
                  {viewContact.tags.map(t => (
                    <span key={t} style={{ fontSize:10.5, padding:'2px 8px', borderRadius:99,
                      background:'rgba(99,102,241,0.12)', color:'#a5b4fc',
                      border:'1px solid rgba(99,102,241,0.2)', fontWeight:600 }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact info */}
            <div style={{ background:'var(--s1)', borderRadius:12, border:'1px solid var(--b1)', overflow:'hidden' }}>
              {[
                { label:'📞 Phone',   value: viewContact.phone,   mono:true },
                { label:'✉️ Email',   value: viewContact.email,   mono:false },
                { label:'⏱ Last seen', value: viewContact.lastSeen, mono:false },
              ].map((r, i, arr) => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'12px 16px',
                  borderBottom: i < arr.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize:13, color:'var(--t4)' }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--t1)',
                    fontFamily: r.mono ? 'monospace' : 'inherit' }}>{r.value}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ padding:'16px', borderRadius:12, background:'rgba(99,102,241,0.07)',
                border:'1px solid rgba(99,102,241,0.15)', textAlign:'center' }}>
                <p style={{ fontSize:26, fontWeight:800, color:'#818cf8',
                  fontFamily:'Space Grotesk', letterSpacing:'-0.03em' }}>{viewContact.orders}</p>
                <p style={{ fontSize:12, color:'var(--t4)', marginTop:4 }}>Total Orders</p>
              </div>
              <div style={{ padding:'16px', borderRadius:12, background:'rgba(52,211,153,0.07)',
                border:'1px solid rgba(52,211,153,0.15)', textAlign:'center' }}>
                <p style={{ fontSize:26, fontWeight:800, color:'#34d399',
                  fontFamily:'Space Grotesk', letterSpacing:'-0.03em' }}>{fmtRevenue(viewContact.revenue)}</p>
                <p style={{ fontSize:12, color:'var(--t4)', marginTop:4 }}>Delivered Revenue</p>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost" style={{ flex:1 }}
                onClick={() => setView(null)}>Close</button>
              <button className="btn btn-ghost" style={{ flex:1, color:'#fca5a5', borderColor:'rgba(239,68,68,0.2)' }}
                onClick={e => confirmDelete(viewContact, e)}>🗑 Delete</button>
              <button className="btn btn-primary" style={{ flex:1 }}
                onClick={e => openEdit(viewContact, e)}>Edit</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Add Contact Modal ─────────────────────────────────────────────── */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Contact" width={480}>
        <ContactForm isNew={true} />
      </Modal>

      {/* ── Edit Contact Modal ────────────────────────────────────────────── */}
      <Modal open={editModal} onClose={() => setEditModal(false)}
        title={`Edit — ${viewContact?.name}`} width={480}>
        <ContactForm isNew={false} />
      </Modal>

      {/* ── Delete Confirm Modal ──────────────────────────────────────────── */}
      <Modal open={deleteModal} onClose={() => setDelModal(false)} title="Delete Contact" width={400}>
        <div style={{ textAlign:'center', padding:'8px 0 4px' }}>
          <div style={{ fontSize:44, marginBottom:12 }}>🗑</div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--t1)', marginBottom:8 }}>Delete contact?</p>
          <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>
            <strong style={{ color:'var(--t1)' }}>{viewContact?.name}</strong> will be permanently removed.
            This cannot be undone.
          </p>
        </div>
        <div style={{ display:'flex', gap:10, marginTop:4 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setDelModal(false)}>Cancel</button>
          <button className="btn" style={{ flex:1, background:'rgba(239,68,68,0.12)', color:'#fca5a5',
            border:'1px solid rgba(239,68,68,0.25)', fontWeight:700 }}
            onClick={deleteContact}>Delete</button>
        </div>
      </Modal>
    </>
  );
}
