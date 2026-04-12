'use client';
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { io } from 'socket.io-client';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://selligentai-production.up.railway.app';

function playNotif() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Two-tone chime
    [0, 0.18].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 880 : 1100;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.36);
    });
  } catch {}
}

/* -- Static data ------------------------------------------------------------ */
const CONVS = [
  { id:'1', name:'Ahmed Mohamed', ch:'whatsapp',  last:'عايز أطلب اتنين',      ago:'2m',  score:91, intent:'ready_to_buy',   unread:2 },
  { id:'2', name:'Sara Khalil',   ch:'instagram', last:'Is this in red?',        ago:'8m',  score:62, intent:'interested',      unread:0 },
  { id:'3', name:'Omar Hassan',   ch:'messenger', last:'السعر عالي شوية',        ago:'15m', score:38, intent:'price_objection', unread:1 },
  { id:'4', name:'Layla Samir',   ch:'livechat',  last:'Do you ship to UAE?',    ago:'22m', score:55, intent:'inquiry',         unread:0 },
  { id:'5', name:'Youssef Ali',   ch:'whatsapp',  last:'تمام خلاص هطلب',         ago:'35m', score:88, intent:'ready_to_buy',   unread:3 },
  { id:'6', name:'Nour Adel',     ch:'instagram', last:'What sizes available?',  ago:'1h',  score:44, intent:'inquiry',         unread:0 },
];

const MSGS = {
  '1': [
    { id:'a', dir:'in',  text:'السلام عليكم', at:'10:00', by:'customer' },
    { id:'b', dir:'out', text:'أهلاً بيك! كيف أقدر أساعدك؟', at:'10:01', by:'agent' },
    { id:'c', dir:'in',  text:'كم سعر المنتج؟', at:'10:02', by:'customer' },
    { id:'d', dir:'out', text:'السعر ٢٩٩ جنيه وعندنا خصم ١٥٪ الأسبوع ده 🎉', at:'10:03', by:'ai' },
    { id:'e', dir:'in',  type:'image',
      url:'https://placehold.co/320x220/1a1a2e/818cf8?text=Product+Photo',
      fileName:'product_photo.jpg', text:'', at:'10:04', by:'customer' },
    { id:'f', dir:'in',  text:'عايز أطلب اتنين', at:'10:05', by:'customer' },
  ],
  '2': [
    { id:'a', dir:'in',  text:'Hi, is this available in red?', at:'9:40', by:'customer' },
    { id:'b', dir:'out', text:'Yes! We have red, blue and white in stock 😊', at:'9:41', by:'ai' },
    { id:'c', dir:'in',  type:'file',
      url:'#', fileName:'size_guide.pdf', fileSize:'245 KB', text:'', at:'9:42', by:'customer' },
    { id:'d', dir:'in',  text:'Great, what sizes do you have?', at:'9:43', by:'customer' },
  ],
};

const DEFAULT_CANNED = [
  { id:'c1', title:'Welcome',        shortcut:'/hi',     text:'أهلاً وسهلاً! كيف أقدر أساعدك اليوم؟ 😊' },
  { id:'c2', title:'Shipping Info',  shortcut:'/ship',   text:'بنوصل لكل مناطق مصر والسعودية والإمارات. وقت التوصيل من ٢ إلى ٥ أيام عمل 📦' },
  { id:'c3', title:'Discount Offer', shortcut:'/disc',   text:'عندنا خصم ١٥٪ على كل الأوردرات فوق ٥٠٠ جنيه. استخدم كود SAVE15 عند الدفع 🎉' },
  { id:'c4', title:'Payment',        shortcut:'/pay',    text:'بنقبل كاش عند الاستلام، فيزا، ماستركارد، وفودافون كاش 💳' },
  { id:'c5', title:'Return Policy',  shortcut:'/return', text:'بنقبل الإرجاع خلال ١٤ يوم من الاستلام بشرط المنتج في حالته الأصلية 🔄' },
];

const AGENTS   = ['Ahmed Mohamed','Sara Khalil','Omar Hassan','Unassigned'];
const TAGS     = ['VIP','Follow Up','Discount','Urgent','Refund','New Lead'];
const CH_ICON  = { whatsapp:'📱', instagram:'📸', messenger:'💬', livechat:'⚡' };
const CH_COLOR = { whatsapp:'#25D366', instagram:'#E1306C', messenger:'#0099FF', livechat:'#6366f1' };
const IC_COLOR = { ready_to_buy:'#10b981', interested:'#6366f1', price_objection:'#f59e0b',
                   inquiry:'#94a3b8', complaint:'#ef4444', other:'#64748b' };
const SUGGESTIONS = {
  '1': { text:'ممتاز! هجهزلك الطلب دلوقتي. المجموع ٥٩٨ جنيه. هتدفع كاش ولا أونلاين؟ 🛍️', conf:0.94 },
  '2': { text:'We have sizes S, M, L and XL available. Which size would you like?', conf:0.88 },
  default: { text:'شكراً على تواصلك! أنا هساعدك فوراً.', conf:0.80 },
};
const AUTO_REPLIES = {
  '1': 'هجهزلك الطلبين دلوقتي! محتاج منك عنوان التوصيل من فضلك 📦',
  '2': 'Great choice! We have S, M, L and XL. The red one is very popular this season 🔴',
  default: 'شكراً على تواصلك! سأرد عليك في أقرب وقت 🙏',
};

/* -- Message renderer ----------------------------------------------------─-- */
function MsgContent({ m }) {
  if (m.type === 'image') {
    return (
      <div>
        <a href={m.url} target="_blank" rel="noreferrer">
          <img src={m.url} alt={m.fileName || 'image'}
            style={{ maxWidth:240, maxHeight:200, borderRadius:10, display:'block',
              objectFit:'cover', cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)' }} />
        </a>
        {m.text && <p style={{ marginTop:6, fontSize:13 }} dir="auto">{m.text}</p>}
        <p style={{ fontSize:10, color:'var(--t4)', marginTop:4 }}>{m.fileName}</p>
      </div>
    );
  }
  if (m.type === 'file') {
    return (
      <a href={m.url} download={m.fileName}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'4px 2px',
          textDecoration:'none', color:'inherit' }}>
        <div style={{ width:36, height:36, borderRadius:9, background:'rgba(99,102,241,0.15)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:18 }}>
          📄
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap',
            overflow:'hidden', textOverflow:'ellipsis' }}>{m.fileName}</p>
          {m.fileSize && <p style={{ fontSize:11, color:'var(--t4)', marginTop:1 }}>{m.fileSize}</p>}
        </div>
        <span style={{ fontSize:16, color:'#818cf8', flexShrink:0 }}>↓</span>
      </a>
    );
  }
  return <span dir="auto">{m.text}</span>;
}

/* -- Page ----------------------------------------------------------------─-- */
export default function ConversationsPage() {
  const [convs, setConvs]           = useState(CONVS);
  const [active, setActive]         = useState(CONVS[0]);
  const [msgs, setMsgs]             = useState(MSGS['1'] || []);
  const [reply, setReply]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [showPanel, setShow]        = useState(true);
  const [tags, setTags]             = useState({ '1': ['VIP'], '2': [] });
  const [assignedTo, setAssignedTo] = useState({});
  const [liveConvs, setLiveConvs]   = useState([]);   // real WhatsApp conversations
  const [activeLive, setActiveLive] = useState(null); // active live conversation
  const [liveMsgs, setLiveMsgs]     = useState([]);   // messages for active live conv
  const [liveSuggestion, setLiveSuggestion] = useState(null);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  /* AI */
  const [aiAutoReply, setAiAutoReply] = useState({});
  const [aiThinking, setAiThinking]   = useState(false);
  const autoReplyTimers               = useRef({});

  /* -- Socket.io + live conversations -- */
  useEffect(() => {
    // Load existing live conversations (polling fallback)
    let prevIds = new Set();
    let prevUnread = {};
    function fetchConvs() {
      fetch(`${API}/api/live/conversations`)
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          setLiveConvs(data);
          // Play sound if a new conversation appeared OR unread count increased
          const newConv = data.some(c => !prevIds.has(c.id));
          const moreUnread = data.some(c => (c.unread || 0) > (prevUnread[c.id] || 0));
          if ((newConv || moreUnread) && prevIds.size > 0) playNotif();
          prevIds = new Set(data.map(c => c.id));
          prevUnread = Object.fromEntries(data.map(c => [c.id, c.unread || 0]));
        })
        .catch(() => {});
    }
    fetchConvs();
    // Poll every 5 seconds as fallback
    const pollTimer = setInterval(fetchConvs, 5000);

    // Connect Socket.io
    const socket = io(API, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => console.log('[Socket] connected'));

    socket.on('whatsapp:message', ({ conversation, message }) => {
      // Add/update conversation in list
      setLiveConvs(prev => {
        const exists = prev.find(c => c.id === conversation.id);
        if (exists) {
          return prev.map(c => c.id === conversation.id
            ? { ...c, lastMessage: message.content, updatedAt: Date.now(), unread: (c.unread || 0) + 1 }
            : c
          );
        }
        return [conversation, ...prev];
      });

      // If this conversation is currently open, add message
      setActiveLive(current => {
        if (current?.id === conversation.id) {
          setLiveMsgs(m => [...m, message]);
        }
        return current;
      });

      playNotif();
      toast(`📱 New WhatsApp from ${conversation.customerName}`, { duration: 4000 });
    });

    socket.on('whatsapp:ai', ({ conversation_id, intent, lead_score, suggested_reply }) => {
      // Update conversation score/intent
      setLiveConvs(prev => prev.map(c =>
        c.id === conversation_id ? { ...c, intent, score: lead_score } : c
      ));
      // Show suggestion if this conv is active
      setActiveLive(current => {
        if (current?.id === conversation_id) {
          setLiveSuggestion({ text: suggested_reply, score: lead_score, intent });
        }
        return current;
      });
    });

    return () => { socket.disconnect(); clearInterval(pollTimer); };
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMsgs]);

  async function openLiveConv(conv) {
    setActiveLive(conv);
    setLiveSuggestion(null);
    // Load messages
    try {
      const r = await fetch(`${API}/api/live/conversations/${encodeURIComponent(conv.id)}/messages`);
      const data = await r.json();
      setLiveMsgs(Array.isArray(data) ? data : []);
      // Mark as read
      fetch(`${API}/api/live/conversations/${encodeURIComponent(conv.id)}/read`, { method: 'POST' });
      setLiveConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c));
    } catch {}
  }

  async function sendLiveReply(text) {
    if (!text.trim() || !activeLive) return;
    // Send via WhatsApp API
    try {
      const res = await fetch(`${API}/api/live/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activeLive.customerPhone,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const outMsg = {
          id: `out_${Date.now()}`,
          direction: 'outbound',
          content: text,
          type: 'text',
          sent_by: 'agent',
          at: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' }),
        };
        setLiveMsgs(m => [...m, outMsg]);
        setLiveConvs(prev => prev.map(c => c.id === activeLive.id ? { ...c, lastMessage: text } : c));
        setLiveSuggestion(null);
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch { toast.error('Connection error'); }
  }

  /* Canned replies */
  const [cannedReplies, setCannedReplies]     = useState(DEFAULT_CANNED);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearch, setCannedSearch]         = useState('');
  const [cannedMgmtModal, setCannedMgmtModal]   = useState(false);
  const [cannedFormMode, setCannedFormMode]     = useState(null); // null | 'add' | { ...item }
  const [cannedForm, setCannedForm]             = useState({ title:'', shortcut:'', text:'' });

  /* File upload */
  const fileInputRef  = useRef(null);
  const imageInputRef = useRef(null);

  /* Modals */
  const [assignModal, setAssignModal]   = useState(false);
  const [closeModal, setCloseModal]     = useState(false);
  const [tagModal, setTagModal]         = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [tagInput, setTagInput]         = useState('');
  const endRef = useRef(null);

  const sugg      = SUGGESTIONS[active?.id] || SUGGESTIONS.default;
  const isAutoOn  = aiAutoReply[active?.id] || false;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);
  useEffect(() => () => Object.values(autoReplyTimers.current).forEach(clearTimeout), []);

  /* Close canned picker when clicking outside */
  useEffect(() => {
    function handler(e) {
      if (!e.target.closest('[data-canned-area]')) setShowCannedPicker(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectConv(c) {
    setActive(c);
    setMsgs(MSGS[c.id] || []);
    setShowCannedPicker(false);
  }

  function toggleAutoReply() {
    const val = !isAutoOn;
    setAiAutoReply(a => ({ ...a, [active.id]: val }));
    if (val) { toast.success('AI Auto-Reply enabled', { icon:'🤖' }); }
    else {
      clearTimeout(autoReplyTimers.current[active.id]);
      delete autoReplyTimers.current[active.id];
      toast('AI Auto-Reply paused', { icon:'👤' });
    }
  }

  function send(e) {
    e?.preventDefault();
    if (!reply.trim()) return;
    setMsgs(m => [...m, {
      id: Date.now()+'', dir:'out', text:reply,
      at: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), by:'agent',
    }]);
    setReply('');
    setShowCannedPicker(false);
  }

  function handleFileSelect(e, forceType) {
    const file = e.target.files[0];
    if (!file) return;
    const isImage = forceType === 'image' || file.type.startsWith('image/');
    const url = URL.createObjectURL(file);
    setMsgs(m => [...m, {
      id: Date.now()+'', dir:'out',
      type: isImage ? 'image' : 'file',
      url, fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(0)} KB`,
      text: '',
      at: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
      by:'agent',
    }]);
    e.target.value = '';
    toast.success(isImage ? '🖼 Image sent' : '📄 File sent');
  }

  function simulateIncoming() {
    const customerMsg = {
      id: Date.now()+'', dir:'in',
      text: active.id === '1' ? 'هل ممكن الدفع عند الاستلام؟' : 'Can I get a discount?',
      at: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}), by:'customer',
    };
    setMsgs(m => [...m, customerMsg]);
    if (aiAutoReply[active.id]) {
      setAiThinking(true);
      autoReplyTimers.current[active.id] = setTimeout(() => {
        setAiThinking(false);
        setMsgs(m => [...m, {
          id: Date.now()+'', dir:'out',
          text: AUTO_REPLIES[active.id] || AUTO_REPLIES.default,
          at: new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'}),
          by:'ai', auto:true,
        }]);
        toast.success('AI auto-replied', { icon:'🤖', duration:2000 });
      }, 1800);
    }
  }

  /* Canned reply helpers */
  function insertCanned(text) {
    setReply(text);
    setShowCannedPicker(false);
    setCannedSearch('');
  }

  function openAddCanned() {
    setCannedForm({ title:'', shortcut:'', text:'' });
    setCannedFormMode('add');
  }

  function openEditCanned(item) {
    setCannedForm({ title:item.title, shortcut:item.shortcut, text:item.text });
    setCannedFormMode(item);
  }

  function saveCanned() {
    if (!cannedForm.title.trim() || !cannedForm.text.trim()) {
      toast.error('Title and message are required'); return;
    }
    if (cannedFormMode === 'add') {
      setCannedReplies(r => [...r, { id:'c'+Date.now(), ...cannedForm }]);
      toast.success('Canned reply added');
    } else {
      setCannedReplies(r => r.map(x => x.id === cannedFormMode.id ? { ...x, ...cannedForm } : x));
      toast.success('Canned reply updated');
    }
    setCannedFormMode(null);
  }

  function deleteCanned(id) {
    setCannedReplies(r => r.filter(x => x.id !== id));
    toast.success('Deleted');
  }

  const filteredCanned = cannedReplies.filter(c =>
    !cannedSearch ||
    c.title.toLowerCase().includes(cannedSearch.toLowerCase()) ||
    c.shortcut.toLowerCase().includes(cannedSearch.toLowerCase()) ||
    c.text.toLowerCase().includes(cannedSearch.toLowerCase())
  );

  function assignAgent(agent) {
    setAssignedTo(a => ({ ...a, [active.id]: agent }));
    setAssignModal(false);
    toast.success(`Assigned to ${agent}`);
  }

  function closeDeal() {
    setActive(a => ({ ...a, intent:'ready_to_buy', score:100 }));
    setCloseModal(false);
    toast.success('Deal marked as Won! 🎉');
  }

  function addTag(tag) {
    setTags(t => ({ ...t, [active.id]: [...new Set([...(t[active.id]||[]), tag])] }));
    setTagInput('');
    toast.success(`Tag "${tag}" added`);
  }

  const filtered      = convs.filter(c => {
    if (filter !== 'all' && c.ch !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const activeTags    = tags[active?.id] || [];
  const currentAgent  = assignedTo[active?.id] || 'Unassigned';

  /* -- Render ------------------------------------------------------------─-- */
  return (
    <>
      {/* hidden file inputs */}
      <input ref={fileInputRef} type="file" style={{ display:'none' }}
        onChange={e => handleFileSelect(e, 'file')} />
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display:'none' }}
        onChange={e => handleFileSelect(e, 'image')} />

      <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

        {/* -- Conversation list ------------------------------------------ */}
        <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column',
          borderRight:'1px solid var(--b1)', background:'var(--bg2)', overflow:'hidden' }}>

          <div style={{ padding:'14px 14px 10px' }}>
            <input className="input" style={{ fontSize:13 }}
              placeholder="Search conversations…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ display:'flex', gap:4, marginTop:10, flexWrap:'wrap' }}>
              {['all','whatsapp','instagram','messenger','livechat'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{
                    fontSize:11, padding:'4px 10px', borderRadius:99, fontWeight:600,
                    cursor:'pointer', border:'1px solid',
                    background: filter===f ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color:       filter===f ? '#a5b4fc' : 'var(--t4)',
                    borderColor: filter===f ? 'rgba(99,102,241,0.3)' : 'var(--b1)',
                    transition:'all 0.15s',
                  }}>
                  {f === 'all' ? 'All' : CH_ICON[f]}
                </button>
              ))}
            </div>
          </div>
          <div style={{ borderBottom:'1px solid var(--b1)', marginBottom:2 }} />
          <div style={{ flex:1, overflowY:'auto' }}>

            {/* Live WhatsApp conversations — top of list */}
            {liveConvs.length > 0 && (
              <>
                <div style={{ padding:'6px 14px 4px', fontSize:10, fontWeight:700,
                  color:'#25D366', letterSpacing:'0.08em', textTransform:'uppercase',
                  display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#25D366',
                    display:'inline-block', animation:'blink 1.5s ease-in-out infinite' }} />
                  Live
                </div>
                {liveConvs.map(conv => (
                  <div key={conv.id}
                    onClick={() => openLiveConv(conv)}
                    style={{ padding:'11px 14px', cursor:'pointer', transition:'background 0.1s',
                      borderBottom:'1px solid rgba(255,255,255,0.04)',
                      background: activeLive?.id === conv.id ? 'rgba(37,211,102,0.08)' : 'transparent',
                      borderLeft: activeLive?.id === conv.id ? '3px solid #25D366' : '3px solid transparent' }}
                    onMouseEnter={e => { if (activeLive?.id !== conv.id) e.currentTarget.style.background = 'var(--s1)'; }}
                    onMouseLeave={e => { if (activeLive?.id !== conv.id) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                      <div style={{ position:'relative', flexShrink:0 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%',
                          background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.3)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontWeight:700, fontSize:13, color:'#25D366' }}>
                          {conv.customerName?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ position:'absolute', bottom:-1, right:-2, fontSize:11 }}>📱</span>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'var(--t1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{conv.customerName}</span>
                          {conv.unread > 0 && <span style={{ fontSize:10, fontWeight:700, background:'#25D366', color:'#000', borderRadius:99, padding:'1px 6px', flexShrink:0, marginLeft:4 }}>{conv.unread}</span>}
                        </div>
                        <div style={{ fontSize:11.5, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} dir="auto">{conv.lastMessage || '…'}</div>
                        {conv.intent && conv.intent !== 'inquiry' && (
                          <div style={{ marginTop:3 }}>
                            <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:99,
                              background:`${IC_COLOR[conv.intent]||'#64748b'}15`, color:IC_COLOR[conv.intent]||'#64748b',
                              border:`1px solid ${IC_COLOR[conv.intent]||'#64748b'}25` }}>
                              {conv.intent.replace(/_/g,' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ padding:'5px 14px 4px', fontSize:10, fontWeight:700,
                  color:'var(--t4)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  Demo
                </div>
              </>
            )}

            {filtered.map(c => (
              <div key={c.id} onClick={() => selectConv(c)}
                style={{
                  padding:'13px 14px', cursor:'pointer',
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                  background: active?.id===c.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  borderLeft: active?.id===c.id ? '2px solid #6366f1' : '2px solid transparent',
                  transition:'background 0.12s',
                }}
                onMouseEnter={e => { if (active?.id!==c.id) e.currentTarget.style.background='var(--s1)'; }}
                onMouseLeave={e => { if (active?.id!==c.id) e.currentTarget.style.background='transparent'; }}
              >
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ position:'relative', flexShrink:0 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%',
                      background:'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.18))',
                      display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:14 }}>
                      {c.name[0]}
                    </div>
                    <span style={{ position:'absolute', bottom:-2, right:-2, fontSize:11 }}>{CH_ICON[c.ch]}</span>
                    {aiAutoReply[c.id] && (
                      <span style={{ position:'absolute', top:-2, right:-2, width:10, height:10,
                        borderRadius:'50%', background:'#67e8f9', border:'1.5px solid var(--bg2)' }} />
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontWeight:600, fontSize:13.5, color:'var(--t1)' }}>{c.name}</span>
                      <span style={{ fontSize:11, color:'var(--t4)', flexShrink:0 }}>{c.ago}</span>
                    </div>
                    <p style={{ fontSize:12.5, color:'var(--t3)', overflow:'hidden',
                      textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:6 }}
                      dir="auto">{c.last}</p>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10.5, fontWeight:600, padding:'2px 7px', borderRadius:99,
                        background:`${IC_COLOR[c.intent]||'#64748b'}12`, color:IC_COLOR[c.intent]||'#64748b',
                        border:`1px solid ${IC_COLOR[c.intent]||'#64748b'}20` }}>
                        {c.intent.replace(/_/g,' ')}
                      </span>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ width:32, height:3, borderRadius:99, background:'var(--s3)' }}>
                          <div style={{ height:3, borderRadius:99,
                            background: c.score>70?'#10b981': c.score>40?'#f59e0b':'#ef4444',
                            width:`${c.score}%` }} />
                        </div>
                        <span style={{ fontSize:11, fontWeight:700,
                          color: c.score>70?'#10b981': c.score>40?'#f59e0b':'#ef4444' }}>{c.score}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* -- Chat area ----------------------------------------------─-- */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

          {/* -- Live WhatsApp chat -- */}
          {activeLive ? (
            <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
              {/* Header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'0 16px', borderBottom:'1px solid var(--b1)', background:'var(--bg2)',
                minHeight:56, flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(37,211,102,0.15)',
                    border:'1px solid rgba(37,211,102,0.3)', display:'flex', alignItems:'center',
                    justifyContent:'center', fontWeight:700, color:'#25D366' }}>
                    {activeLive.customerName?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:'var(--t1)' }}>{activeLive.customerName}</p>
                    <p style={{ fontSize:12, color:'#25D366' }}>📱 WhatsApp · {activeLive.customerPhone}</p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  {activeLive.score > 0 && (
                    <div style={{ padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:700,
                      background: activeLive.score > 70 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                      color: activeLive.score > 70 ? '#34d399' : '#fbbf24' }}>
                      Score {activeLive.score}
                    </div>
                  )}
                  {activeLive.intent && (
                    <div style={{ padding:'4px 12px', borderRadius:99, fontSize:11, fontWeight:600,
                      background:'rgba(99,102,241,0.1)', color:'#a5b4fc' }}>
                      {activeLive.intent.replace(/_/g,' ')}
                    </div>
                  )}
                  <button onClick={() => { setActiveLive(null); setLiveMsgs([]); }}
                    style={{ padding:'6px 14px', borderRadius:8, border:'1px solid var(--b1)',
                      background:'var(--s1)', color:'var(--t3)', cursor:'pointer', fontSize:12 }}>
                    ← Back
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:10 }}>
                {liveMsgs.length === 0 && (
                  <div style={{ textAlign:'center', color:'var(--t4)', fontSize:13, marginTop:40 }}>
                    No messages yet. Waiting for customer…
                  </div>
                )}
                {liveMsgs.map((m, i) => (
                  <div key={m.id || i} style={{ display:'flex', justifyContent: m.direction === 'outbound' ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth:'68%', padding:'10px 14px', borderRadius: m.direction === 'outbound' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: m.direction === 'outbound' ? '#6366f1' : 'var(--bg3)',
                      border: m.direction === 'outbound' ? 'none' : '1px solid var(--b1)',
                      color: m.direction === 'outbound' ? '#fff' : 'var(--t1)' }}>
                      <p style={{ fontSize:14, lineHeight:1.5 }} dir="auto">{m.content}</p>
                      <p style={{ fontSize:10, opacity:0.6, marginTop:4, textAlign:'right' }}>{m.at}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* AI suggestion */}
              {liveSuggestion && (
                <div style={{ margin:'0 16px', padding:'12px 16px', borderRadius:12,
                  background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.2)',
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#a5b4fc', marginBottom:4 }}>🤖 AI Suggestion</p>
                    <p style={{ fontSize:13, color:'var(--t2)' }} dir="auto">{liveSuggestion.text}</p>
                  </div>
                  <button onClick={() => { sendLiveReply(liveSuggestion.text); setLiveSuggestion(null); }}
                    style={{ padding:'8px 16px', borderRadius:8, background:'#6366f1', color:'#fff',
                      border:'none', cursor:'pointer', fontWeight:600, fontSize:12, flexShrink:0 }}>
                    Use Reply
                  </button>
                </div>
              )}

              {/* Reply box */}
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--b1)', display:'flex', gap:10 }}>
                <input
                  className="input" style={{ flex:1, fontSize:14 }}
                  placeholder="Type a reply…"
                  id="live-reply-input"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const el = document.getElementById('live-reply-input'); sendLiveReply(el.value); el.value = ''; }}}
                />
                <button
                  onClick={() => { const el = document.getElementById('live-reply-input'); sendLiveReply(el.value); el.value = ''; }}
                  style={{ padding:'10px 20px', borderRadius:10, background:'#25D366', color:'#000',
                    border:'none', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                  Send 📱
                </button>
              </div>
            </div>
          ) : active ? (
            <>
              {/* Chat header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'0 16px', borderBottom:'1px solid var(--b1)', flexShrink:0,
                background:'var(--bg2)', minHeight:56, gap:8, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:34, height:34, borderRadius:'50%',
                    background:'linear-gradient(135deg,rgba(99,102,241,0.22),rgba(139,92,246,0.18))',
                    display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>
                    {active.name[0]}
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:'var(--t1)', lineHeight:1.2 }}>{active.name}</p>
                    <p style={{ fontSize:12, color:CH_COLOR[active.ch], marginTop:2 }}>
                      {CH_ICON[active.ch]} {active.ch}
                      {currentAgent !== 'Unassigned' && (
                        <span style={{ color:'var(--t4)', marginLeft:8 }}>· {currentAgent}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px',
                    borderRadius:99, border:`1px solid ${isAutoOn ? 'rgba(6,182,212,0.35)' : 'var(--b1)'}`,
                    background: isAutoOn ? 'rgba(6,182,212,0.08)' : 'var(--s1)' }}>
                    <span style={{ fontSize:11.5, fontWeight:600, color: isAutoOn ? '#67e8f9' : 'var(--t4)' }}>
                      {isAutoOn ? '🤖 AI Active' : '👤 Manual'}
                    </span>
                    <div className={`toggle${isAutoOn?' on':''}`} style={{ transform:'scale(0.8)' }}
                      onClick={toggleAutoReply} />
                  </div>
                  <div style={{ fontSize:11, color:IC_COLOR[active.intent],
                    background:`${IC_COLOR[active.intent]}10`, border:`1px solid ${IC_COLOR[active.intent]}22`,
                    padding:'4px 10px', borderRadius:99, fontWeight:600 }}>
                    {active.intent.replace(/_/g,' ')}
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, background:'var(--s2)',
                    border:'1px solid var(--b1)', padding:'4px 10px', borderRadius:99,
                    color: active.score>70?'#34d399': active.score>40?'#fcd34d':'#fca5a5' }}>
                    {active.score}
                  </div>
                  <button className="btn btn-ghost btn-xs" onClick={() => setAssignModal(true)}>Assign</button>
                  <button className="btn btn-primary btn-xs" onClick={() => setCloseModal(true)}>✓ Close</button>
                  <button onClick={() => setShow(v => !v)} className="btn btn-ghost btn-xs">{showPanel?'→':'←'}</button>
                </div>
              </div>

              {/* AI Auto-reply banner */}
              {isAutoOn && (
                <div style={{ background:'rgba(6,182,212,0.06)', borderBottom:'1px solid rgba(6,182,212,0.15)',
                  padding:'8px 20px', display:'flex', alignItems:'center', justifyContent:'space-between',
                  fontSize:12.5, flexShrink:0 }}>
                  <span style={{ color:'#67e8f9', display:'flex', alignItems:'center', gap:7 }}>
                    <span className="anim-pulse" style={{ width:7, height:7, borderRadius:'50%',
                      background:'#67e8f9', display:'inline-block' }} />
                    <strong>AI Agent is handling this conversation</strong> — replies sent automatically
                  </span>
                  <button onClick={toggleAutoReply}
                    style={{ fontSize:12, color:'#fca5a5', background:'rgba(239,68,68,0.08)',
                      border:'1px solid rgba(239,68,68,0.2)', padding:'4px 12px', borderRadius:8,
                      cursor:'pointer', fontWeight:600 }}>
                    ✋ Take Over
                  </button>
                </div>
              )}

              {/* Messages */}
              <div style={{ flex:1, overflowY:'auto', padding:'20px', display:'flex',
                flexDirection:'column', gap:12 }}>
                {msgs.map(m => (
                  <div key={m.id} style={{ display:'flex',
                    justifyContent: m.dir==='out' ? 'flex-end' : 'flex-start',
                    gap:8, alignItems:'flex-end' }}>
                    {m.dir==='in' && (
                      <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
                        background:'rgba(99,102,241,0.18)', display:'flex', alignItems:'center',
                        justifyContent:'center', fontWeight:700, fontSize:12 }}>
                        {active.name[0]}
                      </div>
                    )}
                    <div style={{ maxWidth:'70%' }}>
                      <div className={m.dir==='out' ? 'bubble-out' : 'bubble-in'}
                        style={m.type ? { padding:'10px 12px' }
                          : m.auto ? { border:'1px solid rgba(6,182,212,0.25)', background:'rgba(6,182,212,0.08)' }
                          : {}}>
                        <MsgContent m={m} />
                      </div>
                      <p style={{ fontSize:10.5, color:'var(--t4)', marginTop:4,
                        textAlign: m.dir==='out' ? 'right' : 'left' }}>
                        {m.at}
                        {m.by==='ai' && !m.auto && <span style={{ marginLeft:5, color:'#67e8f9' }}>🤖 Suggestion used</span>}
                        {m.auto && <span style={{ marginLeft:5, color:'#67e8f9' }}>🤖 AI Auto-sent</span>}
                        {m.by==='agent' && <span style={{ marginLeft:5 }}>· Agent</span>}
                      </p>
                    </div>
                  </div>
                ))}
                {aiThinking && (
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8, alignItems:'flex-end' }}>
                    <div style={{ padding:'10px 16px', borderRadius:14, background:'rgba(6,182,212,0.08)',
                      border:'1px solid rgba(6,182,212,0.2)', fontSize:13, color:'#67e8f9' }}>
                      <span style={{ letterSpacing:4 }}>···</span>
                      <span style={{ marginLeft:8, fontSize:11, color:'var(--t4)' }}>AI thinking</span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* AI suggestion bar */}
              <div style={{ margin:'0 16px 8px', background:'rgba(6,182,212,0.05)',
                border:'1px solid rgba(6,182,212,0.18)', borderRadius:12, padding:'10px 14px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#67e8f9' }}>🤖 AI Suggestion</span>
                    <span style={{ fontSize:11, color:'var(--t4)' }}>{Math.round(sugg.conf*100)}% confident</span>
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => { setReply(sugg.text); toast('Loaded ↑'); }}
                      style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:7, cursor:'pointer',
                        background:'rgba(6,182,212,0.15)', color:'#67e8f9', border:'1px solid rgba(6,182,212,0.25)' }}>
                      Use ↑
                    </button>
                    <button onClick={simulateIncoming}
                      style={{ fontSize:11, padding:'3px 9px', borderRadius:7, cursor:'pointer',
                        background:'rgba(99,102,241,0.1)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.2)',
                        fontWeight:600 }}>
                      ▶ Simulate Msg
                    </button>
                  </div>
                </div>
                <p style={{ fontSize:13, color:'var(--t2)', lineHeight:1.55 }} dir="auto">{sugg.text}</p>
              </div>

              {/* Reply area */}
              <div style={{ padding:'0 16px 16px',
                opacity: isAutoOn ? 0.5 : 1, pointerEvents: isAutoOn ? 'none' : 'auto' }}
                data-canned-area="">

                {/* Canned replies picker dropdown */}
                {showCannedPicker && (
                  <div style={{ background:'var(--bg3)', border:'1px solid var(--b1)', borderRadius:12,
                    marginBottom:8, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.4)' }}>
                    <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--b1)',
                      display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:12, fontWeight:700, color:'var(--t2)' }}>
                        💬 Canned Replies
                        <span style={{ fontSize:11, color:'var(--t4)', marginLeft:6 }}>type to filter · click to insert</span>
                      </span>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => { setCannedMgmtModal(true); setShowCannedPicker(false); }}
                          style={{ fontSize:11, padding:'3px 9px', borderRadius:7, cursor:'pointer',
                            background:'var(--s2)', color:'var(--t3)', border:'1px solid var(--b1)', fontWeight:600 }}>
                          ⚙ Manage
                        </button>
                        <button onClick={() => setShowCannedPicker(false)}
                          style={{ fontSize:13, padding:'3px 8px', borderRadius:7, cursor:'pointer',
                            background:'transparent', color:'var(--t4)', border:'none' }}>✕</button>
                      </div>
                    </div>
                    <div style={{ maxHeight:200, overflowY:'auto' }}>
                      {filteredCanned.length === 0 ? (
                        <p style={{ padding:'16px', fontSize:13, color:'var(--t4)', textAlign:'center' }}>
                          No matches — <button onClick={() => { setCannedMgmtModal(true); setShowCannedPicker(false); }}
                            style={{ color:'#818cf8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                            add one
                          </button>
                        </p>
                      ) : filteredCanned.map(c => (
                        <button key={c.id} onClick={() => insertCanned(c.text)}
                          style={{ width:'100%', padding:'10px 14px', textAlign:'left', cursor:'pointer',
                            background:'transparent', border:'none', borderBottom:'1px solid rgba(255,255,255,0.04)',
                            display:'flex', alignItems:'flex-start', gap:10, transition:'background 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--s1)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <span style={{ fontSize:11, fontFamily:'monospace', color:'#818cf8',
                            background:'rgba(99,102,241,0.1)', padding:'2px 6px', borderRadius:5,
                            flexShrink:0, marginTop:1 }}>{c.shortcut}</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:12.5, fontWeight:600, color:'var(--t1)', marginBottom:2 }}>{c.title}</p>
                            <p style={{ fontSize:12, color:'var(--t3)', overflow:'hidden',
                              textOverflow:'ellipsis', whiteSpace:'nowrap' }} dir="auto">{c.text}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <button title="Attach file" onClick={() => fileInputRef.current?.click()}
                    style={{ padding:'5px 9px', borderRadius:8, cursor:'pointer', fontSize:16,
                      background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t3)',
                      transition:'all 0.15s', lineHeight:1 }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--s2)'; e.currentTarget.style.color='var(--t1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--s1)'; e.currentTarget.style.color='var(--t3)'; }}>
                    📎
                  </button>
                  <button title="Send image" onClick={() => imageInputRef.current?.click()}
                    style={{ padding:'5px 9px', borderRadius:8, cursor:'pointer', fontSize:16,
                      background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t3)',
                      transition:'all 0.15s', lineHeight:1 }}
                    onMouseEnter={e => { e.currentTarget.style.background='var(--s2)'; e.currentTarget.style.color='var(--t1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='var(--s1)'; e.currentTarget.style.color='var(--t3)'; }}>
                    🖼
                  </button>
                  <button title="Canned replies" onClick={() => { setShowCannedPicker(v => !v); setCannedSearch(''); }}
                    style={{ padding:'5px 10px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
                      background: showCannedPicker ? 'rgba(99,102,241,0.15)' : 'var(--s1)',
                      border: showCannedPicker ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--b1)',
                      color: showCannedPicker ? '#a5b4fc' : 'var(--t3)',
                      transition:'all 0.15s', lineHeight:1, display:'flex', alignItems:'center', gap:5 }}>
                    💬 <span>Canned</span>
                  </button>
                  <button title="Manage canned replies" onClick={() => setCannedMgmtModal(true)}
                    style={{ padding:'5px 9px', borderRadius:8, cursor:'pointer', fontSize:12,
                      background:'var(--s1)', border:'1px solid var(--b1)', color:'var(--t4)',
                      transition:'all 0.15s', lineHeight:1 }}
                    onMouseEnter={e => { e.currentTarget.style.color='var(--t2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='var(--t4)'; }}>
                    ⚙
                  </button>
                  <span style={{ fontSize:11, color:'var(--t4)', marginLeft:2 }}>
                    {isAutoOn ? 'AI is handling — click "Take Over" to reply' : 'Type / to search canned · Ctrl+Enter to send'}
                  </span>
                </div>

                {/* Textarea + send */}
                <form onSubmit={send} style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                  <textarea className="input" style={{ flex:1, resize:'none', fontSize:13.5,
                    minHeight:52, maxHeight:120, lineHeight:1.55 }}
                    placeholder={isAutoOn ? 'AI is handling — click "Take Over" to reply manually' : 'Type a reply…'}
                    value={reply}
                    onChange={e => {
                      const val = e.target.value;
                      setReply(val);
                      if (val.startsWith('/')) {
                        setShowCannedPicker(true);
                        setCannedSearch(val.slice(1));
                      } else if (showCannedPicker && !val.startsWith('/')) {
                        setShowCannedPicker(false);
                      }
                    }}
                    onKeyDown={e => { if (e.key==='Enter' && e.ctrlKey) send(e); }}
                    rows={2} dir="auto"
                  />
                  <button type="submit" disabled={!reply.trim() || isAutoOn} className="btn btn-primary"
                    style={{ padding:'13px 20px', flexShrink:0 }}>
                    Send ↑
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
              color:'var(--t4)', fontSize:14 }}>
              Select a conversation
            </div>
          )}
        </div>

        {/* -- Customer panel -------------------------------------------- */}
        {active && !activeLive && showPanel && (
          <div style={{ width:230, flexShrink:0, borderLeft:'1px solid var(--b1)',
            background:'var(--bg2)', padding:'20px 16px', overflowY:'auto',
            display:'flex', flexDirection:'column', gap:18 }} className="hide-sm">
            <div style={{ textAlign:'center' }}>
              <div style={{ width:58, height:58, borderRadius:'50%', margin:'0 auto 12px',
                background:'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.2))',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontWeight:800, fontSize:22, border:'2px solid rgba(99,102,241,0.2)' }}>
                {active.name[0]}
              </div>
              <p style={{ fontWeight:700, fontSize:14 }}>{active.name}</p>
              <p style={{ fontSize:12, color:CH_COLOR[active.ch], marginTop:3 }}>
                {CH_ICON[active.ch]} {active.ch}
              </p>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
              {[
                { l:'Lead Score', v:`${active.score}/100`, c: active.score>70?'#34d399': active.score>40?'#fcd34d':'#fca5a5' },
                { l:'Intent', v:active.intent.replace(/_/g,' '), c:IC_COLOR[active.intent]||'var(--t1)' },
                { l:'Assigned', v:currentAgent, c:'var(--t1)' },
                { l:'AI Mode', v:isAutoOn?'Auto':'Manual', c:isAutoOn?'#67e8f9':'var(--t3)' },
              ].map(row => (
                <div key={row.l} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize:12, color:'var(--t4)' }}>{row.l}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:row.c }}>{row.v}</span>
                </div>
              ))}
            </div>

            {activeTags.length > 0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {activeTags.map(t => (
                  <span key={t} style={{ fontSize:11, padding:'3px 9px', borderRadius:99,
                    background:'rgba(99,102,241,0.12)', color:'#a5b4fc',
                    border:'1px solid rgba(99,102,241,0.2)' }}>{t}</span>
                ))}
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 12px', borderRadius:'var(--r)',
                background: isAutoOn ? 'rgba(6,182,212,0.07)' : 'var(--s1)',
                border:`1px solid ${isAutoOn ? 'rgba(6,182,212,0.25)' : 'var(--b1)'}` }}>
                <span style={{ fontSize:12.5, fontWeight:600, color: isAutoOn ? '#67e8f9' : 'var(--t3)' }}>AI Auto-Reply</span>
                <div className={`toggle${isAutoOn?' on':''}`} style={{ transform:'scale(0.75)' }}
                  onClick={toggleAutoReply} />
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setCannedMgmtModal(true)}
                style={{ width:'100%', justifyContent:'center' }}>💬 Canned Replies</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setTagModal(true)}
                style={{ width:'100%', justifyContent:'center' }}>+ Add Tag</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setHistoryModal(true)}
                style={{ width:'100%', justifyContent:'center' }}>View History</button>
            </div>
          </div>
        )}
      </div>

      {/* -- Canned Replies Management Modal -------------------------------- */}
      <Modal open={cannedMgmtModal} onClose={() => { setCannedMgmtModal(false); setCannedFormMode(null); }}
        title="Canned Replies" width={560}>

        {cannedFormMode ? (
          /* Add / Edit form */
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <p style={{ fontSize:13, color:'var(--t3)', marginTop:-8 }}>
              {cannedFormMode === 'add' ? 'Create a new canned reply' : `Editing: ${cannedFormMode.title}`}
            </p>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
                Title
              </label>
              <input className="input" style={{ fontSize:13 }} placeholder="e.g. Welcome message"
                value={cannedForm.title} onChange={e => setCannedForm(f => ({ ...f, title:e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
                Shortcut <span style={{ fontWeight:400, color:'var(--t4)' }}>(type this in the reply box to trigger)</span>
              </label>
              <input className="input" style={{ fontSize:13, fontFamily:'monospace' }} placeholder="/shortcut"
                value={cannedForm.shortcut} onChange={e => {
                  let v = e.target.value;
                  if (v && !v.startsWith('/')) v = '/' + v;
                  setCannedForm(f => ({ ...f, shortcut: v }));
                }} />
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--t2)', display:'block', marginBottom:6 }}>
                Message
              </label>
              <textarea className="input" style={{ fontSize:13, resize:'vertical', minHeight:90 }}
                placeholder="The reply text to insert…"
                value={cannedForm.text} onChange={e => setCannedForm(f => ({ ...f, text:e.target.value }))}
                dir="auto" />
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setCannedFormMode(null)}>← Back</button>
              <button className="btn btn-primary" style={{ flex:2 }} onClick={saveCanned}>
                {cannedFormMode === 'add' ? '+ Add Reply' : '✓ Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          /* List view */
          <>
            <div style={{ display:'flex', gap:8, marginBottom:14, marginTop:-8 }}>
              <input className="input" style={{ flex:1, fontSize:13 }} placeholder="Search canned replies…"
                value={cannedSearch} onChange={e => setCannedSearch(e.target.value)} />
              <button className="btn btn-primary btn-sm" onClick={openAddCanned}>+ New</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:380, overflowY:'auto' }}>
              {filteredCanned.length === 0 ? (
                <p style={{ textAlign:'center', color:'var(--t4)', fontSize:13, padding:'24px 0' }}>
                  No canned replies yet.
                </p>
              ) : filteredCanned.map(c => (
                <div key={c.id}
                  style={{ padding:'12px 14px', borderRadius:'var(--r)', background:'var(--s1)',
                    border:'1px solid var(--b1)', display:'flex', alignItems:'flex-start', gap:12 }}>
                  <span style={{ fontSize:11, fontFamily:'monospace', color:'#818cf8',
                    background:'rgba(99,102,241,0.1)', padding:'3px 8px', borderRadius:6,
                    flexShrink:0, marginTop:2, whiteSpace:'nowrap' }}>{c.shortcut}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{c.title}</p>
                    <p style={{ fontSize:12, color:'var(--t3)', overflow:'hidden', textOverflow:'ellipsis',
                      whiteSpace:'nowrap' }} dir="auto">{c.text}</p>
                  </div>
                  <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                    <button onClick={() => openEditCanned(c)}
                      style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                        background:'rgba(99,102,241,0.1)', color:'#a5b4fc',
                        border:'1px solid rgba(99,102,241,0.2)', fontWeight:600 }}>
                      Edit
                    </button>
                    <button onClick={() => deleteCanned(c.id)}
                      style={{ fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
                        background:'rgba(239,68,68,0.08)', color:'#fca5a5',
                        border:'1px solid rgba(239,68,68,0.15)', fontWeight:600 }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {cannedReplies.length > 0 && (
              <p style={{ fontSize:11, color:'var(--t4)', marginTop:10, textAlign:'center' }}>
                {cannedReplies.length} canned {cannedReplies.length === 1 ? 'reply' : 'replies'} · type <code style={{ color:'#818cf8' }}>/shortcut</code> in the reply box to insert
              </p>
            )}
          </>
        )}
      </Modal>

      {/* -- Assign Modal ------------------------------------------------─-- */}
      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Conversation" width={380}>
        <p style={{ fontSize:13, color:'var(--t3)', marginTop:-8 }}>
          Assign <strong style={{ color:'var(--t1)' }}>{active?.name}</strong> to an agent
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {AGENTS.map(agent => (
            <button key={agent} onClick={() => assignAgent(agent)}
              style={{ padding:'13px 16px', borderRadius:'var(--r)', border:'1px solid var(--b1)',
                background: currentAgent===agent ? 'rgba(99,102,241,0.12)' : 'var(--s1)',
                color: currentAgent===agent ? '#a5b4fc' : 'var(--t1)',
                cursor:'pointer', textAlign:'left', fontWeight:600, fontSize:13.5,
                display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(99,102,241,0.18)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:13 }}>
                  {agent[0]}
                </div>
                {agent}
              </span>
              {currentAgent===agent && <span style={{ fontSize:12, color:'#a5b4fc' }}>● Current</span>}
            </button>
          ))}
        </div>
      </Modal>

      {/* -- Close Deal Modal --------------------------------------------─-- */}
      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Close Deal" width={400}>
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--t1)', marginBottom:8 }}>Mark as Won?</p>
          <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6 }}>
            This will move <strong style={{ color:'var(--t1)' }}>{active?.name}</strong>&apos;s deal to Won.
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setCloseModal(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={closeDeal}>✓ Confirm Won</button>
        </div>
      </Modal>

      {/* -- Tag Modal ------------------------------------------------------ */}
      <Modal open={tagModal} onClose={() => setTagModal(false)} title="Add Tag" width={380}>
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" style={{ flex:1, fontSize:13 }} placeholder="Custom tag…"
            value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && tagInput.trim()) addTag(tagInput.trim()); }} />
          <button className="btn btn-primary" onClick={() => { if (tagInput.trim()) addTag(tagInput.trim()); }}>Add</button>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {TAGS.filter(t => !activeTags.includes(t)).map(t => (
            <button key={t} onClick={() => addTag(t)}
              style={{ fontSize:12, padding:'5px 12px', borderRadius:99, cursor:'pointer',
                background:'var(--s2)', color:'var(--t2)', border:'1px solid var(--b1)', fontWeight:600 }}>
              {t}
            </button>
          ))}
        </div>
      </Modal>

      {/* -- History Modal -------------------------------------------------- */}
      <Modal open={historyModal} onClose={() => setHistoryModal(false)} title={`${active?.name} — History`} width={500}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[
            { date:'Apr 8, 2025',  summary:'Inquired about summer collection', status:'Closed', val:null },
            { date:'Mar 22, 2025', summary:'Ordered 2x Premium T-Shirt',        status:'Won',    val:'EGP 598' },
            { date:'Mar 10, 2025', summary:'Asked about return policy',          status:'Closed', val:null },
          ].map((h, i) => (
            <div key={i} style={{ padding:'13px 16px', borderRadius:'var(--r)',
              background:'var(--s1)', border:'1px solid var(--b1)',
              display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{h.summary}</p>
                <p style={{ fontSize:11.5, color:'var(--t4)' }}>{h.date}</p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                {h.val && <span style={{ fontSize:13, fontWeight:700, color:'#34d399' }}>{h.val}</span>}
                <span className="badge" style={h.status==='Won'
                  ? { background:'rgba(34,197,94,0.1)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.2)' }
                  : { background:'var(--s2)', color:'var(--t4)', border:'1px solid var(--b1)' }}>
                  {h.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
