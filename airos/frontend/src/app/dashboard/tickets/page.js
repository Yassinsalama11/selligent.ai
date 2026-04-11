'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

const PRIORITIES = ['low','medium','high','urgent'];
const STATUSES   = ['open','in_progress','waiting','resolved','closed'];
const CATEGORIES = ['Shipping Delay','Wrong Item','Refund Request','Product Defect','Payment Issue','Other'];

const INIT_TICKETS = [
  { id:'T-001', subject:'Order not delivered after 5 days',   customer:'Ahmed Mohamed',  ch:'📱', priority:'urgent',  status:'open',        cat:'Shipping Delay',  created:'Apr 10, 2025', assigned:'Sara Khalil',  msgs:3, convId:'1' },
  { id:'T-002', subject:'Received wrong size shirt',          customer:'Sara Khalil',    ch:'📸', priority:'high',    status:'in_progress', cat:'Wrong Item',       created:'Apr 9, 2025',  assigned:'Omar Hassan',  msgs:5, convId:'2' },
  { id:'T-003', subject:'Requesting refund for damaged bag',  customer:'Omar Hassan',    ch:'💬', priority:'medium',  status:'waiting',     cat:'Refund Request',   created:'Apr 8, 2025',  assigned:'Ahmed Mohamed',msgs:2, convId:'3' },
  { id:'T-004', subject:'Watch stopped working after 1 week', customer:'Layla Samir',    ch:'⚡', priority:'high',    status:'open',        cat:'Product Defect',   created:'Apr 8, 2025',  assigned:'Unassigned',   msgs:1, convId:'4' },
  { id:'T-005', subject:'Double charged for my order',        customer:'Youssef Ali',    ch:'📱', priority:'urgent',  status:'in_progress', cat:'Payment Issue',    created:'Apr 7, 2025',  assigned:'Sara Khalil',  msgs:7, convId:'5' },
  { id:'T-006', subject:'Package arrived open/damaged',       customer:'Nour Adel',      ch:'📸', priority:'medium',  status:'resolved',    cat:'Product Defect',   created:'Apr 6, 2025',  assigned:'Ahmed Mohamed',msgs:4, convId:'6' },
  { id:'T-007', subject:'Can I change delivery address?',     customer:'Mariam Kamal',   ch:'📱', priority:'low',     status:'closed',      cat:'Other',            created:'Apr 5, 2025',  assigned:'Sara Khalil',  msgs:3, convId:null },
];

const AGENTS = ['Ahmed Mohamed','Sara Khalil','Omar Hassan','Unassigned'];

const P_COLOR = { low:'#64748b', medium:'#f59e0b', high:'#ef4444', urgent:'#dc2626' };
const P_BG    = { low:'rgba(100,116,139,0.1)', medium:'rgba(245,158,11,0.1)', high:'rgba(239,68,68,0.1)', urgent:'rgba(220,38,38,0.15)' };
const S_COLOR = { open:'#6366f1', in_progress:'#06b6d4', waiting:'#f59e0b', resolved:'#10b981', closed:'#64748b' };
const S_BG    = { open:'rgba(99,102,241,0.1)', in_progress:'rgba(6,182,212,0.1)', waiting:'rgba(245,158,11,0.1)', resolved:'rgba(16,185,129,0.1)', closed:'rgba(100,116,139,0.1)' };

const BLANK_TICKET = { subject:'', customer:'', ch:'📱', priority:'medium', cat:'Other', assigned:'Unassigned' };

export default function TicketsPage() {
  const [tickets, setTickets]       = useState(INIT_TICKETS);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterS]  = useState('all');
  const [filterPriority, setFilterP]= useState('all');
  const [selected, setSelected]     = useState(null);
  const [newModal, setNewModal]     = useState(false);
  const [form, setForm]             = useState(BLANK_TICKET);
  const [replyText, setReplyText]   = useState('');

  const [ticketMsgs, setTicketMsgs] = useState({
    'T-001': [
      { id:'a', by:'customer', text:'My order #12345 was placed on Apr 5 and still not delivered!', at:'Apr 10, 10:00 AM' },
      { id:'b', by:'agent',    text:'Hi Ahmed! I\'m checking this with our logistics team right now. I\'ll update you in 30 minutes.', at:'Apr 10, 10:15 AM' },
      { id:'c', by:'customer', text:'It\'s been 5 days. This is unacceptable!', at:'Apr 10, 11:00 AM' },
    ],
    'T-002': [
      { id:'a', by:'customer', text:'I ordered a Large shirt but received a Small.', at:'Apr 9, 2:00 PM' },
      { id:'b', by:'agent',    text:'I apologize for the inconvenience! We\'ll send the correct size immediately.', at:'Apr 9, 2:30 PM' },
    ],
  });

  const filtered = tickets.filter(t => {
    if (search && !t.subject.toLowerCase().includes(search.toLowerCase()) &&
        !t.customer.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const stats = {
    open:      tickets.filter(t => t.status === 'open').length,
    urgent:    tickets.filter(t => t.priority === 'urgent').length,
    progress:  tickets.filter(t => t.status === 'in_progress').length,
    resolved:  tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  function createTicket() {
    if (!form.subject.trim() || !form.customer.trim()) { toast.error('Subject and customer required'); return; }
    const id = 'T-' + String(tickets.length + 1).padStart(3, '0');
    const now = new Date().toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    setTickets(ts => [{ ...form, id, created: now, msgs: 0, status:'open', convId: null }, ...ts]);
    setNewModal(false);
    setForm(BLANK_TICKET);
    toast.success(`Ticket ${id} created`);
  }

  function updateStatus(id, status) {
    setTickets(ts => ts.map(t => t.id === id ? { ...t, status } : t));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
    toast.success(`Ticket marked as ${status.replace('_',' ')}`);
  }

  function assignTicket(id, agent) {
    setTickets(ts => ts.map(t => t.id === id ? { ...t, assigned: agent } : t));
    if (selected?.id === id) setSelected(s => ({ ...s, assigned: agent }));
    toast.success(`Assigned to ${agent}`);
  }

  function sendReply() {
    if (!replyText.trim() || !selected) return;
    const msg = { id:Date.now()+'', by:'agent', text:replyText,
      at: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:true }) };
    setTicketMsgs(m => ({ ...m, [selected.id]: [...(m[selected.id]||[]), msg] }));
    setTickets(ts => ts.map(t => t.id === selected.id ? { ...t, msgs: t.msgs+1 } : t));
    setReplyText('');
    toast.success('Reply sent');
  }

  const msgs = selected ? (ticketMsgs[selected.id] || []) : [];

  return (
    <>
      <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20, height:'100%', boxSizing:'border-box' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>Ticket Complaints</h1>
            <p style={{ fontSize:13, color:'var(--t3)' }}>
              Track and resolve customer complaints across all channels
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(BLANK_TICKET); setNewModal(true); }}>
            + New Ticket
          </button>
        </div>

        {/* KPI cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {[
            { l:'Open', v:stats.open, c:'#6366f1' },
            { l:'Urgent', v:stats.urgent, c:'#dc2626' },
            { l:'In Progress', v:stats.progress, c:'#06b6d4' },
            { l:'Resolved', v:stats.resolved, c:'#10b981' },
          ].map(s => (
            <div key={s.l} className="card-sm" style={{ display:'flex', alignItems:'center', gap:14 }}>
              <span style={{ fontSize:28, fontWeight:900, fontFamily:'Space Grotesk', color:s.c }}>{s.v}</span>
              <span style={{ fontSize:13, color:'var(--t3)' }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" style={{ width:260, fontSize:13 }}
            placeholder="Search tickets…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['all','open','in_progress','waiting','resolved','closed'].map(s => (
              <button key={s} onClick={() => setFilterS(s)}
                className={filterStatus===s ? 'btn btn-primary btn-xs' : 'btn btn-ghost btn-xs'}>
                {s.replace(/_/g,' ')}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {['all','low','medium','high','urgent'].map(p => (
              <button key={p} onClick={() => setFilterP(p)}
                style={{ fontSize:11, padding:'4px 10px', borderRadius:99, fontWeight:600, cursor:'pointer',
                  border:`1px solid ${p==='all' ? 'var(--b1)' : P_COLOR[p]+'44'}`,
                  background: filterPriority===p ? (p==='all'?'rgba(99,102,241,0.15)': P_BG[p]) : 'transparent',
                  color: filterPriority===p ? (p==='all'?'#a5b4fc': P_COLOR[p]) : 'var(--t4)',
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Main layout */}
        <div style={{ display:'flex', gap:16, flex:1, overflow:'hidden', minHeight:0 }}>

          {/* Ticket list */}
          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:'var(--t4)', fontSize:14 }}>
                No tickets found
              </div>
            )}
            {filtered.map(t => (
              <div key={t.id} onClick={() => setSelected(t)}
                style={{ padding:'14px 16px', borderRadius:'var(--r-md)', cursor:'pointer',
                  background: selected?.id===t.id ? 'rgba(99,102,241,0.08)' : 'var(--bg3)',
                  border: selected?.id===t.id ? '1.5px solid rgba(99,102,241,0.3)' : '1px solid var(--b1)',
                  transition:'all 0.12s' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:12, fontFamily:'monospace', color:'var(--t4)',
                        background:'var(--s2)', padding:'1px 7px', borderRadius:5 }}>{t.id}</span>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                        background: P_BG[t.priority], color: P_COLOR[t.priority],
                        border:`1px solid ${P_COLOR[t.priority]}33` }}>
                        {t.priority}
                      </span>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                        background: S_BG[t.status], color: S_COLOR[t.status],
                        border:`1px solid ${S_COLOR[t.status]}33` }}>
                        {t.status.replace(/_/g,' ')}
                      </span>
                    </div>
                    <p style={{ fontSize:14, fontWeight:600, color:'var(--t1)', marginBottom:4,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.subject}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:12, fontSize:12, color:'var(--t4)' }}>
                      <span>{t.ch} {t.customer}</span>
                      <span>·</span>
                      <span>{t.cat}</span>
                      <span>·</span>
                      <span>{t.created}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                    <span style={{ fontSize:12, color:'var(--t4)' }}>
                      {t.assigned === 'Unassigned'
                        ? <span style={{ color:'#f59e0b' }}>Unassigned</span>
                        : t.assigned}
                    </span>
                    {t.msgs > 0 && (
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                        background:'rgba(99,102,241,0.12)', color:'#a5b4fc',
                        border:'1px solid rgba(99,102,241,0.2)' }}>
                        {t.msgs} msg{t.msgs!==1?'s':''}
                      </span>
                    )}
                    {t.convId && (
                      <span style={{ fontSize:11, color:'#67e8f9', fontWeight:600 }}>🔗 Conv linked</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ticket detail panel */}
          {selected && (
            <div style={{ width:380, flexShrink:0, background:'var(--bg3)', border:'1px solid var(--b1)',
              borderRadius:'var(--r-xl)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {/* Detail header */}
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--b1)', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:12, fontFamily:'monospace', color:'var(--t4)',
                    background:'var(--s2)', padding:'2px 8px', borderRadius:6 }}>{selected.id}</span>
                  <button onClick={() => setSelected(null)}
                    style={{ width:26, height:26, borderRadius:'50%', border:'1px solid var(--b1)',
                      background:'var(--s1)', cursor:'pointer', fontSize:14, color:'var(--t4)',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                </div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--t1)', marginBottom:8, lineHeight:1.3 }}>{selected.subject}</p>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                    background:P_BG[selected.priority], color:P_COLOR[selected.priority],
                    border:`1px solid ${P_COLOR[selected.priority]}33` }}>{selected.priority}</span>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                    background:S_BG[selected.status], color:S_COLOR[selected.status],
                    border:`1px solid ${S_COLOR[selected.status]}33` }}>{selected.status.replace(/_/g,' ')}</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:99,
                    background:'var(--s2)', color:'var(--t4)', border:'1px solid var(--b1)' }}>{selected.cat}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--b1)', flexShrink:0 }}>
                <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                  {/* Status picker */}
                  <select
                    value={selected.status}
                    onChange={e => updateStatus(selected.id, e.target.value)}
                    style={{ flex:1, fontSize:12, padding:'6px 10px', borderRadius:8,
                      background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t1)',
                      cursor:'pointer', fontWeight:600 }}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>
                  {/* Agent picker */}
                  <select
                    value={selected.assigned}
                    onChange={e => assignTicket(selected.id, e.target.value)}
                    style={{ flex:1, fontSize:12, padding:'6px 10px', borderRadius:8,
                      background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t1)',
                      cursor:'pointer', fontWeight:600 }}>
                    {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                {selected.convId && (
                  <a href={`/dashboard/conversations`}
                    style={{ fontSize:12, color:'#67e8f9', fontWeight:600, textDecoration:'none',
                      display:'flex', alignItems:'center', gap:5 }}>
                    🔗 View linked conversation →
                  </a>
                )}
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'14px 16px', display:'flex',
                flexDirection:'column', gap:10 }}>
                {msgs.length === 0 && (
                  <div style={{ textAlign:'center', color:'var(--t4)', fontSize:12.5, padding:'20px 0' }}>
                    No messages yet
                  </div>
                )}
                {msgs.map(m => (
                  <div key={m.id} style={{ display:'flex', flexDirection:'column',
                    alignItems: m.by==='agent' ? 'flex-end' : 'flex-start', gap:3 }}>
                    <div style={{ maxWidth:'85%', padding:'10px 14px', borderRadius:12, fontSize:13,
                      lineHeight:1.55,
                      background: m.by==='agent' ? 'rgba(99,102,241,0.15)' : 'var(--s2)',
                      color: m.by==='agent' ? '#c4b5fd' : 'var(--t2)',
                      border: `1px solid ${m.by==='agent' ? 'rgba(99,102,241,0.25)' : 'var(--b1)'}` }}>
                      {m.text}
                    </div>
                    <span style={{ fontSize:10.5, color:'var(--t4)', paddingLeft:4, paddingRight:4 }}>
                      {m.by === 'agent' ? 'Agent' : selected.customer} · {m.at}
                    </span>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--b1)', flexShrink:0 }}>
                <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
                  <textarea className="input" rows={2}
                    style={{ flex:1, resize:'none', fontSize:13, lineHeight:1.5, minHeight:48 }}
                    placeholder="Type a reply to the customer…"
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter' && e.ctrlKey) sendReply(); }}
                  />
                  <button className="btn btn-primary" style={{ padding:'12px 16px', flexShrink:0 }}
                    onClick={sendReply} disabled={!replyText.trim()}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── New Ticket Modal ─────────────────────────────────────────────── */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="Create Ticket" width={480}>
        <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>
              Subject *
            </label>
            <input className="input" placeholder="Describe the issue briefly"
              value={form.subject} onChange={e => setForm(f => ({...f, subject:e.target.value}))} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Customer *</label>
              <input className="input" placeholder="Customer name"
                value={form.customer} onChange={e => setForm(f => ({...f, customer:e.target.value}))} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Channel</label>
              <select className="input" value={form.ch} onChange={e => setForm(f => ({...f, ch:e.target.value}))}>
                {['📱 WhatsApp','📸 Instagram','💬 Messenger','⚡ Live Chat'].map(c => (
                  <option key={c} value={c.split(' ')[0]}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm(f => ({...f, priority:e.target.value}))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Category</label>
              <select className="input" value={form.cat} onChange={e => setForm(f => ({...f, cat:e.target.value}))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t3)', marginBottom:5 }}>Assign To</label>
              <select className="input" value={form.assigned} onChange={e => setForm(f => ({...f, assigned:e.target.value}))}>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:'flex', gap:10, paddingTop:4 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setNewModal(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={createTicket}>Create Ticket</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
