'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

const STAGES = [
  { id:'new_lead',    label:'New Leads',   color:'#6366f1', bg:'rgba(99,102,241,0.1)'  },
  { id:'engaged',     label:'Engaged',     color:'#8b5cf6', bg:'rgba(139,92,246,0.1)'  },
  { id:'negotiation', label:'Negotiation', color:'#06b6d4', bg:'rgba(6,182,212,0.1)'   },
  { id:'closing',     label:'Closing',     color:'#10b981', bg:'rgba(16,185,129,0.1)'  },
  { id:'won',         label:'Won ✓',       color:'#22c55e', bg:'rgba(34,197,94,0.07)'  },
];

const INIT = {
  new_lead:    [
    { id:'d1', name:'Layla Samir',  ch:'⚡', val:null, score:22, intent:'inquiry',   ago:'22m' },
    { id:'d2', name:'Nour Adel',    ch:'📸', val:null, score:18, intent:'inquiry',   ago:'1h'  },
  ],
  engaged: [
    { id:'d3', name:'Sara Khalil',  ch:'📸', val:299,  score:62, intent:'interested', ago:'8m'  },
    { id:'d4', name:'Karim T.',     ch:'📱', val:450,  score:55, intent:'interested', ago:'30m' },
  ],
  negotiation: [
    { id:'d5', name:'Omar Hassan',  ch:'💬', val:380,  score:38, intent:'price_objection', ago:'15m' },
    { id:'d6', name:'Hana M.',      ch:'📱', val:650,  score:71, intent:'interested',      ago:'1h'  },
  ],
  closing: [
    { id:'d7', name:'Ahmed M.',     ch:'📱', val:599,  score:91, intent:'ready_to_buy', ago:'2m'  },
    { id:'d8', name:'Youssef A.',   ch:'📱', val:1200, score:88, intent:'ready_to_buy', ago:'35m' },
  ],
  won: [
    { id:'d9', name:'Mariam K.',    ch:'📸', val:320,  score:95, intent:'ready_to_buy', ago:'2h' },
    { id:'d10',name:'Tarek S.',     ch:'📱', val:780,  score:97, intent:'ready_to_buy', ago:'3h' },
  ],
};

const IC = { ready_to_buy:'#10b981', interested:'#6366f1', price_objection:'#f59e0b',
             inquiry:'#94a3b8', complaint:'#ef4444' };

const CHANNELS = ['📱 WhatsApp','📸 Instagram','💬 Messenger','⚡ Live Chat'];
const INTENTS  = ['inquiry','interested','price_objection','ready_to_buy','complaint'];

function DealCard({ d, onMove }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="deal-card" style={{ position:'relative' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0,
            background:'rgba(99,102,241,0.18)', display:'flex', alignItems:'center',
            justifyContent:'center', fontWeight:700, fontSize:12 }}>
            {d.name[0]}
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', lineHeight:1.2 }}>{d.name}</p>
            <p style={{ fontSize:11, color:'var(--t4)', marginTop:1 }}>{d.ch} · {d.ago}</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {d.val != null && (
            <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>${d.val}</span>
          )}
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={{ width:22, height:22, borderRadius:6, border:'1px solid var(--b1)',
              background:'var(--s1)', cursor:'pointer', fontSize:14, display:'flex',
              alignItems:'center', justifyContent:'center', color:'var(--t4)' }}>
            ⋮
          </button>
        </div>
      </div>

      {/* Move menu */}
      {menuOpen && (
        <div style={{ position:'absolute', top:36, right:0, zIndex:100,
          background:'var(--bg4)', border:'1px solid var(--b2)', borderRadius:10,
          padding:6, minWidth:160, boxShadow:'0 8px 24px rgba(0,0,0,0.4)' }}>
          <p style={{ fontSize:11, color:'var(--t4)', padding:'4px 10px', fontWeight:600,
            textTransform:'uppercase', letterSpacing:'0.05em' }}>Move to</p>
          {STAGES.filter(s => s.id !== d.stageId).map(s => (
            <button key={s.id}
              onClick={() => { onMove(d, s.id); setMenuOpen(false); }}
              style={{ width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:6,
                fontSize:12.5, color:'var(--t2)', background:'none', border:'none',
                cursor:'pointer', fontWeight:600 }}
              onMouseEnter={e => e.currentTarget.style.background='var(--s2)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Score bar */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ flex:1, height:4, borderRadius:99, background:'var(--s3)' }}>
          <div style={{ height:4, borderRadius:99,
            background: d.score>70?'#10b981': d.score>40?'#f59e0b':'#ef4444',
            width:`${d.score}%` }} />
        </div>
        <span style={{ fontSize:11, fontWeight:700, flexShrink:0,
          color: d.score>70?'#34d399': d.score>40?'#fcd34d':'#fca5a5' }}>{d.score}</span>
      </div>

      {/* Intent tag */}
      <div style={{ marginTop:9 }}>
        <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 8px', borderRadius:99,
          background:`${IC[d.intent]||'#64748b'}12`, color:IC[d.intent]||'#64748b',
          border:`1px solid ${IC[d.intent]||'#64748b'}20` }}>
          {d.intent.replace(/_/g,' ')}
        </span>
      </div>
    </div>
  );
}

export default function DealsPage() {
  const [deals, setDeals] = useState(INIT);
  const [newDeal, setNewDeal] = useState(false);
  const [form, setForm] = useState({ name:'', channel:'📱 WhatsApp', val:'', stage:'new_lead', intent:'inquiry', score:50 });

  function moveCard(deal, toStage) {
    setDeals(prev => {
      const next = {};
      for (const [sid, cards] of Object.entries(prev)) {
        next[sid] = cards.filter(c => c.id !== deal.id);
      }
      next[toStage] = [{ ...deal, stageId: toStage }, ...(next[toStage] || [])];
      return next;
    });
    const stageName = STAGES.find(s => s.id === toStage)?.label || toStage;
    toast.success(`Moved to ${stageName}`);
  }

  function createDeal() {
    if (!form.name.trim()) { toast.error('Customer name is required'); return; }
    const id = 'd' + Date.now();
    const deal = {
      id, name: form.name.trim(),
      ch: form.channel.split(' ')[0],
      val: form.val ? Number(form.val) : null,
      score: Number(form.score),
      intent: form.intent,
      ago: 'just now',
      stageId: form.stage,
    };
    setDeals(prev => ({ ...prev, [form.stage]: [deal, ...(prev[form.stage] || [])] }));
    setNewDeal(false);
    setForm({ name:'', channel:'📱 WhatsApp', val:'', stage:'new_lead', intent:'inquiry', score:50 });
    toast.success(`Deal created for ${deal.name} 🎉`);
  }

  const allDeals = Object.values(deals).flat();
  const totalVal = allDeals.reduce((s,d) => s+(d.val||0), 0);
  const wonVal   = deals.won.reduce((s,d) => s+(d.val||0), 0);

  // Attach stageId for move menu logic
  const dealsWithStage = Object.fromEntries(
    Object.entries(deals).map(([sid, cards]) => [sid, cards.map(c => ({ ...c, stageId: sid }))])
  );

  return (
    <>
      <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20, height:'100%' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Deal Pipeline</h1>
            <p style={{ fontSize:13, color:'var(--t3)' }}>
              {allDeals.length} active deals ·{' '}
              <span style={{ color:'var(--t2)' }}>${totalVal.toLocaleString()} pipeline value</span>
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ padding:'7px 16px', background:'rgba(34,197,94,0.08)',
              border:'1px solid rgba(34,197,94,0.18)', borderRadius:'var(--r)',
              fontSize:13, color:'#4ade80', fontWeight:600 }}>
              Won: ${wonVal.toLocaleString()}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setNewDeal(true)}>+ New Deal</button>
          </div>
        </div>

        {/* Summary pills */}
        <div style={{ display:'flex', gap:10 }}>
          {STAGES.map(s => (
            <div key={s.id} style={{ padding:'8px 16px', borderRadius:'var(--r)',
              background:s.bg, border:`1px solid ${s.color}22`,
              display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:s.color }} />
              <span style={{ fontSize:12.5, fontWeight:600, color:'var(--t2)' }}>{s.label}</span>
              <span style={{ fontSize:12.5, fontWeight:800, color:s.color }}>
                {(deals[s.id]||[]).length}
              </span>
            </div>
          ))}
        </div>

        {/* Kanban */}
        <div style={{ display:'flex', gap:14, overflowX:'auto', flex:1, paddingBottom:12 }}>
          {STAGES.map(stage => {
            const cards = dealsWithStage[stage.id] || [];
            const colVal = cards.reduce((s,d) => s+(d.val||0), 0);
            return (
              <div key={stage.id} className="kanban-col">
                <div style={{ marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:stage.color, flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>{stage.label}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:800, padding:'2px 9px', borderRadius:99,
                      background:stage.bg, color:stage.color }}>
                      {cards.length}
                    </span>
                  </div>
                  {colVal > 0 && (
                    <p style={{ fontSize:12, color:'var(--t4)', paddingLeft:15 }}>${colVal.toLocaleString()}</p>
                  )}
                </div>

                <div style={{ height:1, background:'var(--b1)', marginBottom:10 }} />

                <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1, overflowY:'auto' }}>
                  {cards.map(d => (
                    <DealCard key={d.id} d={d} onMove={moveCard} />
                  ))}
                  {cards.length === 0 && (
                    <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t4)', fontSize:12 }}>
                      No deals
                    </div>
                  )}
                  <button onClick={() => { setForm(f => ({...f, stage: stage.id})); setNewDeal(true); }}
                    style={{ width:'100%', padding:'8px', borderRadius:'var(--r)',
                      border:`1px dashed ${stage.color}33`, background:'transparent',
                      color:'var(--t4)', fontSize:12, cursor:'pointer', fontWeight:600 }}
                    onMouseEnter={e => e.currentTarget.style.background = stage.bg}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    + Add Deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── New Deal Modal ───────────────────────────────────────────────── */}
      <Modal open={newDeal} onClose={() => setNewDeal(false)} title="Create New Deal" width={480}>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:6 }}>
              Customer Name *
            </label>
            <input className="input" placeholder="e.g. Ahmed Mohamed"
              value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:6 }}>
                Channel
              </label>
              <select className="input" value={form.channel}
                onChange={e => setForm(f => ({...f, channel: e.target.value}))}>
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:6 }}>
                Deal Value (EGP)
              </label>
              <input className="input" type="number" placeholder="e.g. 500"
                value={form.val} onChange={e => setForm(f => ({...f, val: e.target.value}))} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:6 }}>
                Stage
              </label>
              <select className="input" value={form.stage}
                onChange={e => setForm(f => ({...f, stage: e.target.value}))}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:6 }}>
                Intent
              </label>
              <select className="input" value={form.intent}
                onChange={e => setForm(f => ({...f, intent: e.target.value}))}>
                {INTENTS.map(i => <option key={i} value={i}>{i.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--t3)' }}>Lead Score</label>
              <span style={{ fontSize:13, fontWeight:700, color:'#818cf8' }}>{form.score}</span>
            </div>
            <input type="range" min={0} max={100} step={5}
              value={form.score}
              onChange={e => setForm(f => ({...f, score: +e.target.value}))}
              style={{ width:'100%', accentColor:'#6366f1', cursor:'pointer' }} />
          </div>

          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setNewDeal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={createDeal}>Create Deal</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
