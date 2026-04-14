'use client';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const SERVICES = [
  { id:'api',       name:'REST API',              url:'api.chatorai.com',          status:'operational', uptime:'99.98%', latency:42,   region:'EU-West' },
  { id:'webhook',   name:'Webhook Dispatcher',    url:'hooks.chatorai.com',         status:'operational', uptime:'99.95%', latency:88,   region:'EU-West' },
  { id:'wa_cloud',  name:'WhatsApp Cloud API',    url:'graph.facebook.com',         status:'operational', uptime:'99.91%', latency:134,  region:'Meta Edge' },
  { id:'ig_graph',  name:'Instagram Graph API',   url:'graph.facebook.com/ig',      status:'operational', uptime:'99.88%', latency:156,  region:'Meta Edge' },
  { id:'fb_msg',    name:'Facebook Messenger API',url:'graph.facebook.com/me',      status:'degraded',    uptime:'98.40%', latency:340,  region:'Meta Edge' },
  { id:'db',        name:'Primary Database',      url:'db-primary.internal',        status:'operational', uptime:'99.99%', latency:8,    region:'EU-West' },
  { id:'redis',     name:'Cache / Redis',         url:'cache.internal',             status:'operational', uptime:'99.99%', latency:3,    region:'EU-West' },
  { id:'cdn',       name:'CDN / Widget JS',       url:'cdn.chatorai.com',           status:'operational', uptime:'100%',   latency:18,   region:'Global' },
  { id:'mail',      name:'Email / SMTP',          url:'mail.chatorai.com',          status:'operational', uptime:'99.82%', latency:220,  region:'EU-West' },
  { id:'storage',   name:'File Storage',          url:'storage.chatorai.com',       status:'operational', uptime:'99.97%', latency:62,   region:'EU-West' },
];

const INCIDENTS = [
  { id:'INC-009', date:'Apr 9 2026',  service:'Facebook Messenger API', severity:'medium', status:'monitoring', title:'Elevated latency on Messenger webhook delivery', duration:'4h 12m', impact:'~140 messages delayed' },
  { id:'INC-008', date:'Mar 28 2026', service:'WhatsApp Cloud API',     severity:'low',    status:'resolved',   title:'Meta rate limit spike during broadcast window',  duration:'22m',   impact:'3 broadcasts queued' },
  { id:'INC-007', date:'Mar 12 2026', service:'REST API',               severity:'low',    status:'resolved',   title:'Increased API response times (p99 > 2s)',         duration:'38m',   impact:'Slow dashboard for 8 clients' },
  { id:'INC-006', date:'Feb 20 2026', service:'Primary Database',       severity:'high',   status:'resolved',   title:'Read replica failover — brief 90s outage',         duration:'1m 30s',impact:'All clients briefly offline' },
];

const WEBHOOK_HEALTH = [
  { client:'KSA Electronics',    success:2841, failed:3,   rate:'99.9%', lastFailed:'Apr 9' },
  { client:'TechHub KSA',        success:1920, failed:0,   rate:'100%',  lastFailed:'—'     },
  { client:'MyStore Egypt',      success:1244, failed:8,   rate:'99.4%', lastFailed:'Apr 11'},
  { client:'MedCare Clinic',     success:980,  failed:1,   rate:'99.9%', lastFailed:'Apr 7' },
  { client:'AutoDeals Cairo',    success:620,  failed:12,  rate:'98.1%', lastFailed:'Apr 11'},
  { client:'Food Express',       success:0,    failed:0,   rate:'—',     lastFailed:'—'     },
];

const SEV_COLORS = { low:'#34d399', medium:'#fbbf24', high:'#f87171', critical:'#ef4444' };
const STATUS_COLORS = { operational:'#34d399', degraded:'#fbbf24', outage:'#f87171', monitoring:'#fbbf24', resolved:'#34d399' };

function LatencyBadge({ ms }) {
  const color = ms < 100 ? '#34d399' : ms < 300 ? '#fbbf24' : '#f87171';
  return (
    <span style={{ fontSize:12, fontWeight:700, color, fontFamily:'monospace' }}>{ms}ms</span>
  );
}

export default function AdminSystem() {
  const [latencies, setLatencies] = useState(
    Object.fromEntries(SERVICES.map(s=>[s.id, s.latency]))
  );
  const [refreshing, setRefreshing] = useState(false);

  /* Simulate live latency jitter */
  useEffect(() => {
    const t = setInterval(()=>{
      setLatencies(ls => {
        const next = {...ls};
        SERVICES.forEach(s=>{
          const jitter = Math.floor((Math.random()-0.5)*20);
          next[s.id] = Math.max(1, s.latency + jitter);
        });
        return next;
      });
    }, 3000);
    return ()=>clearInterval(t);
  }, []);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(()=>{ setRefreshing(false); toast.success('Status refreshed'); }, 1200);
  }

  const operational = SERVICES.filter(s=>s.status==='operational').length;
  const degraded    = SERVICES.filter(s=>s.status==='degraded').length;

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:22 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
            System Health
          </h1>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            Real-time status of all platform services and integrations
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ padding:'9px 18px', borderRadius:10, cursor:'pointer', fontWeight:600, fontSize:13,
            background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)',
            color:'#a5b4fc', display:'flex', alignItems:'center', gap:7 }}>
          <span style={{ display:'inline-block', animation: refreshing?'spin 1s linear infinite':undefined }}>🔄</span>
          {refreshing ? 'Refreshing…' : 'Refresh Status'}
        </button>
      </div>

      {/* Overall banner */}
      <div style={{ padding:'16px 20px', borderRadius:14, display:'flex', alignItems:'center', gap:14,
        background: degraded>0 ? 'rgba(251,191,36,0.06)' : 'rgba(52,211,153,0.06)',
        border:`1px solid ${degraded>0 ? 'rgba(251,191,36,0.22)' : 'rgba(52,211,153,0.22)'}` }}>
        <span style={{ fontSize:30 }}>{degraded>0 ? '⚠️' : '✅'}</span>
        <div>
          <p style={{ fontSize:15, fontWeight:700,
            color: degraded>0 ? '#fbbf24' : '#34d399', marginBottom:3 }}>
            {degraded>0
              ? `${degraded} service${degraded>1?'s':''} degraded — monitoring`
              : 'All systems operational'}
          </p>
          <p style={{ fontSize:12.5, color:'var(--t4)' }}>
            {operational}/{SERVICES.length} services healthy · Last checked just now
          </p>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          {['operational','degraded','outage'].map(s=>(
            <div key={s} style={{ display:'flex', alignItems:'center', gap:5,
              fontSize:11.5, color:'var(--t4)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%',
                background:STATUS_COLORS[s], display:'inline-block' }} />
              {s.charAt(0).toUpperCase()+s.slice(1)}: {SERVICES.filter(sv=>sv.status===s).length}
            </div>
          ))}
        </div>
      </div>

      {/* Services grid */}
      <div>
        <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:14 }}>Services</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 80px 80px 90px 80px',
            padding:'8px 16px', fontSize:11, fontWeight:700, color:'var(--t4)',
            textTransform:'uppercase', letterSpacing:'0.07em', gap:8 }}>
            <span>Service</span><span>Endpoint</span>
            <span style={{ textAlign:'center' }}>Status</span>
            <span style={{ textAlign:'right' }}>Uptime</span>
            <span style={{ textAlign:'right' }}>Latency</span>
            <span style={{ textAlign:'center' }}>Region</span>
          </div>
          {SERVICES.map(svc=>(
            <div key={svc.id} style={{ display:'grid',
              gridTemplateColumns:'2fr 1.5fr 80px 80px 90px 80px',
              padding:'13px 16px', gap:8, alignItems:'center', borderRadius:12,
              background:'var(--bg2)', border:`1px solid ${svc.status==='degraded'?'rgba(251,191,36,0.2)':'var(--b1)'}` }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ width:8, height:8, borderRadius:'50%',
                  background:STATUS_COLORS[svc.status], flexShrink:0 }}
                  className={svc.status==='operational'?'anim-pulse':''} />
                <span style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{svc.name}</span>
              </div>
              <span style={{ fontSize:12, color:'var(--t4)', fontFamily:'monospace' }}>{svc.url}</span>
              <div style={{ textAlign:'center' }}>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                  background:`${STATUS_COLORS[svc.status]}15`, color:STATUS_COLORS[svc.status],
                  border:`1px solid ${STATUS_COLORS[svc.status]}28`, textTransform:'capitalize' }}>
                  {svc.status}
                </span>
              </div>
              <span style={{ fontSize:13, color:'var(--t2)', fontWeight:600, textAlign:'right' }}>
                {svc.uptime}
              </span>
              <div style={{ textAlign:'right' }}>
                <LatencyBadge ms={latencies[svc.id]} />
              </div>
              <span style={{ fontSize:11, color:'var(--t4)', textAlign:'center' }}>{svc.region}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Webhook health per client */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>
            Webhook Health by Client
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {WEBHOOK_HEALTH.map(wh=>(
              <div key={wh.client} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'10px 12px', borderRadius:9, background:'var(--s1)',
                border:`1px solid ${wh.failed>5?'rgba(248,113,113,0.2)':'var(--b1)'}` }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:500, color:'var(--t2)', marginBottom:3 }}>
                    {wh.client}
                  </p>
                  <div style={{ display:'flex', gap:10 }}>
                    <span style={{ fontSize:11.5, color:'#34d399' }}>✓ {wh.success.toLocaleString()}</span>
                    {wh.failed > 0 && (
                      <span style={{ fontSize:11.5, color:'#f87171' }}>✕ {wh.failed}</span>
                    )}
                    {wh.lastFailed !== '—' && (
                      <span style={{ fontSize:11, color:'var(--t4)' }}>Last fail: {wh.lastFailed}</span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize:13, fontWeight:700,
                  color: wh.rate==='100%' ? '#34d399' : parseFloat(wh.rate) > 99 ? '#fbbf24' : '#f87171' }}>
                  {wh.rate}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Incident history */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>
            Incident History
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {INCIDENTS.map(inc=>(
              <div key={inc.id} style={{ padding:'12px 14px', borderRadius:10,
                background:'var(--s1)',
                border:`1px solid ${inc.status==='monitoring'?'rgba(251,191,36,0.2)':'var(--b1)'}`,
                borderLeft:`3px solid ${SEV_COLORS[inc.severity]}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ fontSize:11, fontWeight:700, fontFamily:'monospace',
                    color:'var(--t4)' }}>{inc.id}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:99,
                    background:`${SEV_COLORS[inc.severity]}15`, color:SEV_COLORS[inc.severity],
                    border:`1px solid ${SEV_COLORS[inc.severity]}25`,
                    textTransform:'uppercase' }}>{inc.severity}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:99,
                    background:`${STATUS_COLORS[inc.status]}15`, color:STATUS_COLORS[inc.status],
                    border:`1px solid ${STATUS_COLORS[inc.status]}25`,
                    textTransform:'capitalize', marginLeft:'auto' }}>{inc.status}</span>
                </div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>
                  {inc.title}
                </p>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11.5, color:'var(--t4)' }}>📅 {inc.date}</span>
                  <span style={{ fontSize:11.5, color:'var(--t4)' }}>⏱ {inc.duration}</span>
                  <span style={{ fontSize:11.5, color:'var(--t4)' }}>⚠ {inc.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource usage */}
      <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
        <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>
          Resource Usage
        </h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {[
            { label:'API Requests Today', value:'284,210', pct:62, color:'#6366f1', cap:'500k/day' },
            { label:'DB Connections',     value:'48 / 200', pct:24, color:'#06b6d4', cap:'200 max' },
            { label:'Storage Used',       value:'18.7 GB',  pct:37, color:'#8b5cf6', cap:'50 GB' },
            { label:'Active WebSockets',  value:'312',      pct:21, color:'#34d399', cap:'1,500 max' },
          ].map(r=>(
            <div key={r.label} style={{ padding:'14px 16px', borderRadius:10,
              background:'var(--s1)', border:'1px solid var(--b1)' }}>
              <p style={{ fontSize:18, fontWeight:800, color:r.color, marginBottom:3 }}>{r.value}</p>
              <p style={{ fontSize:12, color:'var(--t3)', marginBottom:8 }}>{r.label}</p>
              <div style={{ height:6, borderRadius:99, background:'var(--s2)', overflow:'hidden', marginBottom:4 }}>
                <div style={{ height:'100%', borderRadius:99, background:r.color,
                  width:`${r.pct}%` }} />
              </div>
              <p style={{ fontSize:11, color:'var(--t4)' }}>{r.pct}% · cap: {r.cap}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
