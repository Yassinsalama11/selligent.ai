'use client';
import { useState, useMemo, useEffect, useRef } from 'react';

const CLIENTS = ['All Clients','MyStore Egypt','TechHub KSA','Fashion Palace UAE',
  'AutoDeals Cairo','Beauty Corner','Luxury Boutique','Food Express',
  'Gadget World','MedCare Clinic','KSA Electronics'];

const EVENT_TYPES = ['All Events','message_received','message_sent','broadcast_sent',
  'webhook_received','api_call','template_approved','template_rejected',
  'channel_connected','channel_disconnected','operator_added','operator_removed',
  'payment_received','payment_failed','plan_changed','login','error'];

const SEED_LOGS = [
  { id:'l001', ts:'2026-04-11 14:32:05', client:'TechHub KSA',        level:'info',    event:'broadcast_sent',      channel:'wa', msg:'Broadcast sent to 2,400 recipients', payload:{ templateId:'order_confirmed', recipients:2400, cost:'$87.60', status:'queued' } },
  { id:'l002', ts:'2026-04-11 14:28:41', client:'MyStore Egypt',       level:'success', event:'template_approved',   channel:'wa', msg:'Template "order_confirmed" approved by Meta', payload:{ templateName:'order_confirmed', lang:'ar+en', category:'UTILITY' } },
  { id:'l003', ts:'2026-04-11 14:21:18', client:'Food Express',        level:'error',   event:'payment_failed',      channel:'-',  msg:'Invoice INV-0091 payment failed — card declined', payload:{ invoiceId:'INV-0091', amount:149, reason:'card_declined', retryAt:'2026-04-14' } },
  { id:'l004', ts:'2026-04-11 14:15:02', client:'KSA Electronics',     level:'info',    event:'message_received',    channel:'wa', msg:'New conversation started by +966 55 100 1234', payload:{ from:'+966551001234', preview:'مرحبا، أريد الاستفسار عن...', convId:'CONV-8821' } },
  { id:'l005', ts:'2026-04-11 14:10:55', client:'MyStore Egypt',       level:'info',    event:'message_sent',        channel:'ig', msg:'Agent Sara Ali replied to Instagram DM', payload:{ agentId:'op2', convId:'CONV-4412', chars:142 } },
  { id:'l006', ts:'2026-04-11 13:58:30', client:'KSA Electronics',     level:'info',    event:'operator_added',      channel:'-',  msg:'New operator Sara Al-Ghamdi added (Agent)', payload:{ operatorEmail:'sara@ksaelec.sa', role:'Agent', addedBy:'Abdullah Al-Harbi' } },
  { id:'l007', ts:'2026-04-11 13:44:12', client:'Gadget World',        level:'info',    event:'login',               channel:'-',  msg:'Admin Bassam Al-Otaibi logged in', payload:{ ip:'185.234.12.44', userAgent:'Chrome/124 · macOS', location:'Riyadh, SA' } },
  { id:'l008', ts:'2026-04-11 13:40:08', client:'MedCare Clinic',      level:'success', event:'channel_connected',   channel:'wa', msg:'WhatsApp channel connected via Meta OAuth', payload:{ phone:'+20 100 900 0000', wabaId:'8860055667', verifiedAt:'2026-04-11 13:40:06' } },
  { id:'l009', ts:'2026-04-11 13:22:44', client:'AutoDeals Cairo',     level:'error',   event:'error',               channel:'wa', msg:'Webhook delivery failed — 500 Internal Server Error', payload:{ url:'https://api.selligent.ai/webhooks/whatsapp', status:500, retries:3, nextRetry:'2026-04-11 13:37:44' } },
  { id:'l010', ts:'2026-04-11 13:05:19', client:'Luxury Boutique',     level:'success', event:'plan_changed',        channel:'-',  msg:'Plan upgraded: Starter → Pro', payload:{ oldPlan:'Starter', newPlan:'Pro', oldMrr:49, newMrr:149, changedBy:'admin' } },
  { id:'l011', ts:'2026-04-11 12:55:00', client:'Fashion Palace UAE',  level:'warning', event:'api_call',            channel:'wa', msg:'Rate limit approaching — 85% of monthly quota used', payload:{ quotaUsed:850, quotaTotal:1000, channel:'whatsapp', resetDate:'May 1 2026' } },
  { id:'l012', ts:'2026-04-11 12:40:33', client:'Beauty Corner',       level:'info',    event:'message_received',    channel:'ig', msg:'New Instagram DM from @fashionlover_eg', payload:{ from:'@fashionlover_eg', preview:'Hi, do you have the red dress in size M?', convId:'CONV-3309' } },
  { id:'l013', ts:'2026-04-11 12:28:17', client:'TechHub KSA',         level:'success', event:'payment_received',    channel:'-',  msg:'Invoice INV-0083 paid — $299', payload:{ invoiceId:'INV-0083', amount:299, method:'Visa •••• 4242', txId:'ch_3P9abc' } },
  { id:'l014', ts:'2026-04-11 12:10:04', client:'MedCare Clinic',      level:'info',    event:'broadcast_sent',      channel:'wa', msg:'Broadcast sent to 380 recipients', payload:{ templateId:'appointment_reminder', recipients:380, cost:'$9.50', status:'delivered' } },
  { id:'l015', ts:'2026-04-11 11:58:49', client:'KSA Electronics',     level:'info',    event:'webhook_received',    channel:'wa', msg:'Webhook received: message status update', payload:{ type:'message_status', status:'read', messageId:'wamid.HBgL...', convId:'CONV-8800' } },
  { id:'l016', ts:'2026-04-11 11:44:22', client:'AutoDeals Cairo',     level:'info',    event:'message_sent',        channel:'fb', msg:'Agent Mohamed Samir replied via Messenger', payload:{ agentId:'op1', convId:'CONV-6612', chars:89 } },
  { id:'l017', ts:'2026-04-11 11:30:05', client:'MyStore Egypt',       level:'info',    event:'api_call',            channel:'wa', msg:'WhatsApp Cloud API call: GET /phone_numbers', payload:{ method:'GET', endpoint:'/v18.0/phone_numbers', status:200, latency:'142ms' } },
  { id:'l018', ts:'2026-04-11 11:15:38', client:'Gadget World',        level:'warning', event:'template_rejected',   channel:'wa', msg:'Template "flash_sale" rejected by Meta', payload:{ templateName:'flash_sale', reason:'promotional_content_policy', resubmitAllowed:true } },
  { id:'l019', ts:'2026-04-11 10:58:14', client:'Beauty Corner',       level:'success', event:'channel_connected',   channel:'lc', msg:'Live Chat widget connected — domain beautycorner.eg', payload:{ domain:'beautycorner.eg', widgetId:'WGT-005', installedAt:'2026-04-11 10:58:12' } },
  { id:'l020', ts:'2026-04-11 10:42:30', client:'Luxury Boutique',     level:'info',    event:'operator_removed',    channel:'-',  msg:'Operator Hana Al-Maktoum removed previous agent', payload:{ removed:'agent_old@luxuryboutique.ae', removedBy:'Hana Al-Maktoum', reason:'offboarded' } },
  { id:'l021', ts:'2026-04-11 10:28:55', client:'TechHub KSA',         level:'error',   event:'error',               channel:'ig', msg:'Instagram webhook signature mismatch', payload:{ expected:'sha256=abc...', received:'sha256=xyz...', action:'request_rejected' } },
  { id:'l022', ts:'2026-04-11 10:10:08', client:'MedCare Clinic',      level:'info',    event:'login',               channel:'-',  msg:'Supervisor Rania Sherif logged in', payload:{ ip:'102.44.12.88', userAgent:'Safari/17 · iPhone', location:'Cairo, EG' } },
  { id:'l023', ts:'2026-04-11 09:58:44', client:'KSA Electronics',     level:'success', event:'broadcast_sent',      channel:'wa', msg:'Broadcast sent to 4,100 recipients', payload:{ templateId:'new_arrivals', recipients:4100, cost:'$168.10', status:'delivered' } },
  { id:'l024', ts:'2026-04-11 09:44:19', client:'AutoDeals Cairo',     level:'success', event:'payment_received',    channel:'-',  msg:'Invoice INV-0081 paid — $149', payload:{ invoiceId:'INV-0081', amount:149, method:'MasterCard •••• 5678', txId:'ch_3P8def' } },
  { id:'l025', ts:'2026-04-11 09:30:02', client:'Fashion Palace UAE',  level:'info',    event:'message_received',    channel:'wa', msg:'New WhatsApp message from +971 50 777 1234', payload:{ from:'+971507771234', preview:'Can you ship to Abu Dhabi?', convId:'CONV-2201' } },
];

const LEVEL_COLOR   = { info:'#818cf8', success:'#34d399', warning:'#fbbf24', error:'#f87171' };
const LEVEL_BG      = { info:'rgba(129,140,248,0.08)', success:'rgba(52,211,153,0.08)', warning:'rgba(251,191,36,0.08)', error:'rgba(248,113,113,0.08)' };
const CH_ICON       = { wa:'📱', ig:'📸', fb:'💬', lc:'⚡', '-':'' };

export default function AdminLogs() {
  const [logs, setLogs]             = useState(SEED_LOGS);
  const [filterClient, setFC]       = useState('All Clients');
  const [filterEvent, setFE]        = useState('All Events');
  const [filterLevel, setFL]        = useState('all');
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState(null);
  const [liveMode, setLiveMode]     = useState(true);
  const bottomRef                   = useRef(null);

  /* Simulate incoming logs in live mode */
  useEffect(() => {
    if (!liveMode) return;
    const LIVE_POOL = [
      { client:'KSA Electronics', level:'info',    event:'message_received', channel:'wa', msg:'New WhatsApp message from +966 55 911 2233', payload:{ from:'+966559112233', convId:'CONV-'+Math.floor(Math.random()*9999) } },
      { client:'MyStore Egypt',   level:'info',    event:'message_sent',     channel:'ig', msg:'Agent replied to Instagram DM', payload:{ agentId:'op1', chars:98 } },
      { client:'TechHub KSA',     level:'success', event:'api_call',         channel:'wa', msg:'WhatsApp API call: POST /messages — 200 OK', payload:{ status:200, latency:'88ms' } },
      { client:'MedCare Clinic',  level:'info',    event:'webhook_received', channel:'fb', msg:'Messenger webhook: new message event', payload:{ type:'messages', pageId:'MedCare Egypt' } },
    ];
    const t = setInterval(() => {
      const entry = LIVE_POOL[Math.floor(Math.random()*LIVE_POOL.length)];
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      const id = 'l' + Date.now();
      setLogs(ls => [{ ...entry, id, ts }, ...ls].slice(0, 200));
    }, 4500);
    return () => clearInterval(t);
  }, [liveMode]);

  const visible = useMemo(() => logs.filter(l => {
    if (filterClient !== 'All Clients' && l.client !== filterClient) return false;
    if (filterEvent  !== 'All Events'  && l.event  !== filterEvent)  return false;
    if (filterLevel  !== 'all'         && l.level  !== filterLevel)  return false;
    if (search && !l.msg.toLowerCase().includes(search.toLowerCase()) &&
        !l.client.toLowerCase().includes(search.toLowerCase()) &&
        !l.event.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [logs, filterClient, filterEvent, filterLevel, search]);

  const counts = useMemo(()=>({
    total:   logs.length,
    errors:  logs.filter(l=>l.level==='error').length,
    warnings:logs.filter(l=>l.level==='warning').length,
    success: logs.filter(l=>l.level==='success').length,
  }), [logs]);

  const selectStyle = { padding:'8px 12px', borderRadius:9,
    background:'var(--s1)', border:'1px solid var(--b1)',
    color:'var(--t2)', fontSize:12.5, cursor:'pointer', outline:'none' };

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20, height:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
            Activity Logs
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            All platform events across clients · {logs.length} entries
          </p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button onClick={()=>setLiveMode(m=>!m)}
            style={{ padding:'8px 16px', borderRadius:9, cursor:'pointer', fontWeight:600, fontSize:12.5,
              background: liveMode ? 'rgba(52,211,153,0.1)' : 'var(--s1)',
              border:`1px solid ${liveMode ? 'rgba(52,211,153,0.25)' : 'var(--b1)'}`,
              color: liveMode ? '#34d399' : 'var(--t4)',
              display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:7, height:7, borderRadius:'50%',
              background: liveMode ? '#34d399' : 'var(--t4)',
              display:'inline-block' }} className={liveMode?'anim-pulse':''} />
            {liveMode ? 'Live' : 'Paused'}
          </button>
          <button onClick={()=>setLogs(SEED_LOGS)}
            style={{ padding:'8px 14px', borderRadius:9, cursor:'pointer', fontSize:12.5,
              background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t4)' }}>
            Reset
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { label:'Total Events',  value:counts.total,    color:'#818cf8' },
          { label:'Errors',        value:counts.errors,   color:'#f87171' },
          { label:'Warnings',      value:counts.warnings, color:'#fbbf24' },
          { label:'Success',       value:counts.success,  color:'#34d399' },
        ].map(s=>(
          <div key={s.label} style={{ padding:'12px 16px', borderRadius:10,
            background:'var(--bg2)', border:'1px solid var(--b1)',
            borderLeft:`3px solid ${s.color}` }}>
            <p style={{ fontSize:22, fontWeight:800, color:s.color, marginBottom:2 }}>{s.value}</p>
            <p style={{ fontSize:11.5, color:'var(--t4)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <input placeholder="Search logs…" value={search} onChange={e=>setSearch(e.target.value)}
          style={{ padding:'8px 12px', borderRadius:9, background:'var(--s1)',
            border:'1px solid var(--b1)', color:'var(--t2)', fontSize:12.5, outline:'none', width:220 }} />
        <select value={filterClient} onChange={e=>setFC(e.target.value)} style={selectStyle}>
          {CLIENTS.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={filterEvent} onChange={e=>setFE(e.target.value)} style={selectStyle}>
          {EVENT_TYPES.map(e=><option key={e}>{e}</option>)}
        </select>
        <select value={filterLevel} onChange={e=>setFL(e.target.value)} style={selectStyle}>
          {[['all','All Levels'],['info','Info'],['success','Success'],['warning','Warning'],['error','Error']].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <span style={{ fontSize:12, color:'var(--t4)', marginLeft:'auto' }}>
          {visible.length} result{visible.length!==1?'s':''}
        </span>
      </div>

      {/* Log stream */}
      <div style={{ flex:1, borderRadius:14, border:'1px solid var(--b1)',
        background:'var(--bg2)', overflow:'hidden', display:'flex', flexDirection:'column' }}>

        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'160px 130px 80px 160px 1fr 30px',
          padding:'9px 16px', borderBottom:'1px solid var(--b1)', gap:8,
          fontSize:11, fontWeight:700, color:'var(--t4)',
          textTransform:'uppercase', letterSpacing:'0.07em' }}>
          <span>Timestamp</span>
          <span>Client</span>
          <span>Level</span>
          <span>Event</span>
          <span>Message</span>
          <span></span>
        </div>

        <div style={{ flex:1, overflowY:'auto' }}>
          {visible.length === 0 && (
            <div style={{ padding:'40px', textAlign:'center', color:'var(--t4)', fontSize:13 }}>
              No logs match your filters
            </div>
          )}
          {visible.map(log => (
            <div key={log.id}>
              <div onClick={()=>setExpanded(expanded===log.id ? null : log.id)}
                style={{ display:'grid', gridTemplateColumns:'160px 130px 80px 160px 1fr 30px',
                  padding:'10px 16px', gap:8, alignItems:'center', cursor:'pointer',
                  borderBottom:'1px solid var(--b1)',
                  background: expanded===log.id ? LEVEL_BG[log.level] : 'transparent',
                  transition:'background 0.1s' }}
                onMouseEnter={e=>{ if(expanded!==log.id) e.currentTarget.style.background='var(--s1)'; }}
                onMouseLeave={e=>{ if(expanded!==log.id) e.currentTarget.style.background='transparent'; }}>

                <span style={{ fontSize:11.5, fontFamily:'monospace', color:'var(--t4)' }}>{log.ts}</span>

                <span style={{ fontSize:12.5, color:'var(--t2)', fontWeight:500,
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {log.client}
                </span>

                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                  background:LEVEL_BG[log.level], color:LEVEL_COLOR[log.level],
                  border:`1px solid ${LEVEL_COLOR[log.level]}30`, display:'inline-block',
                  textTransform:'uppercase' }}>
                  {log.level}
                </span>

                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  {CH_ICON[log.channel] && <span style={{ fontSize:13 }}>{CH_ICON[log.channel]}</span>}
                  <span style={{ fontSize:12, fontFamily:'monospace', color:'#a5b4fc',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {log.event}
                  </span>
                </div>

                <span style={{ fontSize:12.5, color:'var(--t3)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {log.msg}
                </span>

                <span style={{ fontSize:12, color:'var(--t4)', textAlign:'center' }}>
                  {expanded===log.id ? '▲' : '▼'}
                </span>
              </div>

              {/* Expanded payload */}
              {expanded===log.id && (
                <div style={{ padding:'12px 16px 14px', borderBottom:'1px solid var(--b1)',
                  background:`${LEVEL_BG[log.level]}` }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--t4)',
                    textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
                    Payload
                  </p>
                  <div style={{ background:'rgba(0,0,0,0.4)', borderRadius:9,
                    padding:'12px 16px', fontFamily:'monospace', fontSize:12.5,
                    color:'#67e8f9', lineHeight:1.8,
                    border:`1px solid ${LEVEL_COLOR[log.level]}20` }}>
                    {Object.entries(log.payload).map(([k,v])=>(
                      <div key={k}>
                        <span style={{ color:'#a5b4fc' }}>{k}</span>
                        <span style={{ color:'var(--t4)' }}>: </span>
                        <span style={{ color: typeof v === 'number' ? '#fbbf24' :
                          typeof v === 'boolean' ? '#34d399' : '#e2e8f0' }}>
                          {JSON.stringify(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

    </div>
  );
}
