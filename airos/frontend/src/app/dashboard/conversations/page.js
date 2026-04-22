'use client';
import { useState, useRef, useEffect, useReducer, useLayoutEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { api as secureApi } from '@/lib/api';
import { connectSocket } from '@/lib/socket';

// Modular Components
import ConversationList from '@/components/conversations/ConversationList';
import ChatWindow from '@/components/conversations/ChatWindow';
import CustomerProfilePanel from '@/components/conversations/CustomerProfilePanel';
import HandoffPanel from '@/components/conversations/HandoffPanel';

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
function messageTimestamp(message = {}) {
  return message.timestamp || message.created_at || message.createdAt || message.sent_at || message.updated_at || message.updatedAt;
}
function normalizeMessage(message = {}, fallbackConversationId = null) {
  const conversationId = String(
    message.conversationId
      || message.conversation_id
      || message.conversation
      || fallbackConversationId
      || ''
  );
  const sentBy = message.sent_by || message.sentBy || message.by || (message.direction === 'outbound' ? 'agent' : 'customer');
  const direction = message.direction
    || (message.dir === 'out' ? 'outbound' : null)
    || (['agent', 'ai'].includes(sentBy) ? 'outbound' : 'inbound');

  return {
    ...message,
    id: String(message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
    conversationId,
    conversation_id: conversationId,
    direction,
    sent_by: sentBy,
    content: message.content ?? message.text ?? '',
    timestamp: messageTimestamp(message) || new Date().toISOString(),
  };
}
function sortMessages(msgs) {
  return msgs
    .map((m, i) => ({ m, i, t: parseTs(messageTimestamp(m)) }))
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
    case 'REPLACE_CONVS': {
      const convs = {};
      for (const c of action.convs) {
        const existing = state.convs[c.id];
        convs[c.id] = { ...existing, ...c, messages: existing?.messages || [] };
      }
      if (state.activeId && !convs[state.activeId] && state.convs[state.activeId]) {
        convs[state.activeId] = state.convs[state.activeId];
      }
      return {
        ...state,
        activeId: state.activeId,
        convs,
      };
    }
    case 'LOAD_MESSAGES': {
      const existing = state.convs[action.convId]?.messages || [];
      const normalizedServerMessages = action.messages.map(m => normalizeMessage(m, action.convId));
      const serverIds = new Set(normalizedServerMessages.map(m => m.id));
      const localOnly = existing.filter(m => !serverIds.has(m.id));
      const merged = sortMessages([...normalizedServerMessages, ...localOnly]);
      return {
        ...state,
        convs: {
          ...state.convs,
          [action.convId]: { ...state.convs[action.convId], messages: merged },
        },
      };
    }
    case 'UPSERT_MESSAGE': {
      const { conv, message } = action;
      const convId = String(conv?.id || message?.conversationId || message?.conversation_id || '');
      if (!convId) return state;
      const existing = state.convs[convId];
      const prevMsgs = existing?.messages || [];
      const normalized = normalizeMessage({ status: 'delivered', ...message }, convId);
      const messages = sortMessages(
        prevMsgs.some(m => m.id === normalized.id)
          ? prevMsgs.map(m => m.id === normalized.id ? { ...m, ...normalized } : m)
          : [...prevMsgs, normalized]
      );
      const isActive = state.activeId === convId;
      const isCustomerInbound = normalized.direction === 'inbound' && normalized.sent_by === 'customer';
      return {
        ...state,
        convs: {
          ...state.convs,
          [convId]: {
            ...(existing || conv),
            ...conv,
            messages,
            unread: isActive ? 0 : isCustomerInbound ? (existing?.unread || 0) + 1 : (existing?.unread || 0),
            lastMessage: normalized.content || '',
            updatedAt: Date.now(),
          },
        },
      };
    }
    case 'OUTBOUND_MESSAGE': {
      const existing = state.convs[action.convId];
      if (!existing) return state;
      if (existing.messages.some(m => m.id === action.message.id)) return state;
      const outMsg = normalizeMessage({ ...action.message, direction: 'outbound', status: 'sending' }, action.convId);
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
      const realMessage = action.message ? normalizeMessage(action.message, action.convId) : null;
      const realId = String(realMessage?.id || action.realId || action.tempId);
      const messages = sortMessages(existing.messages
        .filter(m => !(realMessage && m.id === realId && m.id !== action.tempId))
        .map(m => {
          if (m.id !== action.tempId) return m;
          return realMessage ? { ...m, ...realMessage, status: 'sent' } : { ...m, id: realId, direction: 'outbound', status: 'sent' };
        }));
      return { ...state, convs: { ...state.convs, [action.convId]: { ...existing, messages } } };
    }
    case 'MESSAGE_FAILED': {
      const existing = state.convs[action.convId];
      if (!existing) return state;
      const messages = existing.messages.map(m =>
        m.id === action.tempId ? { ...m, status: 'failed' } : m
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

const DEFAULT_CANNED = [];

const TAGS   = ['VIP','Follow Up','Discount','Urgent','Refund','New Lead'];

function normalizeConversation(row = {}) {
  const updatedAt = row.updated_at || row.updatedAt || row.created_at;
  return {
    ...row,
    id: row.id,
    customerName: row.customer_name || row.customerName || 'Unknown customer',
    customerPhone: row.customer_phone || row.customerPhone || '',
    customerEmail: row.customer_email || row.customerEmail || '',
    channel: row.channel || 'livechat',
    status: row.status || 'open',
    ai_mode: row.ai_mode || row.aiMode || 'manual',
    assigned_to: row.assigned_to || null,
    assigneeName: row.assignee_name || row.assigneeName || 'Unassigned',
    priority: row.priority || null,
    lastMessage: row.last_message || row.lastMessage || '',
    updatedAt: parseTs(updatedAt),
  };
}

/* -- Page ----------------------------------------------------------------─-- */
export default function ConversationsPage() {
  const [active, setActive]         = useState(null);
  const [msgs, setMsgs]             = useState([]);
  const [reply, setReply]           = useState('');
  const [filters, setFilters]       = useState({
    status: 'all',
    channel: 'all',
    assigned_to: 'all',
    priority: 'all',
  });
  const [search, setSearch]         = useState('');
  const [agents, setAgents]         = useState([]);
  const [showPanel, setShow]        = useState(true);
  const [layoutPrefs, setLayoutPrefs] = useState({
    density:'comfortable',
    bubbleStyle:'rounded',
    showScore:true,
    showIntent:true,
    showChannel:true,
    showTimestamp:true,
  });
  const [tags, setTags]             = useState({});
  const [assignedTo, setAssignedTo] = useState({});
  const [handoffs, setHandoffs] = useState({});      // { [convId]: handoff | null }
  const [currentUser, setCurrentUser] = useState(null);
  const [store, dispatch] = useReducer(storeReducer, STORE_INIT);
  const storeRef = useRef(store);
  useEffect(() => { storeRef.current = store; }, [store]);
  const filtersRef = useRef(filters);
  const searchRef = useRef(search);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { searchRef.current = search; }, [search]);

  const liveConvs  = Object.values(store.convs).sort((a, b) => (b.updatedAt||0) - (a.updatedAt||0));
  const activeLive = store.activeId ? store.convs[store.activeId] : null;
  const liveMsgs   = activeLive?.messages || [];
  const [suggestion, setSuggestion] = useState(null);
  const [liveReply,  setLiveReply]  = useState('');
  const aiConfigured = true;

  // Decode JWT for RBAC in HandoffPanel (no sensitive use — frontend display only)
  useEffect(() => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('airos_token') : null;
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUser({ id: payload.id, role: payload.role, tenant_id: payload.tenant_id });
    } catch {}
  }, []);

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

  useEffect(() => {
    let cancelled = false;
    async function loadAgents() {
      try {
        const team = await secureApi.get('/api/auth/team');
        if (!cancelled && Array.isArray(team)) {
          setAgents(team.filter(user => ['owner', 'admin', 'agent'].includes(user.role)));
        }
      } catch {}
    }
    loadAgents();
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
  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    const currentFilters = filtersRef.current;
    for (const [key, value] of Object.entries(currentFilters)) {
      if (value && value !== 'all') params.set(key, value);
    }
    if (searchRef.current.trim()) params.set('search', searchRef.current.trim());
    params.set('limit', '100');

    const path = `/api/conversations?${params.toString()}`;
    const data = await secureApi.get(path);
    if (!Array.isArray(data)) return;
    dispatch({ type: 'REPLACE_CONVS', convs: data.map(normalizeConversation) });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConversations().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [filters, search, fetchConversations]);

  useEffect(() => {
    fetchConversations().catch(() => {});
    const pollTimer = setInterval(() => fetchConversations().catch(() => {}), 10000);

    const token = typeof window !== 'undefined' ? localStorage.getItem('airos_token') : null;
    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('message:new', ({ conversation, message }) => {
      const conv = normalizeConversation(conversation || {});
      const normalized = normalizeMessage(message, conv.id);
      log.ws('message:new', { selectedConversationId: storeRef.current.activeId, conversationId: normalized.conversationId, message: normalized });
      dispatch({ type: 'UPSERT_MESSAGE', conv, message: normalized });
      if (normalized.direction === 'inbound' && normalized.sent_by === 'customer') playNotif();
    });

    // Handoff events — update per-conversation handoff state
    socket.on('agent:handoff_requested', ({ handoff, conversation_id }) => {
      setHandoffs(h => ({ ...h, [conversation_id]: handoff }));
    });
    socket.on('agent:handoff_accepted', ({ handoff, conversation_id }) => {
      setHandoffs(h => ({ ...h, [conversation_id]: handoff }));
    });
    socket.on('agent:handoff_declined', ({ handoff, conversation_id }) => {
      setHandoffs(h => ({ ...h, [conversation_id]: handoff }));
    });
    socket.on('conversation:handoff_status', ({ handoff, conversation_id }) => {
      setHandoffs(h => ({ ...h, [conversation_id]: handoff }));
    });

    return () => {
      socket.disconnect();
      clearInterval(pollTimer);
    };
  }, [fetchConversations]);

  const openLiveConv = useCallback(async (conv) => {
    dispatch({ type: 'SET_ACTIVE', convId: conv.id });
    setSuggestion(null);
    setLiveReply('');
    try {
      const data = await secureApi.get(`/api/conversations/${encodeURIComponent(conv.id)}/messages`);
      if (Array.isArray(data)) {
        log.msg('messages:fetched', {
          selectedConversationId: conv.id,
          count: data.length,
          messageConversationIds: data.map(m => m.conversation_id || m.conversationId),
        });
        dispatch({ type: 'LOAD_MESSAGES', convId: conv.id, messages: data });
      }
    } catch {}
    // Fetch pending handoff for this conversation
    try {
      const hData = await secureApi.get(`/api/conversations/${encodeURIComponent(conv.id)}/handoff`);
      setHandoffs(h => ({ ...h, [conv.id]: hData.handoff }));
    } catch {
      setHandoffs(h => ({ ...h, [conv.id]: null }));
    }
  }, []);

  const sendLiveReply = useCallback(async (text) => {
    const conv = storeRef.current.convs[storeRef.current.activeId];
    if (!text.trim() || !conv) return;
    const tempId = `out_${Date.now()}`;
    dispatch({ type: 'OUTBOUND_MESSAGE', convId: conv.id, message: { id: tempId, content: text, sent_by: 'agent' } });
    setLiveReply('');
    setSuggestion(null);
    try {
      const data = await secureApi.post(`/api/conversations/${encodeURIComponent(conv.id)}/messages`, {
        content: text,
      });
      if (data?.message) {
        dispatch({ type: 'CONFIRM_MESSAGE', convId: conv.id, tempId, message: data.message });
      }
    } catch {
      dispatch({ type: 'MESSAGE_FAILED', convId: conv.id, tempId });
      toast.error('Failed to send');
    }
  }, []);

  /* AI assist state */
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
    openLiveConv(c);
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

  const filtered = Object.values(store.convs).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  const activeTags   = tags[(activeLive || active)?.id] || [];
  const currentAgent = activeLive?.assigneeName || assignedTo[active?.id] || 'Unassigned';

  async function assignActiveConversation(agent) {
    const conv = activeLive;
    if (!conv) return;
    const previous = storeRef.current.convs[conv.id];
    const nextAssignee = agent?.id || null;
    const nextName = agent?.name || agent?.email || 'Unassigned';

    dispatch({
      type: 'UPDATE_CONV',
      convId: conv.id,
      fields: { assigned_to: nextAssignee, assigneeName: nextName, assignee_name: nextName },
    });
    setAssignModal(false);

    try {
      const updated = await secureApi.patch(`/api/conversations/${encodeURIComponent(conv.id)}/assign`, {
        user_id: nextAssignee,
      });
      dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: normalizeConversation(updated) });
      toast.success(nextAssignee ? `Assigned to ${nextName}` : 'Conversation unassigned');
    } catch (err) {
      if (previous) dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: previous });
      toast.error(err.message || 'Assignment failed');
    }
  }

  async function setActiveLiveAiMode(enabled) {
    const conv = activeLive;
    if (!conv) return;
    const previous = storeRef.current.convs[conv.id];
    const nextMode = enabled ? 'auto' : 'manual';

    _autoReply[conv.id] = enabled;
    dispatch({ type:'SET_AUTO_REPLY', convId: conv.id, value: enabled });
    dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: { ai_mode: nextMode } });

    try {
      const updated = await secureApi.patch(`/api/conversations/${encodeURIComponent(conv.id)}/ai-mode`, {
        ai_mode: nextMode,
      });
      dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: normalizeConversation(updated) });
      toast(enabled ? '🤖 Bot Active' : '👤 Manual');
    } catch (err) {
      if (previous) dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: previous });
      _autoReply[conv.id] = previous?.ai_mode === 'auto';
      dispatch({ type:'SET_AUTO_REPLY', convId: conv.id, value: previous?.ai_mode === 'auto' });
      toast.error(err.message || 'Could not update AI mode');
    }
  }

  const filteredCanned = cannedReplies.filter(c =>
    !cannedSearch || c.title.toLowerCase().includes(cannedSearch.toLowerCase()) || c.shortcut.toLowerCase().includes(cannedSearch.toLowerCase())
  );

  return (
    <>
      <div className="flex h-[calc(100vh-var(--topbar-h))] overflow-hidden bg-[#0f172a]">
        <ConversationList
          ref={searchInputRef}
          search={search} setSearch={setSearch}
          filters={filters} setFilters={setFilters}
          agents={agents}
          liveConvs={[]} filtered={filtered}
          activeId={activeLive?.id} activeLiveId={activeLive?.id}
          openLiveConv={openLiveConv} selectConv={selectConv}
          layoutPrefs={layoutPrefs} aiAutoReply={aiAutoReply}
          pendingHandoffs={handoffs}
        />

        <ChatWindow 
          activeConv={activeLive || active}
          messages={activeLive ? liveMsgs.filter(m => String(m.conversationId || m.conversation_id) === String(activeLive.id)) : msgs}
          reply={activeLive ? liveReply : reply}
          setReply={activeLive ? setLiveReply : setReply}
          onSend={activeLive ? () => sendLiveReply(liveReply) : send}
          isAutoOn={activeLive ? activeLive.ai_mode === 'auto' : isAutoOn}
          onToggleAuto={activeLive ? () => setActiveLiveAiMode(activeLive.ai_mode !== 'auto') : toggleAutoReply}
          aiTyping={activeLive ? store.aiTyping[activeLive.id] : aiThinking}
          aiConfigured={aiConfigured}
          suggestion={suggestion}
          onUseSuggestion={(text) => activeLive ? (setLiveReply(text), setSuggestion(null)) : (setReply(text), toast('Loaded ↑'))}
          onSendSuggestion={(text) => activeLive ? (sendLiveReply(text), setSuggestion(null)) : null}
          onDismissSuggestion={() => setSuggestion(null)}
          onTakeOver={() => {
            if (activeLive) {
              setActiveLiveAiMode(false);
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
          <div className="w-[320px] flex-shrink-0 flex flex-col overflow-y-auto bg-[var(--bg2)] border-l border-[var(--b1)] hide-sm">
            <CustomerProfilePanel
              activeConv={activeLive || active}
              isAutoOn={activeLive ? activeLive.ai_mode === 'auto' : isAutoOn}
              onToggleAuto={activeLive ? () => setActiveLiveAiMode(activeLive.ai_mode !== 'auto') : toggleAutoReply}
              tags={activeTags}
              currentAgent={currentAgent}
              onManageCanned={() => setCannedMgmtModal(true)}
              onAddTag={() => !activeLive && setTagModal(true)}
              onViewHistory={() => !activeLive && setHistoryModal(true)}
            />
            {(activeLive || active) && (
              <div className="p-4 pt-0">
                <HandoffPanel
                  conversationId={(activeLive || active).id}
                  handoff={handoffs[(activeLive || active).id] || null}
                  agents={agents}
                  currentUser={currentUser}
                  onHandoffChange={(h) => setHandoffs(prev => ({ ...prev, [(activeLive || active).id]: h }))}
                />
              </div>
            )}
          </div>
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
          <button className="btn btn-ghost justify-start" onClick={() => activeLive ? assignActiveConversation(null) : setAssignModal(false)}>
            Unassigned
          </button>
          {agents.map(agent => (
            <button
              key={agent.id}
              className="btn btn-ghost justify-start"
              onClick={() => activeLive ? assignActiveConversation(agent) : setAssignModal(false)}
            >
              {agent.name || agent.email}
            </button>
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
          <div className="p-4 border border-[var(--b1)] rounded-lg bg-[var(--s1)]">
            <p className="font-bold text-[var(--t1)]">No history available</p>
            <p className="text-sm text-[var(--t4)] mt-1">This panel will show previous interactions when real history is available.</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
