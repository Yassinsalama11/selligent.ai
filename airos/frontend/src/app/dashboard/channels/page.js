'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

const CHANNELS = [
  { id:'whatsapp',  name:'WhatsApp',          icon:'📱', color:'#25D366', status:'connected',     desc:'Meta Cloud API · Business' },
  { id:'instagram', name:'Instagram DM',       icon:'📸', color:'#E1306C', status:'connected',     desc:'Meta Graph API · OAuth'    },
  { id:'messenger', name:'Messenger',          icon:'💬', color:'#0099FF', status:'not_connected', desc:'Facebook Page Messages'    },
  { id:'livechat',  name:'Live Chat Widget',   icon:'⚡', color:'#6366f1', status:'connected',     desc:'Your website · Socket.io'  },
];

const STATS = {
  whatsapp:  { conversations:420, deals:38, rate:'42%', response:'1.2m', satisfaction:'4.8' },
  instagram: { conversations:280, deals:22, rate:'28%', response:'2.1m', satisfaction:'4.5' },
  messenger: { conversations:0,   deals:0,  rate:'—',   response:'—',    satisfaction:'—'   },
  livechat:  { conversations:95,  deals:12, rate:'35%', response:'0.8m', satisfaction:'4.9' },
};

const WA_STEPS = [
  { id:1, title:'Create Meta Business Account', desc:'Go to business.facebook.com and verify your business', done:true  },
  { id:2, title:'Set up WhatsApp Business API', desc:'In Meta Developer portal, create a WhatsApp app', done:true  },
  { id:3, title:'Add Phone Number',             desc:'Register and verify your WhatsApp business number', done:true  },
  { id:4, title:'Connect to Selligent.ai',      desc:'Enter your credentials below to activate', done:false },
];

export default function ChannelsPage() {
  const [channels, setChannels] = useState(CHANNELS);
  const [active, setActive]     = useState(CHANNELS[0]);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [disconnectModal, setDisconnectModal] = useState(false);
  const [fbModal, setFbModal]   = useState(false);
  const [waTab, setWaTab]       = useState('setup'); // 'setup' | 'templates' | 'analytics' | 'settings'

  // WhatsApp-specific state
  const [waTemplates] = useState([
    { id:1, name:'order_confirmed',  status:'approved', lang:'ar+en', preview:'Your order #{{1}} has been confirmed! 🎉' },
    { id:2, name:'shipping_update',  status:'approved', lang:'ar+en', preview:'Your package is on the way! Expected: {{1}}' },
    { id:3, name:'abandoned_cart',   status:'pending',  lang:'ar',    preview:'وجدنا عربيتك مليانة! هل تريد إكمال الطلب؟ 🛒' },
    { id:4, name:'feedback_request', status:'approved', lang:'en',    preview:'How was your experience? Rate us ⭐⭐⭐⭐⭐' },
  ]);

  const [waSettings, setWaSettings] = useState({
    phone_id:'', business_id:'', token:'', verify_token:'selligent_verify_'+Math.random().toString(36).slice(2,10),
    welcome_msg:'أهلاً بك في متجرنا! كيف أقدر أساعدك؟ 👋',
    away_msg:'شكراً على رسالتك! سنرد عليك في أقرب وقت خلال ساعات العمل.',
    business_hours: true, hours_from:'09:00', hours_to:'22:00',
    read_receipts: true, typing_indicator: true,
  });

  function save(e) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false); setSaved(true);
      setChannels(cs => cs.map(c => c.id === active.id ? { ...c, status:'connected' } : c));
      setActive(a => ({ ...a, status:'connected' }));
      toast.success(`${active.name} connected!`);
      setTimeout(() => setSaved(false), 2200);
    }, 1200);
  }

  function copy(text, label) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`))
      .catch(() => toast.error('Copy failed'));
  }

  function disconnect() {
    setChannels(cs => cs.map(c => c.id === active.id ? { ...c, status:'not_connected' } : c));
    setActive(a => ({ ...a, status:'not_connected' }));
    setDisconnectModal(false);
    toast.success(`${active.name} disconnected`);
  }

  const isConnected = (id) => channels.find(c => c.id === id)?.status === 'connected';
  const activeStats = STATS[active.id] || STATS.livechat;
  const webhookUrl  = `https://api.selligent.ai/webhooks/${active.id}`;
  const snippet = `<script src="https://cdn.selligent.ai/widget.js"\n  data-tenant="YOUR_TENANT_ID"></script>`;

  return (
    <>
      <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Channel Connections</h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>Connect and configure your communication channels</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:20 }}>
          {/* Channel selector */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {channels.map(ch => {
              const on  = ch.status === 'connected';
              const sel = active?.id === ch.id;
              return (
                <button key={ch.id} onClick={() => { setActive(ch); setForm({}); setSaved(false); setWaTab('setup'); }}
                  style={{ padding:'16px', borderRadius:'var(--r-md)', cursor:'pointer', textAlign:'left',
                    background: sel ? 'rgba(99,102,241,0.08)' : 'var(--bg3)',
                    border: sel ? '1.5px solid rgba(99,102,241,0.35)' : '1px solid var(--b1)',
                    transition:'all 0.15s' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: on ? 10 : 0 }}>
                    <span style={{ fontSize:26 }}>{ch.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontWeight:700, fontSize:14, color:'var(--t1)' }}>{ch.name}</span>
                        <span className="badge" style={on
                          ? { background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)', fontSize:10.5 }
                          : { background:'var(--s2)', color:'var(--t4)', border:'1px solid var(--b1)', fontSize:10.5 }}>
                          {on ? '● Connected' : '○ Not connected'}
                        </span>
                      </div>
                      <p style={{ fontSize:11.5, color:'var(--t4)', marginTop:2 }}>{ch.desc}</p>
                    </div>
                  </div>
                  {on && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)',
                      borderTop:'1px solid rgba(255,255,255,0.05)', paddingTop:10 }}>
                      {[
                        { l:'Chats', v: STATS[ch.id]?.conversations },
                        { l:'Deals', v: STATS[ch.id]?.deals },
                        { l:'Conv.', v: STATS[ch.id]?.rate },
                      ].map(s => (
                        <div key={s.l} style={{ textAlign:'center' }}>
                          <p style={{ fontSize:14, fontWeight:800, color:ch.color }}>{s.v}</p>
                          <p style={{ fontSize:10, color:'var(--t4)', marginTop:2 }}>{s.l}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Config panel */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Panel header */}
            <div className="card" style={{ paddingBottom:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                <span style={{ fontSize:36 }}>{active.icon}</span>
                <div style={{ flex:1 }}>
                  <h2 style={{ fontSize:18, fontWeight:800, marginBottom:3 }}>{active.name}</h2>
                  <p style={{ fontSize:13, color:'var(--t3)' }}>{active.desc}</p>
                </div>
                <span className="badge" style={{ ...(isConnected(active.id)
                  ? { background:'rgba(16,185,129,0.1)', color:'#34d399', border:'1px solid rgba(16,185,129,0.2)' }
                  : { background:'var(--s2)', color:'var(--t4)', border:'1px solid var(--b1)' }) }}>
                  {isConnected(active.id) ? '● Connected' : '○ Not connected'}
                </span>
                {isConnected(active.id) && (
                  <button className="btn btn-danger btn-sm" onClick={() => setDisconnectModal(true)}>
                    Disconnect
                  </button>
                )}
              </div>

              {/* Stats row for connected channels */}
              {isConnected(active.id) && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)',
                  borderTop:'1px solid var(--b1)', paddingTop:14, paddingBottom:16 }}>
                  {[
                    { l:'Conversations', v:activeStats.conversations },
                    { l:'Deals Closed',  v:activeStats.deals },
                    { l:'Conv. Rate',    v:activeStats.rate },
                    { l:'Avg Response',  v:activeStats.response },
                    { l:'Satisfaction',  v:activeStats.satisfaction },
                  ].map(s => (
                    <div key={s.l} style={{ textAlign:'center' }}>
                      <p style={{ fontSize:18, fontWeight:800, color:active.color, marginBottom:3 }}>{s.v}</p>
                      <p style={{ fontSize:11, color:'var(--t4)' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── WhatsApp Full Setup ────────────────────────────────────── */}
            {active.id === 'whatsapp' && (
              <>
                {/* WhatsApp tabs */}
                <div className="tabs">
                  {['setup','templates','settings','analytics'].map(t => (
                    <button key={t} className={`tab${waTab===t?' active':''}`}
                      onClick={() => setWaTab(t)}
                      style={{ textTransform:'capitalize' }}>{t}</button>
                  ))}
                </div>

                {waTab === 'setup' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {/* Setup steps */}
                    <div className="card">
                      <h3 style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Setup Progress</h3>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {WA_STEPS.map((step, i) => (
                          <div key={step.id} style={{ display:'flex', alignItems:'flex-start', gap:14,
                            padding:'12px 14px', borderRadius:'var(--r)',
                            background: step.done ? 'rgba(16,185,129,0.05)' : 'var(--s1)',
                            border: `1px solid ${step.done ? 'rgba(16,185,129,0.18)' : 'var(--b1)'}` }}>
                            <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                              display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13,
                              background: step.done ? 'rgba(16,185,129,0.15)' : 'var(--s2)',
                              border: `2px solid ${step.done ? '#34d399' : 'var(--b2)'}`,
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
                    </div>

                    {/* Credentials form */}
                    <div className="card">
                      <h3 style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>API Credentials</h3>
                      <p style={{ fontSize:13, color:'var(--t3)', marginBottom:20 }}>
                        Find these in your{' '}
                        <span style={{ color:'#818cf8', cursor:'pointer', fontWeight:600 }}
                          onClick={() => toast('Opening Meta Developer Portal…')}>
                          Meta Developer Portal →
                        </span>
                      </p>
                      <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                          {[
                            { label:'Phone Number ID',     key:'phone_id',    type:'text',     ph:'1234567890' },
                            { label:'Business Account ID', key:'business_id', type:'text',     ph:'9876543210' },
                            { label:'Access Token',        key:'token',       type:'password', ph:'EAAxxxxx…'  },
                            { label:'Verify Token',        key:'verify_token',type:'text',     ph:waSettings.verify_token },
                          ].map(f => (
                            <div key={f.key} style={{ gridColumn: f.type==='password' ? '1/-1' : undefined }}>
                              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>{f.label}</label>
                              <input type={f.type} className="input" style={{ fontSize:13.5 }}
                                placeholder={f.ph}
                                value={waSettings[f.key]||''}
                                onChange={e => setWaSettings(s => ({...s, [f.key]:e.target.value}))} />
                            </div>
                          ))}
                        </div>

                        {/* Webhook URL */}
                        <div>
                          <p style={{ fontSize:12, fontWeight:600, color:'var(--t4)', marginBottom:6,
                            textTransform:'uppercase', letterSpacing:'0.05em' }}>
                            Callback URL — paste this in Meta Dashboard
                          </p>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                            padding:'10px 14px', borderRadius:'var(--r)',
                            background:'rgba(0,0,0,0.35)', border:'1px solid var(--b1)' }}>
                            <code style={{ fontFamily:'monospace', fontSize:13, color:'var(--t2)' }}>
                              {webhookUrl}
                            </code>
                            <button type="button" onClick={() => copy(webhookUrl, 'Webhook URL')}
                              style={{ fontSize:12, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                              Copy
                            </button>
                          </div>
                        </div>

                        <div style={{ display:'flex', gap:10 }}>
                          <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Connecting…' : saved ? '✓ Connected!' : '🔌 Connect WhatsApp'}
                          </button>
                          <button type="button" className="btn btn-ghost btn-sm"
                            onClick={() => toast('Opening Meta Developer Portal guide…')}>
                            📖 Setup Guide
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {waTab === 'templates' && (
                  <div className="card">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                      <div>
                        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>Message Templates</h3>
                        <p style={{ fontSize:13, color:'var(--t3)' }}>
                          Pre-approved templates for outbound WhatsApp messages
                        </p>
                      </div>
                      <button className="btn btn-primary btn-sm" onClick={() => toast('Template builder coming soon!')}>
                        + New Template
                      </button>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {waTemplates.map(t => (
                        <div key={t.id} style={{ padding:'14px 16px', borderRadius:'var(--r-md)',
                          background:'var(--s1)', border:'1px solid var(--b1)' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <code style={{ fontSize:12, color:'#a5b4fc', background:'rgba(99,102,241,0.1)',
                                padding:'2px 8px', borderRadius:5, border:'1px solid rgba(99,102,241,0.2)' }}>
                                {t.name}
                              </code>
                              <span style={{ fontSize:11.5, color:'var(--t4)' }}>{t.lang}</span>
                            </div>
                            <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                              background: t.status==='approved' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                              color: t.status==='approved' ? '#34d399' : '#fcd34d',
                              border: `1px solid ${t.status==='approved' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                              {t.status}
                            </span>
                          </div>
                          <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.5 }} dir="auto">{t.preview}</p>
                          <div style={{ display:'flex', gap:8, marginTop:10 }}>
                            <button className="btn btn-ghost btn-xs" onClick={() => toast(`Using template: ${t.name}`)}>
                              Use Template
                            </button>
                            <button className="btn btn-ghost btn-xs" onClick={() => toast('Edit coming soon')}>
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {waTab === 'settings' && (
                  <div className="card">
                    <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>WhatsApp Settings</h3>
                    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                      <div>
                        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
                          Welcome Message
                        </label>
                        <textarea className="input" rows={3} dir="auto" style={{ resize:'none', fontSize:13 }}
                          value={waSettings.welcome_msg}
                          onChange={e => setWaSettings(s => ({...s, welcome_msg:e.target.value}))} />
                      </div>
                      <div>
                        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
                          Away Message (outside business hours)
                        </label>
                        <textarea className="input" rows={3} dir="auto" style={{ resize:'none', fontSize:13 }}
                          value={waSettings.away_msg}
                          onChange={e => setWaSettings(s => ({...s, away_msg:e.target.value}))} />
                      </div>

                      {[
                        { k:'business_hours',    l:'Business Hours', sub:'Only show as online during set hours' },
                        { k:'read_receipts',     l:'Read Receipts',  sub:'Send read receipts to customers' },
                        { k:'typing_indicator',  l:'Typing Indicator', sub:'Show typing indicator while agents type' },
                      ].map(opt => (
                        <div key={opt.k} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                          padding:'14px 16px', borderRadius:'var(--r)', background:'var(--s1)', border:'1px solid var(--b1)' }}>
                          <div>
                            <p style={{ fontSize:13.5, fontWeight:600, marginBottom:2 }}>{opt.l}</p>
                            <p style={{ fontSize:12, color:'var(--t4)' }}>{opt.sub}</p>
                          </div>
                          <div className={`toggle${waSettings[opt.k]?' on':''}`}
                            onClick={() => setWaSettings(s => ({...s, [opt.k]:!s[opt.k]}))} />
                        </div>
                      ))}

                      {waSettings.business_hours && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12,
                          padding:'14px 16px', borderRadius:'var(--r)', background:'var(--s1)', border:'1px solid var(--b1)' }}>
                          <div>
                            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
                              Open From
                            </label>
                            <input type="time" className="input" value={waSettings.hours_from}
                              onChange={e => setWaSettings(s => ({...s, hours_from:e.target.value}))} />
                          </div>
                          <div>
                            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
                              Close At
                            </label>
                            <input type="time" className="input" value={waSettings.hours_to}
                              onChange={e => setWaSettings(s => ({...s, hours_to:e.target.value}))} />
                          </div>
                        </div>
                      )}

                      <button className="btn btn-primary" onClick={() => toast.success('WhatsApp settings saved!')}>
                        Save Settings
                      </button>
                    </div>
                  </div>
                )}

                {waTab === 'analytics' && (
                  <div className="card">
                    <h3 style={{ fontSize:15, fontWeight:700, marginBottom:20 }}>WhatsApp Analytics</h3>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
                      {[
                        { l:'Messages Sent',     v:'1,840', delta:'+12%', c:'#6366f1' },
                        { l:'Delivered',          v:'1,798', delta:'97.7%', c:'#10b981' },
                        { l:'Read',               v:'1,421', delta:'79.1%', c:'#06b6d4' },
                        { l:'Replied',            v:'642',   delta:'45.2%', c:'#8b5cf6' },
                        { l:'Opt-outs',           v:'12',    delta:'0.7%',  c:'#ef4444' },
                        { l:'Templates Used',     v:'89',    delta:'+5',    c:'#f59e0b' },
                      ].map(k => (
                        <div key={k.l} style={{ padding:'14px 16px', borderRadius:'var(--r)',
                          background:'var(--s1)', border:'1px solid var(--b1)', textAlign:'center' }}>
                          <p style={{ fontSize:22, fontWeight:800, color:k.c, fontFamily:'Space Grotesk', marginBottom:4 }}>{k.v}</p>
                          <p style={{ fontSize:12, color:'var(--t3)', marginBottom:3 }}>{k.l}</p>
                          <p style={{ fontSize:11.5, color:'#34d399', fontWeight:600 }}>{k.delta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Instagram / Messenger ─────────────────────────────────── */}
            {(active.id === 'instagram' || active.id === 'messenger') && (
              <div className="card">
                <form onSubmit={save} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                    {active.id === 'instagram' ? (
                      <>
                        <div>
                          <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--t3)', marginBottom:7 }}>Page ID</label>
                          <input type="text" className="input" placeholder="Instagram Page ID"
                            value={form.page_id||''} onChange={e => setForm(v => ({...v, page_id:e.target.value}))} />
                        </div>
                        <div style={{ gridColumn:'1/-1' }}>
                          <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--t3)', marginBottom:7 }}>Access Token</label>
                          <input type="password" className="input" placeholder="EAAxxxxx…"
                            value={form.token||''} onChange={e => setForm(v => ({...v, token:e.target.value}))} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--t3)', marginBottom:7 }}>FB Page ID</label>
                          <input type="text" className="input" placeholder="FB Page ID"
                            value={form.page_id||''} onChange={e => setForm(v => ({...v, page_id:e.target.value}))} />
                        </div>
                        <div style={{ gridColumn:'1/-1' }}>
                          <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'var(--t3)', marginBottom:7 }}>Access Token</label>
                          <input type="password" className="input" placeholder="EAAxxxxx…"
                            value={form.token||''} onChange={e => setForm(v => ({...v, token:e.target.value}))} />
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ padding:'14px 16px', borderRadius:'var(--r)',
                    background:'var(--s1)', border:'1px solid var(--b1)' }}>
                    <p style={{ fontSize:12.5, color:'var(--t3)', marginBottom:10 }}>Or connect via OAuth (recommended):</p>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFbModal(true)}>
                      🔐 Connect with Facebook
                    </button>
                  </div>

                  <div>
                    <p style={{ fontSize:12, fontWeight:600, color:'var(--t4)', marginBottom:7,
                      textTransform:'uppercase', letterSpacing:'0.05em' }}>
                      Webhook URL
                    </p>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                      padding:'10px 14px', borderRadius:'var(--r)',
                      background:'rgba(0,0,0,0.35)', border:'1px solid var(--b1)' }}>
                      <code style={{ fontFamily:'monospace', fontSize:13, color:'var(--t2)' }}>{webhookUrl}</code>
                      <button type="button" style={{ fontSize:12, color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}
                        onClick={() => copy(webhookUrl, 'Webhook URL')}>Copy</button>
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Connecting…' : saved ? '✓ Connected!' : 'Save & Connect'}
                  </button>
                </form>
              </div>
            )}

            {/* ── Live Chat Widget ──────────────────────────────────────── */}
            {active.id === 'livechat' && (
              <div className="card">
                <div style={{ padding:'18px 20px', borderRadius:'var(--r-md)', marginBottom:16,
                  background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.18)' }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:10 }}>
                    Embed on your website
                  </p>
                  <div style={{ padding:'12px 16px', borderRadius:'var(--r)',
                    background:'rgba(0,0,0,0.4)', fontFamily:'monospace', fontSize:12.5,
                    color:'#67e8f9', lineHeight:1.6, border:'1px solid rgba(6,182,212,0.15)', userSelect:'all' }}>
                    {'<script src="https://cdn.selligent.ai/widget.js"'}<br/>
                    {'  data-tenant="YOUR_TENANT_ID"></script>'}
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)', marginTop:8 }}>
                    Paste before the &lt;/body&gt; tag. RTL auto-detected.
                  </p>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => copy(snippet, 'Snippet')}>Copy Snippet</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toast('Widget preview coming soon 🚀')}>Preview Widget</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Disconnect Modal ─────────────────────────────────────────────── */}
      <Modal open={disconnectModal} onClose={() => setDisconnectModal(false)} title="Disconnect Channel" width={400}>
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--t1)', marginBottom:8 }}>Disconnect {active?.name}?</p>
          <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>
            This will stop receiving messages. You can reconnect anytime.
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setDisconnectModal(false)}>Cancel</button>
          <button className="btn btn-danger" style={{ flex:1 }} onClick={disconnect}>Disconnect</button>
        </div>
      </Modal>

      {/* ── Facebook OAuth Modal ─────────────────────────────────────────── */}
      <Modal open={fbModal} onClose={() => setFbModal(false)} title="Connect with Facebook" width={440}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ padding:'16px 18px', borderRadius:'var(--r-md)',
            background:'rgba(0,153,255,0.06)', border:'1px solid rgba(0,153,255,0.18)' }}>
            <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)', marginBottom:8 }}>🔐 Secure OAuth Flow</p>
            <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>
              You'll be redirected to Facebook to authorize Selligent.ai. No password stored.
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {['Access to Page messages','Read & send messages on your behalf','View Page insights'].map(p => (
              <div key={p} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--t2)' }}>
                <span style={{ color:'#34d399' }}>✓</span> {p}
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setFbModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:1 }}
              onClick={() => { setFbModal(false); toast.success('Redirecting to Facebook…'); }}>
              Continue to Facebook →
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
