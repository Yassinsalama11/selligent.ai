'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const REV_DATA = [
  { d:'Apr 1',  rev:2800, won:5,  lost:2 },
  { d:'Apr 3',  rev:3900, won:7,  lost:1 },
  { d:'Apr 5',  rev:5200, won:12, lost:1 },
  { d:'Apr 7',  rev:7200, won:18, lost:3 },
  { d:'Apr 9',  rev:8100, won:20, lost:2 },
  { d:'Apr 10', rev:7600, won:17, lost:1 },
];
const AI_DATA = [
  { w:'Week 1', sent:280, used:210, edited:45 },
  { w:'Week 2', sent:320, used:265, edited:38 },
  { w:'Week 3', sent:380, used:318, edited:41 },
  { w:'Week 4', sent:420, used:367, edited:35 },
];
const AGENTS = [
  { name:'Ahmed', deals:24, rev:8400, rt:3.2, rate:38 },
  { name:'Sara',  deals:18, rev:6200, rt:2.8, rate:34 },
  { name:'Omar',  deals:15, rev:5100, rt:4.1, rate:28 },
  { name:'Layla', deals:12, rev:4300, rt:3.6, rate:25 },
];
const CH_PIE = [
  { name:'WhatsApp',  v:420, c:'#25D366' },
  { name:'Instagram', v:280, c:'#E1306C' },
  { name:'Messenger', v:150, c:'#0099FF' },
  { name:'Live Chat', v:95,  c:'#6366f1' },
];
const FUNNEL = [
  { name:'Conversations', val:945, c:'#6366f1' },
  { name:'Qualified Leads',val:612, c:'#8b5cf6' },
  { name:'Active Deals',  val:248, c:'#06b6d4' },
  { name:'Closing Stage', val:87,  c:'#10b981' },
  { name:'Won',           val:42,  c:'#22c55e' },
];

const TABS = ['Revenue','Conversion','AI Performance','Agents','Channels'];

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg4)', border:'1px solid var(--b2)', borderRadius:10,
      padding:'10px 14px', fontSize:12 }}>
      <p style={{ color:'var(--t3)', marginBottom:5 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color||p.fill, fontWeight:600, marginTop:3 }}>
          {p.name}: {p.name==='rev'||p.name==='Revenue'
            ? `$${(+p.value).toLocaleString()}`
            : p.value}
        </p>
      ))}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card">
      <p style={{ fontSize:14.5, fontWeight:700, marginBottom:20, color:'var(--t1)' }}>{title}</p>
      {children}
    </div>
  );
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
      padding:'11px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize:13, color:'var(--t3)' }}>{label}</span>
      <span style={{ fontSize:14, fontWeight:700, color:color||'var(--t1)' }}>{value}</span>
    </div>
  );
}

function exportCSV(tab, range) {
  const datasets = {
    Revenue: {
      headers: ['Date','Revenue','Won','Lost'],
      rows: REV_DATA.map(r => [r.d, r.rev, r.won, r.lost]),
    },
    'AI Performance': {
      headers: ['Week','Sent','Used','Edited'],
      rows: AI_DATA.map(r => [r.w, r.sent, r.used, r.edited]),
    },
    Agents: {
      headers: ['Agent','Deals Closed','Revenue','Avg Response (min)','Conv. Rate (%)'],
      rows: AGENTS.map(a => [a.name, a.deals, a.rev, a.rt, a.rate]),
    },
    Channels: {
      headers: ['Channel','Conversations','Conversion Rate (%)'],
      rows: CH_PIE.map(c => [c.name, c.v, '']),
    },
    Conversion: {
      headers: ['Stage','Count','Percentage'],
      rows: FUNNEL.map(f => [f.name, f.val, Math.round((f.val/FUNNEL[0].val)*100)+'%']),
    },
  };
  const d = datasets[tab] || datasets.Revenue;
  const csv = [d.headers, ...d.rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `airos-${tab.toLowerCase().replace(/\s+/g,'-')}-${range}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(`${tab} report exported!`);
}

export default function ReportsPage() {
  const [tab, setTab]     = useState('Revenue');
  const [range, setRange] = useState('7d');

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Reports & Analytics</h1>
          <p style={{ fontSize:13, color:'var(--t3)' }}>Deep-dive business intelligence</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {['7d','30d','90d'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={range===r ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}>
              {r}
            </button>
          ))}
          <button className="btn btn-primary btn-sm" style={{ marginLeft:4 }}
            onClick={() => exportCSV(tab, range)}>↓ Export CSV</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {/* ── Revenue ─────────────────────────────────────────────────────── */}
      {tab==='Revenue' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { l:'Total Revenue', v:'$53,700', c:'#10b981', delta:'+24%' },
              { l:'Avg Deal Value',v:'$428',    c:'#6366f1', delta:'+8%'  },
              { l:'Won Deals',     v:'125',     c:'#8b5cf6', delta:'+31%' },
              { l:'Lost Deals',    v:'21',      c:'#ef4444', delta:'-12%' },
            ].map(k => (
              <div key={k.l} className="kpi">
                <div style={{ fontSize:26, fontWeight:900, fontFamily:'Space Grotesk',
                  color:k.c, marginBottom:5, letterSpacing:'-0.03em' }}>{k.v}</div>
                <div style={{ fontSize:13, color:'var(--t2)', marginBottom:4 }}>{k.l}</div>
                <div style={{ fontSize:11.5, fontWeight:600,
                  color: parseFloat(k.delta)>0?'#34d399':'#fca5a5' }}>{k.delta} vs last period</div>
              </div>
            ))}
          </div>
          <Card title="Revenue Trend">
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={REV_DATA} margin={{left:0,right:0,top:4,bottom:0}}>
                <defs>
                  <linearGradient id="gr2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="d" tick={{fill:'#3a4558',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip />}/>
                <Area type="monotone" dataKey="rev" stroke="#6366f1" strokeWidth={2}
                  fill="url(#gr2)" name="Revenue"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Won vs Lost Deals">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={REV_DATA} barGap={3}>
                <XAxis dataKey="d" tick={{fill:'#3a4558',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip />}/>
                <Bar dataKey="won"  fill="#10b981" radius={[4,4,0,0]} name="won"/>
                <Bar dataKey="lost" fill="#ef4444" radius={[4,4,0,0]} name="lost"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── Conversion ──────────────────────────────────────────────────── */}
      {tab==='Conversion' && (
        <Card title="Conversion Funnel — All Channels">
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {FUNNEL.map(step => {
              const pct = Math.round((step.val/FUNNEL[0].val)*100);
              return (
                <div key={step.name}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:14, color:'var(--t2)' }}>{step.name}</span>
                    <div style={{ display:'flex', gap:16 }}>
                      <span style={{ fontSize:13, color:'var(--t4)' }}>{pct}%</span>
                      <span style={{ fontSize:14, fontWeight:700, color:step.c, minWidth:50, textAlign:'right' }}>
                        {step.val.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ height:8, borderRadius:99, background:'var(--s2)' }}>
                    <div style={{ height:8, borderRadius:99, background:step.c,
                      width:`${pct}%`, transition:'width 0.7s ease' }}/>
                  </div>
                </div>
              );
            })}
            <div style={{ paddingTop:20, borderTop:'1px solid var(--b1)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--t3)' }}>Overall conversion rate</span>
              <span className="gt" style={{ fontSize:32, fontWeight:900, fontFamily:'Space Grotesk' }}>4.4%</span>
            </div>
          </div>
        </Card>
      )}

      {/* ── AI Performance ──────────────────────────────────────────────── */}
      {tab==='AI Performance' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { l:'Suggestions Sent', v:'1,400', c:'#6366f1' },
              { l:'Used by Agent',    v:'1,160', c:'#10b981' },
              { l:'Edited by Agent',  v:'159',   c:'#f59e0b' },
              { l:'AI Usage Rate',    v:'82.8%', c:'#06b6d4' },
            ].map(k => (
              <div key={k.l} className="kpi" style={{ textAlign:'center' }}>
                <div style={{ fontSize:28, fontWeight:900, fontFamily:'Space Grotesk',
                  color:k.c, marginBottom:5 }}>{k.v}</div>
                <div style={{ fontSize:12.5, color:'var(--t3)' }}>{k.l}</div>
              </div>
            ))}
          </div>
          <Card title="AI Suggestion Performance by Week">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={AI_DATA} barGap={3}>
                <XAxis dataKey="w" tick={{fill:'#3a4558',fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip />}/>
                <Bar dataKey="sent"   fill="rgba(99,102,241,0.35)" radius={[3,3,0,0]} name="Sent"/>
                <Bar dataKey="used"   fill="#6366f1"               radius={[3,3,0,0]} name="Used"/>
                <Bar dataKey="edited" fill="#f59e0b"               radius={[3,3,0,0]} name="Edited"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── Agents ──────────────────────────────────────────────────────── */}
      {tab==='Agents' && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {['Agent','Deals Closed','Revenue','Avg Response','Conv. Rate'].map(h=>(
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AGENTS.map(a => (
                <tr key={a.name}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0,
                        background:'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.18))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:700, fontSize:14 }}>
                        {a.name[0]}
                      </div>
                      <span style={{ fontWeight:600, fontSize:14 }}>{a.name}</span>
                    </div>
                  </td>
                  <td style={{ color:'#a5b4fc', fontWeight:700, fontSize:14 }}>{a.deals}</td>
                  <td style={{ color:'#34d399', fontWeight:700, fontSize:14 }}>${a.rev.toLocaleString()}</td>
                  <td style={{ color:'var(--t2)' }}>{a.rt} min</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:64, height:5, borderRadius:99, background:'var(--s3)' }}>
                        <div style={{ height:5, borderRadius:99, background:'#6366f1',
                          width:`${a.rate}%` }}/>
                      </div>
                      <span style={{ fontSize:13, fontWeight:700, color:'#a5b4fc' }}>{a.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Channels ────────────────────────────────────────────────────── */}
      {tab==='Channels' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <Card title="Message Volume by Channel">
            <div style={{ display:'flex', justifyContent:'center' }}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={CH_PIE} dataKey="v" cx="50%" cy="50%"
                    innerRadius={62} outerRadius={95} paddingAngle={3}>
                    {CH_PIE.map((e,i) => <Cell key={i} fill={e.c}/>)}
                  </Pie>
                  <Tooltip formatter={(v,n) => [v, n]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
              {CH_PIE.map(c => (
                <span key={c.name} style={{ display:'flex', alignItems:'center', gap:6,
                  fontSize:12, color:'var(--t3)' }}>
                  <span style={{ width:10, height:10, borderRadius:'50%', background:c.c }}/>
                  {c.name} <strong style={{ color:'var(--t1)' }}>{c.v}</strong>
                </span>
              ))}
            </div>
          </Card>
          <Card title="Conversion Rate by Channel">
            <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:4 }}>
              {[
                { name:'WhatsApp',  rate:42, c:'#25D366', icon:'📱' },
                { name:'Instagram', rate:28, c:'#E1306C', icon:'📸' },
                { name:'Messenger', rate:22, c:'#0099FF', icon:'💬' },
                { name:'Live Chat', rate:35, c:'#6366f1', icon:'⚡' },
              ].map(ch => (
                <div key={ch.name}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontSize:13, color:'var(--t2)', display:'flex', gap:7 }}>
                      {ch.icon} {ch.name}
                    </span>
                    <span style={{ fontSize:13, fontWeight:700, color:ch.c }}>{ch.rate}%</span>
                  </div>
                  <div style={{ height:6, borderRadius:99, background:'var(--s2)' }}>
                    <div style={{ height:6, borderRadius:99, background:ch.c, width:`${ch.rate}%` }}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
