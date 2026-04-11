'use client';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import toast from 'react-hot-toast';

const REV = [
  { d:'Mon', r:3200, deals:8  },
  { d:'Tue', r:4800, deals:12 },
  { d:'Wed', r:3900, deals:9  },
  { d:'Thu', r:6200, deals:15 },
  { d:'Fri', r:5800, deals:14 },
  { d:'Sat', r:7200, deals:18 },
  { d:'Sun', r:6400, deals:16 },
];
const PIPELINE = [
  { label:'New Leads',   n:24, color:'#6366f1' },
  { label:'Engaged',     n:18, color:'#8b5cf6' },
  { label:'Negotiation', n:11, color:'#06b6d4' },
  { label:'Closing',     n:7,  color:'#10b981' },
];
const CHANNELS = [
  { name:'WhatsApp', msgs:420, color:'#25D366', icon:'📱' },
  { name:'Instagram',msgs:280, color:'#E1306C', icon:'📸' },
  { name:'Messenger',msgs:150, color:'#0099FF', icon:'💬' },
  { name:'Live Chat', msgs:95, color:'#6366f1', icon:'⚡' },
];
const LEADS = [
  { name:'Ahmed M.',   intent:'ready_to_buy',    score:91, ch:'📱', ago:'2m',  val:599,  c:'#10b981' },
  { name:'Sara K.',    intent:'interested',       score:67, ch:'📸', ago:'5m',  val:299,  c:'#6366f1' },
  { name:'Omar H.',    intent:'price_objection',  score:38, ch:'💬', ago:'12m', val:null, c:'#f59e0b' },
  { name:'Layla S.',   intent:'inquiry',          score:22, ch:'⚡', ago:'18m', val:null, c:'#64748b' },
  { name:'Youssef A.', intent:'ready_to_buy',     score:88, ch:'📱', ago:'24m', val:1200, c:'#10b981' },
];

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg4)', border:'1px solid var(--b2)', borderRadius:10,
      padding:'10px 14px', fontSize:12 }}>
      <p style={{ color:'var(--t3)', marginBottom:5 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, fontWeight:600 }}>
          {p.dataKey === 'r' ? `$${(+p.value).toLocaleString()}` : `${p.value} deals`}
        </p>
      ))}
    </div>
  );
}

function KPICard({ icon, label, value, delta, color, sub }) {
  const pos = parseFloat(delta) >= 0;
  return (
    <div className="kpi">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
        <div style={{ width:46, height:46, borderRadius:13, display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:22, background:`${color}15`, border:`1px solid ${color}25`,
          flexShrink:0 }}>
          {icon}
        </div>
        <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:99,
          background: pos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: pos ? '#34d399' : '#f87171' }}>
          {pos ? '▲' : '▼'} {delta}
        </span>
      </div>
      <div style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.03em',
        fontFamily:'Space Grotesk', color:'var(--t1)', marginBottom:4 }}>
        {value}
      </div>
      <div style={{ fontSize:13, fontWeight:600, color:'var(--t2)', marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:12, color:'var(--t4)' }}>{sub}</div>
    </div>
  );
}

function SectionHeader({ title, action, href }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
      <span style={{ fontSize:15, fontWeight:700, color:'var(--t1)' }}>{title}</span>
      {action && (
        <a href={href} style={{ fontSize:13, color:'#818cf8', fontWeight:500 }}>{action}</a>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div style={{ padding:'28px 28px 40px', display:'flex', flexDirection:'column', gap:20 }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Revenue Control Center</h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>
            Real-time business intelligence · April 2025
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <select className="input" style={{ width:'auto', fontSize:13, padding:'8px 14px' }}>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>This month</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => {
            const csv = ['Date,Revenue,Deals', ...REV.map(r => `${r.d},${r.r},${r.deals}`)].join('\n');
            const a = Object.assign(document.createElement('a'), {
              href: URL.createObjectURL(new Blob([csv], { type:'text/csv' })),
              download: 'airos-overview.csv',
            });
            a.click();
            toast.success('Overview exported!');
          }}>↓ Export</button>
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
        <KPICard icon="💰" label="Total Revenue"  value="$28,400" delta="24%" color="#10b981" sub="This week" />
        <KPICard icon="💬" label="Conversations"  value="945"     delta="12%" color="#6366f1" sub="Active leads" />
        <KPICard icon="🎯" label="Deals Won"       value="72"      delta="8%"  color="#8b5cf6" sub="This week" />
        <KPICard icon="🤖" label="AI Usage Rate"  value="87%"     delta="5%"  color="#06b6d4" sub="Suggestions used" />
      </div>

      {/* ── Charts row ──────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>

        {/* Revenue area chart */}
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
            <span style={{ fontSize:15, fontWeight:700 }}>Revenue & Deals</span>
            <div style={{ display:'flex', gap:16, fontSize:12, color:'var(--t3)' }}>
              {[['#6366f1','Revenue'],['#06b6d4','Deals']].map(([c,l]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <span style={{ width:10, height:3, borderRadius:99, background:c, display:'inline-block' }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <AreaChart data={REV} margin={{ left:0, right:0, top:4, bottom:0 }}>
              <defs>
                <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.32}/>
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.22}/>
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="d" tick={{ fill:'#3a4558', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="r"     stroke="#6366f1" strokeWidth={2} fill="url(#gr)" />
              <Area type="monotone" dataKey="deals" stroke="#06b6d4" strokeWidth={2} fill="url(#gd)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline mini */}
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <SectionHeader title="Deal Pipeline" />
          <div style={{ display:'flex', flexDirection:'column', gap:16, flex:1 }}>
            {PIPELINE.map(s => (
              <div key={s.label}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                  <span style={{ fontSize:13, color:'var(--t2)' }}>{s.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:s.color }}>{s.n}</span>
                </div>
                <div style={{ height:5, borderRadius:99, background:'var(--s2)' }}>
                  <div style={{ height:5, borderRadius:99, background:s.color,
                    width:`${(s.n/24)*100}%`, transition:'width 0.7s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:20, paddingTop:18, borderTop:'1px solid var(--b1)' }}>
            <p style={{ fontSize:11.5, color:'var(--t4)', marginBottom:5 }}>Overall Conversion</p>
            <p className="gt" style={{ fontSize:30, fontWeight:900, fontFamily:'Space Grotesk' }}>29.2%</p>
          </div>
        </div>
      </div>

      {/* ── Bottom row ──────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16 }}>

        {/* Hot leads */}
        <div className="card">
          <SectionHeader title="🔥 Hot Leads — Live" action="View all →" href="/dashboard/conversations" />
          <div style={{ display:'flex', flexDirection:'column' }}>
            {LEADS.map((l,i) => (
              <div key={i}
                style={{ display:'flex', alignItems:'center', gap:14, padding:'11px 12px',
                  borderRadius:10, cursor:'pointer', transition:'background 0.12s',
                  borderBottom: i < LEADS.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.background='var(--s1)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                {/* Avatar */}
                <div style={{ width:38, height:38, borderRadius:'50%', flexShrink:0,
                  background:'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.18))',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:700, fontSize:14, border:'1px solid rgba(99,102,241,0.18)' }}>
                  {l.name[0]}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
                    <span style={{ fontWeight:600, fontSize:14, color:'var(--t1)' }}>{l.name}</span>
                    <span style={{ fontSize:14 }}>{l.ch}</span>
                    <span className="badge" style={{ background:`${l.c}12`, color:l.c,
                      border:`1px solid ${l.c}22`, fontSize:10.5 }}>
                      {l.intent.replace(/_/g,' ')}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--t4)' }}>{l.ago} ago</p>
                </div>

                {/* Score */}
                <div style={{ textAlign:'right', flexShrink:0, minWidth:36 }}>
                  <p style={{ fontSize:17, fontWeight:800, color:l.c, lineHeight:1 }}>{l.score}</p>
                  <p style={{ fontSize:10.5, color:'var(--t4)', marginTop:2 }}>score</p>
                </div>

                {/* Value */}
                {l.val != null && (
                  <div style={{ textAlign:'right', flexShrink:0, minWidth:50 }}>
                    <p style={{ fontSize:13.5, fontWeight:700, color:'var(--t1)', lineHeight:1 }}>${l.val}</p>
                    <p style={{ fontSize:10.5, color:'var(--t4)', marginTop:2 }}>est.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Channel breakdown */}
        <div className="card">
          <SectionHeader title="Channel Breakdown" />
          <div style={{ display:'flex', flexDirection:'column', gap:15, marginBottom:20 }}>
            {CHANNELS.map(ch => {
              const pct = Math.round((ch.msgs/945)*100);
              return (
                <div key={ch.name}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7 }}>
                    <span style={{ fontSize:13, color:'var(--t2)', display:'flex', alignItems:'center', gap:7 }}>
                      {ch.icon} {ch.name}
                    </span>
                    <span style={{ fontSize:13, fontWeight:700, color:ch.color }}>{pct}%</span>
                  </div>
                  <div style={{ height:5, borderRadius:99, background:'var(--s2)' }}>
                    <div style={{ height:5, borderRadius:99, background:ch.color, width:`${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={CHANNELS} barSize={24} margin={{ left:0, right:0 }}>
              <XAxis dataKey="name" tick={{ fill:'#3a4558', fontSize:10 }} axisLine={false} tickLine={false} />
              <Bar dataKey="msgs" radius={[4,4,0,0]}>
                {CHANNELS.map((ch,i) => <Cell key={i} fill={ch.color} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
