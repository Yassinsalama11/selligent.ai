'use client';
import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

/* ─── Shared UI helpers ───────────────────────────────────────────────────── */
function Label({ children, sub }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--t2)' }}>{children}</label>
      {sub && <p style={{ fontSize:11.5, color:'var(--t4)', marginTop:2 }}>{sub}</p>}
    </div>
  );
}
function Field({ label, sub, children }) {
  return (
    <div>
      <Label sub={sub}>{label}</Label>
      {children}
    </div>
  );
}
function Section({ title, sub, children }) {
  return (
    <div style={{ borderBottom:'1px solid var(--b1)', paddingBottom:28, marginBottom:28 }}>
      <div style={{ marginBottom:18 }}>
        <h3 style={{ fontSize:15, fontWeight:700, color:'var(--t1)' }}>{title}</h3>
        {sub && <p style={{ fontSize:12.5, color:'var(--t4)', marginTop:3 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}
function SaveRow({ onSave, saving }) {
  return (
    <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
      <button className="btn btn-primary" onClick={onSave} style={{ minWidth:140 }}>
        {saving ? 'Saving…' : '✓ Save Changes'}
      </button>
    </div>
  );
}
function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'12px 14px', borderRadius:10, background:'var(--s1)', border:'1px solid var(--b1)' }}>
      <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500 }}>{label}</span>
      <div className={`toggle${value?' on':''}`} style={{ transform:'scale(0.85)' }} onClick={() => onChange(!value)} />
    </div>
  );
}
function Badge({ color='#818cf8', children }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
      background:`${color}18`, color, border:`1px solid ${color}28` }}>{children}</span>
  );
}

/* ─── Sidebar nav config ──────────────────────────────────────────────────── */
const NAV = [
  { group:'GENERAL',           icon:'⚙',  items:[
    { id:'profile',       label:'My Profile' },
    { id:'company',       label:'Company Profile' },
    { id:'operators',     label:'Operators' },
    { id:'departments',   label:'Departments' },
    { id:'usage',         label:'Usage Statistics' },
    { id:'recycle',       label:'Recycle Bin' },
    { id:'conv_layout',   label:'Conversation Layout' },
  ]},
  { group:'PERSONALIZE',       icon:'🎨', items:[
    { id:'brands',        label:'Brands' },
    { id:'global',        label:'Global Settings' },
    { id:'email_tpl',     label:'Email Templates' },
    { id:'profanity',     label:'Profanity Library' },
    { id:'tags',          label:'Tags' },
  ]},
  { group:'MESSAGING CHANNELS',icon:'📡', items:[
    { id:'ch_fb',         label:'Facebook Messenger' },
    { id:'ch_livechat',   label:'Live Chat' },
    { id:'ch_instagram',  label:'Instagram' },
    { id:'ch_whatsapp',   label:'WhatsApp' },
  ]},
  { group:'AI',                 icon:'🤖', items:[
    { id:'ai_config',    label:'AI Configuration' },
  ]},
  { group:'AUTOMATE',          icon:'⚡', items:[
    { id:'triggers',      label:'Triggers' },
    { id:'visitor_route', label:'Visitor Routing' },
    { id:'chat_route',    label:'Chat Routing' },
    { id:'lead_scoring',  label:'Lead Scoring' },
    { id:'company_score', label:'Company Scoring' },
    { id:'sched_report',  label:'Schedule Report' },
  ]},
  { group:'CONTROLS',          icon:'🛡', items:[
    { id:'conv_monitor',  label:'Conversation Monitor' },
    { id:'import',        label:'Import' },
    { id:'profiles',      label:'Profiles' },
    { id:'spammers',      label:'Spammers' },
  ]},
];

/* ─── Seed data ───────────────────────────────────────────────────────────── */
const INIT_OPERATORS = [
  { id:'o1', name:'Ahmed Mohamed', email:'ahmed@store.com',  role:'owner',   dept:'Management',  status:'online',  avatar:'A' },
  { id:'o2', name:'Sara Khalil',   email:'sara@store.com',   role:'admin',   dept:'Sales',        status:'online',  avatar:'S' },
  { id:'o3', name:'Omar Hassan',   email:'omar@store.com',   role:'agent',   dept:'Support',      status:'away',    avatar:'O' },
  { id:'o4', name:'Layla Samir',   email:'layla@store.com',  role:'agent',   dept:'Sales',        status:'offline', avatar:'L' },
];
const INIT_DEPTS = [
  { id:'d1', name:'Management', color:'#6366f1', operators:['o1'], sla:24 },
  { id:'d2', name:'Sales',      color:'#10b981', operators:['o2','o4'], sla:4 },
  { id:'d3', name:'Support',    color:'#f59e0b', operators:['o3'], sla:8 },
];
const INIT_TAGS = [
  { id:'tg1', name:'VIP',         color:'#fbbf24' },
  { id:'tg2', name:'Follow Up',   color:'#6366f1' },
  { id:'tg3', name:'Discount',    color:'#10b981' },
  { id:'tg4', name:'Urgent',      color:'#ef4444' },
  { id:'tg5', name:'Refund',      color:'#f59e0b' },
  { id:'tg6', name:'New Lead',    color:'#38bdf8' },
];
const INIT_BRANDS = [
  { id:'br1', name:'Selligent Store', tone:'Friendly & Warm', lang:'ar', primary:'#6366f1', domain:'mystore.com', active:true },
];
const INIT_TRIGGERS = [
  { id:'tr1', name:'New lead greeting',  event:'conversation_started', condition:'score > 0',  action:'Send welcome canned reply',   active:true  },
  { id:'tr2', name:'High-score alert',   event:'score_updated',        condition:'score >= 80', action:'Notify sales team + Add VIP tag', active:true  },
  { id:'tr3', name:'Idle follow-up',     event:'no_reply',             condition:'idle > 2h',   action:'Send follow-up message',       active:false },
  { id:'tr4', name:'Price objection',    event:'intent_detected',      condition:'intent = price_objection', action:'Send discount canned reply', active:true },
];
const INIT_LEAD_RULES = [
  { id:'lr1', signal:'Message contains buy/order keywords',   weight:30, active:true  },
  { id:'lr2', signal:'Customer replies within 5 minutes',     weight:15, active:true  },
  { id:'lr3', signal:'More than 3 messages in conversation',  weight:10, active:true  },
  { id:'lr4', signal:'Customer shares phone number',          weight:20, active:true  },
  { id:'lr5', signal:'Price objection detected',              weight:-10, active:true },
  { id:'lr6', signal:'Customer requests return/refund',       weight:-15, active:true },
];
const INIT_ROUTING = [
  { id:'rr1', name:'VIP to Sales',        condition:'tag = VIP',            assignTo:'Sales dept',    priority:1, active:true  },
  { id:'rr2', name:'WhatsApp to Ahmed',   condition:'channel = whatsapp',   assignTo:'Ahmed Mohamed', priority:2, active:true  },
  { id:'rr3', name:'Instagram to Sara',   condition:'channel = instagram',  assignTo:'Sara Khalil',   priority:3, active:true  },
  { id:'rr4', name:'After hours → bot',   condition:'time outside 9-18',    assignTo:'AI Bot',        priority:4, active:true  },
];
const INIT_SPAMMERS = [
  { id:'sp1', type:'phone', value:'+20 100 000 9999', reason:'Abusive messages',   blockedAt:'Apr 1' },
  { id:'sp2', type:'email', value:'spam@fake.com',    reason:'Phishing attempt',   blockedAt:'Mar 28' },
];
const INIT_PROFILES = [
  { id:'pf1', label:'Full Name',     type:'text',   required:true,  system:true  },
  { id:'pf2', label:'Phone',         type:'phone',  required:true,  system:true  },
  { id:'pf3', label:'Email',         type:'email',  required:false, system:true  },
  { id:'pf4', label:'Company',       type:'text',   required:false, system:false },
  { id:'pf5', label:'City',          type:'text',   required:false, system:false },
  { id:'pf6', label:'Order Count',   type:'number', required:false, system:false },
];
const INIT_EMAIL_TPLS = [
  { id:'et1', name:'Conversation Assigned', subject:'New conversation assigned to you', active:true  },
  { id:'et2', name:'Daily Summary',         subject:'Your daily performance summary',  active:true  },
  { id:'et3', name:'SLA Breach Alert',      subject:'⚠️ SLA breach detected',          active:false },
  { id:'et4', name:'Weekly Report',         subject:'Weekly analytics report',         active:true  },
];
const INIT_SCHED = [
  { id:'sr1', name:'Daily Summary',   freq:'daily',   time:'08:00', email:'ahmed@store.com',  active:true  },
  { id:'sr2', name:'Weekly Report',   freq:'weekly',  time:'09:00', email:'team@store.com',   active:true  },
  { id:'sr3', name:'Monthly Revenue', freq:'monthly', time:'08:00', email:'ceo@store.com',    active:false },
];
const RECYCLED = [
  { id:'rc1', type:'conversation', name:'Ahmed Mohamed', info:'3 messages · WhatsApp', deletedAt:'Apr 9' },
  { id:'rc2', type:'contact',      name:'Unknown User',  info:'+20 100 111 2222',       deletedAt:'Apr 8' },
  { id:'rc3', type:'conversation', name:'Sara Test',     info:'1 message · Instagram',  deletedAt:'Apr 7' },
];
const USAGE_STATS = {
  conversations: { used:1247, limit:5000 },
  messages:      { used:18340, limit:50000 },
  aiReplies:     { used:4210, limit:10000 },
  contacts:      { used:156, limit:1000 },
  storage:       { used:2.4, limit:10, unit:'GB' },
  broadcast:     { used:909, limit:5000 },
};

const ROLES   = ['owner','admin','agent','viewer'];
const COLORS  = ['#6366f1','#10b981','#f59e0b','#ef4444','#38bdf8','#ec4899','#8b5cf6','#06b6d4'];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function SettingsPage() {
  const [activeId, setActiveId]   = useState('profile');
  const [collapsed, setCollapsed] = useState({});

  /* ── shared save simulation ── */
  const [saving, setSaving] = useState(false);
  function save(msg = 'Changes saved') {
    setSaving(true);
    setTimeout(() => { setSaving(false); toast.success(msg); }, 700);
  }

  /* ── General: My Profile ── */
  const [profile, setProfile] = useState(() => {
    try {
      const u = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('airos_user') || '{}') : {};
      return {
        name:     u.name     || 'Ahmed Mohamed',
        email:    u.email    || 'ahmed@store.com',
        phone:    u.phone    || '',
        timezone: 'Africa/Cairo',
        lang:     'ar',
        avatar:   (u.name?.[0] || 'A').toUpperCase(),
      };
    } catch { return { name:'Ahmed Mohamed', email:'ahmed@store.com', phone:'', timezone:'Africa/Cairo', lang:'ar', avatar:'A' }; }
  });
  const [pwForm, setPwForm] = useState({ current:'', next:'', confirm:'' });

  /* ── General: Company ── */
  const [company, setCompany] = useState({
    name:'Selligent Store', email:'hello@mystore.com', phone:'+20 100 000 0000',
    website:'https://mystore.com', address:'Cairo, Egypt',
    timezone:'Africa/Cairo', currency:'EGP', industry:'eCommerce',
  });

  /* ── General: Operators ── */
  const [operators, setOperators] = useState(INIT_OPERATORS);
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteForm, setInviteForm]   = useState({ name:'', email:'', role:'agent', dept:'Sales' });

  /* ── General: Departments ── */
  const [depts, setDepts]           = useState(INIT_DEPTS);
  const [deptModal, setDeptModal]   = useState(false);
  const [deptForm, setDeptForm]     = useState({ name:'', color:'#6366f1', sla:8 });

  /* ── Personalize: Tags ── */
  const [tags, setTags]         = useState(INIT_TAGS);
  const [tagForm, setTagForm]   = useState({ name:'', color:'#6366f1' });

  /* ── Personalize: Brands ── */
  const [brands, setBrands]       = useState(INIT_BRANDS);
  const [brandModal, setBrandModal]= useState(false);
  const [brandForm, setBrandForm]  = useState({ name:'', tone:'Friendly', lang:'ar', primary:'#6366f1', domain:'' });

  /* ── Personalize: Global Settings ── */
  const [global, setGlobal] = useState({
    autoClose:true, autoCloseHours:48, assignBot:true, workingHours:true,
    defaultLang:'ar', soundNotifs:true, desktopNotifs:false,
    workStart:'09:00', workEnd:'18:00', workDays:['Mon','Tue','Wed','Thu','Fri'],
  });

  /* ── Personalize: Profanity ── */
  const [profanity, setProfanity] = useState(['spam','scam','fake','غش','نصب']);
  const [profInput, setProfInput] = useState('');

  /* ── Personalize: Email Templates ── */
  const [emailTpls, setEmailTpls] = useState(INIT_EMAIL_TPLS);

  /* ── AI Configuration ── */
  const AI_PROVIDERS = {
    openai:    { label:'OpenAI',              models:['gpt-4o','gpt-4o-mini','gpt-4-turbo','gpt-3.5-turbo'], keyPrefix:'sk-' },
    anthropic: { label:'Anthropic (Claude)',  models:['claude-opus-4-6','claude-sonnet-4-6','claude-haiku-4-5-20251001'], keyPrefix:'sk-ant-' },
    google:    { label:'Google (Gemini)',     models:['gemini-2.0-flash','gemini-1.5-pro','gemini-1.5-flash'], keyPrefix:'AIza' },
    mistral:   { label:'Mistral AI',          models:['mistral-large-latest','mistral-medium-latest','mistral-small-latest'], keyPrefix:'mis-' },
  };
  const [aiCfg, setAiCfg] = useState(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem('airos_ai_cfg') : null;
      return s ? JSON.parse(s) : { provider:'openai', model:'gpt-4o-mini', apiKey:'', temperature:0.4, maxTokens:300, systemPrompt:'You are a helpful assistant for an eCommerce business. Reply in the same language as the customer.', autoReply:false, suggestOnly:true };
    } catch { return { provider:'openai', model:'gpt-4o-mini', apiKey:'', temperature:0.4, maxTokens:300, systemPrompt:'You are a helpful assistant for an eCommerce business. Reply in the same language as the customer.', autoReply:false, suggestOnly:true }; }
  });
  const [aiKeyVisible, setAiKeyVisible] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [aiTesting, setAiTesting] = useState(false);
  function saveAiCfg() {
    if (typeof window !== 'undefined') localStorage.setItem('airos_ai_cfg', JSON.stringify(aiCfg));
    save('AI configuration saved');
  }
  async function testAiConnection() {
    if (!aiCfg.apiKey?.trim()) { toast.error('Enter an API key first'); return; }
    setAiTesting(true); setAiTestResult(null);
    try {
      const minPrompt = 'Reply with the single word: OK';
      let reply = '';

      if (aiCfg.provider === 'openai' || !aiCfg.provider) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${aiCfg.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: aiCfg.model || 'gpt-4o-mini', messages: [{ role:'user', content: minPrompt }], max_tokens: 5 }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
        reply = d.choices?.[0]?.message?.content?.trim();

      } else if (aiCfg.provider === 'anthropic') {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': aiCfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: aiCfg.model || 'claude-haiku-4-5-20251001', max_tokens: 5, messages: [{ role:'user', content: minPrompt }] }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
        reply = d.content?.[0]?.text?.trim();

      } else if (aiCfg.provider === 'google') {
        const model = aiCfg.model || 'gemini-2.0-flash';
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiCfg.apiKey}`,
          { method:'POST', headers:{ 'Content-Type':'application/json' },
            body: JSON.stringify({ contents:[{ parts:[{ text: minPrompt }] }], generationConfig:{ maxOutputTokens:5 } }) },
        );
        const d = await res.json();
        if (!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
        reply = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      } else if (aiCfg.provider === 'mistral') {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${aiCfg.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: aiCfg.model || 'mistral-small-latest', messages:[{ role:'user', content: minPrompt }], max_tokens:5 }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error?.message || `HTTP ${res.status}`);
        reply = d.choices?.[0]?.message?.content?.trim();
      }

      setAiTestResult({ ok: true, msg: `✅ Connected to ${AI_PROVIDERS[aiCfg.provider]?.label} · model ${aiCfg.model} · response: "${reply}"` });
    } catch(e) {
      setAiTestResult({ ok: false, msg: `❌ ${e.message}` });
    }
    setAiTesting(false);
  }

  /* ── Channels ── */
  const [channels, setChannels] = useState({
    whatsapp:  {
      connected:true,
      /* Meta Partner OAuth fields — populated after Embedded Signup */
      wabaId:'239801234567890', phoneNumberId:'107543210987654',
      displayName:'MyStore Official', phone:'+20 100 123 0000',
      businessName:'MyStore Egypt', businessId:'123456789012345',
      accessToken:'EAABcDEFghIJ…', verified:true,
      /* partner notice acknowledged */
      partnerAck:true,
    },
    instagram: { connected:true,  token:'IGAAT123…',     page:'mystore.official',  verified:true  },
    messenger: { connected:false, token:'',              page:'',                  verified:false },
    livechat:  { connected:true,  widgetId:'WGT-001',   domain:'mystore.com',      color:'#6366f1' },
  });
  /* WhatsApp Meta OAuth state */
  const [waOAuthStep, setWaOAuthStep] = useState('idle');
  const [waOAuthModal, setWaOAuthModal] = useState(false);
  const [waTab, setWaTab]               = useState('connection'); // connection|templates|messaging|analytics
  const [waSettings, setWaSettings]     = useState({
    welcome_msg:'أهلاً بك في متجرنا! كيف أقدر أساعدك؟ 👋',
    away_msg:'شكراً على رسالتك! سنرد عليك في أقرب وقت خلال ساعات العمل.',
    business_hours:true, hours_from:'09:00', hours_to:'22:00',
    read_receipts:true, typing_indicator:true,
  });
  const [waTemplates, setWaTemplates]   = useState([
    { id:1, name:'order_confirmed',  status:'approved', lang:'ar+en', preview:'Your order #{{1}} has been confirmed! 🎉' },
    { id:2, name:'shipping_update',  status:'approved', lang:'ar+en', preview:'Your package is on the way! Expected: {{1}}' },
    { id:3, name:'abandoned_cart',   status:'pending',  lang:'ar',    preview:'وجدنا عربيتك مليانة! هل تريد إكمال الطلب؟ 🛒' },
    { id:4, name:'feedback_request', status:'approved', lang:'en',    preview:'How was your experience? Rate us ⭐⭐⭐⭐⭐' },
  ]);

  /* Instagram/Messenger/LiveChat channel state */
  const [fbModal, setFbModal]           = useState(false);
  const [igTab, setIgTab]               = useState('connection');
  const [fbmTab, setFbmTab]             = useState('connection');
  const CHANNEL_STATS = {
    whatsapp:  { conversations:420, deals:38, rate:'42%', response:'1.2m', satisfaction:'4.8' },
    instagram: { conversations:280, deals:22, rate:'28%', response:'2.1m', satisfaction:'4.5' },
    messenger: { conversations:0,   deals:0,  rate:'—',   response:'—',    satisfaction:'—'   },
    livechat:  { conversations:95,  deals:12, rate:'35%', response:'0.8m', satisfaction:'4.9' },
  };
  const webhookUrl = (ch) => `https://api.selligent.ai/webhooks/${ch}`;

  /* ── Conversation Layout ── */
  const [layout, setLayout] = useState({
    density:'comfortable', bubbleStyle:'rounded', showScore:true,
    showIntent:true, showChannel:true, showTimestamp:true,
    agentBubble:'#6366f1', customerBubble:'var(--bg3)',
  });

  /* ── Automate: Triggers ── */
  const [triggers, setTriggers]       = useState(INIT_TRIGGERS);
  const [trigModal, setTrigModal]     = useState(false);
  const [trigForm, setTrigForm]       = useState({ name:'', event:'conversation_started', condition:'', action:'', active:true });

  /* ── Automate: Routing ── */
  const [routing, setRouting]     = useState(INIT_ROUTING);
  const [visitorRouting, setVR]   = useState({ mode:'round_robin', fallback:'AI Bot', threshold:30 });

  /* ── Automate: Lead Scoring ── */
  const [leadRules, setLeadRules] = useState(INIT_LEAD_RULES);
  const [compScore, setCompScore] = useState({ enabled:true, minRevenue:1000, minOrders:3, vipThreshold:5000 });

  /* ── Automate: Schedule Report ── */
  const [schedReports, setSchedReports] = useState(INIT_SCHED);
  const [schedModal, setSchedModal]     = useState(false);
  const [schedForm, setSchedForm]       = useState({ name:'', freq:'weekly', time:'08:00', email:'' });

  /* ── Controls: Spammers ── */
  const [spammers, setSpammers]   = useState(INIT_SPAMMERS);
  const [spamInput, setSpamInput] = useState({ type:'phone', value:'', reason:'' });

  /* ── Controls: Profiles ── */
  const [profileFields, setProfileFields] = useState(INIT_PROFILES);
  const [pfForm, setPfForm]               = useState({ label:'', type:'text', required:false });

  /* ── Controls: Import ── */
  const [importFile, setImportFile] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting]   = useState(false);

  /* ── Controls: Recycle Bin ── */
  const [recycled, setRecycled] = useState(RECYCLED);

  /* ── Controls: Conversation Monitor ── */
  const LIVE_CONVS = [
    { id:'1', agent:'Ahmed', customer:'Youssef Ali',   ch:'📱', duration:'4m', msgs:7, status:'active'   },
    { id:'2', agent:'Sara',  customer:'Nour Adel',     ch:'📸', duration:'2m', msgs:3, status:'active'   },
    { id:'3', agent:'AI Bot',customer:'Ahmed Mohamed', ch:'📱', duration:'8m', msgs:12, status:'bot'    },
    { id:'4', agent:'—',     customer:'Layla Samir',   ch:'⚡', duration:'12m', msgs:2, status:'waiting' },
  ];

  /* ─── helpers ─── */
  function saveOp() { save('Operator invited'); setInviteModal(false); setInviteForm({ name:'', email:'', role:'agent', dept:'Sales' }); }
  function saveDept() { if (!deptForm.name) { toast.error('Name required'); return; }
    setDepts(d => [...d, { id:'d'+Date.now(), operators:[], ...deptForm }]);
    setDeptModal(false); toast.success('Department created'); }
  function saveTrigger() { if (!trigForm.name || !trigForm.action) { toast.error('Fill name & action'); return; }
    setTriggers(t => [...t, { id:'tr'+Date.now(), ...trigForm }]);
    setTrigModal(false); toast.success('Trigger created'); }
  function saveSched() { if (!schedForm.name || !schedForm.email) { toast.error('Fill required fields'); return; }
    setSchedReports(r => [...r, { id:'sr'+Date.now(), active:true, ...schedForm }]);
    setSchedModal(false); toast.success('Schedule created'); }

  function simulateImport() {
    if (!importFile) { toast.error('Select a file first'); return; }
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImportResult({ imported:48, skipped:3, errors:1, total:52 });
      toast.success('Import complete!');
    }, 1800);
  }

  /* ─── sidebar helpers ─── */
  const allItems = NAV.flatMap(g => g.items);
  const activeGroup = NAV.find(g => g.items.some(i => i.id === activeId));
  const activeLabel = allItems.find(i => i.id === activeId)?.label || '';

  /* ═══════════════════════════════════════════════════
     SECTION RENDERERS
     ═══════════════════════════════════════════════════ */

  function renderSection() {
    switch (activeId) {

      /* ────── My Profile ────── */
      case 'profile': return (
        <div>
          <Section title="Personal Information" sub="Update your name, email and contact details">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <Field label="Full Name"><input className="input" style={{ fontSize:13 }} value={profile.name} onChange={e => setProfile(p=>({...p,name:e.target.value}))} /></Field>
              <Field label="Email Address"><input className="input" style={{ fontSize:13 }} value={profile.email} onChange={e => setProfile(p=>({...p,email:e.target.value}))} /></Field>
              <Field label="Phone"><input className="input" style={{ fontSize:13 }} value={profile.phone} onChange={e => setProfile(p=>({...p,phone:e.target.value}))} /></Field>
              <Field label="Timezone">
                <select className="input" style={{ fontSize:13 }} value={profile.timezone} onChange={e => setProfile(p=>({...p,timezone:e.target.value}))}>
                  {['Africa/Cairo','Asia/Dubai','Asia/Riyadh','Europe/London','UTC'].map(z=><option key={z}>{z}</option>)}
                </select>
              </Field>
              <Field label="Language">
                <select className="input" style={{ fontSize:13 }} value={profile.lang} onChange={e => setProfile(p=>({...p,lang:e.target.value}))}>
                  <option value="ar">العربية (Arabic)</option>
                  <option value="en">English</option>
                </select>
              </Field>
            </div>
            <SaveRow onSave={() => save('Profile updated')} saving={saving} />
          </Section>

          <Section title="Change Password" sub="Use a strong password of at least 8 characters">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
              <Field label="Current Password"><input className="input" type="password" placeholder="••••••••" value={pwForm.current} onChange={e=>setPwForm(p=>({...p,current:e.target.value}))} /></Field>
              <Field label="New Password"><input className="input" type="password" placeholder="••••••••" value={pwForm.next} onChange={e=>setPwForm(p=>({...p,next:e.target.value}))} /></Field>
              <Field label="Confirm New Password"><input className="input" type="password" placeholder="••••••••" value={pwForm.confirm} onChange={e=>setPwForm(p=>({...p,confirm:e.target.value}))} /></Field>
            </div>
            <SaveRow onSave={() => { if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; } save('Password updated'); setPwForm({current:'',next:'',confirm:''}); }} saving={saving} />
          </Section>

          <Section title="Notification Preferences">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Toggle value={global.soundNotifs} onChange={v=>setGlobal(g=>({...g,soundNotifs:v}))} label="Sound notifications for new messages" />
              <Toggle value={global.desktopNotifs} onChange={v=>setGlobal(g=>({...g,desktopNotifs:v}))} label="Desktop browser notifications" />
            </div>
          </Section>
        </div>
      );

      /* ────── Company Profile ────── */
      case 'company': return (
        <div>
          <Section title="Company Details" sub="This information is used in AI replies and reports">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <Field label="Company Name"><input className="input" style={{ fontSize:13 }} value={company.name} onChange={e=>setCompany(c=>({...c,name:e.target.value}))} /></Field>
              <Field label="Business Email"><input className="input" style={{ fontSize:13 }} value={company.email} onChange={e=>setCompany(c=>({...c,email:e.target.value}))} /></Field>
              <Field label="Phone"><input className="input" style={{ fontSize:13 }} value={company.phone} onChange={e=>setCompany(c=>({...c,phone:e.target.value}))} /></Field>
              <Field label="Website"><input className="input" style={{ fontSize:13 }} value={company.website} onChange={e=>setCompany(c=>({...c,website:e.target.value}))} /></Field>
              <Field label="Address" sub="City, Country"><input className="input" style={{ fontSize:13 }} value={company.address} onChange={e=>setCompany(c=>({...c,address:e.target.value}))} /></Field>
              <Field label="Industry">
                <select className="input" style={{ fontSize:13 }} value={company.industry} onChange={e=>setCompany(c=>({...c,industry:e.target.value}))}>
                  {['eCommerce','Fashion','Electronics','Food & Beverage','Real Estate','Services','Other'].map(i=><option key={i}>{i}</option>)}
                </select>
              </Field>
              <Field label="Currency">
                <select className="input" style={{ fontSize:13 }} value={company.currency} onChange={e=>setCompany(c=>({...c,currency:e.target.value}))}>
                  {['EGP','USD','AED','SAR','EUR'].map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Timezone">
                <select className="input" style={{ fontSize:13 }} value={company.timezone} onChange={e=>setCompany(c=>({...c,timezone:e.target.value}))}>
                  {['Africa/Cairo','Asia/Dubai','Asia/Riyadh','UTC'].map(z=><option key={z}>{z}</option>)}
                </select>
              </Field>
            </div>
            <SaveRow onSave={() => save('Company profile saved')} saving={saving} />
          </Section>
        </div>
      );

      /* ────── Operators ────── */
      case 'operators': return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--t4)' }}>{operators.length} operators · {operators.filter(o=>o.status==='online').length} online</p>
            <button className="btn btn-primary btn-sm" onClick={()=>setInviteModal(true)}>+ Invite Operator</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {operators.map(op => (
              <div key={op.id} style={{ padding:'14px 18px', borderRadius:12, background:'var(--bg2)',
                border:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.18))',
                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:15 }}>
                  {op.avatar}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:'var(--t1)' }}>{op.name}</span>
                    <Badge color={op.role==='owner'?'#fbbf24':op.role==='admin'?'#818cf8':'#34d399'}>{op.role}</Badge>
                    <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0,
                      background: op.status==='online'?'#34d399':op.status==='away'?'#fbbf24':'var(--t4)',
                      display:'inline-block' }} />
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)' }}>{op.email} · {op.dept}</p>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <select className="input" style={{ fontSize:12, padding:'4px 8px', width:90 }}
                    value={op.role} onChange={e => setOperators(ops=>ops.map(o=>o.id===op.id?{...o,role:e.target.value}:o))}>
                    {ROLES.map(r=><option key={r}>{r}</option>)}
                  </select>
                  {op.role !== 'owner' && (
                    <button onClick={()=>{ setOperators(o=>o.filter(x=>x.id!==op.id)); toast.success('Operator removed'); }}
                      style={{ fontSize:12, padding:'4px 10px', borderRadius:8, cursor:'pointer', fontWeight:600,
                        background:'rgba(239,68,68,0.08)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.15)' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      /* ────── Departments ────── */
      case 'departments': return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--t4)' }}>{depts.length} departments</p>
            <button className="btn btn-primary btn-sm" onClick={()=>setDeptModal(true)}>+ New Department</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {depts.map(d => {
              const deptOps = operators.filter(o => d.operators.includes(o.id));
              return (
                <div key={d.id} style={{ padding:'16px 18px', borderRadius:12, background:'var(--bg2)',
                  border:`1px solid var(--b1)`, borderLeft:`3px solid ${d.color}` }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ width:10, height:10, borderRadius:'50%', background:d.color, display:'inline-block' }}/>
                      <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>{d.name}</span>
                      <span style={{ fontSize:11, color:'var(--t4)' }}>SLA: {d.sla}h</span>
                    </div>
                    <button onClick={()=>{ setDepts(ds=>ds.filter(x=>x.id!==d.id)); toast.success('Deleted'); }}
                      style={{ fontSize:11, padding:'3px 9px', borderRadius:7, cursor:'pointer',
                        background:'rgba(239,68,68,0.07)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.15)' }}>
                      Delete
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {deptOps.length === 0
                      ? <span style={{ fontSize:12, color:'var(--t4)' }}>No operators assigned</span>
                      : deptOps.map(op => (
                        <span key={op.id} style={{ fontSize:11.5, padding:'3px 10px', borderRadius:99,
                          background:'rgba(99,102,241,0.1)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.2)' }}>
                          {op.name}
                        </span>
                      ))
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

      /* ────── Usage Statistics ────── */
      case 'usage': return (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>
            {Object.entries(USAGE_STATS).map(([key, stat]) => {
              const pct = Math.round(stat.used / stat.limit * 100);
              const label = key.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
              const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#34d399';
              return (
                <div key={key} style={{ padding:'16px 18px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)' }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color }}>{pct}%</span>
                  </div>
                  <div style={{ height:5, borderRadius:99, background:'var(--s2)', marginBottom:6 }}>
                    <div style={{ height:5, borderRadius:99, background:color, width:`${pct}%`, transition:'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize:11.5, color:'var(--t4)' }}>
                    {stat.used.toLocaleString()} / {stat.limit.toLocaleString()}{stat.unit ? ' '+stat.unit : ''} used
                  </p>
                </div>
              );
            })}
          </div>
          <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(99,102,241,0.06)',
            border:'1px solid rgba(99,102,241,0.15)', fontSize:13, color:'var(--t3)' }}>
            📅 Current billing cycle: Apr 1 – Apr 30, 2025 · <strong style={{ color:'var(--t1)' }}>Growth Plan — $149/mo</strong>
          </div>
        </div>
      );

      /* ────── Recycle Bin ────── */
      case 'recycle': return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:13, color:'var(--t4)' }}>{recycled.length} items · auto-deleted after 30 days</p>
            {recycled.length > 0 && (
              <button onClick={()=>{ setRecycled([]); toast.success('Recycle bin emptied'); }}
                style={{ fontSize:12, padding:'5px 12px', borderRadius:8, cursor:'pointer', fontWeight:600,
                  background:'rgba(239,68,68,0.08)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.18)' }}>
                Empty Bin
              </button>
            )}
          </div>
          {recycled.length === 0
            ? <div style={{ padding:'40px', textAlign:'center', color:'var(--t4)', fontSize:14 }}>🗑 Recycle bin is empty</div>
            : recycled.map(r => (
              <div key={r.id} style={{ padding:'13px 16px', borderRadius:11, background:'var(--bg2)',
                border:'1px solid var(--b1)', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <Badge color={r.type==='conversation'?'#6366f1':'#10b981'}>{r.type}</Badge>
                    <span style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{r.name}</span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)' }}>{r.info} · Deleted {r.deletedAt}</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>{ setRecycled(x=>x.filter(i=>i.id!==r.id)); toast.success('Restored'); }}
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontWeight:600,
                      background:'rgba(99,102,241,0.1)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.2)' }}>
                    Restore
                  </button>
                  <button onClick={()=>{ setRecycled(x=>x.filter(i=>i.id!==r.id)); toast.success('Permanently deleted'); }}
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontWeight:600,
                      background:'rgba(239,68,68,0.07)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.15)' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      );

      /* ────── Conversation Layout ────── */
      case 'conv_layout': return (
        <div>
          <Section title="Display Density" sub="Controls spacing between messages and elements">
            <div style={{ display:'flex', gap:10 }}>
              {['compact','comfortable','expanded'].map(d => (
                <button key={d} onClick={()=>setLayout(l=>({...l,density:d}))}
                  style={{ flex:1, padding:'14px', borderRadius:12, cursor:'pointer', fontWeight:600, fontSize:13,
                    background: layout.density===d?'rgba(99,102,241,0.15)':'var(--s1)',
                    border: layout.density===d?'1.5px solid rgba(99,102,241,0.4)':'1px solid var(--b1)',
                    color: layout.density===d?'#a5b4fc':'var(--t3)', textTransform:'capitalize' }}>
                  {d}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Bubble Style">
            <div style={{ display:'flex', gap:10 }}>
              {['rounded','sharp','pill'].map(s => (
                <button key={s} onClick={()=>setLayout(l=>({...l,bubbleStyle:s}))}
                  style={{ flex:1, padding:'14px', borderRadius:12, cursor:'pointer', fontWeight:600, fontSize:13,
                    background: layout.bubbleStyle===s?'rgba(99,102,241,0.15)':'var(--s1)',
                    border: layout.bubbleStyle===s?'1.5px solid rgba(99,102,241,0.4)':'1px solid var(--b1)',
                    color: layout.bubbleStyle===s?'#a5b4fc':'var(--t3)', textTransform:'capitalize' }}>
                  {s}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Visible Elements">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Toggle value={layout.showScore} onChange={v=>setLayout(l=>({...l,showScore:v}))} label="Show lead score badge in conversation list" />
              <Toggle value={layout.showIntent} onChange={v=>setLayout(l=>({...l,showIntent:v}))} label="Show AI intent label" />
              <Toggle value={layout.showChannel} onChange={v=>setLayout(l=>({...l,showChannel:v}))} label="Show channel icon" />
              <Toggle value={layout.showTimestamp} onChange={v=>setLayout(l=>({...l,showTimestamp:v}))} label="Show message timestamps" />
            </div>
            <SaveRow onSave={()=>save('Layout saved')} saving={saving} />
          </Section>
        </div>
      );

      /* ────── Brands ────── */
      case 'brands': return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--t4)' }}>Each brand can have its own AI tone, language and channels</p>
            <button className="btn btn-primary btn-sm" onClick={()=>setBrandModal(true)}>+ New Brand</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {brands.map(b => (
              <div key={b.id} style={{ padding:'16px 18px', borderRadius:12, background:'var(--bg2)',
                border:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:42, height:42, borderRadius:11, background:`${b.primary}20`,
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:`1px solid ${b.primary}30` }}>
                  🏪
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>{b.name}</span>
                    {b.active && <Badge color='#34d399'>Active</Badge>}
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)' }}>Tone: {b.tone} · Language: {b.lang} · {b.domain}</p>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>{ setBrands(bs=>bs.map(x=>({...x,active:x.id===b.id}))); toast.success(`${b.name} set as active`); }}
                    style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontWeight:600,
                      background:'rgba(99,102,241,0.1)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.2)' }}>
                    {b.active ? '● Active' : 'Set Active'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      /* ────── Global Settings ────── */
      case 'global': return (
        <div>
          <Section title="Conversation Automation">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Toggle value={global.autoClose} onChange={v=>setGlobal(g=>({...g,autoClose:v}))} label="Auto-close inactive conversations" />
              {global.autoClose && (
                <div style={{ paddingLeft:12, display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:13, color:'var(--t3)' }}>Close after</span>
                  <input className="input" type="number" style={{ width:70, fontSize:13 }}
                    value={global.autoCloseHours} onChange={e=>setGlobal(g=>({...g,autoCloseHours:+e.target.value}))} />
                  <span style={{ fontSize:13, color:'var(--t3)' }}>hours of inactivity</span>
                </div>
              )}
              <Toggle value={global.assignBot} onChange={v=>setGlobal(g=>({...g,assignBot:v}))} label="Assign to AI bot when all operators are offline" />
            </div>
          </Section>
          <Section title="Working Hours" sub="Conversations outside working hours are handled by AI bot">
            <Toggle value={global.workingHours} onChange={v=>setGlobal(g=>({...g,workingHours:v}))} label="Enable working hours" />
            {global.workingHours && (
              <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <Field label="Start Time"><input className="input" type="time" style={{ fontSize:13 }} value={global.workStart} onChange={e=>setGlobal(g=>({...g,workStart:e.target.value}))} /></Field>
                <Field label="End Time"><input className="input" type="time" style={{ fontSize:13 }} value={global.workEnd} onChange={e=>setGlobal(g=>({...g,workEnd:e.target.value}))} /></Field>
                <Field label="Working Days" sub="Active days of the week">
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                      <button key={d} onClick={()=>setGlobal(g=>({ ...g, workDays: g.workDays.includes(d) ? g.workDays.filter(x=>x!==d) : [...g.workDays,d] }))}
                        style={{ padding:'5px 11px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
                          background: global.workDays.includes(d)?'rgba(99,102,241,0.15)':'var(--s1)',
                          border: global.workDays.includes(d)?'1px solid rgba(99,102,241,0.35)':'1px solid var(--b1)',
                          color: global.workDays.includes(d)?'#a5b4fc':'var(--t3)' }}>
                        {d}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}
            <SaveRow onSave={()=>save('Global settings saved')} saving={saving} />
          </Section>
        </div>
      );

      /* ────── Email Templates ────── */
      case 'email_tpl': return (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {emailTpls.map(t => (
            <div key={t.id} style={{ padding:'14px 18px', borderRadius:12, background:'var(--bg2)',
              border:'1px solid var(--b1)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{t.name}</p>
                <p style={{ fontSize:12, color:'var(--t4)' }}>Subject: {t.subject}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Toggle value={t.active} onChange={v=>setEmailTpls(ts=>ts.map(x=>x.id===t.id?{...x,active:v}:x))} label="" />
                <button onClick={()=>toast('Email template editor coming soon')}
                  style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontWeight:600,
                    background:'rgba(99,102,241,0.1)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.2)' }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      );

      /* ────── Profanity Library ────── */
      case 'profanity': return (
        <div>
          <Section title="Blocked Words" sub="Messages containing these words will be flagged or auto-blocked">
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <input className="input" style={{ flex:1, fontSize:13 }} placeholder="Add a word or phrase…"
                value={profInput} onChange={e=>setProfInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&profInput.trim()){ setProfanity(p=>[...new Set([...p,profInput.trim()])]); setProfInput(''); toast.success('Word added'); }}} />
              <button className="btn btn-primary btn-sm" onClick={()=>{ if(profInput.trim()){ setProfanity(p=>[...new Set([...p,profInput.trim()])]); setProfInput(''); toast.success('Word added'); }}}>Add</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {profanity.map(w => (
                <div key={w} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px 4px 12px',
                  borderRadius:99, background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.2)',
                  fontSize:13, color:'#fca5a5', fontWeight:600 }}>
                  {w}
                  <button onClick={()=>{ setProfanity(p=>p.filter(x=>x!==w)); toast.success('Removed'); }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#fca5a5', fontSize:14, marginLeft:4, lineHeight:1 }}>✕</button>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Auto-Action">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <Toggle value={true} onChange={()=>{}} label="Flag messages containing blocked words for agent review" />
              <Toggle value={false} onChange={()=>{}} label="Auto-block contacts who use profanity 3+ times" />
            </div>
            <SaveRow onSave={()=>save('Profanity settings saved')} saving={saving} />
          </Section>
        </div>
      );

      /* ────── Tags ────── */
      case 'tags': return (
        <div>
          <Section title="Manage Tags" sub="Tags are used in conversations, contacts, and routing rules">
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              <input className="input" style={{ fontSize:13, flex:1, minWidth:140 }} placeholder="Tag name…"
                value={tagForm.name} onChange={e=>setTagForm(f=>({...f,name:e.target.value}))} />
              <div style={{ display:'flex', gap:6 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={()=>setTagForm(f=>({...f,color:c}))}
                    style={{ width:24, height:24, borderRadius:'50%', background:c, border: tagForm.color===c?'2px solid #fff':'2px solid transparent', cursor:'pointer' }} />
                ))}
              </div>
              <button className="btn btn-primary btn-sm" onClick={()=>{ if(!tagForm.name.trim()){toast.error('Enter tag name');return;} setTags(t=>[...t,{id:'tg'+Date.now(),...tagForm}]); setTagForm({name:'',color:'#6366f1'}); toast.success('Tag added'); }}>+ Add</button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {tags.map(t => (
                <div key={t.id} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px',
                  borderRadius:99, background:`${t.color}12`, border:`1px solid ${t.color}28` }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:t.color, display:'inline-block' }} />
                  <span style={{ fontSize:12.5, fontWeight:600, color:t.color }}>{t.name}</span>
                  <button onClick={()=>{ setTags(ts=>ts.filter(x=>x.id!==t.id)); toast.success('Tag deleted'); }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:t.color, fontSize:13, lineHeight:1, marginLeft:2 }}>✕</button>
                </div>
              ))}
            </div>
          </Section>
        </div>
      );

      /* ────── Channel settings (shared template) ────── */
      case 'ch_whatsapp': return <WhatsAppPanel />;

      case 'ch_instagram': {
        const ig = channels.instagram;
        const igStats = CHANNEL_STATS.instagram;
        return (
          <div>
            {/* Header + stats */}
            <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: ig.connected ? 14 : 0 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:'rgba(225,48,108,0.12)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                  border:'1px solid rgba(225,48,108,0.25)', flexShrink:0 }}>📸</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Instagram DM</p>
                  <p style={{ fontSize:12, color: ig.connected ? '#34d399' : 'var(--t4)' }}>
                    {ig.connected ? `● Connected · @${ig.page} · Verified` : '○ Not connected'}
                  </p>
                </div>
                {ig.connected
                  ? <button className="btn btn-sm btn-ghost" style={{ color:'#fca5a5' }}
                      onClick={()=>{ setChannels(cs=>({...cs,instagram:{...cs.instagram,connected:false}})); toast('Instagram disconnected'); }}>
                      Disconnect
                    </button>
                  : <button className="btn btn-sm btn-primary" style={{ background:'#E1306C', borderColor:'#E1306C', color:'#fff' }}
                      onClick={()=>setFbModal(true)}>🔐 Connect with Facebook</button>}
              </div>
              {ig.connected && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:'1px solid var(--b1)', paddingTop:12 }}>
                  {[['Conversations',igStats.conversations],['Deals Closed',igStats.deals],['Conv. Rate',igStats.rate],['Avg Response',igStats.response],['Satisfaction',igStats.satisfaction]].map(([l,v])=>(
                    <div key={l} style={{ textAlign:'center' }}>
                      <p style={{ fontSize:18, fontWeight:800, color:'#E1306C', marginBottom:2 }}>{v}</p>
                      <p style={{ fontSize:11, color:'var(--t4)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom:20 }}>
              {['connection','settings'].map(t=>(
                <button key={t} className={`tab${igTab===t?' active':''}`}
                  onClick={()=>setIgTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
              ))}
            </div>

            {igTab === 'connection' && (
              <Section title="📸 Instagram Business" sub="Connect via Meta Graph API. Requires Instagram Business or Creator account linked to a Facebook Page.">
                <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(225,48,108,0.05)',
                  border:'1px solid rgba(225,48,108,0.18)', marginBottom:18 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--t2)', marginBottom:6 }}>Recommended: OAuth (no manual keys)</p>
                  <p style={{ fontSize:12.5, color:'var(--t4)', marginBottom:12, lineHeight:1.5 }}>
                    Selligent.ai will be added as a partner in your Meta Business account and receive permission to read/send Instagram DMs.
                  </p>
                  <button className="btn btn-sm" style={{ background:'#E1306C', color:'#fff', border:'none', borderRadius:8 }}
                    onClick={()=>setFbModal(true)}>🔐 Connect with Facebook</button>
                </div>
                <Field label="Instagram Business Account" sub="Or enter manually if you have an existing token.">
                  <input className="input" placeholder="@mystore.official" value={ig.page||''}
                    onChange={e=>setChannels(cs=>({...cs,instagram:{...cs.instagram,page:e.target.value}}))} />
                </Field>
                <div style={{ marginTop:14 }}>
                  <Field label="Meta Access Token">
                    <input className="input" style={{ fontFamily:'monospace', fontSize:12 }} placeholder="IGAAT123…" value={ig.token||''}
                      onChange={e=>setChannels(cs=>({...cs,instagram:{...cs.instagram,token:e.target.value}}))} />
                  </Field>
                </div>
                <div style={{ marginTop:16 }}>
                  <p style={{ fontSize:11.5, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
                    Callback URL
                  </p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 14px', borderRadius:9, background:'rgba(0,0,0,0.3)', border:'1px solid var(--b1)' }}>
                    <code style={{ fontFamily:'monospace', fontSize:13, color:'var(--t2)' }}>{webhookUrl('instagram')}</code>
                    <button style={{ fontSize:12, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                      onClick={()=>{ navigator.clipboard?.writeText(webhookUrl('instagram')); toast.success('Copied!'); }}>Copy</button>
                  </div>
                </div>
                <SaveRow onSave={()=>save('Instagram settings saved')} saving={saving} />
              </Section>
            )}

            {igTab === 'settings' && (
              <Section title="Instagram Settings" sub="Messaging behaviour for your Instagram DM channel.">
                <Toggle label="Auto-reply to Story Mentions" value={true} onChange={()=>toast('Saved')} />
                <div style={{ marginTop:10 }}>
                  <Toggle label="Show Typing Indicator" value={true} onChange={()=>toast('Saved')} />
                </div>
                <div style={{ marginTop:10 }}>
                  <Toggle label="Read Receipts" value={true} onChange={()=>toast('Saved')} />
                </div>
                <SaveRow onSave={()=>save('Instagram settings saved')} saving={saving} />
              </Section>
            )}
          </div>
        );
      }

      case 'ch_fb': {
        const fbm = channels.messenger;
        const fbmStats = CHANNEL_STATS.messenger;
        return (
          <div>
            {/* Header + stats */}
            <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: fbm.connected ? 14 : 0 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:'rgba(0,153,255,0.12)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                  border:'1px solid rgba(0,153,255,0.25)', flexShrink:0 }}>💬</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Facebook Messenger</p>
                  <p style={{ fontSize:12, color: fbm.connected ? '#34d399' : 'var(--t4)' }}>
                    {fbm.connected ? `● Connected · ${fbm.page} · Verified` : '○ Not connected'}
                  </p>
                </div>
                {fbm.connected
                  ? <button className="btn btn-sm btn-ghost" style={{ color:'#fca5a5' }}
                      onClick={()=>{ setChannels(cs=>({...cs,messenger:{...cs.messenger,connected:false}})); toast('Messenger disconnected'); }}>
                      Disconnect
                    </button>
                  : <button className="btn btn-sm btn-primary" style={{ background:'#0099FF', borderColor:'#0099FF', color:'#fff' }}
                      onClick={()=>setFbModal(true)}>🔐 Connect with Facebook</button>}
              </div>
              {fbm.connected && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:'1px solid var(--b1)', paddingTop:12 }}>
                  {[['Conversations',fbmStats.conversations],['Deals Closed',fbmStats.deals],['Conv. Rate',fbmStats.rate],['Avg Response',fbmStats.response],['Satisfaction',fbmStats.satisfaction]].map(([l,v])=>(
                    <div key={l} style={{ textAlign:'center' }}>
                      <p style={{ fontSize:18, fontWeight:800, color:'#0099FF', marginBottom:2 }}>{v}</p>
                      <p style={{ fontSize:11, color:'var(--t4)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom:20 }}>
              {['connection','settings'].map(t=>(
                <button key={t} className={`tab${fbmTab===t?' active':''}`}
                  onClick={()=>setFbmTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
              ))}
            </div>

            {fbmTab === 'connection' && (
              <Section title="💬 Facebook Messenger" sub="Connect your Facebook Page to receive and send Messenger conversations. Requires page admin access.">
                <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(0,153,255,0.05)',
                  border:'1px solid rgba(0,153,255,0.18)', marginBottom:18 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--t2)', marginBottom:6 }}>Recommended: OAuth (no manual keys)</p>
                  <p style={{ fontSize:12.5, color:'var(--t4)', marginBottom:12, lineHeight:1.5 }}>
                    Selligent.ai will be added as a partner in your Meta Business account and receive permission to manage Messenger on your Page.
                  </p>
                  <button className="btn btn-sm" style={{ background:'#0099FF', color:'#fff', border:'none', borderRadius:8 }}
                    onClick={()=>setFbModal(true)}>🔐 Connect with Facebook</button>
                </div>
                <Field label="Facebook Page Name" sub="Or enter manually if you have an existing token.">
                  <input className="input" placeholder="My Store Official" value={fbm.page||''}
                    onChange={e=>setChannels(cs=>({...cs,messenger:{...cs.messenger,page:e.target.value}}))} />
                </Field>
                <div style={{ marginTop:14 }}>
                  <Field label="Page Access Token">
                    <input className="input" style={{ fontFamily:'monospace', fontSize:12 }} placeholder="EAAFbG…" value={fbm.token||''}
                      onChange={e=>setChannels(cs=>({...cs,messenger:{...cs.messenger,token:e.target.value}}))} />
                  </Field>
                </div>
                <div style={{ marginTop:16 }}>
                  <p style={{ fontSize:11.5, fontWeight:700, color:'var(--t4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
                    Callback URL
                  </p>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'10px 14px', borderRadius:9, background:'rgba(0,0,0,0.3)', border:'1px solid var(--b1)' }}>
                    <code style={{ fontFamily:'monospace', fontSize:13, color:'var(--t2)' }}>{webhookUrl('messenger')}</code>
                    <button style={{ fontSize:12, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                      onClick={()=>{ navigator.clipboard?.writeText(webhookUrl('messenger')); toast.success('Copied!'); }}>Copy</button>
                  </div>
                </div>
                <SaveRow onSave={()=>save('Messenger settings saved')} saving={saving} />
              </Section>
            )}

            {fbmTab === 'settings' && (
              <Section title="Messenger Settings" sub="Messaging behaviour for your Facebook Messenger channel.">
                <Toggle label="Persistent Menu" value={true} onChange={()=>toast('Saved')} />
                <div style={{ marginTop:10 }}>
                  <Toggle label="Get Started Button" value={true} onChange={()=>toast('Saved')} />
                </div>
                <div style={{ marginTop:10 }}>
                  <Toggle label="Read Receipts" value={true} onChange={()=>toast('Saved')} />
                </div>
                <SaveRow onSave={()=>save('Messenger settings saved')} saving={saving} />
              </Section>
            )}
          </div>
        );
      }

      case 'ch_livechat': {
        const lc = channels.livechat;
        const lcStats = CHANNEL_STATS.livechat;
        const lcSnippet = `<!-- Selligent.ai Live Chat Widget -->\n<script>\n  (function(w,d){\n    w.SelligentChat = { widgetId: '${lc.widgetId}' };\n    var s = d.createElement('script');\n    s.src = 'https://cdn.selligent.ai/widget.js';\n    s.async = true;\n    d.head.appendChild(s);\n  })(window, document);\n</script>`;
        return (
          <div>
            {/* Header + stats */}
            <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: lc.connected ? 14 : 0 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:'rgba(99,102,241,0.12)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                  border:'1px solid rgba(99,102,241,0.25)', flexShrink:0 }}>⚡</div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Live Chat Widget</p>
                  <p style={{ fontSize:12, color: lc.connected ? '#34d399' : 'var(--t4)' }}>
                    {lc.connected ? `● Active · ${lc.domain} · Widget ID: ${lc.widgetId}` : '○ Not installed'}
                  </p>
                </div>
                {lc.connected
                  ? <button className="btn btn-sm btn-ghost" style={{ color:'#fca5a5' }}
                      onClick={()=>{ setChannels(cs=>({...cs,livechat:{...cs.livechat,connected:false}})); toast('Live Chat disabled'); }}>
                      Disable
                    </button>
                  : <button className="btn btn-sm btn-primary"
                      onClick={()=>{ setChannels(cs=>({...cs,livechat:{...cs.livechat,connected:true}})); toast.success('Live Chat enabled!'); }}>
                      Enable
                    </button>}
              </div>
              {lc.connected && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', borderTop:'1px solid var(--b1)', paddingTop:12 }}>
                  {[['Conversations',lcStats.conversations],['Deals Closed',lcStats.deals],['Conv. Rate',lcStats.rate],['Avg Response',lcStats.response],['Satisfaction',lcStats.satisfaction]].map(([l,v])=>(
                    <div key={l} style={{ textAlign:'center' }}>
                      <p style={{ fontSize:18, fontWeight:800, color:'#6366f1', marginBottom:2 }}>{v}</p>
                      <p style={{ fontSize:11, color:'var(--t4)' }}>{l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Section title="Widget Configuration" sub="Configure your Live Chat widget appearance and allowed domain.">
              <Field label="Allowed Domain" sub="Only this domain can load the chat widget.">
                <input className="input" placeholder="mystore.com" value={lc.domain||''}
                  onChange={e=>setChannels(cs=>({...cs,livechat:{...cs.livechat,domain:e.target.value}}))} />
              </Field>
              <div style={{ marginTop:14 }}>
                <Field label="Widget ID" sub="Auto-generated. Use this in the embed snippet.">
                  <div style={{ position:'relative' }}>
                    <input className="input" readOnly value={lc.widgetId}
                      style={{ fontFamily:'monospace', fontSize:13, color:'var(--t3)', paddingRight:90 }} />
                    <button className="btn btn-sm btn-ghost" style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', fontSize:11 }}
                      onClick={()=>{ navigator.clipboard?.writeText(lc.widgetId); toast.success('Copied!'); }}>Copy</button>
                  </div>
                </Field>
              </div>
              <SaveRow onSave={()=>save('Live Chat settings saved')} saving={saving} />
            </Section>

            <Section title="Embed Code" sub="Paste this snippet before the </body> tag on your website. RTL auto-detected.">
              <div style={{ background:'#0a0a14', borderRadius:10, padding:'16px 18px',
                border:'1px solid rgba(99,102,241,0.2)', fontFamily:'monospace', fontSize:12.5,
                color:'#a5b4fc', whiteSpace:'pre-wrap', lineHeight:1.7, marginBottom:12 }}>
                {lcSnippet}
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-primary btn-sm"
                  onClick={()=>{ navigator.clipboard?.writeText(lcSnippet); toast.success('Snippet copied!'); }}>
                  Copy Snippet
                </button>
                <button className="btn btn-ghost btn-sm"
                  onClick={()=>toast('Widget preview coming soon 🚀')}>
                  Preview Widget
                </button>
              </div>
            </Section>
          </div>
        );
      }

      /* ────── Triggers ────── */
      case 'triggers': return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--t4)' }}>Triggers fire automatically when their event conditions are met</p>
            <button className="btn btn-primary btn-sm" onClick={()=>setTrigModal(true)}>+ New Trigger</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {triggers.map(tr => (
              <div key={tr.id} style={{ padding:'14px 18px', borderRadius:12, background:'var(--bg2)',
                border:`1px solid ${tr.active?'rgba(99,102,241,0.2)':'var(--b1)'}`,
                opacity: tr.active ? 1 : 0.55 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'var(--t1)' }}>{tr.name}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <div className={`toggle${tr.active?' on':''}`} style={{ transform:'scale(0.8)' }}
                      onClick={()=>setTriggers(ts=>ts.map(x=>x.id===tr.id?{...x,active:!x.active}:x))} />
                    <button onClick={()=>{ setTriggers(ts=>ts.filter(x=>x.id!==tr.id)); toast.success('Deleted'); }}
                      style={{ fontSize:11, padding:'3px 8px', borderRadius:7, cursor:'pointer',
                        background:'rgba(239,68,68,0.07)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.15)' }}>✕</button>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11.5, padding:'3px 9px', borderRadius:99, fontWeight:600,
                    background:'rgba(99,102,241,0.1)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.2)' }}>
                    Event: {tr.event.replace(/_/g,' ')}
                  </span>
                  <span style={{ fontSize:11.5, padding:'3px 9px', borderRadius:99, fontWeight:600,
                    background:'rgba(251,191,36,0.1)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.2)' }}>
                    If: {tr.condition}
                  </span>
                  <span style={{ fontSize:11.5, padding:'3px 9px', borderRadius:99, fontWeight:600,
                    background:'rgba(52,211,153,0.1)', color:'#34d399', border:'1px solid rgba(52,211,153,0.2)' }}>
                    → {tr.action}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      /* ────── Visitor Routing ────── */
      case 'visitor_route': return (
        <div>
          <Section title="Visitor Assignment Mode" sub="How new conversations are distributed to operators">
            <div style={{ display:'flex', gap:10, marginBottom:16 }}>
              {['round_robin','least_active','manual'].map(m => (
                <button key={m} onClick={()=>setVR(r=>({...r,mode:m}))}
                  style={{ flex:1, padding:'14px', borderRadius:12, cursor:'pointer', fontWeight:600, fontSize:12.5,
                    background: visitorRouting.mode===m?'rgba(99,102,241,0.15)':'var(--s1)',
                    border: visitorRouting.mode===m?'1.5px solid rgba(99,102,241,0.4)':'1px solid var(--b1)',
                    color: visitorRouting.mode===m?'#a5b4fc':'var(--t3)', textTransform:'capitalize', textAlign:'center' }}>
                  {m.replace('_',' ')}
                </button>
              ))}
            </div>
            <Field label="Fallback (when no operators available)" sub="Conversation goes to:">
              <select className="input" style={{ fontSize:13 }} value={visitorRouting.fallback}
                onChange={e=>setVR(r=>({...r,fallback:e.target.value}))}>
                <option>AI Bot</option>
                {operators.map(o=><option key={o.id}>{o.name}</option>)}
              </select>
            </Field>
            <Field label="Routing timeout" sub="Seconds before routing to fallback">
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input className="input" type="number" style={{ width:80, fontSize:13 }} value={visitorRouting.threshold}
                  onChange={e=>setVR(r=>({...r,threshold:+e.target.value}))} />
                <span style={{ fontSize:13, color:'var(--t3)' }}>seconds</span>
              </div>
            </Field>
            <SaveRow onSave={()=>save('Visitor routing saved')} saving={saving} />
          </Section>
        </div>
      );

      /* ────── Chat Routing ────── */
      case 'chat_route': return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--t4)' }}>Rules are evaluated in priority order — first match wins</p>
            <button className="btn btn-ghost btn-sm" onClick={()=>toast('Rule builder coming soon')}>+ Add Rule</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {routing.map((r, i) => (
              <div key={r.id} style={{ padding:'13px 18px', borderRadius:12, background:'var(--bg2)',
                border:`1px solid ${r.active?'rgba(99,102,241,0.2)':'var(--b1)'}`,
                display:'flex', alignItems:'center', gap:14, opacity: r.active ? 1 : 0.55 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--t4)', width:20, textAlign:'center',
                  background:'var(--s2)', borderRadius:6, padding:'3px 6px' }}>#{i+1}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{r.name}</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <span style={{ fontSize:11.5, color:'#fbbf24' }}>If: {r.condition}</span>
                    <span style={{ fontSize:11.5, color:'var(--t4)' }}>→</span>
                    <span style={{ fontSize:11.5, color:'#34d399' }}>Assign to: {r.assignTo}</span>
                  </div>
                </div>
                <div className={`toggle${r.active?' on':''}`} style={{ transform:'scale(0.8)' }}
                  onClick={()=>setRouting(rs=>rs.map(x=>x.id===r.id?{...x,active:!x.active}:x))} />
              </div>
            ))}
          </div>
        </div>
      );

      /* ────── Lead Scoring ────── */
      case 'lead_scoring': return (
        <div>
          <Section title="Scoring Rules" sub="Each signal adjusts the lead score (0–100). Positive = intent, Negative = objection">
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {leadRules.map(r => (
                <div key={r.id} style={{ padding:'12px 16px', borderRadius:11, background:'var(--bg2)',
                  border:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:14,
                  opacity: r.active ? 1 : 0.5 }}>
                  <div className={`toggle${r.active?' on':''}`} style={{ transform:'scale(0.8)', flexShrink:0 }}
                    onClick={()=>setLeadRules(rs=>rs.map(x=>x.id===r.id?{...x,active:!x.active}:x))} />
                  <span style={{ flex:1, fontSize:13, color:'var(--t2)' }}>{r.signal}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <input type="number" className="input" style={{ width:60, fontSize:13, textAlign:'center',
                      color: r.weight>0?'#34d399':'#fca5a5', fontWeight:700 }}
                      value={r.weight} onChange={e=>setLeadRules(rs=>rs.map(x=>x.id===r.id?{...x,weight:+e.target.value}:x))} />
                    <span style={{ fontSize:12, color:'var(--t4)' }}>pts</span>
                  </div>
                </div>
              ))}
            </div>
            <SaveRow onSave={()=>save('Lead scoring rules saved')} saving={saving} />
          </Section>
        </div>
      );

      /* ────── Company Scoring ────── */
      case 'company_score': return (
        <div>
          <Section title="Company Score Thresholds" sub="Scores contacts based on purchase history to identify high-value accounts">
            <Toggle value={compScore.enabled} onChange={v=>setCompScore(s=>({...s,enabled:v}))} label="Enable company scoring" />
            {compScore.enabled && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
                <Field label="Minimum revenue for High Value" sub="EGP"><input className="input" type="number" style={{ fontSize:13 }} value={compScore.minRevenue} onChange={e=>setCompScore(s=>({...s,minRevenue:+e.target.value}))} /></Field>
                <Field label="Minimum orders for Regular"><input className="input" type="number" style={{ fontSize:13 }} value={compScore.minOrders} onChange={e=>setCompScore(s=>({...s,minOrders:+e.target.value}))} /></Field>
                <Field label="VIP threshold (EGP total revenue)"><input className="input" type="number" style={{ fontSize:13 }} value={compScore.vipThreshold} onChange={e=>setCompScore(s=>({...s,vipThreshold:+e.target.value}))} /></Field>
              </div>
            )}
            <SaveRow onSave={()=>save('Company scoring saved')} saving={saving} />
          </Section>
        </div>
      );

      /* ────── Schedule Report ────── */
      case 'sched_report': return (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <p style={{ fontSize:13, color:'var(--t4)' }}>Automated reports sent to specified email addresses</p>
            <button className="btn btn-primary btn-sm" onClick={()=>setSchedModal(true)}>+ New Schedule</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {schedReports.map(s => (
              <div key={s.id} style={{ padding:'13px 18px', borderRadius:12, background:'var(--bg2)',
                border:'1px solid var(--b1)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
                opacity: s.active ? 1 : 0.55 }}>
                <div>
                  <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{s.name}</p>
                  <p style={{ fontSize:12, color:'var(--t4)' }}>
                    Every {s.freq} at {s.time} → {s.email}
                  </p>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <div className={`toggle${s.active?' on':''}`} style={{ transform:'scale(0.8)' }}
                    onClick={()=>setSchedReports(rs=>rs.map(x=>x.id===s.id?{...x,active:!x.active}:x))} />
                  <button onClick={()=>{ setSchedReports(rs=>rs.filter(x=>x.id!==s.id)); toast.success('Deleted'); }}
                    style={{ fontSize:11, padding:'3px 8px', borderRadius:7, cursor:'pointer',
                      background:'rgba(239,68,68,0.07)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.15)' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      /* ────── Conversation Monitor ────── */
      case 'conv_monitor': return (
        <div>
          <div style={{ display:'flex', gap:14, marginBottom:20 }}>
            {[
              { label:'Active', value: LIVE_CONVS.filter(c=>c.status==='active').length, color:'#34d399' },
              { label:'Bot',    value: LIVE_CONVS.filter(c=>c.status==='bot').length,    color:'#67e8f9' },
              { label:'Waiting',value: LIVE_CONVS.filter(c=>c.status==='waiting').length,color:'#fbbf24' },
            ].map(s => (
              <div key={s.label} style={{ padding:'12px 20px', borderRadius:11, background:'var(--bg2)',
                border:`1px solid ${s.color}22`, flex:1, textAlign:'center' }}>
                <p style={{ fontSize:24, fontWeight:800, color:s.color, fontFamily:'Space Grotesk' }}>{s.value}</p>
                <p style={{ fontSize:12, color:'var(--t4)', marginTop:2 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {LIVE_CONVS.map(c => (
              <div key={c.id} style={{ padding:'13px 18px', borderRadius:12, background:'var(--bg2)',
                border:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:14 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                  background: c.status==='active'?'#34d399':c.status==='bot'?'#67e8f9':'#fbbf24',
                  display:'inline-block' }} />
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{c.customer}</span>
                    <span style={{ fontSize:14 }}>{c.ch}</span>
                    <span style={{ fontSize:11.5, color:'var(--t4)' }}>{c.msgs} messages · {c.duration}</span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)', marginTop:2 }}>Agent: {c.agent}</p>
                </div>
                <button onClick={()=>toast('Opening conversation…')} className="btn btn-ghost btn-xs">View</button>
                {c.status === 'bot' && (
                  <button onClick={()=>toast.success('Taken over from AI')} className="btn btn-xs"
                    style={{ background:'rgba(6,182,212,0.1)', color:'#67e8f9', border:'1px solid rgba(6,182,212,0.2)', fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer', fontWeight:600 }}>
                    Take Over
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      );

      /* ────── Import ────── */
      case 'import': return (
        <div>
          <Section title="Import Contacts" sub="Upload a CSV file to bulk import contacts into your database">
            <div style={{ padding:'32px', borderRadius:14, border:'2px dashed var(--b1)',
              background:'var(--s1)', textAlign:'center', marginBottom:16 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📂</div>
              <p style={{ fontSize:14, color:'var(--t2)', marginBottom:6 }}>
                {importFile ? `✓ ${importFile.name}` : 'Drop your CSV file here'}
              </p>
              <p style={{ fontSize:12, color:'var(--t4)', marginBottom:16 }}>
                Columns: Name, Phone, Email, Country, Tags (comma separated)
              </p>
              <label style={{ cursor:'pointer' }}>
                <input type="file" accept=".csv,.xlsx" style={{ display:'none' }}
                  onChange={e=>{ setImportFile(e.target.files[0]); setImportResult(null); }} />
                <span className="btn btn-ghost btn-sm">Browse Files</span>
              </label>
            </div>
            {importResult && (
              <div style={{ padding:'14px 18px', borderRadius:11, background:'rgba(52,211,153,0.06)',
                border:'1px solid rgba(52,211,153,0.2)', marginBottom:14, display:'grid',
                gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                {[
                  { label:'Total', value:importResult.total, color:'var(--t1)' },
                  { label:'Imported', value:importResult.imported, color:'#34d399' },
                  { label:'Skipped', value:importResult.skipped, color:'#fbbf24' },
                  { label:'Errors', value:importResult.errors, color:'#fca5a5' },
                ].map(s=>(
                  <div key={s.label} style={{ textAlign:'center' }}>
                    <p style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:'Space Grotesk' }}>{s.value}</p>
                    <p style={{ fontSize:11.5, color:'var(--t4)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-primary" onClick={simulateImport}
              disabled={!importFile || importing} style={{ minWidth:160 }}>
              {importing ? (
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <svg style={{ animation:'anim-spin 1s linear infinite', width:16, height:16 }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
                  </svg> Importing…
                </span>
              ) : '⬆ Import Contacts'}
            </button>
          </Section>
        </div>
      );

      /* ────── Profiles ────── */
      case 'profiles': return (
        <div>
          <Section title="Contact Profile Fields" sub="Customize what information is collected for each contact">
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <input className="input" style={{ fontSize:13, flex:1 }} placeholder="Field label…"
                value={pfForm.label} onChange={e=>setPfForm(f=>({...f,label:e.target.value}))} />
              <select className="input" style={{ fontSize:13, width:110 }} value={pfForm.type}
                onChange={e=>setPfForm(f=>({...f,type:e.target.value}))}>
                {['text','number','email','phone','date','url','select'].map(t=><option key={t}>{t}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={()=>{ if(!pfForm.label.trim()){toast.error('Label required');return;}
                setProfileFields(fs=>[...fs,{id:'pf'+Date.now(),...pfForm,system:false}]);
                setPfForm({label:'',type:'text',required:false}); toast.success('Field added'); }}>+ Add</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {profileFields.map(f => (
                <div key={f.id} style={{ padding:'11px 16px', borderRadius:10, background:'var(--bg2)',
                  border:'1px solid var(--b1)', display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', flex:1 }}>{f.label}</span>
                  <Badge color='#818cf8'>{f.type}</Badge>
                  {f.required && <Badge color='#ef4444'>required</Badge>}
                  {f.system && <Badge color='#94a3b8'>system</Badge>}
                  {!f.system && (
                    <button onClick={()=>{ setProfileFields(fs=>fs.filter(x=>x.id!==f.id)); toast.success('Field removed'); }}
                      style={{ fontSize:11, padding:'3px 8px', borderRadius:7, cursor:'pointer',
                        background:'rgba(239,68,68,0.07)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.15)' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>
      );

      /* ────── Spammers ────── */
      case 'spammers': return (
        <div>
          <Section title="Block List" sub="Contacts added here are permanently blocked from initiating conversations">
            <div style={{ display:'grid', gridTemplateColumns:'100px 1fr 1fr auto', gap:10, marginBottom:16 }}>
              <select className="input" style={{ fontSize:13 }} value={spamInput.type}
                onChange={e=>setSpamInput(s=>({...s,type:e.target.value}))}>
                <option value="phone">Phone</option>
                <option value="email">Email</option>
              </select>
              <input className="input" style={{ fontSize:13 }} placeholder="Value…"
                value={spamInput.value} onChange={e=>setSpamInput(s=>({...s,value:e.target.value}))} />
              <input className="input" style={{ fontSize:13 }} placeholder="Reason…"
                value={spamInput.reason} onChange={e=>setSpamInput(s=>({...s,reason:e.target.value}))} />
              <button className="btn btn-primary btn-sm" onClick={()=>{ if(!spamInput.value.trim()){toast.error('Enter value');return;}
                setSpammers(ss=>[...ss,{id:'sp'+Date.now(),...spamInput,blockedAt:'Today'}]);
                setSpamInput({type:'phone',value:'',reason:''}); toast.success('Blocked'); }}>Block</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {spammers.map(s => (
                <div key={s.id} style={{ padding:'12px 16px', borderRadius:11, background:'rgba(239,68,68,0.05)',
                  border:'1px solid rgba(239,68,68,0.15)', display:'flex', alignItems:'center', gap:14 }}>
                  <Badge color='#ef4444'>{s.type}</Badge>
                  <span style={{ fontFamily:'monospace', fontSize:13, color:'var(--t1)', flex:1 }}>{s.value}</span>
                  <span style={{ fontSize:12, color:'var(--t4)', flex:1 }}>{s.reason}</span>
                  <span style={{ fontSize:11.5, color:'var(--t4)' }}>{s.blockedAt}</span>
                  <button onClick={()=>{ setSpammers(ss=>ss.filter(x=>x.id!==s.id)); toast.success('Unblocked'); }}
                    style={{ fontSize:11, padding:'3px 9px', borderRadius:7, cursor:'pointer', fontWeight:600,
                      background:'rgba(99,102,241,0.1)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.2)' }}>
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </Section>
        </div>
      );

      /* ────── AI Configuration ────── */
      case 'ai_config': {
        const prov = AI_PROVIDERS[aiCfg.provider];
        return (
          <div>
            <Section title="AI Provider & Model" sub="Choose your AI provider and connect your API key. Used for reply suggestions and auto-replies.">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <Field label="AI Provider">
                  <select className="input" style={{ fontSize:13 }} value={aiCfg.provider}
                    onChange={e => {
                      const p = e.target.value;
                      setAiCfg(c => ({ ...c, provider:p, model:AI_PROVIDERS[p].models[0] }));
                    }}>
                    {Object.entries(AI_PROVIDERS).map(([k,v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Model">
                  <select className="input" style={{ fontSize:13 }} value={aiCfg.model}
                    onChange={e => setAiCfg(c => ({ ...c, model:e.target.value }))}>
                    {prov.models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="API Key">
                <div style={{ display:'flex', gap:8 }}>
                  <div style={{ flex:1, position:'relative' }}>
                    <input className="input" style={{ fontSize:13, paddingRight:44 }}
                      type={aiKeyVisible ? 'text' : 'password'}
                      placeholder={`${prov.keyPrefix}…`}
                      value={aiCfg.apiKey}
                      onChange={e => setAiCfg(c => ({ ...c, apiKey:e.target.value }))} />
                    <button
                      onClick={() => setAiKeyVisible(v => !v)}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
                        background:'none', border:'none', cursor:'pointer', fontSize:15, color:'var(--t4)' }}>
                      {aiKeyVisible ? '🙈' : '👁'}
                    </button>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={testAiConnection}
                    disabled={aiTesting}
                    style={{ flexShrink:0, minWidth:90 }}>
                    {aiTesting ? '…' : '🔌 Test'}
                  </button>
                </div>
                {aiTestResult && (
                  <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, fontSize:12,
                    background: aiTestResult.ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${aiTestResult.ok ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    color: aiTestResult.ok ? '#34d399' : '#fca5a5' }}>
                    {aiTestResult.ok ? '✓' : '✕'} {aiTestResult.msg}
                  </div>
                )}
                <p style={{ fontSize:11, color:'var(--t4)', marginTop:6 }}>
                  Your key is stored locally in your browser and never sent to our servers.
                  Get your key from: {aiCfg.provider === 'openai' ? 'platform.openai.com/api-keys'
                    : aiCfg.provider === 'anthropic' ? 'console.anthropic.com/settings/keys'
                    : aiCfg.provider === 'google' ? 'aistudio.google.com/app/apikey'
                    : 'console.mistral.ai/api-keys'}
                </p>
              </Field>
              <SaveRow onSave={saveAiCfg} saving={saving} />
            </Section>

            <Section title="AI Behaviour" sub="Control how AI replies are generated and used in conversations">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
                <Field label="Temperature" sub="Lower = more focused, higher = more creative (0.0 – 1.0)">
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <input type="range" min={0} max={1} step={0.1}
                      value={aiCfg.temperature}
                      onChange={e => setAiCfg(c => ({ ...c, temperature:parseFloat(e.target.value) }))}
                      style={{ flex:1, accentColor:'#6366f1' }} />
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)', minWidth:28 }}>{aiCfg.temperature}</span>
                  </div>
                </Field>
                <Field label="Max Response Tokens">
                  <input className="input" style={{ fontSize:13 }} type="number" min={50} max={2000}
                    value={aiCfg.maxTokens}
                    onChange={e => setAiCfg(c => ({ ...c, maxTokens:parseInt(e.target.value)||300 }))} />
                </Field>
              </div>
              <Field label="System Prompt" sub="Instructions the AI follows when generating replies">
                <textarea className="input" style={{ fontSize:13, resize:'vertical', minHeight:90 }}
                  value={aiCfg.systemPrompt}
                  onChange={e => setAiCfg(c => ({ ...c, systemPrompt:e.target.value }))}
                  dir="auto" />
              </Field>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:8 }}>
                <Toggle
                  value={aiCfg.suggestOnly}
                  onChange={v => setAiCfg(c => ({ ...c, suggestOnly:v, autoReply:v ? false : c.autoReply }))}
                  label="Suggest only — show AI reply suggestion but require agent approval before sending" />
                <Toggle
                  value={aiCfg.autoReply}
                  onChange={v => setAiCfg(c => ({ ...c, autoReply:v, suggestOnly:v ? false : c.suggestOnly }))}
                  label="Auto-reply — AI sends replies automatically without agent approval" />
              </div>
              <SaveRow onSave={saveAiCfg} saving={saving} />
            </Section>

            <Section title="Usage & Limits" sub="Current AI usage this billing period">
              {[
                { label:'AI Replies Generated', used:USAGE_STATS.aiReplies.used, limit:USAGE_STATS.aiReplies.limit },
              ].map(r => (
                <div key={r.label} style={{ marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                    <span style={{ color:'var(--t2)', fontWeight:600 }}>{r.label}</span>
                    <span style={{ color:'var(--t4)' }}>{r.used.toLocaleString()} / {r.limit.toLocaleString()}</span>
                  </div>
                  <div style={{ height:6, borderRadius:99, background:'var(--s3)' }}>
                    <div style={{ height:6, borderRadius:99, background:'#6366f1',
                      width:`${Math.min(100, r.used/r.limit*100).toFixed(1)}%`,
                      transition:'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </Section>
          </div>
        );
      }

      default: return (
        <div style={{ padding:'40px', textAlign:'center', color:'var(--t4)', fontSize:14 }}>
          Select a setting from the sidebar
        </div>
      );
    }
  }

  /* ── WhatsApp Meta Business Partner panel ── */
  function WhatsAppPanel() {
    const wa = channels.whatsapp;

    /* Simulate Meta Embedded Signup OAuth popup */
    function handleConnectMeta() {
      setWaOAuthStep('authorizing');
      setWaOAuthModal(true);
      /* In production this opens window.FB.login() or Meta Embedded Signup popup.
         Here we simulate the OAuth callback after 2.5 s. */
      setTimeout(() => {
        setWaOAuthStep('success');
        setChannels(cs => ({
          ...cs,
          whatsapp: {
            ...cs.whatsapp,
            connected: true, verified: true, partnerAck: true,
            wabaId:'239801234567890', phoneNumberId:'107543210987654',
            displayName:'MyStore Official', phone:'+20 100 123 0000',
            businessName:'MyStore Egypt', businessId:'123456789012345',
            accessToken:'EAABcDEFghIJ…',
          },
        }));
        toast.success('WhatsApp connected via Meta!');
      }, 2500);
    }

    function handleDisconnect() {
      setChannels(cs => ({
        ...cs,
        whatsapp: {
          connected:false, verified:false, partnerAck:false,
          wabaId:'', phoneNumberId:'', displayName:'', phone:'',
          businessName:'', businessId:'', accessToken:'',
        },
      }));
      toast('WhatsApp disconnected');
    }

    const row = (label, value) => (
      <div key={label} style={{ display:'flex', alignItems:'center', gap:0,
        padding:'11px 14px', borderRadius:9, background:'var(--s1)', border:'1px solid var(--b1)' }}>
        <span style={{ fontSize:12, color:'var(--t4)', width:160, flexShrink:0 }}>{label}</span>
        <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500, fontFamily:'monospace',
          wordBreak:'break-all' }}>{value || '—'}</span>
      </div>
    );

    const stats = CHANNEL_STATS.whatsapp;
    const WA_STEPS = [
      { id:1, title:'Create Meta Business Account', desc:'Go to business.facebook.com and verify your business', done:true },
      { id:2, title:'Set up WhatsApp Business API',  desc:'In Meta Developer portal, create a WhatsApp app',    done:true },
      { id:3, title:'Add Phone Number',              desc:'Register and verify your WhatsApp business number',  done:true },
      { id:4, title:'Connect to Selligent.ai',       desc:'Authorise via Meta Embedded Signup below',           done:wa.connected },
    ];

    return (
      <div>
        {/* ── Partner Notice ── */}
        <div style={{ background:'rgba(37,211,102,0.06)', border:'1px solid rgba(37,211,102,0.22)',
          borderRadius:12, padding:'14px 18px', marginBottom:24, display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:20, flexShrink:0 }}>ℹ️</span>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'#4ade80', marginBottom:5 }}>How this connection works</p>
            <p style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.7 }}>
              When you click <strong style={{ color:'var(--t2)' }}>Connect with Meta</strong>, a secure Meta popup
              opens where you log in with <strong style={{ color:'var(--t2)' }}>your own Facebook/Meta account</strong> and
              select <strong style={{ color:'var(--t2)' }}>your WhatsApp Business Account</strong> and phone number.
              Selligent.ai never sees your Meta password — it only receives an access token scoped to your account.
              Selligent.ai will appear as a <strong style={{ color:'var(--t2)' }}>partner</strong> in your Meta
              Business Suite. This integration will <strong style={{ color:'#fca5a5' }}>stop working</strong> if
              you remove Selligent.ai from your partner list.
            </p>
          </div>
        </div>

        {/* ── Header + stats ── */}
        <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--s1)', border:'1px solid var(--b1)', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: wa.connected ? 14 : 0 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:'rgba(37,211,102,0.12)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
              border:'1px solid rgba(37,211,102,0.25)', flexShrink:0 }}>📱</div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>WhatsApp Business</p>
              <p style={{ fontSize:12, color: wa.connected ? '#34d399' : 'var(--t4)' }}>
                {wa.connected ? `● Connected · ${wa.displayName || wa.phone} · Verified` : '○ Not connected'}
              </p>
            </div>
            {wa.connected
              ? <button className="btn btn-sm btn-ghost" onClick={handleDisconnect} style={{ color:'#fca5a5' }}>Disconnect</button>
              : <button className="btn btn-sm btn-primary" onClick={handleConnectMeta}
                  style={{ background:'#25D366', borderColor:'#25D366', color:'#fff', display:'flex', alignItems:'center', gap:7 }}>
                  🔗 Connect with Meta
                </button>}
          </div>
          {wa.connected && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)',
              borderTop:'1px solid var(--b1)', paddingTop:12 }}>
              {[
                { l:'Conversations', v:stats.conversations },
                { l:'Deals Closed',  v:stats.deals },
                { l:'Conv. Rate',    v:stats.rate },
                { l:'Avg Response',  v:stats.response },
                { l:'Satisfaction',  v:stats.satisfaction },
              ].map(s=>(
                <div key={s.l} style={{ textAlign:'center' }}>
                  <p style={{ fontSize:18, fontWeight:800, color:'#25D366', marginBottom:2 }}>{s.v}</p>
                  <p style={{ fontSize:11, color:'var(--t4)' }}>{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div className="tabs" style={{ marginBottom:20 }}>
          {['connection','templates','messaging','analytics'].map(t=>(
            <button key={t} className={`tab${waTab===t?' active':''}`}
              onClick={()=>setWaTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>

        {/* ── Connection tab ── */}
        {waTab === 'connection' && (
          <Section title="Setup Progress"
            sub="Complete all steps to activate WhatsApp messaging.">
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {WA_STEPS.map(step=>(
                <div key={step.id} style={{ display:'flex', alignItems:'flex-start', gap:14,
                  padding:'12px 14px', borderRadius:10,
                  background: step.done ? 'rgba(16,185,129,0.05)' : 'var(--s1)',
                  border:`1px solid ${step.done ? 'rgba(16,185,129,0.18)' : 'var(--b1)'}` }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13,
                    background: step.done ? 'rgba(16,185,129,0.15)' : 'var(--s2)',
                    border:`2px solid ${step.done ? '#34d399' : 'var(--b2)'}`,
                    color: step.done ? '#34d399' : 'var(--t4)' }}>
                    {step.done ? '✓' : step.id}
                  </div>
                  <div>
                    <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{step.title}</p>
                    <p style={{ fontSize:12.5, color:'var(--t3)' }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {wa.connected && (
              <>
                <p style={{ fontSize:11.5, fontWeight:700, color:'var(--t4)', textTransform:'uppercase',
                  letterSpacing:'0.08em', marginBottom:10 }}>Account Details (from Meta)</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
                  {[
                    ['Display Name',    wa.displayName],
                    ['Phone Number',    wa.phone],
                    ['Business Name',   wa.businessName],
                    ['WABA ID',         wa.wabaId],
                    ['Phone Number ID', wa.phoneNumberId],
                    ['Business ID',     wa.businessId],
                  ].map(([lbl,val])=>(
                    <div key={lbl} style={{ display:'flex', alignItems:'center',
                      padding:'10px 14px', borderRadius:9, background:'var(--s1)', border:'1px solid var(--b1)' }}>
                      <span style={{ fontSize:12, color:'var(--t4)', width:160, flexShrink:0 }}>{lbl}</span>
                      <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500, fontFamily:'monospace' }}>{val||'—'}</span>
                    </div>
                  ))}
                </div>
                <Field label="Access Token" sub="Managed automatically via OAuth — Selligent.ai refreshes this on your behalf.">
                  <div style={{ position:'relative' }}>
                    <input className="input" readOnly value={wa.accessToken}
                      style={{ fontSize:12, fontFamily:'monospace', paddingRight:90, color:'var(--t3)' }} />
                    <button className="btn btn-sm btn-ghost" style={{ position:'absolute', right:6, top:'50%', transform:'translateY(-50%)', fontSize:11 }}
                      onClick={()=>{ navigator.clipboard?.writeText(wa.accessToken); toast.success('Copied!'); }}>Copy</button>
                  </div>
                </Field>
                <div style={{ marginTop:14, padding:'10px 14px', borderRadius:9,
                  background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.16)',
                  display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <p style={{ fontSize:12.5, color:'var(--t3)' }}>Need to update permissions or re-link?</p>
                  <button className="btn btn-sm btn-ghost" onClick={handleConnectMeta}
                    style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
                    🔄 Re-authorize with Meta
                  </button>
                </div>
              </>
            )}

            {/* Webhook URL */}
            <div style={{ marginTop:20 }}>
              <p style={{ fontSize:11.5, fontWeight:700, color:'var(--t4)', textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:8 }}>Callback URL — paste this in Meta Dashboard</p>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 14px', borderRadius:9, background:'rgba(0,0,0,0.3)', border:'1px solid var(--b1)' }}>
                <code style={{ fontFamily:'monospace', fontSize:13, color:'var(--t2)' }}>{webhookUrl('whatsapp')}</code>
                <button style={{ fontSize:12, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                  onClick={()=>{ navigator.clipboard?.writeText(webhookUrl('whatsapp')); toast.success('Copied!'); }}>Copy</button>
              </div>
            </div>

            <div style={{ marginTop:16, padding:'10px 14px', borderRadius:9,
              background:'rgba(255,255,255,0.03)', border:'1px solid var(--b1)',
              fontSize:12, color:'var(--t4)', lineHeight:1.6 }}>
              💡 <strong style={{ color:'var(--t3)' }}>Billing:</strong> Meta charges per conversation (24-hour window).
              Costs are deducted from your broadcast credits.
              Rates: 🇪🇬 EG $0.025 · 🇦🇪 AE $0.036 · 🇸🇦 SA $0.041 per conversation.
            </div>
          </Section>
        )}

        {/* ── Templates tab ── */}
        {waTab === 'templates' && (
          <Section title="Message Templates"
            sub="Pre-approved templates required for outbound WhatsApp messages. Templates are reviewed by Meta within 24 hours.">
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
              <button className="btn btn-primary btn-sm" onClick={()=>toast('Template builder — coming soon!')}>
                + New Template
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {waTemplates.map(t=>(
                <div key={t.id} style={{ padding:'14px 16px', borderRadius:10,
                  background:'var(--s1)', border:'1px solid var(--b1)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <code style={{ fontSize:12, color:'#a5b4fc', background:'rgba(99,102,241,0.1)',
                        padding:'2px 8px', borderRadius:5, border:'1px solid rgba(99,102,241,0.2)' }}>{t.name}</code>
                      <span style={{ fontSize:11.5, color:'var(--t4)' }}>{t.lang}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                      background: t.status==='approved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                      color: t.status==='approved' ? '#34d399' : '#fcd34d',
                      border:`1px solid ${t.status==='approved' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                      {t.status}
                    </span>
                  </div>
                  <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.5 }} dir="auto">{t.preview}</p>
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    <button className="btn btn-ghost btn-xs" onClick={()=>toast(`Using: ${t.name}`)}>Use in Broadcast</button>
                    <button className="btn btn-ghost btn-xs" onClick={()=>toast('Edit coming soon')}>Edit</button>
                    <button className="btn btn-ghost btn-xs" style={{ color:'#fca5a5' }}
                      onClick={()=>{ setWaTemplates(ts=>ts.filter(x=>x.id!==t.id)); toast.success('Template removed'); }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── Messaging settings tab ── */}
        {waTab === 'messaging' && (
          <Section title="Messaging Settings" sub="Configure auto-replies and availability for WhatsApp.">
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <Field label="Welcome Message" sub="Sent automatically when a new conversation starts.">
                <textarea className="input" rows={3} dir="auto" style={{ resize:'none', fontSize:13 }}
                  value={waSettings.welcome_msg}
                  onChange={e=>setWaSettings(s=>({...s,welcome_msg:e.target.value}))} />
              </Field>
              <Field label="Away Message" sub="Sent outside business hours when no agent is available.">
                <textarea className="input" rows={3} dir="auto" style={{ resize:'none', fontSize:13 }}
                  value={waSettings.away_msg}
                  onChange={e=>setWaSettings(s=>({...s,away_msg:e.target.value}))} />
              </Field>
              {[
                { k:'business_hours',   l:'Business Hours',    sub:'Only show as online during set hours' },
                { k:'read_receipts',    l:'Read Receipts',     sub:'Send read receipts to customers' },
                { k:'typing_indicator', l:'Typing Indicator',  sub:'Show typing indicator while agents type' },
              ].map(opt=>(
                <Toggle key={opt.k} label={opt.l} value={waSettings[opt.k]}
                  onChange={v=>setWaSettings(s=>({...s,[opt.k]:v}))} />
              ))}
              {waSettings.business_hours && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
                  padding:'14px 16px', borderRadius:10, background:'var(--s1)', border:'1px solid var(--b1)' }}>
                  <Field label="Open From">
                    <input type="time" className="input" value={waSettings.hours_from}
                      onChange={e=>setWaSettings(s=>({...s,hours_from:e.target.value}))} />
                  </Field>
                  <Field label="Close At">
                    <input type="time" className="input" value={waSettings.hours_to}
                      onChange={e=>setWaSettings(s=>({...s,hours_to:e.target.value}))} />
                  </Field>
                </div>
              )}
              <SaveRow onSave={()=>save('WhatsApp messaging settings saved')} saving={saving} />
            </div>
          </Section>
        )}

        {/* ── Analytics tab ── */}
        {waTab === 'analytics' && (
          <Section title="WhatsApp Analytics" sub="Performance metrics for your WhatsApp Business channel.">
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              {[
                { l:'Messages Sent',  v:'1,840', delta:'+12%', c:'#6366f1' },
                { l:'Delivered',      v:'1,798', delta:'97.7%', c:'#10b981' },
                { l:'Read',           v:'1,421', delta:'79.1%', c:'#06b6d4' },
                { l:'Replied',        v:'642',   delta:'45.2%', c:'#8b5cf6' },
                { l:'Opt-outs',       v:'12',    delta:'0.7%',  c:'#ef4444' },
                { l:'Templates Used', v:'89',    delta:'+5',    c:'#f59e0b' },
              ].map(k=>(
                <div key={k.l} style={{ padding:'14px 16px', borderRadius:10,
                  background:'var(--s1)', border:'1px solid var(--b1)', textAlign:'center' }}>
                  <p style={{ fontSize:22, fontWeight:800, color:k.c, marginBottom:3 }}>{k.v}</p>
                  <p style={{ fontSize:12, color:'var(--t3)', marginBottom:3 }}>{k.l}</p>
                  <p style={{ fontSize:11.5, color:'#34d399', fontWeight:600 }}>{k.delta}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── OAuth flow modal ── */}
        {waOAuthModal && (
          <Modal title="Connecting to Meta" onClose={()=>{ if(waOAuthStep!=='authorizing') setWaOAuthModal(false); }}>
            <div style={{ padding:'8px 0 4px', textAlign:'center' }}>
              {waOAuthStep === 'authorizing' && (
                <>
                  <div style={{ fontSize:40, marginBottom:16 }}>🔗</div>
                  <p style={{ fontSize:14, fontWeight:600, color:'var(--t1)', marginBottom:8 }}>Authorising with Meta…</p>
                  <p style={{ fontSize:12.5, color:'var(--t4)', marginBottom:20, lineHeight:1.6 }}>
                    The Meta Business Login window has been opened.<br />
                    Please complete the steps in that window to grant<br />
                    Selligent.ai partner access to your WhatsApp Business Account.
                  </p>
                  {['Opening Meta Business Login…','Requesting WABA permissions…','Adding Selligent.ai as partner…'].map((s,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8,
                      padding:'8px 14px', borderRadius:8, background:'var(--s1)', textAlign:'left' }}>
                      <span style={{ fontSize:11 }} className="anim-pulse">⏳</span>
                      <span style={{ fontSize:12.5, color:'var(--t3)' }}>{s}</span>
                    </div>
                  ))}
                </>
              )}
              {waOAuthStep === 'success' && (
                <>
                  <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
                  <p style={{ fontSize:15, fontWeight:700, color:'#4ade80', marginBottom:8 }}>Connected successfully!</p>
                  <p style={{ fontSize:12.5, color:'var(--t4)', marginBottom:16 }}>
                    Selligent.ai has been added as a partner in your<br />Meta Business account.
                  </p>
                  <p style={{ fontSize:12, marginBottom:20, lineHeight:1.7,
                    padding:'10px 14px', borderRadius:8, background:'rgba(250,204,21,0.06)',
                    border:'1px solid rgba(250,204,21,0.18)', color:'#fde68a' }}>
                    ⚠ Do not remove Selligent.ai from your Meta Business partner list — this will break the integration.
                  </p>
                  <button className="btn btn-primary" style={{ width:'100%' }} onClick={()=>setWaOAuthModal(false)}>Done</button>
                </>
              )}
            </div>
          </Modal>
        )}
      </div>
    );
  }

  /* ── Channel panel component (inline) ── */
  function ChannelPanel({ id, label, icon, color, fields, note }) {
    const ch = channels[id];
    return (
      <div>
        <Section title={`${icon} ${label}`} sub={note}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:`${color}15`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:`1px solid ${color}25` }}>
              {icon}
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:600, color:'var(--t1)' }}>{label}</p>
              <p style={{ fontSize:12, color: ch.connected ? '#34d399' : 'var(--t4)' }}>
                {ch.connected ? `● Connected${ch.verified ? ' · Verified' : ''}` : '○ Not connected'}
              </p>
            </div>
            <button onClick={()=>{ setChannels(cs=>({...cs,[id]:{...cs[id],connected:!cs[id].connected}})); toast.success(ch.connected?'Disconnected':'Connected!'); }}
              className={`btn btn-sm ${ch.connected ? 'btn-ghost' : 'btn-primary'}`}
              style={{ marginLeft:'auto', color: ch.connected ? '#fca5a5' : undefined }}>
              {ch.connected ? 'Disconnect' : 'Connect'}
            </button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {fields.map(f => (
              <Field key={f.key} label={f.label}>
                <input className="input" style={{ fontSize:13, fontFamily: f.mono ? 'monospace' : 'inherit' }}
                  placeholder={f.ph} value={channels[id][f.key] || ''}
                  onChange={e=>setChannels(cs=>({...cs,[id]:{...cs[id],[f.key]:e.target.value}}))} />
              </Field>
            ))}
          </div>
          <SaveRow onSave={()=>save(`${label} settings saved`)} saving={saving} />
        </Section>
      </div>
    );
  }

  /* ── Shared Facebook OAuth Modal (Instagram + Messenger) ── */
  function FbOAuthModal() {
    if (!fbModal) return null;
    return (
      <Modal title="Connect with Facebook" onClose={()=>setFbModal(false)}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'16px 18px', borderRadius:10,
            background:'rgba(0,153,255,0.06)', border:'1px solid rgba(0,153,255,0.18)' }}>
            <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', marginBottom:8 }}>🔐 Secure OAuth — your account, your data</p>
            <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>
              A Meta popup will open where you sign in with <strong style={{ color:'var(--t2)' }}>your own Facebook account</strong> and
              choose <strong style={{ color:'var(--t2)' }}>your Pages and Instagram account</strong>.
              Selligent.ai never sees your password — only receives a token tied to your chosen pages.
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              'You select which Facebook Pages to connect',
              'You select which Instagram account to connect',
              'Read & send messages on your behalf',
              'View Page insights',
            ].map(p=>(
              <div key={p} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--t2)' }}>
                <span style={{ color:'#34d399' }}>✓</span> {p}
              </div>
            ))}
          </div>
          <div style={{ padding:'10px 14px', borderRadius:9, background:'rgba(250,204,21,0.05)',
            border:'1px solid rgba(250,204,21,0.16)', fontSize:12, color:'#fde68a' }}>
            ⚠ This integration will not work if Selligent.ai is later removed from your Meta partner list.
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setFbModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:1 }}
              onClick={()=>{
                setFbModal(false);
                const id = activeId === 'ch_instagram' ? 'instagram' : 'messenger';
                setChannels(cs=>({...cs,[id]:{...cs[id],connected:true,verified:true}}));
                toast.success('Connected via Facebook OAuth!');
              }}>
              Continue to Facebook →
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  /* ════════════════ FINAL RENDER ════════════════ */
  return (
    <>
      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

        {/* ── Sidebar ── */}
        <div style={{ width:230, flexShrink:0, background:'var(--bg2)', borderRight:'1px solid var(--b1)',
          overflowY:'auto', padding:'16px 10px' }}>
          {NAV.map(group => (
            <div key={group.group} style={{ marginBottom:4 }}>
              <button onClick={()=>setCollapsed(c=>({...c,[group.group]:!c[group.group]}))}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:7, padding:'8px 8px',
                  background:'none', border:'none', cursor:'pointer', marginBottom:2 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--t4)',
                  textTransform:'uppercase', letterSpacing:'0.07em', flex:1, textAlign:'left' }}>
                  {group.icon} {group.group}
                </span>
                <span style={{ fontSize:10, color:'var(--t4)' }}>{collapsed[group.group]?'▶':'▼'}</span>
              </button>
              {!collapsed[group.group] && group.items.map(item => (
                <button key={item.id} onClick={()=>setActiveId(item.id)}
                  style={{ width:'100%', textAlign:'left', padding:'8px 14px', borderRadius:9,
                    fontSize:13, fontWeight: activeId===item.id ? 600 : 400, cursor:'pointer',
                    background: activeId===item.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: activeId===item.id ? '#a5b4fc' : 'var(--t3)',
                    border: activeId===item.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                    transition:'all 0.12s', marginBottom:2 }}>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'28px 32px' }}>
          <div style={{ marginBottom:24 }}>
            <h2 style={{ fontSize:20, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
              {activeLabel}
            </h2>
            <p style={{ fontSize:12.5, color:'var(--t4)' }}>
              {activeGroup?.group}
            </p>
          </div>
          {renderSection()}
        </div>
      </div>

      <FbOAuthModal />

      {/* ── Invite Operator Modal ── */}
      <Modal open={inviteModal} onClose={()=>setInviteModal(false)} title="Invite Operator" width={440}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {[{ k:'name', label:'Full Name', ph:'Ahmed Mohamed', type:'text' },{ k:'email', label:'Email', ph:'agent@store.com', type:'email' }].map(f=>(
            <Field key={f.k} label={f.label}>
              <input className="input" type={f.type} placeholder={f.ph} style={{ fontSize:13 }}
                value={inviteForm[f.k]} onChange={e=>setInviteForm(x=>({...x,[f.k]:e.target.value}))} />
            </Field>
          ))}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Role">
              <select className="input" style={{ fontSize:13 }} value={inviteForm.role} onChange={e=>setInviteForm(x=>({...x,role:e.target.value}))}>
                {ROLES.map(r=><option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Department">
              <select className="input" style={{ fontSize:13 }} value={inviteForm.dept} onChange={e=>setInviteForm(x=>({...x,dept:e.target.value}))}>
                {depts.map(d=><option key={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setInviteModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={()=>{
              if(!inviteForm.name||!inviteForm.email){toast.error('Fill all fields');return;}
              setOperators(ops=>[...ops,{id:'o'+Date.now(),avatar:inviteForm.name[0],status:'offline',...inviteForm}]);
              saveOp();
            }}>Send Invite →</button>
          </div>
        </div>
      </Modal>

      {/* ── New Department Modal ── */}
      <Modal open={deptModal} onClose={()=>setDeptModal(false)} title="New Department" width={380}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Department Name"><input className="input" style={{ fontSize:13 }} placeholder="e.g. Sales" value={deptForm.name} onChange={e=>setDeptForm(f=>({...f,name:e.target.value}))} /></Field>
          <Field label="Color">
            <div style={{ display:'flex', gap:8 }}>
              {COLORS.map(c=><button key={c} onClick={()=>setDeptForm(f=>({...f,color:c}))} style={{ width:26,height:26,borderRadius:'50%',background:c,border:deptForm.color===c?'2px solid #fff':'2px solid transparent',cursor:'pointer' }} />)}
            </div>
          </Field>
          <Field label="SLA (hours)" sub="Target response time">
            <input className="input" type="number" style={{ fontSize:13, width:80 }} value={deptForm.sla} onChange={e=>setDeptForm(f=>({...f,sla:+e.target.value}))} />
          </Field>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setDeptModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveDept}>Create Department</button>
          </div>
        </div>
      </Modal>

      {/* ── New Trigger Modal ── */}
      <Modal open={trigModal} onClose={()=>setTrigModal(false)} title="New Trigger" width={480}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Trigger Name"><input className="input" style={{ fontSize:13 }} placeholder="e.g. VIP greeting" value={trigForm.name} onChange={e=>setTrigForm(f=>({...f,name:e.target.value}))} /></Field>
          <Field label="Event (When)">
            <select className="input" style={{ fontSize:13 }} value={trigForm.event} onChange={e=>setTrigForm(f=>({...f,event:e.target.value}))}>
              {['conversation_started','score_updated','intent_detected','tag_added','no_reply','conversation_closed'].map(ev=><option key={ev}>{ev}</option>)}
            </select>
          </Field>
          <Field label="Condition (If)" sub="e.g. score >= 80, intent = ready_to_buy">
            <input className="input" style={{ fontSize:13 }} placeholder="score >= 80" value={trigForm.condition} onChange={e=>setTrigForm(f=>({...f,condition:e.target.value}))} />
          </Field>
          <Field label="Action (Then)">
            <input className="input" style={{ fontSize:13 }} placeholder="Send canned reply / Assign to dept / Add tag…" value={trigForm.action} onChange={e=>setTrigForm(f=>({...f,action:e.target.value}))} />
          </Field>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setTrigModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveTrigger}>Create Trigger</button>
          </div>
        </div>
      </Modal>

      {/* ── New Schedule Report Modal ── */}
      <Modal open={schedModal} onClose={()=>setSchedModal(false)} title="Schedule Report" width={420}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Report Name"><input className="input" style={{ fontSize:13 }} placeholder="e.g. Weekly Summary" value={schedForm.name} onChange={e=>setSchedForm(f=>({...f,name:e.target.value}))} /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Frequency">
              <select className="input" style={{ fontSize:13 }} value={schedForm.freq} onChange={e=>setSchedForm(f=>({...f,freq:e.target.value}))}>
                {['daily','weekly','monthly'].map(f=><option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Time"><input className="input" type="time" style={{ fontSize:13 }} value={schedForm.time} onChange={e=>setSchedForm(f=>({...f,time:e.target.value}))} /></Field>
          </div>
          <Field label="Send to Email"><input className="input" type="email" style={{ fontSize:13 }} placeholder="team@store.com" value={schedForm.email} onChange={e=>setSchedForm(f=>({...f,email:e.target.value}))} /></Field>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setSchedModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={saveSched}>Create Schedule</button>
          </div>
        </div>
      </Modal>

      {/* ── New Brand Modal ── */}
      <Modal open={brandModal} onClose={()=>setBrandModal(false)} title="New Brand" width={440}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <Field label="Brand Name"><input className="input" style={{ fontSize:13 }} placeholder="My Brand" value={brandForm.name} onChange={e=>setBrandForm(f=>({...f,name:e.target.value}))} /></Field>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="AI Tone">
              <select className="input" style={{ fontSize:13 }} value={brandForm.tone} onChange={e=>setBrandForm(f=>({...f,tone:e.target.value}))}>
                {['Friendly & Warm','Professional','Casual','Formal','Enthusiastic'].map(t=><option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <select className="input" style={{ fontSize:13 }} value={brandForm.lang} onChange={e=>setBrandForm(f=>({...f,lang:e.target.value}))}>
                <option value="ar">Arabic</option><option value="en">English</option>
              </select>
            </Field>
          </div>
          <Field label="Domain"><input className="input" style={{ fontSize:13 }} placeholder="mybrand.com" value={brandForm.domain} onChange={e=>setBrandForm(f=>({...f,domain:e.target.value}))} /></Field>
          <Field label="Primary Color">
            <div style={{ display:'flex', gap:8 }}>
              {COLORS.map(c=><button key={c} onClick={()=>setBrandForm(f=>({...f,primary:c}))} style={{ width:26,height:26,borderRadius:'50%',background:c,border:brandForm.primary===c?'2px solid #fff':'2px solid transparent',cursor:'pointer' }} />)}
            </div>
          </Field>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>setBrandModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:2 }} onClick={()=>{ if(!brandForm.name){toast.error('Name required');return;} setBrands(bs=>[...bs,{id:'br'+Date.now(),active:false,...brandForm}]); setBrandModal(false); toast.success('Brand created'); }}>Create Brand</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
