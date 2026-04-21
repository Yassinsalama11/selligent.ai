'use client';
import { useState, useRef, useEffect, useReducer, useLayoutEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { API_BASE, api as secureApi } from '@/lib/api';
import { connectSocket } from '@/lib/socket';

// Modular Components
import ConversationList from '@/components/conversations/ConversationList';
import ChatWindow from '@/components/conversations/ChatWindow';
import CustomerProfilePanel from '@/components/conversations/CustomerProfilePanel';

// Module-level auto-reply map — updated synchronously when toggle changes.
const _autoReply = {}; // { [convId]: boolean }

/* ─── Logger ─────────────────────────────────────────────────────────────── */
const log = {
  msg:    (...a) => console.log(`%c[MSG]`,    'color:#25D366;font-weight:bold', ...a),
  store:  (...a) => console.log(`%c[STORE]`,  'color:#6366f1;font-weight:bold', ...a),
  ws:     (...a) => console.log(`%c[WS]`,     'color:#f59e0b;font-weight:bold', ...a),
  ai:     (...a) => console.log(`%c[AI]`,     'color:#67e8f9;font-weight:bold', ...a),
  error:  (...a) => console.error(`%c[ERR]`,  'color:#ef4444;font-weight:bold', ...a),
};

/* ─── Conversation Store ───────────────────────── */
const STORE_INIT = {
  activeId:  null,
  autoReply: {},
  aiTyping:  {},
  convs:     {},
};

Object.assign(_autoReply, STORE_INIT.autoReply || {});

function parseTs(ts) {
  if (!ts) return 0;
  const n = Number(ts);
  if (!isNaN(n)) return n < 1e12 ? n * 1000 : n;
  const d = new Date(ts).getTime();
  return isNaN(d) ? 0 : d;
}
function sortMessages(msgs) {
  return msgs
    .map((m, i) => ({ m, i, t: parseTs(m.timestamp) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map(x => x.m);
}

function storeReducer(state, action) {
  log.store(action.type, action);
  switch (action.type) {
    case 'LOAD_CONVS': {
      const convs = { ...state.convs };
      for (const c of action.convs) {
        convs[c.id] = { ...c, messages: convs[c.id]?.messages || [] };
      }
      return { ...state, convs };
    }
    case 'LOAD_MESSAGES': {
      const existing = state.convs[action.convId]?.messages || [];
      const serverIds = new Set(action.messages.map(m => m.id));
      const localOnly = existing.filter(m => !serverIds.has(m.id));
      const merged = sortMessages([...action.messages, ...localOnly]);
      return {
        ...state,
        convs: {
          ...state.convs,
          [action.convId]: { ...state.convs[action.convId], messages: merged },
        },
      };
    }
    case 'INBOUND_MESSAGE': {
      const { conv, message } = action;
      const existing = state.convs[conv.id];
      const prevMsgs = existing?.messages || [];
      if (prevMsgs.some(m => m.id === message.id)) return state;
      const normalized = { ...message, direction: 'inbound', status: 'delivered' };
      const messages = sortMessages([...prevMsgs, normalized]);
      const isActive = state.activeId === conv.id;
      return {
        ...state,
        convs: {
          ...state.convs,
          [conv.id]: {
            ...(existing || conv),
            ...conv,
            messages,
            unread: isActive ? 0 : (existing?.unread || 0) + 1,
            lastMessage: message.content || '',
            updatedAt: Date.now(),
          },
        },
      };
    }
    case 'OUTBOUND_MESSAGE': {
      const existing = state.convs[action.convId];
      if (!existing) return state;
      if (existing.messages.some(m => m.id === action.message.id)) return state;
      const outMsg = { ...action.message, direction: 'outbound', status: 'sending' };
      const messages = sortMessages([...existing.messages, outMsg]);
      return {
        ...state,
        convs: {
          ...state.convs,
          [action.convId]: {
            ...existing,
            messages,
            lastMessage: action.message.content,
            updatedAt: Date.now(),
          },
        },
      };
    }
    case 'CONFIRM_MESSAGE': {
      const existing = state.convs[action.convId];
      if (!existing) return state;
      const realId = action.realId || action.tempId;
      const hasDupe = existing.messages.some(m => m.id === realId && m.id !== action.tempId);
      const messages = hasDupe
        ? existing.messages.filter(m => m.id !== action.tempId)
        : existing.messages.map(m =>
            m.id === action.tempId ? { ...m, id: realId, direction: 'outbound', status: 'sent' } : m
          );
      return { ...state, convs: { ...state.convs, [action.convId]: { ...existing, messages } } };
    }
    case 'UPDATE_CONV': {
      const conv = state.convs[action.convId];
      if (!conv) return state;
      return { ...state, convs: { ...state.convs, [action.convId]: { ...conv, ...action.fields } } };
    }
    case 'SET_ACTIVE': {
      const conv = state.convs[action.convId];
      if (!conv) return { ...state, activeId: action.convId };
      return {
        ...state,
        activeId: action.convId,
        convs: { ...state.convs, [action.convId]: { ...conv, unread: 0 } },
      };
    }
    case 'CLOSE_ACTIVE': return { ...state, activeId: null };
    case 'MARK_READ': {
      const conv = state.convs[action.convId];
      if (!conv) return state;
      return { ...state, convs: { ...state.convs, [action.convId]: { ...conv, unread: 0 } } };
    }
    case 'SET_AUTO_REPLY': return { ...state, autoReply: { ...state.autoReply, [action.convId]: action.value } };
    case 'SET_AI_TYPING': return { ...state, aiTyping: { ...state.aiTyping, [action.convId]: action.value } };
    default: return state;
  }
}

function playNotif() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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

function getAiConfig() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('airos_ai_cfg') : null;
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (cfg?.enabled === false) return null;
    return cfg;
  } catch { return null; }
}

async function runFrontendAI(conv, inboundMessage, recentMessages = []) {
  const cfg = getAiConfig() || {};
  if (cfg.enabled === false) return null;
  const token = typeof window !== 'undefined' ? localStorage.getItem('airos_token') : null;
  if (!token) return null;

  const history = recentMessages.slice(-6).map(m => ({
    direction: m.direction === 'inbound' ? 'inbound' : 'outbound',
    content:   m.content,
  }));

  try {
    const res = await fetch(`${API_BASE}/v1/ai/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        conversation_id: conv.id,
        last_message:    inboundMessage.content,
        history,
        customer:        { name: conv.customerName, phone: conv.customerPhone },
        provider:        cfg?.provider,
        model:           cfg?.model,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch { return null; }
}

/* -- Demo Data ------------------------------------------------------------ */
const CONVS = [
  { id:'1', name:'Ahmed Mohamed', ch:'whatsapp',  last:'عايز أطلب اتنين',      ago:'2m',  score:91, intent:'ready_to_buy',   unread:2 },
  { id:'2', name:'Sara Khalil',   ch:'instagram', last:'Is this in red?',        ago:'8m',  score:62, intent:'interested',      unread:0 },
  { id:'3', name:'Omar Hassan',   ch:'messenger', last:'السعر عالي شوية',        ago:'15m', score:38, intent:'price_objection', unread:1 },
];

const MSGS = {
  '1': [
    { id:'a', dir:'in',  text:'السلام عليكم', at:'10:00', by:'customer' },
    { id:'b', dir:'out', text:'أهلاً بيك! كيف أقدر أساعدك؟', at:'10:01', by:'agent' },
  ],
};

const DEFAULT_CANNED = [
  { id:'c1', title:'Welcome',        shortcut:'/hi',     text:'أهلاً وسهلاً! كيف أقدر أساعدك اليوم؟ 😊' },
  { id:'c2', title:'Shipping Info',  shortcut:'/ship',   text:'بنوصل لكل مناطق مصر والسعودية والإمارات. وقت التوصيل من ٢ إلى ٥ أيام عمل 📦' },
];

const AGENTS = ['Ahmed Mohamed','Sara Khalil','Omar Hassan','Unassigned'];
const TAGS   = ['VIP','Follow Up','Discount','Urgent','Refund','New Lead'];

/* -- Page ----------------------------------------------------------------─-- */
export default function ConversationsPage() {
  const [convs, setConvs]           = useState(CONVS);
  const [active, setActive]         = useState(CONVS[0]);
  const [msgs, setMsgs]             = useState(MSGS['1'] || []);
  const [reply, setReply]           = useState('');
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [showPanel, setShow]        = useState(true);
  const [layoutPrefs, setLayoutPrefs] = useState({
    density:'comfortable',
    bubbleStyle:'rounded',
    showScore:true,
    showIntent:true,
    showChannel:true,
    showTimestamp:true,
  });
  const [tags, setTags]             = useState({ '1': ['VIP'], '2': [] });
  const [assignedTo, setAssignedTo] = useState({});
  const [store, dispatch] = useReducer(storeReducer, STORE_INIT);
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);

  const liveConvs  = Object.values(store.convs).sort((a, b) => (b.updatedAt||0) - (a.updatedAt||0));
  const activeLive = store.activeId ? store.convs[store.activeId] : null;
  const liveMsgs   = activeLive?.messages || [];
  const [suggestion, setSuggestion] = useState(null);
  const [liveReply,  setLiveReply]  = useState('');
  const [aiConfigured, setAiConfigured] = useState(() => {
    const cfg = getAiConfig();
    return cfg === null || cfg.enabled !== false;
  });

  useEffect(() => {
    let cancelled = false;
    async function loadLayoutPrefs() {
      try {
        const settings = await secureApi.get('/api/settings');
        if (!cancelled && settings?.layout) setLayoutPrefs(c => ({ ...c, ...settings.layout }));
      } catch {}
    }
    loadLayoutPrefs();
    return () => { cancelled = true; };
  }, []);

  const bottomRef = useRef(null);
  const msgsContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (activeLive || active) {
          dispatch({ type: 'CLOSE_ACTIVE' });
          setActive(null);
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, activeLive]);

  useLayoutEffect(() => {
    const el = msgsContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveMsgs.length, store.activeId]);

  const socketRef = useRef(null);
  useEffect(() => {
    function fetchConvs() {
      fetch(`${API_BASE}/api/live/conversations`)
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          dispatch({ type: 'LOAD_CONVS', convs: data });
        }).catch(() => {});
    }
    fetchConvs();
    const pollTimer = setInterval(fetchConvs, 10000);

    const token = typeof window !== 'undefined' ? localStorage.getItem('airos_token') : null;
    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('message:new', ({ conversation, message }) => {
      dispatch({ type: 'INBOUND_MESSAGE', conv: conversation, message });
      playNotif();
    });

    socket.on('whatsapp:message', ({ conversation, message }) => {
      dispatch({ type: 'INBOUND_MESSAGE', conv: conversation, message });
      playNotif();
      if (!message.content) return;
      const convId = conversation.id;
      dispatch({ type: 'SET_AI_TYPING', convId, value: true });
      const recentMsgs = [...(storeRef.current.convs[convId]?.messages || []), { ...message, direction: 'inbound' }].slice(-8);
      runFrontendAI(conversation, message, recentMsgs).then(ai => {
        dispatch({ type: 'SET_AI_TYPING', convId, value: false });
        if (!ai || !ai.suggested_reply) return;
        dispatch({ type: 'UPDATE_CONV', convId, fields: { intent: ai.intent, score: ai.lead_score } });
        if (_autoReply[convId] !== false) {
          const tempId = `ai_${Date.now()}`;
          dispatch({ type: 'OUTBOUND_MESSAGE', convId, message: { id: tempId, content: ai.suggested_reply, sent_by: 'ai' } });
          fetch(`${API_BASE}/api/live/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: conversation.customerPhone, message: ai.suggested_reply }),
          }).then(r => r.json()).then(d => {
            if (d.ok) dispatch({ type: 'CONFIRM_MESSAGE', convId, tempId, realId: d.message_id });
          });
        } else if (storeRef.current.activeId === convId) {
          setSuggestion({ text: ai.suggested_reply, score: ai.lead_score, intent: ai.intent });
        }
      });
    });

    return () => {
      socket.disconnect();
      clearInterval(pollTimer);
    };
  }, []);

  const openLiveConv = useCallback(async (conv) => {
    dispatch({ type: 'SET_ACTIVE', convId: conv.id });
    setSuggestion(null);
    setLiveReply('');
    try {
      const r = await fetch(`${API_BASE}/api/live/conversations/${encodeURIComponent(conv.id)}/messages`);
      const data = await r.json();
      if (Array.isArray(data)) dispatch({ type: 'LOAD_MESSAGES', convId: conv.id, messages: data });
      fetch(`${API_BASE}/api/live/conversations/${encodeURIComponent(conv.id)}/read`, { method: 'POST' }).catch(() => {});
    } catch {}
  }, []);

  const sendLiveReply = useCallback(async (text) => {
    const conv = storeRef.current.convs[storeRef.current.activeId];
    if (!text.trim() || !conv) return;
    const tempId = `out_${Date.now()}`;
    dispatch({ type: 'OUTBOUND_MESSAGE', convId: conv.id, message: { id: tempId, content: text, sent_by: 'agent' } });
    setLiveReply('');
    setSuggestion(null);
    try {
      const res = await fetch(`${API_BASE}/api/live/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: conv.customerPhone, message: text }),
      });
      const data = await res.json();
      if (data.ok) dispatch({ type: 'CONFIRM_MESSAGE', convId: conv.id, tempId, realId: data.message_id });
    } catch { toast.error('Failed to send'); }
  }, []);

  /* AI (demo convs) */
  const [aiAutoReply, setAiAutoReply] = useState({});
  const [aiThinking, setAiThinking]   = useState(false);
  const autoReplyTimers               = useRef({});

  /* Canned replies */
  const [cannedReplies, setCannedReplies]     = useState(DEFAULT_CANNED);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearch, setCannedSearch]         = useState('');
  const [cannedMgmtModal, setCannedMgmtModal]   = useState(false);
  const [cannedFormMode, setCannedFormMode]     = useState(null); 
  const [cannedForm, setCannedForm]             = useState({ title:'', shortcut:'', text:'' });

  /* Modals */
  const [assignModal, setAssignModal]   = useState(false);
  const [closeModal, setCloseModal]     = useState(false);
  const [tagModal, setTagModal]         = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [tagInput, setTagInput]         = useState('');

  const isAutoOn = aiAutoReply[active?.id] || false;

  function selectConv(c) {
    setActive(c);
    setMsgs(MSGS[c.id] || []);
    setShowCannedPicker(false);
  }

  function toggleAutoReply() {
    const val = !isAutoOn;
    setAiAutoReply(a => ({ ...a, [active.id]: val }));
    toast(val ? '🤖 AI Auto-Reply ON' : '👤 Manual mode');
  }

  function send() {
    if (!reply.trim()) return;
    setMsgs(m => [...m, { id: Date.now()+'', dir:'out', text:reply, by:'agent' }]);
    setReply('');
  }

  function handleFileSelect(e, type) {
    toast.success(`${type === 'image' ? '🖼 Image' : '📄 File'} sent (simulated)`);
  }

  const filtered = convs.filter(c => {
    if (filter !== 'all' && c.ch !== filter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeTags   = tags[active?.id] || [];
  const currentAgent = assignedTo[active?.id] || 'Unassigned';

  const filteredCanned = cannedReplies.filter(c =>
    !cannedSearch || c.title.toLowerCase().includes(cannedSearch.toLowerCase()) || c.shortcut.toLowerCase().includes(cannedSearch.toLowerCase())
  );

  return (
    <>
      <div className="flex h-full overflow-hidden bg-[var(--bg)]">
        <ConversationList 
          ref={searchInputRef}
          search={search} setSearch={setSearch}
          filter={filter} setFilter={setFilter}
          liveConvs={liveConvs} filtered={filtered}
          activeId={active?.id} activeLiveId={activeLive?.id}
          openLiveConv={openLiveConv} selectConv={selectConv}
          layoutPrefs={layoutPrefs} aiAutoReply={aiAutoReply}
        />

        <ChatWindow 
          activeConv={activeLive || active}
          messages={activeLive ? liveMsgs : msgs}
          reply={activeLive ? liveReply : reply}
          setReply={activeLive ? setLiveReply : setReply}
          onSend={activeLive ? () => sendLiveReply(liveReply) : send}
          isAutoOn={activeLive ? (_autoReply[activeLive.id] !== false) : isAutoOn}
          onToggleAuto={activeLive ? () => {
            const next = !(_autoReply[activeLive.id] !== false);
            _autoReply[activeLive.id] = next;
            dispatch({ type:'SET_AUTO_REPLY', convId: activeLive.id, value: next });
            toast(next ? '🤖 Bot Active' : '👤 Manual');
          } : toggleAutoReply}
          aiTyping={activeLive ? store.aiTyping[activeLive.id] : aiThinking}
          aiConfigured={aiConfigured}
          suggestion={suggestion}
          onUseSuggestion={(text) => activeLive ? (setLiveReply(text), setSuggestion(null)) : (setReply(text), toast('Loaded ↑'))}
          onSendSuggestion={(text) => activeLive ? (sendLiveReply(text), setSuggestion(null)) : null}
          onDismissSuggestion={() => setSuggestion(null)}
          onTakeOver={() => {
            if (activeLive) {
              _autoReply[activeLive.id] = false;
              dispatch({ type:'SET_AUTO_REPLY', convId: activeLive.id, value: false });
              toast('👤 Manual takeover');
            }
          }}
          onAssign={() => setAssignModal(true)}
          onClose={() => activeLive ? (dispatch({ type:'CLOSE_ACTIVE' }), setSuggestion(null)) : setCloseModal(true)}
          onTogglePanel={() => setShow(v => !v)}
          showPanel={showPanel}
          layoutPrefs={layoutPrefs}
          msgsContainerRef={msgsContainerRef}
          bottomRef={bottomRef}
          showCannedPicker={showCannedPicker}
          setShowCannedPicker={setShowCannedPicker}
          cannedSearch={cannedSearch}
          setCannedSearch={setCannedSearch}
          filteredCanned={filteredCanned}
          onInsertCanned={(text) => { activeLive ? setLiveReply(text) : setReply(text); setShowCannedPicker(false); }}
          onManageCanned={() => setCannedMgmtModal(true)}
          fileInputRef={fileInputRef}
          imageInputRef={imageInputRef}
        />

        {showPanel && (active || activeLive) && (
          <CustomerProfilePanel 
            activeConv={activeLive || active}
            isAutoOn={activeLive ? (_autoReply[activeLive.id] !== false) : isAutoOn}
            onToggleAuto={activeLive ? () => {
              const next = !(_autoReply[activeLive.id] !== false);
              _autoReply[activeLive.id] = next;
              dispatch({ type:'SET_AUTO_REPLY', convId: activeLive.id, value: next });
            } : toggleAutoReply}
            tags={activeTags}
            currentAgent={currentAgent}
            onManageCanned={() => setCannedMgmtModal(true)}
            onAddTag={() => !activeLive && setTagModal(true)}
            onViewHistory={() => !activeLive && setHistoryModal(true)}
          />
        )}
      </div>

      {/* Modals */}
      <Modal open={cannedMgmtModal} onClose={() => setCannedMgmtModal(false)} title="Canned Replies" width={560}>
        <div className="flex flex-col gap-4">
          {cannedReplies.map(c => (
            <div key={c.id} className="p-3 border border-[var(--b1)] rounded-lg flex justify-between items-center">
              <div>
                <p className="font-bold">{c.title}</p>
                <p className="text-sm text-[var(--t4)]">{c.shortcut}</p>
              </div>
              <button className="btn btn-ghost btn-xs" onClick={() => setCannedReplies(r => r.filter(x => x.id !== c.id))}>Delete</button>
            </div>
          ))}
          <button className="btn btn-primary" onClick={() => toast('Add form logic here')}>+ Add New</button>
        </div>
      </Modal>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Agent">
        <div className="flex flex-col gap-2">
          {AGENTS.map(a => (
            <button key={a} className="btn btn-ghost justify-start" onClick={() => { setAssignedTo(prev => ({ ...prev, [active?.id]: a })); setAssignModal(false); }}>{a}</button>
          ))}
        </div>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Close Conversation">
        <p className="mb-4">Mark this conversation as closed?</p>
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={() => setCloseModal(false)}>Yes, Close</button>
          <button className="btn btn-ghost flex-1" onClick={() => setCloseModal(false)}>Cancel</button>
        </div>
      </Modal>

      <Modal open={tagModal} onClose={() => setTagModal(false)} title="Add Tag">
        <div className="flex gap-2 mb-4">
          <input className="input flex-1" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tag name..." />
          <button className="btn btn-primary" onClick={() => { setTags(t => ({ ...t, [active.id]: [...(t[active.id]||[]), tagInput] })); setTagInput(''); setTagModal(false); }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(t => (
            <button key={t} className="btn btn-ghost btn-xs" onClick={() => { setTags(tgs => ({ ...tgs, [active.id]: [...(tgs[active.id]||[]), t] })); setTagModal(false); }}>{t}</button>
          ))}
        </div>
      </Modal>

      <Modal open={historyModal} onClose={() => setHistoryModal(false)} title="Conversation History">
        <div className="flex flex-col gap-3">
          <div className="p-3 border border-[var(--b1)] rounded-lg">
            <p className="font-bold">Previous interaction</p>
            <p className="text-sm text-[var(--t4)]">Yesterday · Completed</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
