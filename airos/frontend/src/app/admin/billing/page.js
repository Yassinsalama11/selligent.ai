'use client';
// TODO: Set SHOW_CREDITS = true when BSP status is approved
const SHOW_CREDITS = false;

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

const INVOICES = [
  { id:'INV-0091', client:'Food Express',       plan:'Pro',        amount:149, status:'unpaid',  date:'Apr 3 2026',  due:'Apr 10 2026', method:'' },
  { id:'INV-0086', client:'KSA Electronics',    plan:'Enterprise', amount:299, status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Visa •••• 1234' },
  { id:'INV-0085', client:'MedCare Clinic',     plan:'Enterprise', amount:299, status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Visa •••• 5678' },
  { id:'INV-0084', client:'MyStore Egypt',      plan:'Pro',        amount:149, status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Mastercard •••• 4321' },
  { id:'INV-0083', client:'TechHub KSA',        plan:'Enterprise', amount:299, status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Visa •••• 4242' },
  { id:'INV-0082', client:'Fashion Palace UAE', plan:'Starter',    amount:49,  status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Amex •••• 0001' },
  { id:'INV-0081', client:'AutoDeals Cairo',    plan:'Pro',        amount:149, status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Mastercard •••• 5678' },
  { id:'INV-0080', client:'Beauty Corner',      plan:'Starter',    amount:49,  status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Visa •••• 9999' },
  { id:'INV-0079', client:'Luxury Boutique',    plan:'Pro',        amount:149, status:'paid',    date:'Apr 1 2026',  due:'Apr 1 2026',  method:'Visa •••• 3333' },
  { id:'INV-0078', client:'Food Express',       plan:'Pro',        amount:149, status:'paid',    date:'Mar 1 2026',  due:'Mar 1 2026',  method:'Visa •••• 7777' },
  { id:'INV-0077', client:'KSA Electronics',    plan:'Enterprise', amount:299, status:'paid',    date:'Mar 1 2026',  due:'Mar 1 2026',  method:'Visa •••• 1234' },
  { id:'INV-0076', client:'MedCare Clinic',     plan:'Enterprise', amount:299, status:'paid',    date:'Mar 1 2026',  due:'Mar 1 2026',  method:'Visa •••• 5678' },
  { id:'INV-0075', client:'MyStore Egypt',      plan:'Pro',        amount:149, status:'paid',    date:'Mar 1 2026',  due:'Mar 1 2026',  method:'Mastercard •••• 4321' },
  { id:'INV-0074', client:'TechHub KSA',        plan:'Enterprise', amount:299, status:'paid',    date:'Mar 1 2026',  due:'Mar 1 2026',  method:'Visa •••• 4242' },
  { id:'INV-0073', client:'AutoDeals Cairo',    plan:'Pro',        amount:149, status:'paid',    date:'Mar 1 2026',  due:'Mar 1 2026',  method:'Mastercard •••• 5678' },
  { id:'INV-0072', client:'Luxury Boutique',    plan:'Starter',    amount:49,  status:'paid',    date:'Mar 1 2026',  due:'Mar 1 2026',  method:'Visa •••• 3333' },
];

const CREDIT_TRANSACTIONS = [
  { id:'ct001', ts:'Apr 11, 14:02', client:'TechHub KSA',        type:'deduct',  amount:-87.60, desc:'Broadcast · 2,400 recipients', balance:222.00 },
  { id:'ct002', ts:'Apr 11, 13:40', client:'MyStore Egypt',      type:'topup',   amount:+50.00, desc:'Manual top-up by Admin',        balance:57.50  },
  { id:'ct003', ts:'Apr 11, 10:14', client:'MedCare Clinic',     type:'deduct',  amount:-9.50,  desc:'Broadcast · 380 recipients',    balance:155.00 },
  { id:'ct004', ts:'Apr 10, 16:20', client:'KSA Electronics',    type:'deduct',  amount:-168.10,desc:'Broadcast · 4,100 recipients',  balance:290.00 },
  { id:'ct005', ts:'Apr 10, 09:00', client:'KSA Electronics',    type:'topup',   amount:+250.00,desc:'Client top-up · Package L',     balance:458.10 },
  { id:'ct006', ts:'Apr 09, 14:30', client:'Luxury Boutique',    type:'topup',   amount:+100.00,desc:'Client top-up · Package M',     balance:100.00 },
  { id:'ct007', ts:'Apr 08, 11:15', client:'AutoDeals Cairo',    type:'deduct',  amount:-21.80, desc:'Broadcast · 620 recipients',    balance:58.75  },
  { id:'ct008', ts:'Apr 07, 09:00', client:'Fashion Palace UAE', type:'topup',   amount:+20.00, desc:'Client top-up · Package S',     balance:20.00  },
];

const MONTHLY_REV = [
  { month:'Nov 25', rev:1244 },
  { month:'Dec 25', rev:1392 },
  { month:'Jan 26', rev:1541 },
  { month:'Feb 26', rev:1690 },
  { month:'Mar 26', rev:1990 },
  { month:'Apr 26', rev:2145 },
];

const PLAN_COLORS = { Starter:'#06b6d4', Pro:'#818cf8', Enterprise:'#f59e0b' };
const STATUS_COLOR = { paid:'#34d399', unpaid:'#f87171', overdue:'#fb923c' };

export default function AdminBilling() {
  const [invoices, setInvoices] = useState(INVOICES);
  const [tab, setTab]           = useState('invoices'); // invoices | credits | subscriptions
  const [filterStatus, setFS]   = useState('all');
  const [filterClient, setFC]   = useState('All');
  const [search, setSearch]     = useState('');

  const clients = useMemo(() => ['All', ...new Set(INVOICES.map(i=>i.client))], []);

  const visible = useMemo(() => invoices.filter(i=>{
    if (filterStatus!=='all' && i.status!==filterStatus) return false;
    if (filterClient!=='All' && i.client!==filterClient) return false;
    if (search && !i.client.toLowerCase().includes(search.toLowerCase()) &&
        !i.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [invoices, filterStatus, filterClient, search]);

  const totalMRR   = 2294;
  const totalPaid  = invoices.filter(i=>i.status==='paid').reduce((a,i)=>a+i.amount,0);
  const totalUnpaid= invoices.filter(i=>i.status==='unpaid').reduce((a,i)=>a+i.amount,0);
  const maxRev     = Math.max(...MONTHLY_REV.map(m=>m.rev));

  const planDist = ['Starter','Pro','Enterprise'].map(p=>({
    p, count:[...new Set(INVOICES.filter(i=>i.plan===p).map(i=>i.client))].length,
    mrr: { Starter:49, Pro:149, Enterprise:299 }[p] *
         [...new Set(INVOICES.filter(i=>i.plan===p&&i.status==='paid').map(i=>i.client))].length,
  }));

  function markPaid(id) {
    setInvoices(ivs => ivs.map(i => i.id===id ? {...i, status:'paid', method:'Manual override'} : i));
    toast.success(`${id} marked as paid`);
  }

  const inputStyle = { padding:'8px 12px', borderRadius:9,
    background:'var(--s1)', border:'1px solid var(--b1)',
    color:'var(--t2)', fontSize:12.5, outline:'none' };

  return (
    <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:22 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
          Billing & Orders
        </h1>
        <p style={{ fontSize:13, color:'var(--t4)' }}>Subscriptions and invoices</p>
      </div>

      {/* KPI row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
        {[
          { label:'MRR',           value:`$${totalMRR.toLocaleString()}`, sub:'Monthly recurring revenue', color:'#f59e0b' },
          { label:'ARR',           value:`$${(totalMRR*12).toLocaleString()}`, sub:'Annualised',           color:'#818cf8' },
          { label:'Collected (Apr)',value:`$${totalPaid}`, sub:'Paid invoices this month',                  color:'#34d399' },
          { label:'Outstanding',   value:`$${totalUnpaid}`, sub:'Unpaid / overdue invoices',               color: totalUnpaid>0?'#f87171':'#34d399' },
        ].map(k=>(
          <div key={k.label} style={{ padding:'18px 20px', borderRadius:14,
            background:'var(--bg2)', border:'1px solid var(--b1)',
            borderTop:`2px solid ${k.color}` }}>
            <p style={{ fontSize:26, fontWeight:800, color:k.color, marginBottom:3,
              fontFamily:'Space Grotesk, sans-serif' }}>{k.value}</p>
            <p style={{ fontSize:12, color:'var(--t2)', marginBottom:2 }}>{k.label}</p>
            <p style={{ fontSize:11, color:'var(--t4)' }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart + plan dist */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>

        {/* Revenue trend */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:20 }}>
            Revenue Trend (6 months)
          </h3>
          <div style={{ display:'flex', alignItems:'flex-end', gap:10, height:120 }}>
            {MONTHLY_REV.map(m=>(
              <div key={m.month} style={{ flex:1, display:'flex', flexDirection:'column',
                alignItems:'center', gap:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'#f59e0b' }}>${m.rev}</span>
                <div style={{ width:'100%', borderRadius:'4px 4px 0 0',
                  background: m.month==='Apr 26'
                    ? 'linear-gradient(180deg,#f59e0b,#f97316)'
                    : 'rgba(245,158,11,0.3)',
                  height:`${(m.rev/maxRev)*100}px`,
                  transition:'height 0.4s ease' }} />
                <span style={{ fontSize:10.5, color:'var(--t4)' }}>{m.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan distribution */}
        <div style={{ padding:'20px', borderRadius:14, background:'var(--bg2)', border:'1px solid var(--b1)' }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:16 }}>
            Plan Breakdown
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {planDist.map(({p,count,mrr})=>(
              <div key={p}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:13, color:PLAN_COLORS[p], fontWeight:600 }}>{p}</span>
                  <div style={{ display:'flex', gap:10 }}>
                    <span style={{ fontSize:12, color:'var(--t4)' }}>{count} clients</span>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--t2)' }}>${mrr}/mo</span>
                  </div>
                </div>
                <div style={{ height:7, borderRadius:99, background:'var(--s2)', overflow:'hidden' }}>
                  <div style={{ height:'100%', borderRadius:99, background:PLAN_COLORS[p],
                    width:`${(count/10)*100}%` }} />
                </div>
              </div>
            ))}
            <div style={{ paddingTop:12, borderTop:'1px solid var(--b1)',
              display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:12, color:'var(--t4)' }}>Total MRR</span>
              <span style={{ fontSize:16, fontWeight:800, color:'#f59e0b' }}>${totalMRR}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['invoices', ...(SHOW_CREDITS ? ['credits'] : []), 'subscriptions'].map(t=>(
          <button key={t} className={`tab${tab===t?' active':''}`}
            onClick={()=>setTab(t)} style={{ textTransform:'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* ── Invoices tab ── */}
      {tab==='invoices' && (
        <>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
            <input placeholder="Search client or invoice…" value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{ ...inputStyle, width:240 }} />
            <select value={filterStatus} onChange={e=>setFS(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
              {[['all','All Status'],['paid','Paid'],['unpaid','Unpaid']].map(([v,l])=>(
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <select value={filterClient} onChange={e=>setFC(e.target.value)} style={{ ...inputStyle, cursor:'pointer' }}>
              {clients.map(c=><option key={c}>{c}</option>)}
            </select>
            {filterStatus==='unpaid' && (
              <div style={{ marginLeft:'auto', padding:'7px 14px', borderRadius:9,
                background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)',
                fontSize:12.5, color:'#f87171', fontWeight:600 }}>
                ⚠ ${totalUnpaid} outstanding
              </div>
            )}
          </div>

          <div style={{ borderRadius:14, border:'1px solid var(--b1)', overflow:'hidden', background:'var(--bg2)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'110px 1.5fr 90px 90px 110px 140px 120px',
              padding:'9px 16px', borderBottom:'1px solid var(--b1)',
              fontSize:11, fontWeight:700, color:'var(--t4)',
              textTransform:'uppercase', letterSpacing:'0.07em', gap:8 }}>
              <span>Invoice</span><span>Client</span><span>Plan</span>
              <span style={{ textAlign:'right' }}>Amount</span>
              <span>Date</span><span>Method</span><span style={{ textAlign:'center' }}>Status</span>
            </div>
            {visible.map((inv,i)=>(
              <div key={inv.id} style={{ display:'grid',
                gridTemplateColumns:'110px 1.5fr 90px 90px 110px 140px 120px',
                padding:'12px 16px', gap:8, alignItems:'center',
                borderBottom: i<visible.length-1 ? '1px solid var(--b1)' : 'none',
                background: inv.status==='unpaid' ? 'rgba(248,113,113,0.03)' : 'transparent' }}>
                <span style={{ fontSize:12.5, fontFamily:'monospace', color:'#818cf8', fontWeight:600 }}>
                  {inv.id}
                </span>
                <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500 }}>{inv.client}</span>
                <span style={{ fontSize:11.5, fontWeight:700, padding:'2px 7px', borderRadius:99,
                  background:`${PLAN_COLORS[inv.plan]}15`, color:PLAN_COLORS[inv.plan],
                  border:`1px solid ${PLAN_COLORS[inv.plan]}25`, display:'inline-block' }}>
                  {inv.plan}
                </span>
                <span style={{ fontSize:14, fontWeight:800, color:'var(--t1)', textAlign:'right' }}>
                  ${inv.amount}
                </span>
                <span style={{ fontSize:12, color:'var(--t4)' }}>{inv.date}</span>
                <span style={{ fontSize:12, color:'var(--t4)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {inv.method || '—'}
                </span>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                    background:`${STATUS_COLOR[inv.status]}15`, color:STATUS_COLOR[inv.status],
                    border:`1px solid ${STATUS_COLOR[inv.status]}25` }}>
                    {inv.status.toUpperCase()}
                  </span>
                  {inv.status==='unpaid' && (
                    <button onClick={()=>markPaid(inv.id)}
                      style={{ fontSize:10.5, padding:'3px 8px', borderRadius:7, cursor:'pointer',
                        background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)',
                        color:'#34d399', fontWeight:600 }}>
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Credits tab — hidden until BSP ── */}
      {SHOW_CREDITS && tab==='credits' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <p style={{ fontSize:13, color:'var(--t4)' }}>
            All broadcast credit top-ups and deductions across clients
          </p>
          <div style={{ borderRadius:14, border:'1px solid var(--b1)', overflow:'hidden', background:'var(--bg2)' }}>
            <div style={{ display:'grid', gridTemplateColumns:'140px 1.5fr 80px 1fr 110px',
              padding:'9px 16px', borderBottom:'1px solid var(--b1)',
              fontSize:11, fontWeight:700, color:'var(--t4)',
              textTransform:'uppercase', letterSpacing:'0.07em', gap:8 }}>
              <span>Time</span><span>Client</span><span>Type</span>
              <span>Description</span><span style={{ textAlign:'right' }}>Amount</span>
            </div>
            {CREDIT_TRANSACTIONS.map((tx,i)=>(
              <div key={tx.id} style={{ display:'grid',
                gridTemplateColumns:'140px 1.5fr 80px 1fr 110px',
                padding:'12px 16px', gap:8, alignItems:'center',
                borderBottom: i<CREDIT_TRANSACTIONS.length-1 ? '1px solid var(--b1)' : 'none' }}>
                <span style={{ fontSize:12, color:'var(--t4)', fontFamily:'monospace' }}>{tx.ts}</span>
                <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500 }}>{tx.client}</span>
                <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                  background: tx.type==='topup' ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                  color: tx.type==='topup' ? '#34d399' : '#f87171',
                  border:`1px solid ${tx.type==='topup' ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
                  display:'inline-block' }}>
                  {tx.type==='topup' ? 'TOP-UP' : 'DEDUCT'}
                </span>
                <span style={{ fontSize:12.5, color:'var(--t3)' }}>{tx.desc}</span>
                <span style={{ fontSize:14, fontWeight:800, textAlign:'right',
                  color: tx.amount > 0 ? '#34d399' : '#f87171' }}>
                  {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subscriptions tab ── */}
      {tab==='subscriptions' && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { name:'MyStore Egypt',      plan:'Pro',        mrr:149, nextBilling:'May 1 2026',  status:'active',    ops:3 },
            { name:'TechHub KSA',        plan:'Enterprise', mrr:299, nextBilling:'May 1 2026',  status:'active',    ops:4 },
            { name:'Fashion Palace UAE', plan:'Starter',    mrr:49,  nextBilling:'May 1 2026',  status:'active',    ops:1 },
            { name:'AutoDeals Cairo',    plan:'Pro',        mrr:149, nextBilling:'May 1 2026',  status:'active',    ops:2 },
            { name:'Beauty Corner',      plan:'Starter',    mrr:49,  nextBilling:'May 1 2026',  status:'active',    ops:1 },
            { name:'Luxury Boutique',    plan:'Pro',        mrr:149, nextBilling:'May 1 2026',  status:'active',    ops:2 },
            { name:'Food Express',       plan:'Pro',        mrr:149, nextBilling:'—',           status:'suspended', ops:1 },
            { name:'Gadget World',       plan:'Starter',    mrr:0,   nextBilling:'Apr 15 2026', status:'trial',     ops:1 },
            { name:'MedCare Clinic',     plan:'Enterprise', mrr:299, nextBilling:'May 1 2026',  status:'active',    ops:3 },
            { name:'KSA Electronics',    plan:'Enterprise', mrr:299, nextBilling:'May 1 2026',  status:'active',    ops:4 },
          ].map((s,i,arr)=>(
            <div key={s.name} style={{ display:'grid',
              gridTemplateColumns:'2fr 110px 90px 140px 100px 80px',
              padding:'13px 16px', gap:8, alignItems:'center', borderRadius:12,
              background:'var(--bg2)', border:'1px solid var(--b1)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:9,
                  background:`${PLAN_COLORS[s.plan]}20`,
                  border:`1px solid ${PLAN_COLORS[s.plan]}30`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:800, color:PLAN_COLORS[s.plan], flexShrink:0 }}>
                  {s.name[0]}
                </div>
                <span style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{s.name}</span>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99,
                background:`${PLAN_COLORS[s.plan]}15`, color:PLAN_COLORS[s.plan],
                border:`1px solid ${PLAN_COLORS[s.plan]}25`, display:'inline-block' }}>
                {s.plan}
              </span>
              <span style={{ fontSize:14, fontWeight:800, color:'#f59e0b' }}>
                {s.mrr>0?`$${s.mrr}/mo`:'Trial'}
              </span>
              <span style={{ fontSize:12, color:'var(--t4)' }}>{s.nextBilling}</span>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                background:`${s.status==='active'?'rgba(52,211,153,0.1)':s.status==='trial'?'rgba(251,191,36,0.1)':'rgba(248,113,113,0.1)'}`,
                color:s.status==='active'?'#34d399':s.status==='trial'?'#fbbf24':'#f87171',
                border:`1px solid ${s.status==='active'?'rgba(52,211,153,0.2)':s.status==='trial'?'rgba(251,191,36,0.2)':'rgba(248,113,113,0.2)'}`,
                display:'inline-block', textTransform:'capitalize' }}>
                {s.status}
              </span>
              <span style={{ fontSize:12.5, color:'var(--t3)', textAlign:'right' }}>
                {s.ops} operator{s.ops!==1?'s':''}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
