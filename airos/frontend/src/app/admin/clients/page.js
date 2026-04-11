'use client';
// TODO: Set SHOW_CREDITS = true when BSP status is approved
const SHOW_CREDITS = false;

import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';

/* ─── Seed Data ───────────────────────────────────────────────────────────── */
const INIT_CLIENTS = [
  {
    id:'c1', name:'MyStore Egypt', email:'admin@mystore.eg', phone:'+20 100 123 0000',
    country:'EG', domain:'mystore.eg', plan:'Pro', mrr:149, status:'active',
    channels:{ wa:{ connected:true, phone:'+20 100 123 0000', wabaId:'2398012345', verified:true },
               ig:{ connected:true, page:'mystore.official', verified:true },
               fb:{ connected:false }, lc:{ connected:true, domain:'mystore.eg', widgetId:'WGT-001' } },
    operators:[
      { name:'Ahmed Mohamed', email:'ahmed@mystore.eg',  role:'Admin',  lastActive:'2m ago',  status:'online' },
      { name:'Sara Ali',      email:'sara@mystore.eg',   role:'Agent',  lastActive:'5m ago',  status:'online' },
      { name:'Omar Hassan',   email:'omar@mystore.eg',   role:'Agent',  lastActive:'2h ago',  status:'offline' },
    ],
    usage:{ conversations:4820, convLimit:10000, msgs:18420, broadcasts:12, creditsUsed:42.50, creditsBalance:57.50, storage:'1.2 GB' },
    invoices:[
      { id:'INV-0084', date:'Apr 1 2026',  amount:149, status:'paid' },
      { id:'INV-0071', date:'Mar 1 2026',  amount:149, status:'paid' },
      { id:'INV-0058', date:'Feb 1 2026',  amount:149, status:'paid' },
    ],
    notes:'VIP client — escalate issues immediately.',
    created:'2024-10-12', lastActive:'2m ago',
  },
  {
    id:'c2', name:'TechHub KSA', email:'it@techhub.sa', phone:'+966 55 200 0000',
    country:'SA', domain:'techhub.sa', plan:'Enterprise', mrr:299, status:'active',
    channels:{ wa:{ connected:true, phone:'+966 55 200 0000', wabaId:'3310098765', verified:true },
               ig:{ connected:true, page:'techhub.sa', verified:true },
               fb:{ connected:true, page:'TechHub KSA', verified:true },
               lc:{ connected:true, domain:'techhub.sa', widgetId:'WGT-002' } },
    operators:[
      { name:'Khalid Al-Rashid', email:'khalid@techhub.sa', role:'Admin',  lastActive:'10m ago', status:'online' },
      { name:'Nora Fahad',       email:'nora@techhub.sa',   role:'Agent',  lastActive:'1h ago',  status:'away'   },
      { name:'Faisal Turki',     email:'faisal@techhub.sa', role:'Agent',  lastActive:'3h ago',  status:'offline' },
      { name:'Reem Saleh',       email:'reem@techhub.sa',   role:'Supervisor', lastActive:'30m ago', status:'online' },
    ],
    usage:{ conversations:9210, convLimit:99999, msgs:41200, broadcasts:38, creditsUsed:128.00, creditsBalance:222.00, storage:'4.8 GB' },
    invoices:[
      { id:'INV-0083', date:'Apr 1 2026',  amount:299, status:'paid' },
      { id:'INV-0070', date:'Mar 1 2026',  amount:299, status:'paid' },
    ],
    notes:'Enterprise — dedicated SLA. Assigned account manager: Yassin.',
    created:'2024-08-05', lastActive:'10m ago',
  },
  {
    id:'c3', name:'Fashion Palace UAE', email:'hello@fashionpalace.ae', phone:'+971 50 300 0000',
    country:'AE', domain:'fashionpalace.ae', plan:'Starter', mrr:49, status:'active',
    channels:{ wa:{ connected:true, phone:'+971 50 300 0000', wabaId:'4420011223', verified:true },
               ig:{ connected:false }, fb:{ connected:false }, lc:{ connected:false } },
    operators:[
      { name:'Layla Mansour', email:'layla@fashionpalace.ae', role:'Admin', lastActive:'1h ago', status:'away' },
    ],
    usage:{ conversations:890, convLimit:1000, msgs:2840, broadcasts:3, creditsUsed:11.20, creditsBalance:8.80, storage:'0.3 GB' },
    invoices:[
      { id:'INV-0082', date:'Apr 1 2026', amount:49, status:'paid' },
    ],
    notes:'Close to conversation limit — upsell opportunity.',
    created:'2025-01-20', lastActive:'1h ago',
  },
  {
    id:'c4', name:'AutoDeals Cairo', email:'ops@autodeals.eg', phone:'+20 111 400 0000',
    country:'EG', domain:'autodeals.eg', plan:'Pro', mrr:149, status:'active',
    channels:{ wa:{ connected:true, phone:'+20 111 400 0000', wabaId:'5530022334', verified:true },
               ig:{ connected:false }, fb:{ connected:true, page:'AutoDeals Cairo', verified:true },
               lc:{ connected:false } },
    operators:[
      { name:'Mohamed Samir', email:'m.samir@autodeals.eg', role:'Admin', lastActive:'20m ago', status:'online' },
      { name:'Dina Khalil',   email:'dina@autodeals.eg',    role:'Agent', lastActive:'4h ago',  status:'offline' },
    ],
    usage:{ conversations:3140, convLimit:10000, msgs:9800, broadcasts:8, creditsUsed:58.75, creditsBalance:41.25, storage:'2.1 GB' },
    invoices:[
      { id:'INV-0081', date:'Apr 1 2026', amount:149, status:'paid' },
    ],
    notes:'',
    created:'2024-11-03', lastActive:'20m ago',
  },
  {
    id:'c5', name:'Beauty Corner', email:'contact@beautycorner.eg', phone:'+20 100 500 0000',
    country:'EG', domain:'beautycorner.eg', plan:'Starter', mrr:49, status:'active',
    channels:{ wa:{ connected:false }, ig:{ connected:true, page:'beautycorner.eg', verified:true },
               fb:{ connected:false }, lc:{ connected:true, domain:'beautycorner.eg', widgetId:'WGT-005' } },
    operators:[
      { name:'Nadia Fawzy', email:'nadia@beautycorner.eg', role:'Admin', lastActive:'3h ago', status:'offline' },
    ],
    usage:{ conversations:620, convLimit:1000, msgs:1920, broadcasts:1, creditsUsed:8.00, creditsBalance:12.00, storage:'0.2 GB' },
    invoices:[
      { id:'INV-0080', date:'Apr 1 2026', amount:49, status:'paid' },
    ],
    notes:'',
    created:'2025-02-14', lastActive:'3h ago',
  },
  {
    id:'c6', name:'Luxury Boutique', email:'info@luxuryboutique.ae', phone:'+971 52 600 0000',
    country:'AE', domain:'luxuryboutique.ae', plan:'Pro', mrr:149, status:'active',
    channels:{ wa:{ connected:true, phone:'+971 52 600 0000', wabaId:'6640033445', verified:true },
               ig:{ connected:true, page:'luxuryboutique', verified:true },
               fb:{ connected:true, page:'Luxury Boutique', verified:false },
               lc:{ connected:true, domain:'luxuryboutique.ae', widgetId:'WGT-006' } },
    operators:[
      { name:'Hana Al-Maktoum', email:'hana@luxuryboutique.ae', role:'Admin', lastActive:'45m ago', status:'online' },
      { name:'Tariq Zayed',     email:'tariq@luxuryboutique.ae', role:'Agent', lastActive:'2h ago', status:'offline' },
    ],
    usage:{ conversations:2980, convLimit:10000, msgs:8700, broadcasts:15, creditsUsed:33.40, creditsBalance:66.60, storage:'1.8 GB' },
    invoices:[
      { id:'INV-0079', date:'Apr 1 2026', amount:149, status:'paid' },
    ],
    notes:'Recently upgraded from Starter.',
    created:'2024-12-01', lastActive:'45m ago',
  },
  {
    id:'c7', name:'Food Express', email:'tech@foodexpress.eg', phone:'+20 122 700 0000',
    country:'EG', domain:'foodexpress.eg', plan:'Pro', mrr:149, status:'suspended',
    channels:{ wa:{ connected:false }, ig:{ connected:false }, fb:{ connected:false }, lc:{ connected:false } },
    operators:[
      { name:'Amr Mostafa', email:'amr@foodexpress.eg', role:'Admin', lastActive:'6 days ago', status:'offline' },
    ],
    usage:{ conversations:0, convLimit:10000, msgs:0, broadcasts:0, creditsUsed:0, creditsBalance:5.20, storage:'0.9 GB' },
    invoices:[
      { id:'INV-0091', date:'Apr 3 2026', amount:149, status:'unpaid' },
      { id:'INV-0078', date:'Mar 1 2026', amount:149, status:'paid'   },
    ],
    notes:'Suspended due to unpaid invoice. Contact: +20 122 700 0000.',
    created:'2024-09-18', lastActive:'6 days ago',
  },
  {
    id:'c8', name:'Gadget World', email:'admin@gadgetworld.sa', phone:'+966 54 800 0000',
    country:'SA', domain:'gadgetworld.sa', plan:'Starter', mrr:0, status:'trial',
    channels:{ wa:{ connected:true, phone:'+966 54 800 0000', wabaId:'7750044556', verified:false },
               ig:{ connected:false }, fb:{ connected:false }, lc:{ connected:false } },
    operators:[
      { name:'Bassam Al-Otaibi', email:'bassam@gadgetworld.sa', role:'Admin', lastActive:'1h ago', status:'online' },
    ],
    usage:{ conversations:210, convLimit:1000, msgs:640, broadcasts:0, creditsUsed:0, creditsBalance:10.00, storage:'0.1 GB' },
    invoices:[],
    notes:'Trial expires Apr 15 2026. Good engagement — potential convert.',
    created:'2025-04-01', lastActive:'1h ago',
  },
  {
    id:'c9', name:'MedCare Clinic', email:'it@medcare.eg', phone:'+20 100 900 0000',
    country:'EG', domain:'medcare.eg', plan:'Enterprise', mrr:299, status:'active',
    channels:{ wa:{ connected:true, phone:'+20 100 900 0000', wabaId:'8860055667', verified:true },
               ig:{ connected:false }, fb:{ connected:true, page:'MedCare Egypt', verified:true },
               lc:{ connected:false } },
    operators:[
      { name:'Dr. Hossam Nabil',  email:'hossam@medcare.eg',  role:'Admin',      lastActive:'15m ago', status:'online'  },
      { name:'Rania Sherif',      email:'rania@medcare.eg',   role:'Supervisor', lastActive:'1h ago',  status:'away'    },
      { name:'Karim Ibrahim',     email:'karim@medcare.eg',   role:'Agent',      lastActive:'5h ago',  status:'offline' },
    ],
    usage:{ conversations:5600, convLimit:99999, msgs:22400, broadcasts:20, creditsUsed:95.00, creditsBalance:155.00, storage:'3.2 GB' },
    invoices:[
      { id:'INV-0085', date:'Apr 1 2026', amount:299, status:'paid' },
    ],
    notes:'Healthcare sector — HIPAA-adjacent requirements. Handle data requests carefully.',
    created:'2024-07-22', lastActive:'15m ago',
  },
  {
    id:'c10', name:'KSA Electronics', email:'sys@ksaelec.sa', phone:'+966 55 100 0000',
    country:'SA', domain:'ksaelec.sa', plan:'Enterprise', mrr:299, status:'active',
    channels:{ wa:{ connected:true, phone:'+966 55 100 0000', wabaId:'9970066778', verified:true },
               ig:{ connected:true, page:'ksaelectronics', verified:true },
               fb:{ connected:true, page:'KSA Electronics', verified:true },
               lc:{ connected:true, domain:'ksaelec.sa', widgetId:'WGT-010' } },
    operators:[
      { name:'Abdullah Al-Harbi', email:'a.harbi@ksaelec.sa',  role:'Admin',      lastActive:'5m ago',  status:'online'  },
      { name:'Saad Al-Qahtani',   email:'saad@ksaelec.sa',     role:'Supervisor', lastActive:'20m ago', status:'online'  },
      { name:'Mona Al-Zahrani',   email:'mona@ksaelec.sa',     role:'Agent',      lastActive:'1h ago',  status:'away'    },
      { name:'Yazeed Bin Saud',   email:'yazeed@ksaelec.sa',   role:'Agent',      lastActive:'2h ago',  status:'offline' },
    ],
    usage:{ conversations:11200, convLimit:99999, msgs:48900, broadcasts:52, creditsUsed:210.00, creditsBalance:290.00, storage:'7.1 GB' },
    invoices:[
      { id:'INV-0086', date:'Apr 1 2026', amount:299, status:'paid' },
    ],
    notes:'Highest volume client. Monitor webhook health daily.',
    created:'2024-06-15', lastActive:'5m ago',
  },
];

/* ─── Users (contacts/end-customers) per client ──────────────────────────── */
const CLIENT_USERS = {
  c1: [
    { id:'u1',  name:'Mohamed Tarek',     phone:'+20 100 111 2233', email:'m.tarek@gmail.com',     channel:'wa', tags:['VIP','Repeat'],    orders:14, revenue:4200,  lastSeen:'2m ago',   status:'active',  country:'EG' },
    { id:'u2',  name:'Nour El-Din',        phone:'+20 112 333 4455', email:'nour@outlook.com',      channel:'ig', tags:['New'],             orders:2,  revenue:380,   lastSeen:'1h ago',   status:'active',  country:'EG' },
    { id:'u3',  name:'Aya Salah',          phone:'+20 100 556 7788', email:'aya.s@yahoo.com',       channel:'lc', tags:['Repeat'],          orders:6,  revenue:1820,  lastSeen:'3h ago',   status:'active',  country:'EG' },
    { id:'u4',  name:'Khaled Mahmoud',     phone:'+20 111 990 1122', email:'khaledm@gmail.com',     channel:'wa', tags:['Lead'],            orders:1,  revenue:120,   lastSeen:'1d ago',   status:'idle',    country:'EG' },
    { id:'u5',  name:'Fatma Ali',          phone:'+20 100 223 4455', email:'fatma@hotmail.com',     channel:'wa', tags:['VIP','Repeat'],    orders:22, revenue:7800,  lastSeen:'5m ago',   status:'active',  country:'EG' },
    { id:'u6',  name:'Omar Adel',          phone:'+20 122 667 8899', email:'omar.a@gmail.com',      channel:'ig', tags:['New'],             orders:1,  revenue:250,   lastSeen:'2d ago',   status:'idle',    country:'EG' },
  ],
  c2: [
    { id:'u7',  name:'Turki Al-Faisal',    phone:'+966 55 211 3344', email:'turki@company.sa',      channel:'wa', tags:['Enterprise','VIP'],orders:38, revenue:28400, lastSeen:'10m ago',  status:'active',  country:'SA' },
    { id:'u8',  name:'Lina Hassan',        phone:'+966 50 445 6677', email:'lina.h@gmail.com',      channel:'ig', tags:['Repeat'],          orders:9,  revenue:3200,  lastSeen:'2h ago',   status:'active',  country:'SA' },
    { id:'u9',  name:'Abdulrahman Nasser', phone:'+966 54 778 9900', email:'a.nasser@outlook.com',  channel:'wa', tags:['New'],             orders:2,  revenue:640,   lastSeen:'4h ago',   status:'idle',    country:'SA' },
    { id:'u10', name:'Reem Al-Otaibi',     phone:'+966 55 112 2334', email:'reem.o@gmail.com',      channel:'fb', tags:['Lead'],            orders:0,  revenue:0,     lastSeen:'1d ago',   status:'idle',    country:'SA' },
    { id:'u11', name:'Faris Bin Hamad',    phone:'+966 50 334 5566', email:'faris@tech.sa',         channel:'wa', tags:['Repeat','VIP'],    orders:18, revenue:9800,  lastSeen:'30m ago',  status:'active',  country:'SA' },
  ],
  c3: [
    { id:'u12', name:'Hessa Al-Maktoum',   phone:'+971 50 311 2233', email:'hessa@gmail.com',       channel:'wa', tags:['VIP'],             orders:8,  revenue:6200,  lastSeen:'1h ago',   status:'active',  country:'AE' },
    { id:'u13', name:'Dana Mohamed',       phone:'+971 55 445 6677', email:'dana.m@hotmail.com',    channel:'wa', tags:['New'],             orders:1,  revenue:290,   lastSeen:'3h ago',   status:'idle',    country:'AE' },
    { id:'u14', name:'Youssef Khalil',     phone:'+971 52 667 8899', email:'y.khalil@gmail.com',    channel:'wa', tags:['Repeat'],          orders:4,  revenue:1400,  lastSeen:'2d ago',   status:'idle',    country:'AE' },
  ],
  c4: [
    { id:'u15', name:'Amira Sayed',        phone:'+20 100 112 2233', email:'amira@gmail.com',       channel:'wa', tags:['Lead'],            orders:0,  revenue:0,     lastSeen:'20m ago',  status:'active',  country:'EG' },
    { id:'u16', name:'Hassan El-Shahat',   phone:'+20 111 334 5566', email:'hassan.s@outlook.com',  channel:'fb', tags:['Repeat'],          orders:7,  revenue:3800,  lastSeen:'3h ago',   status:'idle',    country:'EG' },
    { id:'u17', name:'Doaa Ibrahim',       phone:'+20 100 556 7788', email:'doaa@gmail.com',        channel:'wa', tags:['VIP','Repeat'],    orders:16, revenue:9200,  lastSeen:'1h ago',   status:'active',  country:'EG' },
    { id:'u18', name:'Walid Gamal',        phone:'+20 122 778 9900', email:'walid.g@yahoo.com',     channel:'wa', tags:['New'],             orders:1,  revenue:150,   lastSeen:'1d ago',   status:'idle',    country:'EG' },
  ],
  c5: [
    { id:'u19', name:'Maha Abdelhamid',    phone:'+20 100 223 4455', email:'maha@gmail.com',        channel:'ig', tags:['Repeat','VIP'],    orders:11, revenue:2800,  lastSeen:'3h ago',   status:'active',  country:'EG' },
    { id:'u20', name:'Yasmine Nabil',      phone:'+20 112 445 6677', email:'yasmine@outlook.com',   channel:'lc', tags:['New'],             orders:1,  revenue:95,    lastSeen:'1d ago',   status:'idle',    country:'EG' },
  ],
  c6: [
    { id:'u21', name:'Sheikha Al-Rashid',  phone:'+971 52 311 2233', email:'sheikha@gmail.com',     channel:'wa', tags:['VIP'],             orders:25, revenue:32000, lastSeen:'45m ago',  status:'active',  country:'AE' },
    { id:'u22', name:'Mariam Al-Zaabi',    phone:'+971 55 556 7788', email:'mariam.z@hotmail.com',  channel:'ig', tags:['Repeat'],          orders:7,  revenue:8400,  lastSeen:'2h ago',   status:'active',  country:'AE' },
    { id:'u23', name:'Khalifa Mansouri',   phone:'+971 50 778 9900', email:'k.mansouri@gmail.com',  channel:'fb', tags:['New'],             orders:2,  revenue:1200,  lastSeen:'4h ago',   status:'idle',    country:'AE' },
  ],
  c7: [
    { id:'u24', name:'Salma Mostafa',      phone:'+20 100 334 5566', email:'salma@gmail.com',       channel:'wa', tags:['Repeat'],          orders:5,  revenue:1200,  lastSeen:'6d ago',   status:'inactive',country:'EG' },
  ],
  c8: [
    { id:'u25', name:'Bassem Al-Ghamdi',   phone:'+966 54 445 6677', email:'bassem@gmail.com',      channel:'wa', tags:['Trial'],           orders:0,  revenue:0,     lastSeen:'1h ago',   status:'active',  country:'SA' },
    { id:'u26', name:'Renad Al-Qahtani',   phone:'+966 55 667 8899', email:'renad@hotmail.com',     channel:'wa', tags:['Trial','Lead'],    orders:0,  revenue:0,     lastSeen:'3h ago',   status:'idle',    country:'SA' },
  ],
  c9: [
    { id:'u27', name:'Dr. Samar Fouad',    phone:'+20 100 445 6677', email:'s.fouad@medcare.eg',    channel:'wa', tags:['VIP','Regular'],   orders:28, revenue:11200, lastSeen:'15m ago',  status:'active',  country:'EG' },
    { id:'u28', name:'Ahmed Badr',         phone:'+20 112 778 9900', email:'a.badr@gmail.com',      channel:'fb', tags:['Repeat'],          orders:12, revenue:4800,  lastSeen:'1h ago',   status:'active',  country:'EG' },
    { id:'u29', name:'Hana Mostafa',       phone:'+20 100 990 1122', email:'hana.m@outlook.com',    channel:'wa', tags:['New'],             orders:2,  revenue:380,   lastSeen:'2h ago',   status:'idle',    country:'EG' },
    { id:'u30', name:'Tarek El-Sayed',     phone:'+20 111 223 4455', email:'tarek.e@yahoo.com',     channel:'wa', tags:['Regular'],         orders:6,  revenue:2400,  lastSeen:'4h ago',   status:'idle',    country:'EG' },
  ],
  c10: [
    { id:'u31', name:'Nasser Al-Harbi',    phone:'+966 55 556 7788', email:'nasser@ksaelec.sa',     channel:'wa', tags:['Enterprise','VIP'],orders:52, revenue:48000, lastSeen:'5m ago',   status:'active',  country:'SA' },
    { id:'u32', name:'Mona Al-Shehri',     phone:'+966 50 778 9900', email:'mona@gmail.com',        channel:'ig', tags:['Repeat'],          orders:14, revenue:8200,  lastSeen:'20m ago',  status:'active',  country:'SA' },
    { id:'u33', name:'Bandar Al-Dosari',   phone:'+966 54 990 1122', email:'bandar@outlook.com',    channel:'wa', tags:['Repeat'],          orders:9,  revenue:4900,  lastSeen:'1h ago',   status:'active',  country:'SA' },
    { id:'u34', name:'Suha Al-Amri',       phone:'+966 55 334 5566', email:'suha@gmail.com',        channel:'fb', tags:['New'],             orders:1,  revenue:220,   lastSeen:'3h ago',   status:'idle',    country:'SA' },
    { id:'u35', name:'Ziyad Bin Fahad',    phone:'+966 50 667 8899', email:'ziyad@company.sa',      channel:'wa', tags:['Enterprise'],      orders:31, revenue:22400, lastSeen:'30m ago',  status:'active',  country:'SA' },
  ],
};

const PLAN_COLORS   = { Starter:'#06b6d4', Pro:'#818cf8', Enterprise:'#f59e0b' };
const STATUS_COLORS = { active:'#34d399', suspended:'#f87171', trial:'#fcd34d' };
const CH_ICONS      = { wa:'📱', ig:'📸', fb:'💬', lc:'⚡' };
const CH_LABELS     = { wa:'WhatsApp', ig:'Instagram', fb:'Messenger', lc:'Live Chat' };
const CH_COLORS     = { wa:'#25D366', ig:'#E1306C', fb:'#0099FF', lc:'#6366f1' };
const STATUS_ONLINE = { online:'#34d399', away:'#fbbf24', offline:'var(--t4)' };
const TAG_COLORS    = { VIP:'#f59e0b', Repeat:'#818cf8', New:'#06b6d4', Lead:'#34d399', Enterprise:'#a78bfa', Regular:'#64748b', Trial:'#fbbf24', inactive:'#f87171' };

/* ─── UsersTabContent component ──────────────────────────────────────────── */
function UsersTabContent({ clientId, userSearch, setUserSearch, userFilter, setUserFilter,
  userChFilter, setUserChFilter, selectedUser, setSelectedUser, inputStyle }) {

  const allUsers = CLIENT_USERS[clientId] || [];
  const visibleUsers = allUsers.filter(u => {
    if (userFilter !== 'all' && u.status !== userFilter) return false;
    if (userChFilter !== 'all' && u.channel !== userChFilter) return false;
    if (userSearch && !u.name.toLowerCase().includes(userSearch.toLowerCase()) &&
        !u.phone.includes(userSearch) && !u.email.toLowerCase().includes(userSearch.toLowerCase())) return false;
    return true;
  });
  const totalRev = allUsers.reduce((a,u)=>a+u.revenue,0);
  const totalOrd = allUsers.reduce((a,u)=>a+u.orders,0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
        {[
          { l:'Total Users',   v:allUsers.length,                                c:'#818cf8' },
          { l:'Active Now',    v:allUsers.filter(u=>u.status==='active').length,  c:'#34d399' },
          { l:'Total Orders',  v:totalOrd,                                        c:'#f59e0b' },
          { l:'Total Revenue', v:`$${totalRev.toLocaleString()}`,                 c:'#06b6d4' },
        ].map(s=>(
          <div key={s.l} style={{ padding:'12px 14px', borderRadius:10,
            background:'var(--s1)', border:'1px solid var(--b1)', textAlign:'center' }}>
            <p style={{ fontSize:18, fontWeight:800, color:s.c, marginBottom:2 }}>{s.v}</p>
            <p style={{ fontSize:11, color:'var(--t4)' }}>{s.l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8 }}>
        <input placeholder="Search name, phone, email…" value={userSearch}
          onChange={e=>setUserSearch(e.target.value)}
          style={{ ...inputStyle, flex:1 }} />
        <select value={userFilter} onChange={e=>setUserFilter(e.target.value)}
          style={{ ...inputStyle, cursor:'pointer' }}>
          {[['all','All Status'],['active','Active'],['idle','Idle'],['inactive','Inactive']].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select value={userChFilter} onChange={e=>setUserChFilter(e.target.value)}
          style={{ ...inputStyle, cursor:'pointer' }}>
          {[['all','All Channels'],['wa','WhatsApp'],['ig','Instagram'],['fb','Messenger'],['lc','Live Chat']].map(([v,l])=>(
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* User list */}
      {visibleUsers.length === 0 && (
        <p style={{ fontSize:13, color:'var(--t4)', padding:'20px 0', textAlign:'center' }}>
          No users match your filters
        </p>
      )}
      {visibleUsers.map(u=>(
        <div key={u.id} onClick={()=>setSelectedUser(selectedUser?.id===u.id ? null : u)}
          style={{ borderRadius:12, background:'var(--s1)',
            border:`1px solid ${selectedUser?.id===u.id?'rgba(99,102,241,0.35)':'var(--b1)'}`,
            cursor:'pointer', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1.2fr 1fr 80px 90px 80px',
            padding:'12px 14px', gap:8, alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fff', fontWeight:700, fontSize:13 }}>
                {u.name[0]}
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{u.name}</p>
                <p style={{ fontSize:11.5, color:'var(--t4)' }}>{u.phone}</p>
              </div>
            </div>
            <span style={{ fontSize:12, color:'var(--t4)',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</span>
            <span style={{ fontSize:13 }}>{CH_ICONS[u.channel]} {CH_LABELS[u.channel]}</span>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--t2)', textAlign:'right' }}>
              {u.orders} orders
            </span>
            <span style={{ fontSize:13, fontWeight:700, color:'#34d399', textAlign:'right' }}>
              ${u.revenue.toLocaleString()}
            </span>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 7px', borderRadius:99,
                background: u.status==='active'?'rgba(52,211,153,0.12)':u.status==='idle'?'rgba(251,191,36,0.1)':'rgba(248,113,113,0.1)',
                color: u.status==='active'?'#34d399':u.status==='idle'?'#fbbf24':'#f87171',
                border:`1px solid ${u.status==='active'?'rgba(52,211,153,0.2)':u.status==='idle'?'rgba(251,191,36,0.2)':'rgba(248,113,113,0.2)'}` }}>
                {u.status}
              </span>
            </div>
          </div>

          {selectedUser?.id===u.id && (
            <div style={{ padding:'12px 14px 14px', borderTop:'1px solid var(--b1)',
              background:'rgba(99,102,241,0.04)', display:'flex', gap:20, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:180 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase',
                  letterSpacing:'0.07em', marginBottom:8 }}>Contact Details</p>
                {[
                  ['Phone',    u.phone],
                  ['Email',    u.email],
                  ['Country',  {EG:'🇪🇬 Egypt',SA:'🇸🇦 Saudi Arabia',AE:'🇦🇪 UAE'}[u.country]||u.country],
                  ['Channel',  `${CH_ICONS[u.channel]} ${CH_LABELS[u.channel]}`],
                  ['Last Seen',u.lastSeen],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:12, color:'var(--t4)', width:80, flexShrink:0 }}>{l}</span>
                    <span style={{ fontSize:12.5, color:'var(--t2)' }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--t4)', textTransform:'uppercase',
                  letterSpacing:'0.07em', marginBottom:8 }}>Activity</p>
                {[['Orders',u.orders],['Revenue',`$${u.revenue.toLocaleString()}`]].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', gap:10, marginBottom:4 }}>
                    <span style={{ fontSize:12, color:'var(--t4)', width:80, flexShrink:0 }}>{l}</span>
                    <span style={{ fontSize:12.5, fontWeight:700, color:'var(--t1)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                  {u.tags.map(tag=>(
                    <span key={tag} style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                      background:`${TAG_COLORS[tag]||'#6366f1'}18`, color:TAG_COLORS[tag]||'#818cf8',
                      border:`1px solid ${TAG_COLORS[tag]||'#6366f1'}28` }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                <button onClick={e=>{ e.stopPropagation(); toast(`Opening conversations for ${u.name}…`); }}
                  style={{ fontSize:12, padding:'6px 12px', borderRadius:8, cursor:'pointer',
                    background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)',
                    color:'#a5b4fc', fontWeight:600 }}>
                  View Conversations
                </button>
                <button onClick={e=>{ e.stopPropagation(); toast.success(`${u.name} blocked`); }}
                  style={{ fontSize:12, padding:'6px 12px', borderRadius:8, cursor:'pointer',
                    background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)',
                    color:'#fca5a5', fontWeight:600 }}>
                  Block User
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function Pill({ color, children }) {
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99,
      background:`${color}18`, color, border:`1px solid ${color}28` }}>
      {children}
    </span>
  );
}

function Stat({ label, value, color='var(--t1)', sub }) {
  return (
    <div style={{ textAlign:'center' }}>
      <p style={{ fontSize:20, fontWeight:800, color, fontFamily:'Space Grotesk, sans-serif' }}>{value}</p>
      <p style={{ fontSize:11, color:'var(--t4)', marginTop:2 }}>{label}</p>
      {sub && <p style={{ fontSize:10.5, color:'var(--t3)', marginTop:1 }}>{sub}</p>}
    </div>
  );
}

function Bar({ pct, color='#6366f1', height=6 }) {
  return (
    <div style={{ height, borderRadius:99, background:'var(--s2)', overflow:'hidden' }}>
      <div style={{ height:'100%', borderRadius:99, background:color,
        width:`${Math.min(pct,100)}%`, transition:'width 0.4s ease' }} />
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function AdminClients() {
  const [clients, setClients]       = useState(INIT_CLIENTS);
  const [search, setSearch]         = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCh, setFilterCh]     = useState('all');
  const [selected, setSelected]     = useState(null);
  const [detailTab, setDetailTab]   = useState('profile');
  const [editMode, setEditMode]     = useState(false);
  const [editData, setEditData]     = useState({});
  const [addCreditsAmt, setAddCreditsAmt] = useState('');
  const [newOpModal, setNewOpModal] = useState(false);
  const [newOp, setNewOp]           = useState({ name:'', email:'', role:'Agent' });
  const [planModal, setPlanModal]   = useState(false);
  /* Users tab state */
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all'); // all|active|idle|inactive
  const [userChFilter, setUserChFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editOpIdx, setEditOpIdx]   = useState(null); // operator being edited inline

  /* ── Filtered list ── */
  const visible = useMemo(() => clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.email.toLowerCase().includes(search.toLowerCase()) &&
        !c.domain.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPlan !== 'all'   && c.plan   !== filterPlan)   return false;
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterCh !== 'all'     && !c.channels[filterCh]?.connected) return false;
    return true;
  }), [clients, search, filterPlan, filterStatus, filterCh]);

  /* ── Actions ── */
  function openClient(c) {
    setSelected(c); setDetailTab('profile'); setEditMode(false); setEditOpIdx(null);
    setUserSearch(''); setUserFilter('all'); setUserChFilter('all');
    setEditData({
      name:c.name, email:c.email, phone:c.phone, domain:c.domain,
      country:c.country, notes:c.notes,
      // channel fields
      wa_phone: c.channels.wa?.phone||'', wa_wabaId: c.channels.wa?.wabaId||'',
      ig_page:  c.channels.ig?.page||'',
      fb_page:  c.channels.fb?.page||'',
      lc_domain:c.channels.lc?.domain||'', lc_widgetId:c.channels.lc?.widgetId||'',
    });
  }

  function saveOpRole(idx, role) {
    setClients(cs => cs.map(c => c.id===selected.id
      ? {...c, operators:c.operators.map((o,i)=>i===idx?{...o,role}:o)}
      : c));
    setSelected(s => ({...s, operators:s.operators.map((o,i)=>i===idx?{...o,role}:o)}));
    setEditOpIdx(null);
    toast.success('Role updated');
  }

  function saveEdit() {
    const { wa_phone, wa_wabaId, ig_page, fb_page, lc_domain, lc_widgetId, ...profileFields } = editData;
    const updatedChannels = ch => ({
      ...ch,
      wa: { ...ch.wa, phone:wa_phone, wabaId:wa_wabaId },
      ig: { ...ch.ig, page:ig_page },
      fb: { ...ch.fb, page:fb_page },
      lc: { ...ch.lc, domain:lc_domain, widgetId:lc_widgetId },
    });
    setClients(cs => cs.map(c => c.id===selected.id
      ? { ...c, ...profileFields, channels:updatedChannels(c.channels) }
      : c));
    setSelected(s => ({ ...s, ...profileFields, channels:updatedChannels(s.channels) }));
    setEditMode(false);
    toast.success('Client updated');
  }

  function toggleStatus(status) {
    const next = status === 'active' ? 'suspended' : 'active';
    setClients(cs => cs.map(c => c.id===selected.id ? {...c,status:next} : c));
    setSelected(s => ({...s,status:next}));
    toast.success(`Client ${next}`);
  }

  function addCredits() {
    const amt = parseFloat(addCreditsAmt);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    setClients(cs => cs.map(c => c.id===selected.id
      ? {...c, usage:{...c.usage, creditsBalance: +(c.usage.creditsBalance+amt).toFixed(2) }}
      : c));
    setSelected(s => ({...s, usage:{...s.usage, creditsBalance:+(s.usage.creditsBalance+amt).toFixed(2)}}));
    setAddCreditsAmt('');
    toast.success(`$${amt.toFixed(2)} added to ${selected.name}`);
  }

  function changePlan(plan) {
    const mrr = { Starter:49, Pro:149, Enterprise:299 }[plan];
    setClients(cs => cs.map(c => c.id===selected.id ? {...c,plan,mrr} : c));
    setSelected(s => ({...s,plan,mrr}));
    setPlanModal(false);
    toast.success(`Plan changed to ${plan}`);
  }

  function removeOp(opName) {
    setClients(cs => cs.map(c => c.id===selected.id
      ? {...c, operators:c.operators.filter(o=>o.name!==opName)}
      : c));
    setSelected(s => ({...s, operators:s.operators.filter(o=>o.name!==opName)}));
    toast.success('Operator removed');
  }

  function addOperator() {
    if (!newOp.name || !newOp.email) return toast.error('Name and email required');
    const op = { ...newOp, lastActive:'just now', status:'online' };
    setClients(cs => cs.map(c => c.id===selected.id
      ? {...c, operators:[...c.operators, op]}
      : c));
    setSelected(s => ({...s, operators:[...s.operators, op]}));
    setNewOpModal(false);
    setNewOp({ name:'', email:'', role:'Agent' });
    toast.success('Operator added');
  }

  function toggleChannel(ch) {
    setClients(cs => cs.map(c => c.id===selected.id
      ? {...c, channels:{...c.channels,[ch]:{...c.channels[ch],connected:!c.channels[ch].connected}}}
      : c));
    setSelected(s => ({...s,
      channels:{...s.channels,[ch]:{...s.channels[ch],connected:!s.channels[ch].connected}}}));
    toast.success('Channel updated');
  }

  const inputStyle = { width:'100%', padding:'9px 12px', borderRadius:9,
    background:'var(--s1)', border:'1px solid var(--b1)',
    color:'var(--t1)', fontSize:13, outline:'none' };

  return (
    <>
      <div style={{ padding:'28px', display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, letterSpacing:'-0.03em', color:'var(--t1)', marginBottom:4 }}>
              Clients
            </h1>
            <p style={{ fontSize:13, color:'var(--t4)' }}>
              {clients.length} total · {clients.filter(c=>c.status==='active').length} active
            </p>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <input placeholder="Search client, email, domain…" value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{ ...inputStyle, width:260 }} />
          {[
            { label:'Plan', value:filterPlan, set:setFilterPlan,
              opts:[['all','All Plans'],['Starter','Starter'],['Pro','Pro'],['Enterprise','Enterprise']] },
            { label:'Status', value:filterStatus, set:setFilterStatus,
              opts:[['all','All Status'],['active','Active'],['trial','Trial'],['suspended','Suspended']] },
            { label:'Channel', value:filterCh, set:setFilterCh,
              opts:[['all','All Channels'],['wa','WhatsApp'],['ig','Instagram'],['fb','Messenger'],['lc','Live Chat']] },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e=>f.set(e.target.value)}
              style={{ ...inputStyle, width:'auto', cursor:'pointer' }}>
              {f.opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <span style={{ fontSize:12, color:'var(--t4)', marginLeft:'auto' }}>
            {visible.length} result{visible.length!==1?'s':''}
          </span>
        </div>

        {/* Table */}
        <div style={{ borderRadius:14, border:'1px solid var(--b1)', overflow:'hidden',
          background:'var(--bg2)' }}>
          {/* Head */}
          <div style={{ display:'grid',
            gridTemplateColumns:`2fr 100px 140px 80px 100px${SHOW_CREDITS?' 90px':''} 90px 100px`,
            padding:'10px 18px', borderBottom:'1px solid var(--b1)',
            fontSize:11, fontWeight:700, color:'var(--t4)',
            textTransform:'uppercase', letterSpacing:'0.07em', gap:8 }}>
            <span>Client</span><span>Plan</span><span>Channels</span>
            <span style={{ textAlign:'right' }}>Ops</span>
            <span style={{ textAlign:'right' }}>Messages</span>
            {SHOW_CREDITS && <span style={{ textAlign:'right' }}>Credits</span>}
            <span style={{ textAlign:'center' }}>Status</span>
            <span style={{ textAlign:'right' }}>MRR</span>
          </div>

          {visible.length === 0 && (
            <div style={{ padding:'40px', textAlign:'center', color:'var(--t4)', fontSize:13 }}>
              No clients match your filters
            </div>
          )}

          {visible.map((c, i) => (
            <div key={c.id}
              onClick={() => openClient(c)}
              style={{ display:'grid',
                gridTemplateColumns:`2fr 100px 140px 80px 100px${SHOW_CREDITS?' 90px':''} 90px 100px`,
                padding:'13px 18px', gap:8, alignItems:'center', cursor:'pointer',
                borderBottom: i < visible.length-1 ? '1px solid var(--b1)' : 'none',
                transition:'background 0.12s',
                background:'transparent' }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--s1)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>

              {/* Client */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
                  background:`linear-gradient(135deg,${PLAN_COLORS[c.plan]}30,${PLAN_COLORS[c.plan]}10)`,
                  border:`1px solid ${PLAN_COLORS[c.plan]}25`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14, fontWeight:800, color:PLAN_COLORS[c.plan] }}>
                  {c.name[0]}
                </div>
                <div style={{ minWidth:0 }}>
                  <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)',
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                  <p style={{ fontSize:11.5, color:'var(--t4)' }}>{c.domain}</p>
                </div>
              </div>

              {/* Plan */}
              <Pill color={PLAN_COLORS[c.plan]}>{c.plan}</Pill>

              {/* Channels */}
              <div style={{ display:'flex', gap:4 }}>
                {Object.entries(c.channels).map(([key,val]) => (
                  <span key={key} title={CH_LABELS[key]}
                    style={{ fontSize:14, opacity: val.connected ? 1 : 0.2 }}>
                    {CH_ICONS[key]}
                  </span>
                ))}
              </div>

              {/* Operators */}
              <p style={{ textAlign:'right', fontSize:13, color:'var(--t2)', fontWeight:600 }}>
                {c.operators.length}
              </p>

              {/* Messages */}
              <p style={{ textAlign:'right', fontSize:13, color:'var(--t2)' }}>
                {c.usage.msgs.toLocaleString()}
              </p>

              {/* Credits — hidden until BSP */}
              {SHOW_CREDITS && (
                <p style={{ textAlign:'right', fontSize:13,
                  color: c.usage.creditsBalance < 10 ? '#f87171' : '#34d399', fontWeight:600 }}>
                  ${c.usage.creditsBalance.toFixed(2)}
                </p>
              )}

              {/* Status */}
              <div style={{ display:'flex', justifyContent:'center' }}>
                <Pill color={STATUS_COLORS[c.status]}>
                  {c.status.charAt(0).toUpperCase()+c.status.slice(1)}
                </Pill>
              </div>

              {/* MRR */}
              <p style={{ textAlign:'right', fontSize:14, fontWeight:800, color:'#f59e0b' }}>
                {c.mrr > 0 ? `$${c.mrr}` : 'Trial'}
              </p>
            </div>
          ))}
        </div>

      </div>

      {/* ══════════════ CLIENT DETAIL MODAL ══════════════ */}
      {selected && (
        <Modal open={true} title={selected.name} onClose={()=>setSelected(null)} width={820}>
          <div style={{ display:'flex', flexDirection:'column', gap:0, maxHeight:'75vh', overflowY:'auto', paddingRight:4 }}>

            {/* Status bar */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16,
              padding:'10px 14px', borderRadius:10, background:'var(--s1)',
              border:'1px solid var(--b1)' }}>
              <Pill color={PLAN_COLORS[selected.plan]}>{selected.plan}</Pill>
              <Pill color={STATUS_COLORS[selected.status]}>
                {selected.status.charAt(0).toUpperCase()+selected.status.slice(1)}
              </Pill>
              <span style={{ fontSize:12, color:'var(--t4)' }}>·</span>
              <span style={{ fontSize:12, color:'var(--t4)' }}>Created {selected.created}</span>
              <span style={{ fontSize:12, color:'var(--t4)' }}>·</span>
              <span style={{ fontSize:12, color:'var(--t4)' }}>Last active {selected.lastActive}</span>
              <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                <button onClick={()=>setPlanModal(true)}
                  style={{ fontSize:12, padding:'5px 12px', borderRadius:8, cursor:'pointer',
                    background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
                    color:'#f59e0b', fontWeight:600 }}>
                  Change Plan
                </button>
                <button onClick={()=>toggleStatus(selected.status)}
                  style={{ fontSize:12, padding:'5px 12px', borderRadius:8, cursor:'pointer',
                    background: selected.status==='active' ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)',
                    border: `1px solid ${selected.status==='active' ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)'}`,
                    color: selected.status==='active' ? '#f87171' : '#34d399', fontWeight:600 }}>
                  {selected.status==='active' ? 'Suspend' : 'Activate'}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom:18 }}>
              {['profile','users','channels','operators','usage','billing','edit'].map(t=>(
                <button key={t} className={`tab${detailTab===t?' active':''}`}
                  onClick={()=>{ setDetailTab(t); setEditMode(t==='edit'); }}
                  style={{ textTransform:'capitalize',
                    ...(t==='edit'?{ color:'#fbbf24' }:{}) }}>
                  {t==='edit'?'✏ Edit':t}
                </button>
              ))}
            </div>

            {/* ── Profile tab ── */}
            {detailTab==='profile' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  ['Company Name',  selected.name],
                  ['Contact Email', selected.email],
                  ['Phone',         selected.phone],
                  ['Domain',        selected.domain],
                  ['Country',       { EG:'🇪🇬 Egypt', SA:'🇸🇦 Saudi Arabia', AE:'🇦🇪 UAE' }[selected.country]],
                  ['Plan',          selected.plan],
                  ['MRR',           `$${selected.mrr}/mo`],
                  ['Created',       selected.created],
                  ['Last Active',   selected.lastActive],
                  ['Operators',     selected.operators.length],
                  ['Users',         (CLIENT_USERS[selected.id]||[]).length],
                ].map(([l,v])=>(
                  <div key={l} style={{ display:'flex', alignItems:'center',
                    padding:'10px 14px', borderRadius:9, background:'var(--s1)',
                    border:'1px solid var(--b1)' }}>
                    <span style={{ fontSize:12, color:'var(--t4)', width:150, flexShrink:0 }}>{l}</span>
                    <span style={{ fontSize:13, color:'var(--t2)', fontWeight:500 }}>{v}</span>
                  </div>
                ))}
                {selected.notes && (
                  <div style={{ padding:'12px 14px', borderRadius:9,
                    background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.16)' }}>
                    <p style={{ fontSize:11.5, color:'#fbbf24', fontWeight:600, marginBottom:4 }}>📌 Internal Note</p>
                    <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.5 }}>{selected.notes}</p>
                  </div>
                )}
                <button onClick={()=>setDetailTab('edit')}
                  style={{ padding:'10px', borderRadius:9, background:'rgba(251,191,36,0.08)',
                    border:'1px solid rgba(251,191,36,0.2)', color:'#fbbf24',
                    cursor:'pointer', fontWeight:600, fontSize:13 }}>
                  ✏ Edit This Client
                </button>
              </div>
            )}

            {/* ── Users tab ── */}
            {detailTab==='users' && (
              <UsersTabContent
                clientId={selected.id}
                userSearch={userSearch} setUserSearch={setUserSearch}
                userFilter={userFilter} setUserFilter={setUserFilter}
                userChFilter={userChFilter} setUserChFilter={setUserChFilter}
                selectedUser={selectedUser} setSelectedUser={setSelectedUser}
                inputStyle={inputStyle}
              />
            )}

            {/* ── Edit tab ── */}
            {detailTab==='edit' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                {/* Profile fields */}
                <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--s1)',
                  border:'1px solid var(--b1)' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--t4)', textTransform:'uppercase',
                    letterSpacing:'0.07em', marginBottom:14 }}>Profile</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {[
                      { k:'name',   l:'Company Name'   },
                      { k:'email',  l:'Contact Email'  },
                      { k:'phone',  l:'Phone'          },
                      { k:'domain', l:'Domain'         },
                    ].map(f=>(
                      <div key={f.k}>
                        <label style={{ display:'block', fontSize:12, fontWeight:600,
                          color:'var(--t4)', marginBottom:5 }}>{f.l}</label>
                        <input style={inputStyle} value={editData[f.k]||''}
                          onChange={e=>setEditData(d=>({...d,[f.k]:e.target.value}))} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display:'block', fontSize:12, fontWeight:600,
                        color:'var(--t4)', marginBottom:5 }}>Country</label>
                      <select style={{ ...inputStyle, cursor:'pointer' }} value={editData.country||''}
                        onChange={e=>setEditData(d=>({...d,country:e.target.value}))}>
                        {[['EG','🇪🇬 Egypt'],['SA','🇸🇦 Saudi Arabia'],['AE','🇦🇪 UAE']].map(([v,l])=>(
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop:12 }}>
                    <label style={{ display:'block', fontSize:12, fontWeight:600,
                      color:'var(--t4)', marginBottom:5 }}>Internal Notes</label>
                    <textarea style={{ ...inputStyle, resize:'none', width:'100%' }} rows={3}
                      value={editData.notes||''}
                      onChange={e=>setEditData(d=>({...d,notes:e.target.value}))} />
                  </div>
                </div>

                {/* Channel credential fields */}
                <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--s1)',
                  border:'1px solid var(--b1)' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--t4)', textTransform:'uppercase',
                    letterSpacing:'0.07em', marginBottom:14 }}>Channel Credentials</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {/* WhatsApp */}
                    <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(37,211,102,0.05)',
                      border:'1px solid rgba(37,211,102,0.15)' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'#25D366', marginBottom:10 }}>📱 WhatsApp</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={{ display:'block', fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>Phone Number</label>
                          <input style={inputStyle} value={editData.wa_phone||''}
                            onChange={e=>setEditData(d=>({...d,wa_phone:e.target.value}))} placeholder="+20 100 000 0000" />
                        </div>
                        <div>
                          <label style={{ display:'block', fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>WABA ID</label>
                          <input style={{ ...inputStyle, fontFamily:'monospace', fontSize:12 }} value={editData.wa_wabaId||''}
                            onChange={e=>setEditData(d=>({...d,wa_wabaId:e.target.value}))} placeholder="2398012345" />
                        </div>
                      </div>
                    </div>
                    {/* Instagram */}
                    <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(225,48,108,0.05)',
                      border:'1px solid rgba(225,48,108,0.15)' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'#E1306C', marginBottom:10 }}>📸 Instagram</p>
                      <label style={{ display:'block', fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>Page / Username</label>
                      <input style={inputStyle} value={editData.ig_page||''}
                        onChange={e=>setEditData(d=>({...d,ig_page:e.target.value}))} placeholder="@mybusiness" />
                    </div>
                    {/* Messenger */}
                    <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(0,153,255,0.05)',
                      border:'1px solid rgba(0,153,255,0.15)' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'#0099FF', marginBottom:10 }}>💬 Messenger</p>
                      <label style={{ display:'block', fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>Facebook Page Name</label>
                      <input style={inputStyle} value={editData.fb_page||''}
                        onChange={e=>setEditData(d=>({...d,fb_page:e.target.value}))} placeholder="My Business Page" />
                    </div>
                    {/* Live Chat */}
                    <div style={{ padding:'12px 14px', borderRadius:10, background:'rgba(99,102,241,0.05)',
                      border:'1px solid rgba(99,102,241,0.15)' }}>
                      <p style={{ fontSize:12, fontWeight:700, color:'#6366f1', marginBottom:10 }}>⚡ Live Chat</p>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                          <label style={{ display:'block', fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>Domain</label>
                          <input style={inputStyle} value={editData.lc_domain||''}
                            onChange={e=>setEditData(d=>({...d,lc_domain:e.target.value}))} placeholder="mystore.com" />
                        </div>
                        <div>
                          <label style={{ display:'block', fontSize:11.5, color:'var(--t4)', marginBottom:4 }}>Widget ID</label>
                          <input style={{ ...inputStyle, fontFamily:'monospace', fontSize:12 }} value={editData.lc_widgetId||''}
                            onChange={e=>setEditData(d=>({...d,lc_widgetId:e.target.value}))} placeholder="WGT-001" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operator role management */}
                <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--s1)',
                  border:'1px solid var(--b1)' }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--t4)', textTransform:'uppercase',
                    letterSpacing:'0.07em', marginBottom:14 }}>Operator Roles</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {selected.operators.map((op,idx)=>(
                      <div key={op.email} style={{ display:'flex', alignItems:'center', gap:10,
                        padding:'10px 12px', borderRadius:9, background:'var(--bg2)',
                        border:'1px solid var(--b1)' }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
                          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          color:'#fff', fontWeight:700, fontSize:12 }}>
                          {op.name[0]}
                        </div>
                        <div style={{ flex:1 }}>
                          <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{op.name}</p>
                          <p style={{ fontSize:11.5, color:'var(--t4)' }}>{op.email}</p>
                        </div>
                        {editOpIdx===idx ? (
                          <select defaultValue={op.role}
                            style={{ ...inputStyle, width:'auto', cursor:'pointer' }}
                            onChange={e=>saveOpRole(idx,e.target.value)}
                            autoFocus>
                            {['Agent','Supervisor','Admin'].map(r=>(
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <span style={{ fontSize:11.5, fontWeight:600, padding:'2px 9px',
                              borderRadius:99, background:'rgba(99,102,241,0.1)',
                              color:'#818cf8', border:'1px solid rgba(99,102,241,0.2)' }}>
                              {op.role}
                            </span>
                            <button onClick={()=>setEditOpIdx(idx)}
                              style={{ fontSize:12, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                                background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)',
                                color:'#fbbf24', fontWeight:600 }}>
                              Change
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save / Cancel */}
                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={saveEdit}
                    style={{ flex:1, padding:'12px', borderRadius:10, background:'#6366f1',
                      color:'#fff', border:'none', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                    ✓ Save All Changes
                  </button>
                  <button onClick={()=>setDetailTab('profile')}
                    style={{ padding:'12px 20px', borderRadius:10, background:'var(--s1)',
                      color:'var(--t3)', border:'1px solid var(--b1)', cursor:'pointer', fontSize:13 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Channels tab ── */}
            {detailTab==='channels' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {Object.entries(selected.channels).map(([key,ch])=>(
                  <div key={key} style={{ padding:'14px 16px', borderRadius:12,
                    background:'var(--s1)', border:`1px solid ${ch.connected?CH_COLORS[key]+'30':'var(--b1)'}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:22 }}>{CH_ICONS[key]}</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{CH_LABELS[key]}</p>
                        <p style={{ fontSize:12, color: ch.connected ? '#34d399' : 'var(--t4)' }}>
                          {ch.connected ? '● Connected' : '○ Not connected'}
                          {ch.verified === false && ch.connected && (
                            <span style={{ color:'#fbbf24', marginLeft:8 }}>· ⚠ Unverified</span>
                          )}
                        </p>
                      </div>
                      <button onClick={()=>toggleChannel(key)}
                        style={{ fontSize:12, padding:'5px 12px', borderRadius:8, cursor:'pointer',
                          background: ch.connected ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)',
                          border:`1px solid ${ch.connected ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.2)'}`,
                          color: ch.connected ? '#f87171' : '#34d399', fontWeight:600 }}>
                        {ch.connected ? 'Disconnect' : 'Enable'}
                      </button>
                    </div>
                    {ch.connected && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--b1)',
                        display:'flex', gap:16, flexWrap:'wrap' }}>
                        {ch.phone    && <span style={{ fontSize:12, color:'var(--t4)' }}>📞 {ch.phone}</span>}
                        {ch.wabaId   && <span style={{ fontSize:12, color:'var(--t4)', fontFamily:'monospace' }}>WABA: {ch.wabaId}</span>}
                        {ch.page     && <span style={{ fontSize:12, color:'var(--t4)' }}>🔖 {ch.page}</span>}
                        {ch.domain   && <span style={{ fontSize:12, color:'var(--t4)' }}>🌐 {ch.domain}</span>}
                        {ch.widgetId && <span style={{ fontSize:12, color:'var(--t4)', fontFamily:'monospace' }}>Widget: {ch.widgetId}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Operators tab ── */}
            {detailTab==='operators' && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:4 }}>
                  <button onClick={()=>setNewOpModal(true)}
                    style={{ fontSize:12, padding:'7px 14px', borderRadius:9, cursor:'pointer',
                      background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)',
                      color:'#a5b4fc', fontWeight:600 }}>
                    + Add Operator
                  </button>
                </div>
                {selected.operators.map(op=>(
                  <div key={op.email} style={{ display:'flex', alignItems:'center', gap:12,
                    padding:'12px 14px', borderRadius:10, background:'var(--s1)',
                    border:'1px solid var(--b1)' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0,
                      background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      color:'#fff', fontWeight:700, fontSize:14 }}>
                      {op.name[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13.5, fontWeight:600, color:'var(--t1)' }}>{op.name}</p>
                      <p style={{ fontSize:12, color:'var(--t4)' }}>{op.email}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:99,
                        background:'rgba(99,102,241,0.1)', color:'#818cf8',
                        border:'1px solid rgba(99,102,241,0.2)' }}>{op.role}</span>
                      <p style={{ fontSize:11, color:STATUS_ONLINE[op.status], marginTop:4 }}>
                        ● {op.status} · {op.lastActive}
                      </p>
                    </div>
                    <button onClick={()=>removeOp(op.name)}
                      style={{ fontSize:12, padding:'5px 10px', borderRadius:7, cursor:'pointer',
                        background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.15)',
                        color:'#fca5a5' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* ── Usage tab ── */}
            {detailTab==='usage' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                  {[
                    { l:'Conversations', v:selected.usage.conversations.toLocaleString(), c:'#818cf8' },
                    { l:'Messages Sent', v:selected.usage.msgs.toLocaleString(),          c:'#06b6d4' },
                    { l:'Broadcasts',    v:selected.usage.broadcasts,                      c:'#f59e0b' },
                    { l:'Storage',       v:selected.usage.storage,                         c:'#34d399' },
                  ].map(s=>(
                    <div key={s.l} style={{ padding:'14px', borderRadius:10, background:'var(--s1)',
                      border:'1px solid var(--b1)', textAlign:'center' }}>
                      <p style={{ fontSize:20, fontWeight:800, color:s.c, marginBottom:4 }}>{s.v}</p>
                      <p style={{ fontSize:11.5, color:'var(--t4)' }}>{s.l}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:13, color:'var(--t2)' }}>Conversations limit</span>
                    <span style={{ fontSize:12, color:'var(--t4)' }}>
                      {selected.usage.conversations.toLocaleString()} / {selected.usage.convLimit === 99999 ? 'Unlimited' : selected.usage.convLimit.toLocaleString()}
                    </span>
                  </div>
                  <Bar pct={selected.usage.convLimit===99999 ? 30 : (selected.usage.conversations/selected.usage.convLimit)*100}
                    color={selected.usage.conversations/selected.usage.convLimit > 0.85 ? '#f87171' : '#6366f1'} height={8} />
                </div>
                {/* Broadcast credits — hidden until BSP */}
                {SHOW_CREDITS && (
                  <>
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <span style={{ fontSize:13, color:'var(--t2)' }}>Broadcast credits used</span>
                        <span style={{ fontSize:12, color:'var(--t4)' }}>
                          ${selected.usage.creditsUsed.toFixed(2)} used · ${selected.usage.creditsBalance.toFixed(2)} remaining
                        </span>
                      </div>
                      <Bar pct={(selected.usage.creditsUsed/(selected.usage.creditsUsed+selected.usage.creditsBalance))*100}
                        color='#f59e0b' height={8} />
                    </div>
                    <div style={{ padding:'14px 16px', borderRadius:10,
                      background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.16)' }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#fbbf24', marginBottom:10 }}>
                        Add Broadcast Credits
                      </p>
                      <div style={{ display:'flex', gap:8 }}>
                        <input placeholder="Amount in USD (e.g. 50)" value={addCreditsAmt}
                          onChange={e=>setAddCreditsAmt(e.target.value)} type="number" min="1"
                          style={{ ...inputStyle, flex:1 }} />
                        <button onClick={addCredits}
                          style={{ padding:'9px 18px', borderRadius:9, cursor:'pointer',
                            background:'#f59e0b', color:'#000', border:'none', fontWeight:700, fontSize:13 }}>
                          Add
                        </button>
                      </div>
                      <div style={{ display:'flex', gap:8, marginTop:8 }}>
                        {[10,25,50,100].map(a=>(
                          <button key={a} onClick={()=>setAddCreditsAmt(String(a))}
                            style={{ flex:1, padding:'6px', borderRadius:8, cursor:'pointer',
                              background:'var(--s1)', border:'1px solid var(--b1)',
                              color:'var(--t3)', fontSize:12 }}>
                            +${a}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Billing tab ── */}
            {detailTab==='billing' && (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ padding:'14px 16px', borderRadius:10, background:'var(--s1)',
                  border:'1px solid var(--b1)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <p style={{ fontSize:13, color:'var(--t4)', marginBottom:4 }}>Current Plan</p>
                    <span style={{ fontSize:18, fontWeight:800, color:PLAN_COLORS[selected.plan] }}>
                      {selected.plan}
                    </span>
                    <span style={{ fontSize:13, color:'var(--t4)', marginLeft:8 }}>
                      ${selected.mrr}/month
                    </span>
                  </div>
                  <button onClick={()=>setPlanModal(true)}
                    style={{ fontSize:12, padding:'7px 14px', borderRadius:9, cursor:'pointer',
                      background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
                      color:'#f59e0b', fontWeight:600 }}>
                    Change Plan
                  </button>
                </div>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--t4)',
                  textTransform:'uppercase', letterSpacing:'0.07em' }}>Invoice History</p>
                {selected.invoices.length === 0 && (
                  <p style={{ fontSize:13, color:'var(--t4)', padding:'16px 0' }}>No invoices yet.</p>
                )}
                {selected.invoices.map(inv=>(
                  <div key={inv.id} style={{ display:'flex', alignItems:'center', gap:12,
                    padding:'12px 14px', borderRadius:9, background:'var(--s1)',
                    border:`1px solid ${inv.status==='unpaid'?'rgba(239,68,68,0.2)':'var(--b1)'}` }}>
                    <span style={{ fontSize:13, fontFamily:'monospace', color:'#818cf8', fontWeight:600 }}>
                      {inv.id}
                    </span>
                    <span style={{ fontSize:12.5, color:'var(--t3)', flex:1 }}>{inv.date}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:'var(--t1)' }}>${inv.amount}</span>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                      background: inv.status==='paid' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                      color: inv.status==='paid' ? '#34d399' : '#f87171',
                      border:`1px solid ${inv.status==='paid' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                      {inv.status.toUpperCase()}
                    </span>
                    {inv.status==='unpaid' && (
                      <button onClick={()=>toast.success(`Payment link sent for ${inv.id}`)}
                        style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                          background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
                          color:'#f87171', fontWeight:600 }}>
                        Send Reminder
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </Modal>
      )}

      {/* ── Change Plan Modal ── */}
      {planModal && selected && (
        <Modal open={true} title="Change Plan" onClose={()=>setPlanModal(false)} width={420}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { plan:'Starter',    price:49,  desc:'1,000 conversations · 2 operators' },
              { plan:'Pro',        price:149, desc:'10,000 conversations · 10 operators' },
              { plan:'Enterprise', price:299, desc:'Unlimited conversations & operators' },
            ].map(p=>(
              <button key={p.plan} onClick={()=>changePlan(p.plan)}
                style={{ padding:'14px 16px', borderRadius:10, cursor:'pointer', textAlign:'left',
                  background: selected.plan===p.plan ? `${PLAN_COLORS[p.plan]}15` : 'var(--s1)',
                  border:`1px solid ${selected.plan===p.plan ? PLAN_COLORS[p.plan]+'40' : 'var(--b1)'}`,
                  display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:PLAN_COLORS[p.plan], marginBottom:3 }}>
                    {p.plan} {selected.plan===p.plan && '(current)'}
                  </p>
                  <p style={{ fontSize:12, color:'var(--t4)' }}>{p.desc}</p>
                </div>
                <span style={{ fontSize:16, fontWeight:800, color:'var(--t1)' }}>${p.price}/mo</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* ── Add Operator Modal ── */}
      {newOpModal && (
        <Modal open={true} title="Add Operator" onClose={()=>setNewOpModal(false)} width={400}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[{ k:'name', label:'Full Name', ph:'Ahmed Mohamed' },
              { k:'email', label:'Email', ph:'agent@client.com' }].map(f=>(
              <div key={f.k}>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t4)', marginBottom:5 }}>
                  {f.label}
                </label>
                <input style={inputStyle} placeholder={f.ph} value={newOp[f.k]}
                  onChange={e=>setNewOp(o=>({...o,[f.k]:e.target.value}))} />
              </div>
            ))}
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'var(--t4)', marginBottom:5 }}>
                Role
              </label>
              <select style={{ ...inputStyle, cursor:'pointer' }} value={newOp.role}
                onChange={e=>setNewOp(o=>({...o,role:e.target.value}))}>
                {['Agent','Supervisor','Admin'].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:10, marginTop:4 }}>
              <button onClick={()=>setNewOpModal(false)}
                style={{ flex:1, padding:'10px', borderRadius:9, background:'var(--s1)',
                  border:'1px solid var(--b1)', color:'var(--t3)', cursor:'pointer' }}>Cancel</button>
              <button onClick={addOperator}
                style={{ flex:1, padding:'10px', borderRadius:9, background:'#6366f1',
                  border:'none', color:'#fff', cursor:'pointer', fontWeight:600 }}>Add Operator</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
