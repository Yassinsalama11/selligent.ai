'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/Modal';
import { api as secureApi } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import ConversationListV2 from './ConversationListV2';
import ChatHeaderV2 from './ChatHeaderV2';
import AIStateBarV2 from './AIStateBarV2';
import MessageListV2 from './MessageListV2';
import ComposerV2 from './ComposerV2';
import AISuggestionBarV2 from './AISuggestionBarV2';
import CustomerPanelV2 from './CustomerPanelV2';
import ContextDrawerV2 from './ContextDrawerV2';
import {
  DEFAULT_CANNED,
  STORE_INIT,
  TAGS,
  getInboxTheme,
  isNearBottom,
  normalizeConversation,
  normalizeMessage,
  storeReducer,
} from './utils';

const _autoReply = {};
Object.assign(_autoReply, STORE_INIT.autoReply || {});

function playNotif() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
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

function EmptyThread() {
  return (
    <main className="flex h-full min-h-0 min-w-0 flex-1 items-center justify-center bg-[var(--inbox-main)] px-8">
      <div className="max-w-[420px] rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-surface)] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] text-[12px] font-bold text-[var(--inbox-text-secondary)]">
          IN
        </div>
        <p className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-[var(--inbox-text-primary)]">Select a conversation</p>
        <p className="mt-3 text-[14px] leading-6 text-[var(--inbox-text-secondary)]">
          Choose a thread from the inbox to view messages, manage ownership, and reply from a single workspace.
        </p>
      </div>
    </main>
  );
}

export default function ConversationsV2Page() {
  const [filters, setFilters] = useState({
    status: 'all',
    channel: 'all',
    assigned_to: 'all',
    priority: 'all',
  });
  const [search, setSearch] = useState('');
  const [agents, setAgents] = useState([]);
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(true);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [tags, setTags] = useState({});
  const [handoffs, setHandoffs] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [store, dispatch] = useReducer(storeReducer, STORE_INIT);
  const [suggestion, setSuggestion] = useState(null);
  const [liveReply, setLiveReply] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewMessages, setShowNewMessages] = useState(false);

  const [aiAutoReply, setAiAutoReply] = useState({});
  const [cannedReplies, setCannedReplies] = useState(DEFAULT_CANNED);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearch, setCannedSearch] = useState('');
  const [cannedMgmtModal, setCannedMgmtModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [tagModal, setTagModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const storeRef = useRef(store);
  const filtersRef = useRef(filters);
  const searchRef = useRef(search);
  const messagesRef = useRef(null);
  const bottomRef = useRef(null);
  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const wasNearBottomRef = useRef(true);

  useEffect(() => { storeRef.current = store; }, [store]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { searchRef.current = search; }, [search]);

  const conversations = useMemo(
    () => Object.values(store.convs).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [store.convs]
  );
  const activeConversation = store.activeId ? store.convs[store.activeId] : null;
  const messages = activeConversation
    ? (activeConversation.messages || []).filter(message => String(message.conversationId) === String(activeConversation.id))
    : [];
  const isAutoOn = activeConversation?.ai_mode === 'auto';
  const aiConfigured = true;
  const activeTags = tags[activeConversation?.id] || [];
  const currentAgent = activeConversation?.assigneeName || 'Unassigned';
  const aiTyping = activeConversation ? Boolean(store.aiTyping[activeConversation.id]) : false;
  const activeHandoff = activeConversation ? handoffs[activeConversation.id] || null : null;
  const hasActiveConversation = Boolean(activeConversation);
  const inboxTheme = getInboxTheme(isLightMode);

  const filteredCanned = cannedReplies.filter(reply =>
    !cannedSearch
    || reply.title.toLowerCase().includes(cannedSearch.toLowerCase())
    || reply.shortcut.toLowerCase().includes(cannedSearch.toLowerCase())
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const narrowQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(max-width: 1199px)');
    const syncLayout = () => {
      setIsNarrow(narrowQuery.matches);
      setIsTablet(tabletQuery.matches);
      if (!tabletQuery.matches) setMobileContextOpen(false);
    };
    const syncTheme = () => {
      const storedTheme = localStorage.getItem('airos_theme') || localStorage.getItem('theme');
      const root = document.documentElement;
      setIsLightMode(storedTheme === 'light' || root.dataset.theme === 'light' || root.classList.contains('light'));
    };
    syncLayout();
    syncTheme();
    narrowQuery.addEventListener?.('change', syncLayout);
    tabletQuery.addEventListener?.('change', syncLayout);
    window.addEventListener('storage', syncTheme);
    return () => {
      narrowQuery.removeEventListener?.('change', syncLayout);
      tabletQuery.removeEventListener?.('change', syncLayout);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

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

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filtersRef.current)) {
      if (value && value !== 'all') params.set(key, value);
    }
    if (searchRef.current.trim()) params.set('search', searchRef.current.trim());
    params.set('limit', '100');

    const data = await secureApi.get(`/api/conversations?${params.toString()}`);
    if (Array.isArray(data)) {
      dispatch({ type: 'REPLACE_CONVS', convs: data.map(normalizeConversation) });
    }
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

    socket.on('message:new', ({ conversation, message }) => {
      const conv = normalizeConversation(conversation || {});
      const normalized = normalizeMessage(message, conv.id);
      const activeId = storeRef.current.activeId;
      const messageForActive = String(normalized.conversationId) === String(activeId);
      const nearBottom = isNearBottom(messagesRef.current);
      dispatch({ type: 'UPSERT_MESSAGE', conv, message: normalized });
      if (messageForActive && nearBottom) {
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: 'end' }));
      } else if (messageForActive) {
        setShowNewMessages(true);
      }
      if (normalized.direction === 'inbound' && normalized.sent_by === 'customer') playNotif();
    });

    socket.on('agent:handoff_requested', ({ handoff, conversation_id }) => {
      setHandoffs(current => ({ ...current, [conversation_id]: handoff }));
    });
    socket.on('agent:handoff_accepted', ({ handoff, conversation_id }) => {
      setHandoffs(current => ({ ...current, [conversation_id]: handoff }));
    });
    socket.on('agent:handoff_declined', ({ handoff, conversation_id }) => {
      setHandoffs(current => ({ ...current, [conversation_id]: handoff }));
    });
    socket.on('conversation:handoff_status', ({ handoff, conversation_id }) => {
      setHandoffs(current => ({ ...current, [conversation_id]: handoff }));
    });

    return () => {
      socket.disconnect();
      clearInterval(pollTimer);
    };
  }, [fetchConversations]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        if (mobileContextOpen) setMobileContextOpen(false);
        else if (activeConversation) dispatch({ type: 'CLOSE_ACTIVE' });
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeConversation, mobileContextOpen]);

  useLayoutEffect(() => {
    if (wasNearBottomRef.current || messages.length <= 1) {
      bottomRef.current?.scrollIntoView({ block: 'end' });
      setShowNewMessages(false);
    }
  }, [messages.length, store.activeId]);

  const openConversation = useCallback(async (conversation) => {
    dispatch({ type: 'SET_ACTIVE', convId: conversation.id });
    setSuggestion(null);
    setLiveReply('');
    setShowCannedPicker(false);
    setShowNewMessages(false);
    setLoadingMessages(true);
    try {
      const data = await secureApi.get(`/api/conversations/${encodeURIComponent(conversation.id)}/messages`);
      if (Array.isArray(data)) dispatch({ type: 'LOAD_MESSAGES', convId: conversation.id, messages: data });
    } catch {
      toast.error('Could not load messages');
    } finally {
      setLoadingMessages(false);
    }
    try {
      const hData = await secureApi.get(`/api/conversations/${encodeURIComponent(conversation.id)}/handoff`);
      setHandoffs(current => ({ ...current, [conversation.id]: hData.handoff }));
    } catch {
      setHandoffs(current => ({ ...current, [conversation.id]: null }));
    }
  }, []);

  const sendLiveReply = useCallback(async (text) => {
    const conv = storeRef.current.convs[storeRef.current.activeId];
    if (!text.trim() || !conv) return;
    const tempId = `out_${Date.now()}`;
    wasNearBottomRef.current = true;
    dispatch({ type: 'OUTBOUND_MESSAGE', convId: conv.id, message: { id: tempId, content: text, sent_by: 'agent' } });
    setLiveReply('');
    setSuggestion(null);
    try {
      const data = await secureApi.post(`/api/conversations/${encodeURIComponent(conv.id)}/messages`, { content: text });
      if (data?.message) {
        dispatch({ type: 'CONFIRM_MESSAGE', convId: conv.id, tempId, message: data.message });
      }
    } catch {
      dispatch({ type: 'MESSAGE_FAILED', convId: conv.id, tempId });
      toast.error('Failed to send');
    }
  }, []);

  async function setActiveLiveAiMode(enabled) {
    const conv = activeConversation;
    if (!conv) return;
    const previous = storeRef.current.convs[conv.id];
    const nextMode = enabled ? 'auto' : 'manual';
    _autoReply[conv.id] = enabled;
    dispatch({ type: 'SET_AUTO_REPLY', convId: conv.id, value: enabled });
    dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: { ai_mode: nextMode } });
    try {
      const updated = await secureApi.patch(`/api/conversations/${encodeURIComponent(conv.id)}/ai-mode`, { ai_mode: nextMode });
      dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: normalizeConversation(updated) });
      toast(enabled ? 'AI auto-reply enabled' : 'Manual mode enabled');
    } catch (err) {
      if (previous) dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: previous });
      _autoReply[conv.id] = previous?.ai_mode === 'auto';
      dispatch({ type: 'SET_AUTO_REPLY', convId: conv.id, value: previous?.ai_mode === 'auto' });
      toast.error(err.message || 'Could not update AI mode');
    }
  }

  async function assignActiveConversation(agent) {
    const conv = activeConversation;
    if (!conv) return;
    const previous = storeRef.current.convs[conv.id];
    const nextAssignee = agent?.id || null;
    const nextName = agent?.name || agent?.email || 'Unassigned';
    dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: { assigned_to: nextAssignee, assigneeName: nextName, assignee_name: nextName } });
    setAssignModal(false);
    try {
      const updated = await secureApi.patch(`/api/conversations/${encodeURIComponent(conv.id)}/assign`, { user_id: nextAssignee });
      dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: normalizeConversation(updated) });
      toast.success(nextAssignee ? `Assigned to ${nextName}` : 'Conversation unassigned');
    } catch (err) {
      if (previous) dispatch({ type: 'UPDATE_CONV', convId: conv.id, fields: previous });
      toast.error(err.message || 'Assignment failed');
    }
  }

  function handleSelectConversation(conversation) {
    openConversation(conversation);
    if (isNarrow) setMobileContextOpen(false);
  }

  function closeActiveConversation() {
    dispatch({ type: 'CLOSE_ACTIVE' });
    setSuggestion(null);
    setMobileContextOpen(false);
  }

  function jumpToBottom() {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    setShowNewMessages(false);
  }

  function handleFileSelect(event, type) {
    toast.success(`${type === 'image' ? 'Image' : 'File'} selected`);
    event.target.value = '';
  }

  const panelProps = {
    conversation: activeConversation,
    isAutoOn,
    onToggleAuto: () => activeConversation && setActiveLiveAiMode(activeConversation.ai_mode !== 'auto'),
    tags: activeTags,
    currentAgent,
    onManageCanned: () => setCannedMgmtModal(true),
    onAddTag: () => setTagModal(true),
    onViewHistory: () => setHistoryModal(true),
    handoff: activeHandoff,
    agents,
    currentUser,
    onHandoffChange: (handoff) => activeConversation && setHandoffs(current => ({ ...current, [activeConversation.id]: handoff })),
  };

  return (
    <div className="h-full min-h-0" style={inboxTheme}>
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-[var(--inbox-main)] font-['Inter',sans-serif] text-[14px] text-[var(--inbox-text-primary)]">
        <div className={`${hasActiveConversation ? 'hidden md:flex' : 'flex'} h-full min-h-0 w-full shrink-0 md:w-[320px]`}>
          <ConversationListV2
            ref={searchInputRef}
            search={search}
            setSearch={setSearch}
            filters={filters}
            setFilters={setFilters}
            agents={agents}
            conversations={conversations}
            activeId={activeConversation?.id}
            onSelect={handleSelectConversation}
            pendingHandoffs={handoffs}
          />
        </div>

        <div className={`${hasActiveConversation ? 'flex' : 'hidden md:flex'} h-full min-h-0 min-w-0 flex-1`}>
          {activeConversation ? (
            <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--inbox-main)]">
              <ChatHeaderV2
                conversation={activeConversation}
                isAutoOn={isAutoOn}
                aiTyping={aiTyping}
                aiConfigured={aiConfigured}
                onBack={closeActiveConversation}
                onAssign={() => setAssignModal(true)}
                onClose={() => setCloseModal(true)}
                onToggleContext={() => (isTablet ? setMobileContextOpen(true) : setDesktopPanelOpen(value => !value))}
                contextOpen={!isTablet && desktopPanelOpen}
              />
              <AIStateBarV2
                isAutoOn={isAutoOn}
                aiTyping={aiTyping}
                aiConfigured={aiConfigured}
                handoff={activeHandoff}
                onToggleAuto={() => setActiveLiveAiMode(activeConversation.ai_mode !== 'auto')}
              />
              <MessageListV2
                messages={messages}
                contactName={activeConversation.customerName}
                aiTyping={aiTyping}
                loading={loadingMessages}
                messagesRef={(node) => {
                  messagesRef.current = node;
                  if (node) {
                    node.onscroll = () => {
                      wasNearBottomRef.current = isNearBottom(node);
                      if (wasNearBottomRef.current) setShowNewMessages(false);
                    };
                  }
                }}
                bottomRef={bottomRef}
                showNewMessages={showNewMessages}
                onJumpToBottom={jumpToBottom}
                onRetry={(message) => message?.content && sendLiveReply(message.content)}
              />
              <AISuggestionBarV2
                suggestion={suggestion}
                aiTyping={aiTyping && !isAutoOn}
                onUse={(text) => { setLiveReply(text); setSuggestion(null); }}
                onSend={(text) => { sendLiveReply(text); setSuggestion(null); }}
                onDismiss={() => setSuggestion(null)}
              />
              <ComposerV2
                reply={liveReply}
                setReply={setLiveReply}
                onSend={() => sendLiveReply(liveReply)}
                isAutoOn={isAutoOn}
                onTakeOver={() => setActiveLiveAiMode(false)}
                showCannedPicker={showCannedPicker}
                setShowCannedPicker={setShowCannedPicker}
                cannedSearch={cannedSearch}
                setCannedSearch={setCannedSearch}
                filteredCanned={filteredCanned}
                onInsertCanned={(text) => { setLiveReply(text); setShowCannedPicker(false); }}
                onManageCanned={() => setCannedMgmtModal(true)}
                fileInputRef={fileInputRef}
                imageInputRef={imageInputRef}
                onFileSelect={handleFileSelect}
              />
            </main>
          ) : (
            <EmptyThread />
          )}
        </div>

        {desktopPanelOpen && activeConversation && (
          <div className="hidden h-full min-h-0 w-[320px] shrink-0 border-l border-[var(--inbox-border)] bg-[var(--inbox-surface)] xl:block">
            <CustomerPanelV2 {...panelProps} />
          </div>
        )}
      </div>

      <ContextDrawerV2
        open={mobileContextOpen && Boolean(activeConversation)}
        onClose={() => setMobileContextOpen(false)}
        panelProps={panelProps}
      />

      <Modal open={cannedMgmtModal} onClose={() => setCannedMgmtModal(false)} title="Canned Replies" width={560} variant="inbox">
        <div className="flex flex-col gap-4">
          {cannedReplies.map(reply => (
            <div key={reply.id} className="flex items-center justify-between rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] p-4">
              <div>
                <p className="text-[14px] font-semibold text-[var(--inbox-text-primary)]">{reply.title}</p>
                <p className="mt-1 text-[12px] text-[var(--inbox-text-secondary)]">{reply.shortcut}</p>
              </div>
              <button className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-surface)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)]" onClick={() => setCannedReplies(current => current.filter(item => item.id !== reply.id))}>Delete</button>
            </div>
          ))}
          <button className="rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(255,90,31,0.22)]" onClick={() => toast('Canned reply creation is not wired yet')}>
            Add new
          </button>
        </div>
      </Modal>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Agent" variant="inbox">
        <div className="flex flex-col gap-2">
          <button className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3 text-left text-[14px] font-semibold text-[var(--inbox-text-primary)]" onClick={() => assignActiveConversation(null)}>
            Unassigned
          </button>
          {agents.map(agent => (
            <button key={agent.id} className="rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3 text-left text-[14px] font-semibold text-[var(--inbox-text-primary)]" onClick={() => assignActiveConversation(agent)}>
              {agent.name || agent.email}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={closeModal} onClose={() => setCloseModal(false)} title="Close Conversation" variant="inbox">
        <p className="mb-4 text-[14px] text-[var(--inbox-text-secondary)]">Go back to the conversation list?</p>
        <div className="flex gap-2">
          <button className="flex-1 rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-4 py-3 text-[14px] font-semibold text-white" onClick={() => { setCloseModal(false); closeActiveConversation(); }}>Close view</button>
          <button className="flex-1 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3 text-[14px] font-semibold text-[var(--inbox-text-primary)]" onClick={() => setCloseModal(false)}>Cancel</button>
        </div>
      </Modal>

      <Modal open={tagModal} onClose={() => setTagModal(false)} title="Add Tag" variant="inbox">
        <div className="mb-4 flex gap-2">
          <input className="flex-1 rounded-[10px] border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-4 py-3 text-[14px] text-[var(--inbox-text-primary)] outline-none" value={tagInput} onChange={event => setTagInput(event.target.value)} placeholder="Tag name..." />
          <button className="rounded-[10px] bg-gradient-to-br from-[#FF7A18] to-[#FF3D00] px-4 py-3 text-[14px] font-semibold text-white" onClick={() => { if (!activeConversation || !tagInput.trim()) return; setTags(current => ({ ...current, [activeConversation.id]: [...(current[activeConversation.id] || []), tagInput.trim()] })); setTagInput(''); setTagModal(false); }}>Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(tag => (
            <button key={tag} className="rounded-full border border-[var(--inbox-border)] bg-[var(--inbox-card)] px-3 py-2 text-[12px] font-semibold text-[var(--inbox-text-secondary)]" onClick={() => { if (!activeConversation) return; setTags(current => ({ ...current, [activeConversation.id]: [...(current[activeConversation.id] || []), tag] })); setTagModal(false); }}>{tag}</button>
          ))}
        </div>
      </Modal>

      <Modal open={historyModal} onClose={() => setHistoryModal(false)} title="Conversation History" variant="inbox">
        <div className="rounded-xl border border-[var(--inbox-border)] bg-[var(--inbox-card)] p-4">
          <p className="text-[14px] font-semibold text-[var(--inbox-text-primary)]">No history available</p>
          <p className="mt-1 text-[12px] text-[var(--inbox-text-secondary)]">This panel will show previous interactions when real history is available.</p>
        </div>
      </Modal>
    </div>
  );
}

