'use client';
import { useState } from 'react';
import Link from 'next/link';

const CLIENTS = [
  { id:'c1',  name:'MyStore Egypt',     plan:'Pro',        mrr:149,  status:'active',    channels:['wa','ig','lc'],     msgs:4820, credits:42.50, country:'EG', created:'2024-10-12' },
  { id:'c2',  name:'TechHub KSA',       plan:'Enterprise', mrr:299,  status:'active',    channels:['wa','ig','fb','lc'],msgs:9210, credits:128.00,country:'SA', created:'2024-08-05' },
  { id:'c3',  name:'Fashion Palace UAE',plan:'Starter',    mrr:49,   status:'active',    channels:['wa'],               msgs:890,  credits:11.20, country:'AE', created:'2025-01-20' },
  { id:'c4',  name:'AutoDeals Cairo',   plan:'Pro',        mrr:149,  status:'active',    channels:['wa','fb'],          msgs:3140, credits:58.75, country:'EG', created:'2024-11-03' },
  { id:'c5',  name:'Beauty Corner',     plan:'Starter',    mrr:49,   status:'active',    channels:['ig','lc'],          msgs:620,  credits:8.00,  country:'EG', created:'2025-02-14' },
  { id:'c6',  name:'Luxury Boutique',   plan:'Pro',        mrr:149,  status:'active',    channels:['wa','ig','fb','lc'],msgs:2980, credits:33.40, country:'AE', created:'2024-12-01' },
  { id:'c7',  name:'Food Express',      plan:'Pro',        mrr:149,  status:'suspended', channels:['wa','lc'],          msgs:0,    credits:5.20,  country:'EG', created:'2024-09-18' },
  { id:'c8',  name:'Gadget World',      plan:'Starter',    mrr:0,    status:'trial',     channels:['wa'],               msgs:210,  credits:10.00, country:'SA', created:'2025-04-01' },
  { id:'c9',  name:'MedCare Clinic',    plan:'Enterprise', mrr:299,  status:'active',    channels:['wa','fb'],          msgs:5600, credits:95.00, country:'EG', created:'2024-07-22' },
  { id:'c10', name:'KSA Electronics',   plan:'Enterprise', mrr:299,  status:'active',    channels:['wa','ig','fb','lc'],msgs:11200,credits:210.00,country:'SA', created:'2024-06-15' },
];

const RECENT_ACTIVITY = [
  { time:'2m ago',  client:'TechHub KSA',        event:'Broadcast sent',        detail:'2,400 recipients · WhatsApp', level:'info'    },
  { time:'8m ago',  client:'MyStore Egypt',       event:'Template approved',     detail:'order_confirmed · Meta',       level:'success' },
  { time:'15m ago', client:'Food Express',        event:'Payment failed',        detail:'Invoice #INV-0091 · $149',     level:'error'   },
  { time:'23m ago', client:'KSA Electronics',     event:'New operator added',    detail:'Sara Al-Ghamdi · Agent role',  level:'info'    },
  { time:'41m ago', client:'Gadget World',        event:'Trial started',         detail:'Starter plan · 14 days',       level:'info'    },
  { time:'1h ago',  client:'MedCare Clinic',      event:'Channel connected',     detail:'WhatsApp · +20 100 900 0000',  level:'success' },
  { time:'2h ago',  client:'AutoDeals Cairo',     event:'Webhook error',         detail:'POST /webhooks/whatsapp 500',   level:'error'   },
  { time:'3h ago',  client:'Luxury Boutique',     event:'Plan upgraded',         detail:'Starter → Pro · $149/mo',      level:'success' },
];

const CH_ICONS = { wa:'📱', ig:'📸', fb:'💬', lc:'⚡' };
const PLAN_COLORS = { Starter:'#06b6d4', Pro:'#818cf8', Enterprise:'#f59e0b' };
const STATUS_COLORS = { active:'#34d399', suspended:'#f87171', trial:'#fcd34d' };

// TODO: Set SHOW_CREDITS = true when BSP status is approved
const SHOW_CREDITS = false;

export default function AdminOverview() {
  const active    = CLIENTS.filter(c => c.status === 'active');
  const mrr       = CLIENTS.filter(c=>c.status==='active').reduce((a,c)=>a+c.mrr,0);
  const msgs      = CLIENTS.reduce((a,c)=>a+c.msgs,0);
  const credits   = CLIENTS.reduce((a,c)=>a+c.credits,0);
  const channels  = CLIENTS.reduce((a,c)=>a+c.channels.length,0);

  const planDist  = ['Starter','Pro','Enterprise'].map(p=>({
    plan:p, count:CLIENTS.filter(c=>c.plan===p).length,
    mrr: CLIENTS.filter(c=>c.plan===p&&c.status==='active').reduce((a,c)=>a+c.mrr,0),
  }));

  const chDist = ['wa','ig','fb','lc'].map(ch=>({
    ch, label:{'wa':'WhatsApp','ig':'Instagram','fb':'Messenger','lc':'Live Chat'}[ch],
    count: CLIENTS.filter(c=>c.channels.includes(ch)).length,
  }));

  const KPIs = [
    { label:'Total Clients',     value: CLIENTS.length,         sub:`${active.length} active`,     color:'#818cf8', icon:'🏢' },
    { label:'Monthly Revenue',   value:`$${mrr.toLocaleString()}`, sub:'MRR',                      color:'#f59e0b', icon:'💰' },
    { label:'Messages This Month',value: msgs.toLocaleString(), sub:'across all clients',           color:'#06b6d4', icon:'💬' },
    { label:'Active Connections', value: channels,              sub:'channel integrations',          color:'#34d399', icon:'🔗' },
    ...(SHOW_CREDITS ? [{ label:'Credits Balance', value:`$${credits.toFixed(0)}`, sub:'total across clients', color:'#a78bfa', icon:'⚡' }] : []),
    { label:'Trial Accounts',    value: CLIENTS.filter(c=>c.status==='trial').length, sub:'converting soon', color:'#fcd34d', icon:'⏳' },
  ];

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
            Platform Overview
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            April 2026 · All clients · Real-time
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Link href="/admin/clients" style={{ padding:'9px 18px', borderRadius:10, fontSize:13,
            fontWeight:600, background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.2)',
            color:'#f59e0b', textDecoration:'none' }}>
            View All Clients →
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14 }}>
        {KPIs.map(k => (
          <div key={k.label} style={{ padding:'20px 22px', borderRadius:14,
            background:'var(--bg2)', border:'1px solid var(--b1)',
            borderTop:`2px solid ${k.color}` }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:24 }}>{k.icon}</span>
              <span style={{ fontSize:11, fontWeight:600, color:k.color,
                background:`${k.color}15`, border:`1px solid ${k.color}25`,
                padding:'2px 8px', borderRadius:99 }}>LIVE</span>
            </div>
            <p style={{ fontSize:28, fontWeight:800, color:k.color,
              fontFamily:'Space Grotesk, sans-serif', letterSpacing:'-0.02em', marginBottom:4 }}>
              {k.value}
            </p>
            <p style={{ fontSize:12, color:'var(--t3)', marginBottom:2 }}>{k.label}</p>
            <p style={{ fontSize:11, color:'var(--t4)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>

        {/* Plan distribution */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>Plan Distribution</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {planDist.map(p => (
              <div key={p.plan}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500 }}>{p.plan}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'var(--t4)' }}>{p.count} clients</span>
                    <span style={{ fontSize:12, fontWeight:700, color:PLAN_COLORS[p.plan] }}>
                      ${p.mrr}/mo
                    </span>
                  </div>
                </div>
                <div style={{ height:6, borderRadius:99, background:'var(--s2)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99,
                    background:PLAN_COLORS[p.plan],
                    width:`${(p.count/CLIENTS.length)*100}%`,
                    transition:'width 0.4s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid var(--b1)',
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, color:'var(--t4)' }}>Total MRR</span>
            <span style={{ fontSize:16, fontWeight:800, color:'#f59e0b' }}>${mrr}</span>
          </div>
        </div>

        {/* Channel distribution */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>Channel Adoption</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {chDist.map(c => (
              <div key={c.ch}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                  <span style={{ fontSize:13, color:'var(--t2)' }}>{CH_ICONS[c.ch]} {c.label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--t2)' }}>
                    {c.count}/{CLIENTS.length}
                  </span>
                </div>
                <div style={{ height:6, borderRadius:99, background:'var(--s2)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99,
                    background:'#6366f1',
                    width:`${(c.count/CLIENTS.length)*100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>Client Status</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {['active','trial','suspended'].map(s => {
              const count = CLIENTS.filter(c=>c.status===s).length;
              return (
                <div key={s} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'12px 14px', borderRadius:10, background:'var(--s1)',
                  border:`1px solid ${STATUS_COLORS[s]}22` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%',
                      background:STATUS_COLORS[s], display:'inline-block' }} />
                    <span style={{ fontSize:13, color:'var(--t2)', textTransform:'capitalize',
                      fontWeight:500 }}>{s}</span>
                  </div>
                  <span style={{ fontSize:20, fontWeight:800, color:STATUS_COLORS[s] }}>{count}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:14, padding:'10px 14px', borderRadius:9,
            background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.14)' }}>
            <p style={{ fontSize:11.5, color:'var(--t3)' }}>
              ⚠ 1 suspended client · Unpaid invoice since Apr 3
            </p>
          </div>
        </div>
      </div>

      {/* Top clients + Recent activity */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Top clients by MRR */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Top Clients by MRR</h3>
            <Link href="/admin/clients" style={{ fontSize:12, color:'#818cf8', textDecoration:'none' }}>
              View all →
            </Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[...CLIENTS].sort((a,b)=>b.mrr-a.mrr).slice(0,6).map((c,i) => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:12,
                padding:'10px 12px', borderRadius:9, background:'var(--s1)',
                border:'1px solid var(--b1)' }}>
                <span style={{ fontSize:12, fontWeight:800, color:'var(--t4)',
                  width:18, textAlign:'center' }}>#{i+1}</span>
                <div style={{ width:32, height:32, borderRadius:9,
                  background:`linear-gradient(135deg,${PLAN_COLORS[c.plan]}40,${PLAN_COLORS[c.plan]}15)`,
                  border:`1px solid ${PLAN_COLORS[c.plan]}30`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:800, color:PLAN_COLORS[c.plan], flexShrink:0 }}>
                  {c.name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {c.name}
                  </p>
                  <p style={{ fontSize:11, color:'var(--t4)' }}>
                    {c.channels.map(ch=>CH_ICONS[ch]).join(' ')} · {c.msgs.toLocaleString()} msgs
                  </p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontSize:14, fontWeight:800, color:'#f59e0b' }}>${c.mrr}</p>
                  <p style={{ fontSize:10, color:'var(--t4)' }}>/mo</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)' }}>Recent Activity</h3>
            <Link href="/admin/logs" style={{ fontSize:12, color:'#818cf8', textDecoration:'none' }}>
              Full logs →
            </Link>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {RECENT_ACTIVITY.map((a,i) => {
              const lc = { info:'#818cf8', success:'#34d399', error:'#f87171' };
              return (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start',
                  padding:'9px 12px', borderRadius:9, background:'var(--s1)',
                  borderLeft:`3px solid ${lc[a.level]}` }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                      <span style={{ fontSize:12, fontWeight:600, color:lc[a.level] }}>{a.event}</span>
                      <span style={{ fontSize:11, color:'var(--t4)' }}>·</span>
                      <span style={{ fontSize:11.5, fontWeight:500, color:'var(--t3)' }}>{a.client}</span>
                    </div>
                    <p style={{ fontSize:11.5, color:'var(--t4)' }}>{a.detail}</p>
                  </div>
                  <span style={{ fontSize:11, color:'var(--t4)', flexShrink:0, whiteSpace:'nowrap' }}>
                    {a.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
