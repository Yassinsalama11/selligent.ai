'use client';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { api } from '@/lib/api';

/* ─────────────────────────────────────────────────────────────────────────────
   Meta WhatsApp Business API — Marketing Broadcast Logic
   ─────────────────────────────────────────────────────────────────────────────
   • Only approved Message Templates can be sent as marketing broadcasts.
   • Each unique 24-hr conversation with a recipient = 1 billable conversation.
   • Rates vary by destination country (USD per conversation).
   • Minimum top-up is $10. Balance is pre-paid (deducted on send).
   • Templates must be submitted to Meta and reviewed within 24-48 hours.
   • Recipients must have opted in to receive marketing messages.
   ──────────────────────────────────────────────────────────────────────────── */

/* ── Per-conversation rates (Meta MENA pricing, USD) ── */
const RATES = { EG: 0.025, AE: 0.036, SA: 0.041, OTHER: 0.035 };

/* ── Seed templates ── */
const SEED_TEMPLATES = [
  {
    id: 't1', name: 'seasonal_sale',
    status: 'approved',        /* approved | pending | rejected */
    category: 'MARKETING',
    language: 'ar',
    header: { type: 'TEXT', text: '🎉 عرض خاص لفترة محدودة!' },
    body: 'أهلاً {{1}}، عندنا خصم {{2}} على كل المنتجات اللي اشتريتها قبل كده! العرض شغال لحد {{3}}. اضغط على الزر واشتري دلوقتي 🛍️',
    footer: 'Selligent.ai · إلغاء الاشتراك اكتب STOP',
    buttons: [{ type: 'URL', text: 'تسوق دلوقتي', url: 'https://store.example.com' }],
    variables: ['اسم العميل', 'نسبة الخصم', 'تاريخ الانتهاء'],
  },
  {
    id: 't2', name: 'new_collection',
    status: 'approved',
    category: 'MARKETING',
    language: 'ar',
    header: { type: 'IMAGE', text: 'product_banner.jpg' },
    body: 'أهلاً {{1}}! وصلت الكوليكشن الجديدة وفيها منتجات هتعجبك 😍\nشوف أحدث الموديلات وأسعارها على موقعنا.',
    footer: 'Selligent.ai · إلغاء الاشتراك اكتب STOP',
    buttons: [
      { type: 'URL',         text: 'شوف الكوليكشن',    url: 'https://store.example.com/new' },
      { type: 'QUICK_REPLY', text: 'مش مهتم',          url: '' },
    ],
    variables: ['اسم العميل'],
  },
  {
    id: 't3', name: 'order_followup',
    status: 'approved',
    category: 'UTILITY',
    language: 'ar',
    header: { type: 'TEXT', text: '📦 تابع طلبك' },
    body: 'أهلاً {{1}}، طلبك رقم {{2}} اتشحن وهيوصلك خلال {{3}} أيام عمل.\nشكراً لثقتك فينا! ❤️',
    footer: 'Selligent.ai',
    buttons: [{ type: 'URL', text: 'تتبع الشحن', url: 'https://track.example.com/{{4}}' }],
    variables: ['اسم العميل', 'رقم الطلب', 'مدة التوصيل', 'كود التتبع'],
  },
  {
    id: 't4', name: 'win_back',
    status: 'pending',
    category: 'MARKETING',
    language: 'ar',
    header: { type: 'TEXT', text: '👋 اشتقنالك!' },
    body: 'أهلاً {{1}}! مشفناكش من فترة 😔 عشان كده عملنالك كود خصم خاص {{2}} صالح لمدة 72 ساعة بس!',
    footer: 'Selligent.ai · إلغاء الاشتراك اكتب STOP',
    buttons: [{ type: 'COPY_CODE', text: 'انسخ الكود', url: '' }],
    variables: ['اسم العميل', 'كود الخصم'],
  },
  {
    id: 't5', name: 'flash_sale_en',
    status: 'rejected',
    category: 'MARKETING',
    language: 'en',
    header: { type: 'TEXT', text: '⚡ Flash Sale - 24 Hours Only!' },
    body: 'Hi {{1}}! Don\'t miss our flash sale — up to {{2}} off storewide. Use code {{3}} at checkout.',
    footer: 'Selligent.ai · Reply STOP to unsubscribe',
    buttons: [{ type: 'URL', text: 'Shop Now', url: 'https://store.example.com/flash' }],
    variables: ['Customer Name', 'Discount %', 'Promo Code'],
    rejectReason: 'Template contains misleading urgency claims. Please revise body copy.',
  },
];

/* ── Seed broadcast history ── */
const SEED_HISTORY = [
  { id:'b1', name:'Ramadan Sale 2025', template:'seasonal_sale', sentAt:'Apr 8, 10:30', recipients:248, delivered:241, read:187, failed:7,  cost:6.20,  status:'completed' },
  { id:'b2', name:'New Spring Collection', template:'new_collection', sentAt:'Mar 22, 14:00', recipients:412, delivered:398, read:301, failed:14, cost:10.30, status:'completed' },
  { id:'b3', name:'Order Follow-up Blast', template:'order_followup', sentAt:'Mar 15, 9:00',  recipients:89,  delivered:88, read:72,  failed:1,  cost:2.23,  status:'completed' },
  { id:'b4', name:'Win-Back Campaign',     template:'win_back',       sentAt:'—',             recipients:156, delivered:0,  read:0,   failed:0,  cost:0,     status:'scheduled' },
];

/* ── Seed contacts (matching contacts page) ── */
const CONTACTS = [
  { id:'1',  name:'Ahmed Mohamed',   phone:'+20 100 123 4567', country:'EG', tags:['VIP'] },
  { id:'2',  name:'Sara Khalil',     phone:'+20 111 987 6543', country:'EG', tags:['Interested'] },
  { id:'3',  name:'Omar Hassan',     phone:'+971 50 234 5678', country:'AE', tags:['Price Obj.'] },
  { id:'4',  name:'Layla Samir',     phone:'+971 55 876 5432', country:'AE', tags:['Follow Up'] },
  { id:'5',  name:'Youssef Ali',     phone:'+20 122 456 7890', country:'EG', tags:['VIP','Loyal'] },
  { id:'6',  name:'Nour Adel',       phone:'+966 50 111 2233', country:'SA', tags:[] },
  { id:'7',  name:'Khaled Mansour',  phone:'+20 100 333 4444', country:'EG', tags:['VIP'] },
  { id:'8',  name:'Fatima Al-Zahra', phone:'+966 55 444 5555', country:'SA', tags:['Regular'] },
  { id:'9',  name:'Mostafa Ibrahim', phone:'+20 115 666 7777', country:'EG', tags:['New Lead'] },
  { id:'10', name:'Rania Fouad',     phone:'+971 52 888 9999', country:'AE', tags:['VIP','Loyal'] },
  { id:'11', name:'Tarek Saleh',     phone:'+20 100 222 3333', country:'EG', tags:[] },
  { id:'12', name:'Dina Kamal',      phone:'+966 54 777 8888', country:'SA', tags:['Follow Up'] },
];

const TOP_UP_PACKAGES = [
  { amount: 10,  label: '$10',  bonus: null },
  { amount: 25,  label: '$25',  bonus: null },
  { amount: 50,  label: '$50',  bonus: '5% bonus' },
  { amount: 100, label: '$100', bonus: '12% bonus' },
  { amount: 250, label: '$250', bonus: '20% bonus' },
];

const STATUS_STYLE = {
  approved:  { bg:'rgba(52,211,153,0.1)',  color:'#34d399', border:'rgba(52,211,153,0.2)',  label:'✓ Approved' },
  pending:   { bg:'rgba(251,191,36,0.1)',  color:'#fbbf24', border:'rgba(251,191,36,0.2)',  label:'⏳ Pending' },
  rejected:  { bg:'rgba(239,68,68,0.1)',   color:'#fca5a5', border:'rgba(239,68,68,0.2)',   label:'✕ Rejected' },
  completed: { bg:'rgba(52,211,153,0.1)',  color:'#34d399', border:'rgba(52,211,153,0.2)',  label:'Completed' },
  scheduled: { bg:'rgba(251,191,36,0.1)',  color:'#fbbf24', border:'rgba(251,191,36,0.2)',  label:'Scheduled' },
};

function Badge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99,
      background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function estimateCost(recipients, defaultRate = RATES.EG) {
  return recipients.reduce((sum, c) => {
    const rate = RATES[c.country] || RATES.OTHER;
    return sum + rate;
  }, 0);
}

function formatHistoryDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { month:'short', day:'numeric' }) + ', ' +
    date.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
}

function normalizeHistoryEntry(entry = {}) {
  return {
    ...entry,
    sentAt: formatHistoryDate(entry.sentAt),
  };
}

/* ════════════════════════════════════════════════════════════════════════════ */
export default function BroadcastPage() {
  const [tab, setTab]               = useState('new');   /* new | templates | history */
  const [balance, setBalance]       = useState(0);
  const [templates, setTemplates]   = useState([]);
  const [history, setHistory]       = useState([]);
  const [contacts, setContacts]     = useState([]);
  const [loading, setLoading]       = useState(true);

  /* ── New broadcast wizard (4 steps) ── */
  const [step, setStep]             = useState(1);
  const [bName, setBName]           = useState('');
  const [selTemplate, setSelTpl]    = useState(null);
  const [selContacts, setSelCont]   = useState(new Set());
  const [manualNums, setManual]     = useState('');
  const [recipientMode, setRcpMode] = useState('contacts'); /* contacts | manual | tag */
  const [tagFilter, setTagFilter]   = useState('');
  const [varValues, setVarValues]   = useState({});
  const [scheduleType, setSched]    = useState('now');     /* now | later */
  const [scheduleAt, setSchedAt]    = useState('');
  const [sending, setSending]       = useState(false);

  /* ── Modals ── */
  const [topUpModal, setTopUpModal]     = useState(false);
  const [topUpAmt, setTopUpAmt]         = useState(25);
  const [newTplModal, setNewTplModal]   = useState(false);
  const [tplForm, setTplForm]           = useState({ name:'', category:'MARKETING', language:'ar', header:'', body:'', footer:'', buttons:'' });
  const [histDetail, setHistDetail]     = useState(null);

  /* ── Recipient helpers ── */
  useEffect(() => {
    let cancelled = false;

    async function loadBroadcastData() {
      setLoading(true);
      try {
        const data = await api.get('/api/broadcast');
        if (cancelled) return;
        setBalance(Number(data?.balance || 0));
        setTemplates(Array.isArray(data?.templates) ? data.templates : []);
        setHistory(Array.isArray(data?.history) ? data.history.map(normalizeHistoryEntry) : []);
        setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || 'Could not load broadcast data');
          setBalance(18.45);
          setTemplates(SEED_TEMPLATES);
          setHistory(SEED_HISTORY);
          setContacts(CONTACTS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBroadcastData();
    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => [...new Set(contacts.flatMap(c => c.tags || []))].filter(Boolean), [contacts]);

  const activeRecipients = useMemo(() => {
    if (recipientMode === 'contacts') return contacts.filter(c => selContacts.has(c.id));
    if (recipientMode === 'tag') return tagFilter ? contacts.filter(c => (c.tags || []).includes(tagFilter)) : [];
    if (recipientMode === 'manual') {
      return manualNums.split('\n').map(l => l.trim()).filter(Boolean).map((phone, i) => ({
        id: 'manual_'+i, name: phone, phone, country: 'EG', tags: [],
      }));
    }
    return [];
  }, [contacts, recipientMode, selContacts, tagFilter, manualNums]);

  const estimatedCost = useMemo(() => estimateCost(activeRecipients), [activeRecipients]);
  const hasBalance    = balance >= estimatedCost;

  /* ── Variable helpers ── */
  function previewBody() {
    if (!selTemplate) return '';
    let text = selTemplate.body;
    selTemplate.variables.forEach((_, i) => {
      text = text.replace(`{{${i+1}}}`, varValues[i+1] || `{{${i+1}}}`);
    });
    return text;
  }

  /* ── Step guards ── */
  function canGoStep(n) {
    if (n >= 2 && (!bName.trim() || !selTemplate)) return false;
    if (n >= 3 && activeRecipients.length === 0) return false;
    if (n >= 4 && selTemplate?.variables.some((_, i) => !varValues[i+1]?.trim())) return false;
    return true;
  }

  /* ── Send ── */
  async function sendBroadcast() {
    if (!hasBalance) { toast.error('Insufficient balance — please top up'); return; }
    setSending(true);
    try {
      const response = await api.post('/api/broadcast/send', {
        name: bName,
        templateId: selTemplate.id,
        recipients: activeRecipients,
        variables: varValues,
        scheduleAt: scheduleType === 'later' ? scheduleAt : null,
      });

      if (response?.entry) setHistory(h => [normalizeHistoryEntry(response.entry), ...h]);
      if (typeof response?.balance === 'number') setBalance(response.balance);

      setStep(1); setBName(''); setSelTpl(null);
      setSelCont(new Set()); setManual(''); setVarValues({});
      setSched('now'); setSchedAt('');

      toast.success(scheduleType === 'now'
        ? `📣 Broadcast sent to ${activeRecipients.length} contacts!`
        : '📅 Broadcast scheduled!', { duration: 4000 });
      setTab('history');
    } catch (err) {
      toast.error(err.message || 'Could not send broadcast');
    } finally {
      setSending(false);
    }
  }

  /* ── Top-up ── */
  async function doTopUp() {
    try {
      const response = await api.post('/api/broadcast/top-up', { amount: topUpAmt });
      setBalance(Number(response?.balance || 0));
      setTopUpModal(false);
      toast.success(`$${topUpAmt} added to your balance 💳`);
    } catch (err) {
      toast.error(err.message || 'Could not top up balance');
    }
  }

  /* ── Submit new template ── */
  async function submitTemplate() {
    if (!tplForm.name.trim() || !tplForm.body.trim()) {
      toast.error('Template name and body are required'); return;
    }
    const variables = (tplForm.body.match(/\{\{\d+\}\}/g) || [])
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .map((_, i) => `Variable ${i+1}`);
    try {
      const nextTemplates = await api.post('/api/broadcast/templates', {
        name: tplForm.name.replace(/\s+/g,'_').toLowerCase(),
        status: 'pending',
        category: tplForm.category,
        language: tplForm.language,
        header: { type:'TEXT', text: tplForm.header },
        body: tplForm.body,
        footer: tplForm.footer,
        buttons: tplForm.buttons ? [{ type:'URL', text: tplForm.buttons, url:'' }] : [],
        variables,
      });
      setTemplates(Array.isArray(nextTemplates) ? nextTemplates : []);
      setNewTplModal(false);
      setTplForm({ name:'', category:'MARKETING', language:'ar', header:'', body:'', footer:'', buttons:'' });
      toast.success('Template submitted to Meta for review (24-48 hrs) ⏳');
    } catch (err) {
      toast.error(err.message || 'Could not save template');
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <div style={{ padding:'28px 28px 60px', maxWidth:1200 }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
          marginBottom:24, gap:12, flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
              WhatsApp Broadcast
            </h1>
            <p style={{ fontSize:13, color:'var(--t4)' }}>
              Send approved marketing templates to opted-in contacts via Meta WhatsApp Business API
              {loading ? ' · Loading live data…' : ''}
            </p>
          </div>

          {/* Balance chip */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <div style={{ padding:'10px 18px', borderRadius:12,
              background: balance < 5 ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.07)',
              border: `1px solid ${balance < 5 ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)'}`,
              display:'flex', alignItems:'center', gap:10 }}>
              <div>
                <p style={{ fontSize:10.5, color:'var(--t4)', fontWeight:600,
                  textTransform:'uppercase', letterSpacing:'0.06em' }}>Balance</p>
                <p style={{ fontSize:18, fontWeight:800, color: balance < 5 ? '#fca5a5' : '#34d399',
                  fontFamily:'Space Grotesk', lineHeight:1.1 }}>${balance.toFixed(2)}</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setTopUpModal(true)}>
                + Top Up
              </button>
            </div>
            {balance < 5 && (
              <div style={{ padding:'8px 14px', borderRadius:10, background:'rgba(239,68,68,0.07)',
                border:'1px solid rgba(239,68,68,0.2)', fontSize:12, color:'#fca5a5', fontWeight:600 }}>
                ⚠️ Low balance
              </div>
            )}
          </div>
        </div>

        {/* ── Meta info banner ─────────────────────────────────────────── */}
        <div style={{ padding:'12px 18px', marginBottom:22, borderRadius:12,
          background:'rgba(37,211,102,0.05)', border:'1px solid rgba(37,211,102,0.15)',
          display:'flex', alignItems:'flex-start', gap:12, fontSize:12.5, color:'var(--t3)' }}>
          <span style={{ fontSize:20, flexShrink:0 }}>📋</span>
          <div>
            <strong style={{ color:'#25D366' }}>Meta WhatsApp Business API rules:</strong>
            {' '}Only <strong style={{ color:'var(--t2)' }}>approved templates</strong> can be broadcast.
            Each conversation is billed per 24-hr window — EG: $0.025 · AE: $0.036 · SA: $0.041.
            Recipients must have <strong style={{ color:'var(--t2)' }}>opted in</strong> to receive marketing messages.
            Template approval takes <strong style={{ color:'var(--t2)' }}>24-48 hours</strong>.
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:2, marginBottom:24, borderBottom:'1px solid var(--b1)',
          paddingBottom:0 }}>
          {[
            { key:'new',       label:'📣 New Broadcast' },
            { key:'templates', label:'📝 Templates' },
            { key:'history',   label:'📊 History' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'10px 18px', fontSize:13.5, fontWeight:600, cursor:'pointer',
                background:'none', border:'none', color: tab===t.key ? '#a5b4fc' : 'var(--t4)',
                borderBottom: tab===t.key ? '2px solid #6366f1' : '2px solid transparent',
                transition:'all 0.15s', marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════
            TAB: NEW BROADCAST (4-step wizard)
            ════════════════════════════════════════════════════════════════ */}
        {tab === 'new' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:24, alignItems:'start' }}>

            {/* ── Wizard left ── */}
            <div>
              {/* Step indicator */}
              <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:28 }}>
                {[
                  { n:1, label:'Template' },
                  { n:2, label:'Recipients' },
                  { n:3, label:'Personalise' },
                  { n:4, label:'Review & Send' },
                ].map((s, i, arr) => (
                  <div key={s.n} style={{ display:'flex', alignItems:'center', flex: i < arr.length-1 ? 1 : 'none' }}>
                    <button onClick={() => canGoStep(s.n) && setStep(s.n)}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                        background:'none', border:'none', cursor: canGoStep(s.n) ? 'pointer' : 'default',
                        padding:'0 4px', flexShrink:0 }}>
                      <div style={{ width:34, height:34, borderRadius:'50%', fontSize:14, fontWeight:700,
                        display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
                        background: step > s.n ? '#34d399' : step === s.n ? '#6366f1' : 'var(--s2)',
                        color: step >= s.n ? '#fff' : 'var(--t4)',
                        border: step === s.n ? '2px solid rgba(99,102,241,0.5)' : '2px solid transparent',
                        boxShadow: step === s.n ? '0 0 14px rgba(99,102,241,0.35)' : 'none' }}>
                        {step > s.n ? '✓' : s.n}
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, whiteSpace:'nowrap',
                        color: step >= s.n ? 'var(--t1)' : 'var(--t4)' }}>{s.label}</span>
                    </button>
                    {i < arr.length-1 && (
                      <div style={{ flex:1, height:2, margin:'0 4px', marginBottom:20,
                        background: step > s.n ? '#34d399' : 'var(--s2)',
                        transition:'background 0.3s' }} />
                    )}
                  </div>
                ))}
              </div>

              {/* ── STEP 1: Name + Template ── */}
              {step === 1 && (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:8 }}>
                      Broadcast Name <span style={{ color:'var(--t4)', fontWeight:400 }}>(internal reference)</span>
                    </label>
                    <input className="input" style={{ fontSize:14 }} placeholder="e.g. Ramadan Sale Apr 2025"
                      value={bName} onChange={e => setBName(e.target.value)} />
                  </div>

                  <div>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                      <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)' }}>
                        Select Template <span style={{ color:'#34d399' }}>(approved only)</span>
                      </label>
                      <button className="btn btn-ghost btn-xs" onClick={() => setTab('templates')}>
                        + New Template
                      </button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {templates.filter(t => t.status === 'approved').map(t => (
                        <div key={t.id} onClick={() => { setSelTpl(t); setVarValues({}); }}
                          style={{ padding:'14px 16px', borderRadius:12, cursor:'pointer', transition:'all 0.15s',
                            border: selTemplate?.id === t.id
                              ? '1.5px solid rgba(99,102,241,0.5)' : '1px solid var(--b1)',
                            background: selTemplate?.id === t.id
                              ? 'rgba(99,102,241,0.08)' : 'var(--bg2)' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontFamily:'monospace', fontSize:12.5, color:'#a5b4fc',
                                background:'rgba(99,102,241,0.1)', padding:'2px 8px', borderRadius:6 }}>
                                {t.name}
                              </span>
                              <span style={{ fontSize:10.5, color:'var(--t4)',
                                background:'var(--s2)', padding:'2px 7px', borderRadius:99,
                                border:'1px solid var(--b1)' }}>{t.category}</span>
                              <span style={{ fontSize:10.5, color:'var(--t4)' }}>{t.language === 'ar' ? '🇪🇬 AR' : '🌐 EN'}</span>
                            </div>
                            <Badge status={t.status} />
                          </div>
                          {t.header.text && (
                            <p style={{ fontSize:12, fontWeight:700, color:'var(--t2)', marginBottom:4 }}
                              dir="auto">{t.header.type === 'IMAGE' ? '🖼 ' : ''}{t.header.text}</p>
                          )}
                          <p style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.6, marginBottom:6 }}
                            dir="auto">
                            {t.body.length > 100 ? t.body.slice(0, 100) + '…' : t.body}
                          </p>
                          {t.variables.length > 0 && (
                            <p style={{ fontSize:11, color:'var(--t4)' }}>
                              Variables: {t.variables.map((v, i) => (
                                <code key={i} style={{ color:'#818cf8', marginRight:4 }}>{`{{${i+1}}}`} {v}</code>
                              ))}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button className="btn btn-primary"
                    disabled={!bName.trim() || !selTemplate}
                    style={{ alignSelf:'flex-end', padding:'11px 28px' }}
                    onClick={() => setStep(2)}>
                    Next: Select Recipients →
                  </button>
                </div>
              )}

              {/* ── STEP 2: Recipients ── */}
              {step === 2 && (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  {/* Mode tabs */}
                  <div style={{ display:'flex', gap:8 }}>
                    {[
                      { key:'contacts', label:'📋 From Contacts' },
                      { key:'tag',      label:'🏷 By Tag/Segment' },
                      { key:'manual',   label:'✏️ Manual Numbers' },
                    ].map(m => (
                      <button key={m.key} onClick={() => { setRcpMode(m.key); setSelCont(new Set()); }}
                        style={{ padding:'8px 14px', borderRadius:10, fontSize:12.5, fontWeight:600,
                          cursor:'pointer', transition:'all 0.15s',
                          background: recipientMode===m.key ? 'rgba(99,102,241,0.15)' : 'var(--s1)',
                          border:     recipientMode===m.key ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--b1)',
                          color:      recipientMode===m.key ? '#a5b4fc' : 'var(--t3)' }}>
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Contacts list */}
                  {recipientMode === 'contacts' && (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center' }}>
                        <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)' }}>
                          Select contacts ({selContacts.size} selected)
                        </label>
                        <button style={{ fontSize:11, color:'#818cf8', background:'none', border:'none',
                          cursor:'pointer', fontWeight:600 }}
                          onClick={() => setSelCont(
                            selContacts.size === contacts.length
                              ? new Set()
                              : new Set(contacts.map(c => c.id))
                          )}>
                          {selContacts.size === contacts.length ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:340, overflowY:'auto' }}>
                        {contacts.map(c => (
                          <label key={c.id}
                            style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                              borderRadius:10, cursor:'pointer', transition:'background 0.1s',
                              background: selContacts.has(c.id) ? 'rgba(99,102,241,0.07)' : 'var(--bg2)',
                              border: selContacts.has(c.id) ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--b1)' }}>
                            <input type="checkbox" style={{ accentColor:'#6366f1', width:15, height:15, cursor:'pointer' }}
                              checked={selContacts.has(c.id)}
                              onChange={() => {
                                const n = new Set(selContacts);
                                n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                                setSelCont(n);
                              }} />
                            <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
                              background:'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))',
                              display:'flex', alignItems:'center', justifyContent:'center',
                              fontWeight:700, fontSize:12 }}>{c.name[0]}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{c.name}</p>
                              <p style={{ fontSize:11, color:'var(--t4)', fontFamily:'monospace' }}>{c.phone}</p>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                              <span style={{ fontSize:10.5, color:'var(--t4)',
                                background:'var(--s2)', padding:'2px 7px', borderRadius:99,
                                border:'1px solid var(--b1)' }}>
                                {c.country === 'EG' ? '🇪🇬' : c.country === 'AE' ? '🇦🇪' : '🇸🇦'} ${RATES[c.country]}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By tag */}
                  {recipientMode === 'tag' && (
                    <div>
                      <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:8 }}>
                        Select segment / tag
                      </label>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                        {allTags.map(t => (
                          <button key={t} onClick={() => setTagFilter(t === tagFilter ? '' : t)}
                            style={{ padding:'8px 16px', borderRadius:99, fontSize:12.5, fontWeight:600,
                              cursor:'pointer', transition:'all 0.15s',
                              background: tagFilter===t ? 'rgba(99,102,241,0.15)' : 'var(--s1)',
                              border:     tagFilter===t ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--b1)',
                              color:      tagFilter===t ? '#a5b4fc' : 'var(--t3)' }}>
                            {t} ({contacts.filter(c => (c.tags || []).includes(t)).length})
                          </button>
                        ))}
                      </div>
                      {tagFilter && (
                        <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10,
                          background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)',
                          fontSize:13, color:'var(--t2)' }}>
                          {contacts.filter(c => (c.tags || []).includes(tagFilter)).length} contacts will receive this broadcast
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual */}
                  {recipientMode === 'manual' && (
                    <div>
                      <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:8 }}>
                        Phone numbers <span style={{ fontWeight:400, color:'var(--t4)' }}>(one per line, international format)</span>
                      </label>
                      <textarea className="input" style={{ fontSize:13, resize:'vertical', minHeight:140,
                        fontFamily:'monospace' }}
                        placeholder={'+20 100 123 4567\n+971 50 234 5678\n+966 50 111 2233'}
                        value={manualNums} onChange={e => setManual(e.target.value)} />
                      <p style={{ fontSize:11, color:'var(--t4)', marginTop:6 }}>
                        {manualNums.split('\n').filter(l => l.trim()).length} numbers entered
                      </p>
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                    <button className="btn btn-primary"
                      disabled={activeRecipients.length === 0}
                      style={{ padding:'11px 28px' }}
                      onClick={() => setStep(3)}>
                      Next: Personalise →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Variables ── */}
              {step === 3 && selTemplate && (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  <div style={{ padding:'14px 16px', borderRadius:12, background:'var(--bg2)',
                    border:'1px solid var(--b1)' }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'var(--t4)', marginBottom:8,
                      textTransform:'uppercase', letterSpacing:'0.06em' }}>Template: {selTemplate.name}</p>
                    <p style={{ fontSize:13.5, color:'var(--t2)', lineHeight:1.7 }} dir="auto">
                      {selTemplate.body}
                    </p>
                  </div>

                  {selTemplate.variables.length === 0 ? (
                    <div style={{ padding:'20px', textAlign:'center', color:'var(--t4)', fontSize:13 }}>
                      ✓ This template has no variables — no personalisation needed.
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                      <p style={{ fontSize:13, color:'var(--t3)' }}>
                        Fill in the default values for each variable. These will be the same for all recipients
                        unless you upload a personalised CSV.
                      </p>
                      {selTemplate.variables.map((v, i) => (
                        <div key={i}>
                          <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
                            <code style={{ color:'#818cf8', marginRight:6 }}>{`{{${i+1}}}`}</code>{v}
                          </label>
                          <input className="input" style={{ fontSize:13 }}
                            placeholder={`Enter value for ${v}…`}
                            value={varValues[i+1] || ''}
                            onChange={e => setVarValues(x => ({ ...x, [i+1]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setStep(2)}>← Back</button>
                    <button className="btn btn-primary"
                      disabled={selTemplate.variables.some((_, i) => !varValues[i+1]?.trim()) && selTemplate.variables.length > 0}
                      style={{ padding:'11px 28px' }}
                      onClick={() => setStep(4)}>
                      Next: Review →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 4: Review & Send ── */}
              {step === 4 && selTemplate && (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  {/* Summary */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {[
                      { label:'Broadcast name', value: bName },
                      { label:'Template', value: selTemplate.name },
                      { label:'Recipients', value: `${activeRecipients.length} contacts` },
                      { label:'Estimated cost', value: `$${estimatedCost.toFixed(3)}`, color: hasBalance ? '#34d399' : '#fca5a5' },
                    ].map(r => (
                      <div key={r.label} style={{ padding:'12px 14px', borderRadius:10,
                        background:'var(--bg2)', border:'1px solid var(--b1)' }}>
                        <p style={{ fontSize:11, color:'var(--t4)', marginBottom:4 }}>{r.label}</p>
                        <p style={{ fontSize:14, fontWeight:700, color: r.color || 'var(--t1)' }}>{r.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Balance check */}
                  {!hasBalance && (
                    <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(239,68,68,0.08)',
                      border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'center',
                      justifyContent:'space-between', gap:12 }}>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700, color:'#fca5a5', marginBottom:3 }}>
                          ⚠️ Insufficient balance
                        </p>
                        <p style={{ fontSize:12, color:'var(--t4)' }}>
                          Need ${estimatedCost.toFixed(3)} · Have ${balance.toFixed(2)} ·{' '}
                          Short ${(estimatedCost - balance).toFixed(3)}
                        </p>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => setTopUpModal(true)}>
                        Top Up →
                      </button>
                    </div>
                  )}

                  {/* Schedule */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:10 }}>
                      When to send?
                    </label>
                    <div style={{ display:'flex', gap:10 }}>
                      {[{ k:'now', label:'⚡ Send Now' }, { k:'later', label:'📅 Schedule' }].map(o => (
                        <button key={o.k} onClick={() => setSched(o.k)}
                          style={{ padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:600,
                            cursor:'pointer', transition:'all 0.15s',
                            background: scheduleType===o.k ? 'rgba(99,102,241,0.15)' : 'var(--s1)',
                            border:     scheduleType===o.k ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--b1)',
                            color:      scheduleType===o.k ? '#a5b4fc' : 'var(--t3)' }}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {scheduleType === 'later' && (
                      <input type="datetime-local" className="input" style={{ fontSize:13, marginTop:12 }}
                        value={scheduleAt} onChange={e => setSchedAt(e.target.value)} />
                    )}
                  </div>

                  <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button className="btn btn-ghost" onClick={() => setStep(3)}>← Back</button>
                    <button className="btn btn-primary"
                      disabled={!hasBalance || sending || (scheduleType === 'later' && !scheduleAt)}
                      style={{ padding:'11px 32px', minWidth:160, justifyContent:'center' }}
                      onClick={sendBroadcast}>
                      {sending ? (
                        <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <svg style={{ animation:'anim-spin 1s linear infinite', width:16, height:16 }}
                            viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"
                              strokeDasharray="40 60" />
                          </svg>
                          Sending…
                        </span>
                      ) : scheduleType === 'now' ? '📣 Send Broadcast' : '📅 Schedule Broadcast'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Preview panel (right) ── */}
            <div style={{ position:'sticky', top:0 }}>
              <p style={{ fontSize:11.5, fontWeight:600, color:'var(--t4)',
                textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                Message Preview
              </p>

              {/* Phone mock */}
              <div style={{ background:'#1a1a2e', border:'1.5px solid rgba(255,255,255,0.1)',
                borderRadius:20, padding:'24px 16px', boxShadow:'0 20px 60px rgba(0,0,0,0.5)' }}>
                {/* Status bar */}
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16,
                  fontSize:10, color:'rgba(255,255,255,0.4)' }}>
                  <span>9:41</span><span>●●●●●</span>
                </div>
                {/* Chat header */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16,
                  paddingBottom:12, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:'#25D366',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🏪</div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:600, color:'#fff' }}>Selligent Store</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>Business Account</p>
                  </div>
                </div>
                {/* Message bubble */}
                {selTemplate ? (
                  <div style={{ background:'#1f2c34', borderRadius:'16px 16px 16px 4px',
                    padding:'12px 14px', maxWidth:'88%' }}>
                    {selTemplate.header.text && (
                      <p style={{ fontSize:12.5, fontWeight:700, color:'#e9edef', marginBottom:8,
                        paddingBottom:8, borderBottom:'1px solid rgba(255,255,255,0.08)' }} dir="auto">
                        {selTemplate.header.type === 'IMAGE' ? '🖼 ' : ''}
                        {selTemplate.header.text}
                      </p>
                    )}
                    <p style={{ fontSize:12.5, color:'#d1d7db', lineHeight:1.65, whiteSpace:'pre-line' }} dir="auto">
                      {previewBody()}
                    </p>
                    {selTemplate.footer && (
                      <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:8 }} dir="auto">
                        {selTemplate.footer}
                      </p>
                    )}
                    <p style={{ fontSize:9.5, color:'rgba(255,255,255,0.3)', marginTop:6, textAlign:'right' }}>
                      {new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})} ✓✓
                    </p>
                    {selTemplate.buttons.length > 0 && (
                      <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6,
                        borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:10 }}>
                        {selTemplate.buttons.map((b, i) => (
                          <div key={i} style={{ padding:'8px', borderRadius:8,
                            background:'rgba(255,255,255,0.05)',
                            border:'1px solid rgba(255,255,255,0.08)',
                            fontSize:12, color:'#53bdeb', textAlign:'center', fontWeight:600 }}>
                            {b.type === 'QUICK_REPLY' ? '↩ ' : b.type === 'URL' ? '🔗 ' : '📋 '}
                            {b.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding:'20px 0', textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:12 }}>
                    Select a template to preview
                  </div>
                )}
              </div>

              {/* Cost estimate */}
              {activeRecipients.length > 0 && (
                <div style={{ marginTop:14, padding:'14px 16px', borderRadius:12,
                  background:'var(--bg2)', border:'1px solid var(--b1)' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--t2)', marginBottom:10 }}>Cost Estimate</p>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'var(--t4)' }}>Recipients</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'var(--t1)' }}>{activeRecipients.length}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:12, color:'var(--t4)' }}>Est. total</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'#34d399' }}>${estimatedCost.toFixed(3)}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:12, color:'var(--t4)' }}>Balance after</span>
                    <span style={{ fontSize:12, fontWeight:700,
                      color: hasBalance ? 'var(--t2)' : '#fca5a5' }}>
                      ${(balance - estimatedCost).toFixed(3)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: TEMPLATES
            ════════════════════════════════════════════════════════════════ */}
        {tab === 'templates' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
              <div>
                <p style={{ fontSize:14, color:'var(--t3)' }}>
                  Templates must be approved by Meta before use. Approval takes 24-48 hours.
                </p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setNewTplModal(true)}>
                + New Template
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {templates.map(t => (
                <div key={t.id} style={{ padding:'18px 20px', borderRadius:14,
                  background:'var(--bg2)', border:'1px solid var(--b1)' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                    gap:12, marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <code style={{ fontSize:13, color:'#a5b4fc', background:'rgba(99,102,241,0.1)',
                        padding:'3px 10px', borderRadius:7, fontWeight:600 }}>{t.name}</code>
                      <span style={{ fontSize:11, color:'var(--t4)', background:'var(--s2)',
                        padding:'2px 8px', borderRadius:99, border:'1px solid var(--b1)' }}>{t.category}</span>
                      <span style={{ fontSize:11, color:'var(--t4)' }}>{t.language === 'ar' ? '🇪🇬 Arabic' : '🌐 English'}</span>
                    </div>
                    <Badge status={t.status} />
                  </div>

                  {t.status === 'rejected' && t.rejectReason && (
                    <div style={{ padding:'10px 14px', borderRadius:9, marginBottom:12,
                      background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)',
                      fontSize:12, color:'#fca5a5' }}>
                      <strong>Rejection reason:</strong> {t.rejectReason}
                    </div>
                  )}

                  {t.header.text && (
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--t2)', marginBottom:6 }} dir="auto">
                      {t.header.type === 'IMAGE' ? '🖼 ' : ''}{t.header.text}
                    </p>
                  )}
                  <p style={{ fontSize:13.5, color:'var(--t3)', lineHeight:1.7, marginBottom:10 }} dir="auto">
                    {t.body}
                  </p>
                  {t.footer && (
                    <p style={{ fontSize:11.5, color:'var(--t4)', marginBottom:10 }} dir="auto">{t.footer}</p>
                  )}
                  {t.buttons.length > 0 && (
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                      {t.buttons.map((b, i) => (
                        <span key={i} style={{ fontSize:11.5, padding:'4px 12px', borderRadius:99,
                          background:'rgba(83,189,235,0.1)', color:'#53bdeb',
                          border:'1px solid rgba(83,189,235,0.2)', fontWeight:600 }}>
                          {b.type === 'URL' ? '🔗' : b.type === 'QUICK_REPLY' ? '↩' : '📋'} {b.text}
                        </span>
                      ))}
                    </div>
                  )}
                  {t.variables.length > 0 && (
                    <p style={{ fontSize:11, color:'var(--t4)' }}>
                      Variables: {t.variables.map((v, i) => (
                        <code key={i} style={{ color:'#818cf8', marginRight:4 }}>{`{{${i+1}}}`} {v}</code>
                      ))}
                    </p>
                  )}

                  {t.status === 'approved' && (
                    <div style={{ marginTop:12 }}>
                      <button className="btn btn-ghost btn-xs"
                        onClick={() => { setSelTpl(t); setVarValues({}); setStep(1); setTab('new'); }}>
                        📣 Use in Broadcast
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            TAB: HISTORY
            ════════════════════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <div>
            {/* Summary stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
              {[
                { label:'Total Sent',      value: history.filter(h=>h.status==='completed').reduce((s,h)=>s+h.recipients,0).toLocaleString(), icon:'📣', color:'#818cf8' },
                { label:'Total Delivered', value: history.filter(h=>h.status==='completed').reduce((s,h)=>s+h.delivered,0).toLocaleString(), icon:'✅', color:'#34d399' },
                { label:'Total Read',      value: history.filter(h=>h.status==='completed').reduce((s,h)=>s+h.read,0).toLocaleString(),      icon:'👁', color:'#38bdf8' },
                { label:'Total Spent',     value: '$' + history.reduce((s,h)=>s+h.cost,0).toFixed(2),                                        icon:'💰', color:'#fbbf24' },
              ].map(s => (
                <div key={s.label} style={{ padding:'16px 18px', borderRadius:14, background:'var(--bg2)',
                  border:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${s.color}14`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <p style={{ fontSize:18, fontWeight:800, color:s.color,
                      fontFamily:'Space Grotesk', letterSpacing:'-0.03em', lineHeight:1 }}>{s.value}</p>
                    <p style={{ fontSize:11.5, color:'var(--t4)', marginTop:3 }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* History table */}
            <div style={{ background:'var(--bg2)', border:'1px solid var(--b1)', borderRadius:14, overflow:'hidden' }}>
              {/* Header */}
              <div style={{ display:'grid',
                gridTemplateColumns:'2fr 1.2fr 90px 90px 80px 80px 90px 80px',
                padding:'0 18px', borderBottom:'1px solid var(--b1)',
                background:'rgba(255,255,255,0.02)' }}>
                {['Broadcast','Template','Sent At','Recipients','Delivered','Read','Cost','Status'].map(h => (
                  <div key={h} style={{ padding:'11px 8px', fontSize:11, fontWeight:600, color:'var(--t4)',
                    textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</div>
                ))}
              </div>
              {history.map((h, i) => {
                const delivRate = h.recipients > 0 ? Math.round(h.delivered / h.recipients * 100) : 0;
                const readRate  = h.delivered > 0  ? Math.round(h.read / h.delivered * 100) : 0;
                return (
                  <div key={h.id} onClick={() => setHistDetail(h)}
                    style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 90px 90px 80px 80px 90px 80px',
                      padding:'0 18px', cursor:'pointer', transition:'background 0.1s',
                      borderBottom: i < history.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='var(--s1)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <div style={{ padding:'14px 8px' }}>
                      <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{h.name}</p>
                    </div>
                    <div style={{ padding:'14px 8px', display:'flex', alignItems:'center' }}>
                      <code style={{ fontSize:11.5, color:'#a5b4fc' }}>{h.template}</code>
                    </div>
                    <div style={{ padding:'14px 8px', display:'flex', alignItems:'center' }}>
                      <span style={{ fontSize:12, color:'var(--t3)' }}>{h.sentAt}</span>
                    </div>
                    <div style={{ padding:'14px 8px', display:'flex', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{h.recipients}</span>
                    </div>
                    <div style={{ padding:'14px 8px', display:'flex', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:600,
                        color: delivRate > 95 ? '#34d399' : delivRate > 80 ? '#fbbf24' : '#fca5a5' }}>
                        {delivRate}%
                      </span>
                    </div>
                    <div style={{ padding:'14px 8px', display:'flex', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#38bdf8' }}>
                        {h.status === 'scheduled' ? '—' : readRate + '%'}
                      </span>
                    </div>
                    <div style={{ padding:'14px 8px', display:'flex', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:700, color:'#fbbf24' }}>
                        ${h.cost.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ padding:'14px 8px', display:'flex', alignItems:'center' }}>
                      <Badge status={h.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Top-Up Modal ──────────────────────────────────────────────────── */}
      <Modal open={topUpModal} onClose={() => setTopUpModal(false)} title="Top Up Balance" width={440}>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ padding:'12px 16px', borderRadius:10, background:'rgba(37,211,102,0.06)',
            border:'1px solid rgba(37,211,102,0.15)', fontSize:13, color:'var(--t3)' }}>
            💳 Credits are billed per WhatsApp conversation (24-hr window). Unused balance carries forward.
          </div>

          <p style={{ fontSize:12, fontWeight:600, color:'var(--t2)' }}>Select amount</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {TOP_UP_PACKAGES.map(pkg => (
              <button key={pkg.amount} onClick={() => setTopUpAmt(pkg.amount)}
                style={{ padding:'14px 8px', borderRadius:12, cursor:'pointer', textAlign:'center',
                  transition:'all 0.15s',
                  background: topUpAmt===pkg.amount ? 'rgba(99,102,241,0.15)' : 'var(--s1)',
                  border:     topUpAmt===pkg.amount ? '1.5px solid rgba(99,102,241,0.4)' : '1px solid var(--b1)',
                  color:      topUpAmt===pkg.amount ? '#a5b4fc' : 'var(--t2)' }}>
                <p style={{ fontSize:20, fontWeight:800, fontFamily:'Space Grotesk',
                  letterSpacing:'-0.03em' }}>{pkg.label}</p>
                {pkg.bonus && (
                  <p style={{ fontSize:10.5, color:'#34d399', fontWeight:700, marginTop:3 }}>{pkg.bonus}</p>
                )}
                {!pkg.bonus && <p style={{ fontSize:10.5, color:'var(--t4)', marginTop:3 }}>
                  ~{Math.floor(pkg.amount / RATES.EG)} EG conversations
                </p>}
              </button>
            ))}
          </div>

          <div style={{ padding:'14px 16px', borderRadius:10, background:'var(--bg2)',
            border:'1px solid var(--b1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:'var(--t3)' }}>New balance after top-up</span>
            <span style={{ fontSize:15, fontWeight:800, color:'#34d399', fontFamily:'Space Grotesk' }}>
              ${(balance + topUpAmt).toFixed(2)}
            </span>
          </div>

          <p style={{ fontSize:11.5, color:'var(--t4)', textAlign:'center' }}>
            Powered by Stripe · Secure payment · Instant credit
          </p>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setTopUpModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={doTopUp}>
              💳 Pay ${topUpAmt} & Add Credits
            </button>
          </div>
        </div>
      </Modal>

      {/* ── New Template Modal ─────────────────────────────────────────────── */}
      <Modal open={newTplModal} onClose={() => setNewTplModal(false)} title="Submit New Template" width={560}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(251,191,36,0.07)',
            border:'1px solid rgba(251,191,36,0.2)', fontSize:12.5, color:'#fbbf24' }}>
            ⏳ Templates are reviewed by Meta in 24-48 hours before they can be used for broadcasts.
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>Template name</label>
              <input className="input" style={{ fontSize:13 }} placeholder="e.g. summer_promo"
                value={tplForm.name} onChange={e => setTplForm(x => ({ ...x, name:e.target.value }))} />
              <p style={{ fontSize:10.5, color:'var(--t4)', marginTop:4 }}>lowercase, underscores only</p>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>Category</label>
              <select className="input" style={{ fontSize:13 }}
                value={tplForm.category} onChange={e => setTplForm(x => ({ ...x, category:e.target.value }))}>
                <option value="MARKETING">MARKETING</option>
                <option value="UTILITY">UTILITY</option>
                <option value="AUTHENTICATION">AUTHENTICATION</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>Language</label>
            <select className="input" style={{ fontSize:13, width:'50%' }}
              value={tplForm.language} onChange={e => setTplForm(x => ({ ...x, language:e.target.value }))}>
              <option value="ar">🇪🇬 Arabic</option>
              <option value="en">🌐 English</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
              Header <span style={{ fontWeight:400, color:'var(--t4)' }}>(optional)</span>
            </label>
            <input className="input" style={{ fontSize:13 }} placeholder="Header text or image description"
              value={tplForm.header} onChange={e => setTplForm(x => ({ ...x, header:e.target.value }))} />
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
              Body <span style={{ color:'#818cf8' }}>— use {`{{1}}`}, {`{{2}}`}… for variables</span>
            </label>
            <textarea className="input" style={{ fontSize:13, resize:'vertical', minHeight:100 }}
              placeholder={'أهلاً {{1}}، عندنا عرض خاص لك 🎉\nاستخدم كود {{2}} للخصم.'}
              value={tplForm.body} onChange={e => setTplForm(x => ({ ...x, body:e.target.value }))}
              dir="auto" />
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
              Footer <span style={{ fontWeight:400, color:'var(--t4)' }}>(optional)</span>
            </label>
            <input className="input" style={{ fontSize:13 }}
              placeholder="e.g. Reply STOP to unsubscribe"
              value={tplForm.footer} onChange={e => setTplForm(x => ({ ...x, footer:e.target.value }))} />
          </div>

          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
              Button text <span style={{ fontWeight:400, color:'var(--t4)' }}>(optional, 1 CTA)</span>
            </label>
            <input className="input" style={{ fontSize:13 }} placeholder="e.g. Shop Now"
              value={tplForm.buttons} onChange={e => setTplForm(x => ({ ...x, buttons:e.target.value }))} />
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setNewTplModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={submitTemplate}>
              Submit to Meta for Review →
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Broadcast Detail Modal ─────────────────────────────────────────── */}
      <Modal open={!!histDetail} onClose={() => setHistDetail(null)}
        title={histDetail?.name} width={480}>
        {histDetail && (() => {
          const delivRate = histDetail.recipients > 0 ? (histDetail.delivered / histDetail.recipients * 100).toFixed(1) : 0;
          const readRate  = histDetail.delivered > 0  ? (histDetail.read / histDetail.delivered * 100).toFixed(1) : 0;
          const failRate  = histDetail.recipients > 0 ? (histDetail.failed / histDetail.recipients * 100).toFixed(1) : 0;
          return (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginTop:-4 }}>
                <code style={{ fontSize:12, color:'#a5b4fc', background:'rgba(99,102,241,0.1)',
                  padding:'3px 10px', borderRadius:7 }}>{histDetail.template}</code>
                <Badge status={histDetail.status} />
                <span style={{ fontSize:12, color:'var(--t4)' }}>{histDetail.sentAt}</span>
              </div>

              {/* Stats grid */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                {[
                  { label:'Sent',      value:histDetail.recipients, color:'#818cf8' },
                  { label:'Delivered', value:`${histDetail.delivered} (${delivRate}%)`, color:'#34d399' },
                  { label:'Read',      value:`${histDetail.read} (${readRate}%)`, color:'#38bdf8' },
                  { label:'Failed',    value:`${histDetail.failed} (${failRate}%)`, color:'#fca5a5' },
                  { label:'Cost',      value:`$${histDetail.cost.toFixed(2)}`, color:'#fbbf24' },
                  { label:'CPM',       value:histDetail.recipients>0 ? `$${(histDetail.cost/histDetail.recipients*1000).toFixed(2)}` : '—', color:'var(--t3)' },
                ].map(s => (
                  <div key={s.label} style={{ padding:'12px 14px', borderRadius:10,
                    background:'var(--s1)', border:'1px solid var(--b1)' }}>
                    <p style={{ fontSize:11, color:'var(--t4)', marginBottom:4 }}>{s.label}</p>
                    <p style={{ fontSize:15, fontWeight:700, color:s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Funnel bars */}
              {histDetail.status === 'completed' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Delivered', val:histDetail.delivered, total:histDetail.recipients, color:'#34d399' },
                    { label:'Read',      val:histDetail.read,      total:histDetail.recipients, color:'#38bdf8' },
                  ].map(r => (
                    <div key={r.label}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, color:'var(--t4)' }}>{r.label}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:r.color }}>
                          {r.total > 0 ? Math.round(r.val/r.total*100) : 0}%
                        </span>
                      </div>
                      <div style={{ height:6, borderRadius:99, background:'var(--s2)' }}>
                        <div style={{ height:6, borderRadius:99, background:r.color,
                          width: `${r.total > 0 ? r.val/r.total*100 : 0}%`, transition:'width 0.5s' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn btn-ghost" onClick={() => setHistDetail(null)}>Close</button>
            </div>
          );
        })()}
      </Modal>
    </>
  );
}
