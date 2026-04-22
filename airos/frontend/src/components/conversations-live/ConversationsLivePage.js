'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import {
  PrototypeAIStateBar,
  PrototypeChatHeader,
  PrototypeComposer,
  PrototypeContextDrawerMobile,
  PrototypeConversationList,
  PrototypeCustomerPanel,
  PrototypeLayoutShell,
  PrototypeMessageList,
  PrototypeSidebarNav,
} from '@/components/conversations-prototype/ConversationsPrototypePage';
import styles from '@/components/conversations-prototype/ConversationsPrototypePage.module.css';

const filters = ['All', 'WhatsApp', 'Instagram', 'Messenger'];

function formatChannel(channel) {
  const value = String(channel || 'livechat').toLowerCase();
  if (value === 'whatsapp') return 'WhatsApp';
  if (value === 'instagram') return 'Instagram';
  if (value === 'messenger') return 'Messenger';
  if (value === 'livechat') return 'Live chat';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Live chat';
}

function channelTone(channel) {
  const value = String(channel || '').toLowerCase();
  if (value === 'whatsapp') return 'wa';
  if (value === 'instagram') return 'ig';
  if (value === 'messenger') return 'ms';
  return 'ms';
}

function initialsFromName(name) {
  const parts = String(name || 'Unknown customer')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (parts[0]?.[0] || 'U').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const diffMs = now.getTime() - date.getTime();
  if (diffMs > 0 && diffMs < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function normalizeConversation(row = {}) {
  const customerName = row.customer_name || row.customerName || row.customer?.name || 'Unknown customer';
  const channel = formatChannel(row.channel);
  const updatedAt = row.updated_at || row.updatedAt || row.created_at || row.createdAt;
  const aiMode = row.ai_mode || row.aiMode || 'manual';

  return {
    id: String(row.id),
    name: customerName,
    initials: initialsFromName(customerName),
    channel,
    channelTone: channelTone(row.channel),
    status: row.status || 'open',
    intent: row.intent || row.priority || 'Not detected',
    aiMode,
    aiAvailable: row.ai_available ?? row.aiAvailable ?? row.ai_configured ?? row.aiConfigured ?? null,
    leadScore: Number(row.lead_score || row.leadScore || 0),
    assignee: row.assignee_name || row.assigneeName || 'Unassigned',
    lastMessage: row.last_message || row.lastMessage || 'No messages yet',
    timestamp: formatTime(updatedAt),
    sortTimestamp: updatedAt || '',
    unread: Number(row.unread_count || row.unread || 0),
    tags: Array.isArray(row.tags) ? row.tags : [],
    email: row.customer_email || row.customerEmail || '',
    phone: row.customer_phone || row.customerPhone || '',
    location: row.location || '',
    value: row.value || '',
    sentiment: row.sentiment || '',
    messages: [],
  };
}

function mergeConversation(existing = {}, incoming = {}, normalizedMessage = null) {
  const normalizedIncoming = incoming?.id ? normalizeConversation(incoming) : null;
  const sortTimestamp = normalizedMessage?.timestamp || incoming?.updated_at || incoming?.updatedAt || incoming?.created_at || existing.sortTimestamp || '';

  return {
    ...existing,
    ...(normalizedIncoming || {}),
    id: String(normalizedIncoming?.id || existing.id || normalizedMessage?.conversationId || ''),
    lastMessage: normalizedMessage?.content || normalizedIncoming?.lastMessage || existing.lastMessage || 'No messages yet',
    timestamp: sortTimestamp ? formatTime(sortTimestamp) || existing.timestamp || '' : existing.timestamp || '',
    sortTimestamp,
    unread: existing.unread || 0,
  };
}

function messageTimestamp(message = {}) {
  return message.timestamp || message.created_at || message.createdAt || message.sent_at || message.updated_at || message.updatedAt || '';
}

function normalizeMessage(message = {}, fallbackConversationId = '') {
  const sentBy = message.sent_by || message.sentBy || message.by || (message.auto ? 'ai' : message.direction === 'outbound' ? 'agent' : 'customer');
  const direction = message.direction
    || (message.dir === 'out' ? 'outbound' : message.dir === 'in' ? 'inbound' : '')
    || (['agent', 'ai'].includes(sentBy) ? 'outbound' : 'inbound');

  return {
    id: String(message.id || `${fallbackConversationId}-${messageTimestamp(message) || Date.now()}`),
    conversationId: String(message.conversationId || message.conversation_id || fallbackConversationId || ''),
    direction: direction === 'out' ? 'outbound' : direction === 'in' ? 'inbound' : direction,
    sent_by: sentBy,
    content: String(message.content ?? message.text ?? ''),
    timestamp: messageTimestamp(message) || '',
  };
}

function upsertMessage(messages, nextMessage) {
  const byId = new Map();
  for (const message of messages) {
    byId.set(message.id, message);
  }
  byId.set(nextMessage.id, { ...(byId.get(nextMessage.id) || {}), ...nextMessage });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = new Date(a.timestamp || 0).getTime();
    const bTime = new Date(b.timestamp || 0).getTime();
    return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
  });
}

function isNearBottom(element) {
  if (!element) return true;
  return element.scrollHeight - element.scrollTop - element.clientHeight < 96;
}

export default function ConversationsLivePage() {
  const [theme, setTheme] = useState('dark');
  const [filter, setFilter] = useState('All');
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [composerValue, setComposerValue] = useState('');
  const [sending, setSending] = useState(false);
  const [aiModeUpdating, setAiModeUpdating] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const messageBottomRef = useRef(null);
  const messageListRef = useRef(null);
  const activeConversationIdRef = useRef(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('airos_user') || 'null');
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConversations(silent = false) {
      if (!silent) setLoading(true);
      setError('');
      try {
        const data = await api.get('/api/conversations?limit=100');
        if (cancelled) return;
        const rows = (Array.isArray(data) ? data : []).map(normalizeConversation);
        setConversations((current) => {
          const previousById = new Map(current.map((conversation) => [conversation.id, conversation]));
          const merged = rows.map((conversation) => {
            const previous = previousById.get(conversation.id);
            return previous ? { ...conversation, unread: previous.unread || conversation.unread } : conversation;
          });
          const activeId = activeConversationIdRef.current;
          if (activeId && !merged.some((conversation) => conversation.id === activeId)) {
            const activePrevious = previousById.get(activeId);
            if (activePrevious) merged.unshift(activePrevious);
          }
          return merged;
        });
      } catch (err) {
        if (!cancelled) {
          if (!silent) {
            setError(err?.message || 'Could not load conversations.');
            setConversations([]);
          }
        }
      } finally {
        if (!cancelled && !silent) setLoading(false);
      }
    }

    loadConversations(false);
    const timer = setInterval(() => loadConversations(true), 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const visibleConversations = useMemo(() => {
    if (filter === 'All') return conversations;
    return conversations.filter((conversation) => conversation.channel === filter);
  }, [conversations, filter]);

  const activeConversation = useMemo(() => (
    conversations.find((conversation) => conversation.id === activeConversationId) || null
  ), [activeConversationId, conversations]);

  const emptyLabel = loading
    ? 'Loading conversations...'
    : error || 'No conversations found yet.';

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!activeConversationId) {
        setMessages([]);
        setMessagesError('');
        setMessagesLoading(false);
        setComposerValue('');
        return;
      }

      setMessages([]);
      setMessagesError('');
      setMessagesLoading(true);
      setComposerValue('');
      try {
        const data = await api.get(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`);
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : [];
        const serverMessages = rows.map((message) => normalizeMessage(message, activeConversationId));
        setMessages((current) => {
          const currentForConversation = current.filter((message) => message.conversationId === activeConversationId);
          return currentForConversation.reduce(
            (merged, message) => upsertMessage(merged, message),
            serverMessages
          );
        });
      } catch (err) {
        if (!cancelled) {
          setMessages([]);
          setMessagesError(err?.message || 'Could not load messages.');
        }
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadHandoff() {
      if (!activeConversationId) {
        setHandoff(null);
        return;
      }
      try {
        const data = await api.get(`/api/conversations/${encodeURIComponent(activeConversationId)}/handoff`);
        if (!cancelled) setHandoff(data?.handoff || null);
      } catch {
        if (!cancelled) setHandoff(null);
      }
    }

    loadHandoff();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId || messagesLoading) return;
    requestAnimationFrame(() => {
      messageBottomRef.current?.scrollIntoView({ block: 'end' });
    });
  }, [activeConversationId, messagesLoading, messages.length]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('airos_token') : null;
    const socket = connectSocket(token);

    function handleNewMessage(payload = {}) {
      const incomingConversation = payload.conversation || {};
      const fallbackConversationId = incomingConversation.id || payload.message?.conversation_id || payload.message?.conversationId || '';
      const normalized = normalizeMessage(payload.message || {}, fallbackConversationId);
      if (!normalized.conversationId) return;

      const activeId = activeConversationIdRef.current;
      const isActive = String(normalized.conversationId) === String(activeId);
      const nearBottom = isNearBottom(messageListRef.current);

      setConversations((current) => {
        const index = current.findIndex((conversation) => conversation.id === normalized.conversationId);
        const existing = index >= 0 ? current[index] : { id: normalized.conversationId };
        const updated = mergeConversation(existing, incomingConversation, normalized);
        updated.unread = isActive ? 0 : Number(existing.unread || 0) + (normalized.direction === 'inbound' ? 1 : 0);
        const next = index >= 0
          ? current.map((conversation, currentIndex) => currentIndex === index ? updated : conversation)
          : [updated, ...current];
        return next.sort((a, b) => {
          const aTime = new Date(a.sortTimestamp || 0).getTime();
          const bTime = new Date(b.sortTimestamp || 0).getTime();
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });
      });

      if (isActive) {
        setMessages((current) => upsertMessage(current, normalized));
        if (nearBottom) {
          requestAnimationFrame(() => {
            messageBottomRef.current?.scrollIntoView({ block: 'end' });
          });
        }
      }
    }

    socket.on('message:new', handleNewMessage);
    socket.on('agent:handoff_requested', ({ handoff: nextHandoff, conversation_id }) => {
      if (String(conversation_id) === String(activeConversationIdRef.current)) setHandoff(nextHandoff || null);
    });
    socket.on('agent:handoff_accepted', ({ handoff: nextHandoff, conversation_id }) => {
      if (String(conversation_id) === String(activeConversationIdRef.current)) setHandoff(nextHandoff?.status === 'pending' ? nextHandoff : null);
    });
    socket.on('agent:handoff_declined', ({ handoff: nextHandoff, conversation_id }) => {
      if (String(conversation_id) === String(activeConversationIdRef.current)) setHandoff(nextHandoff?.status === 'pending' ? nextHandoff : null);
    });
    socket.on('conversation:handoff_status', ({ handoff: nextHandoff, conversation_id }) => {
      if (String(conversation_id) === String(activeConversationIdRef.current)) setHandoff(nextHandoff?.status === 'pending' ? nextHandoff : null);
    });
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('agent:handoff_requested');
      socket.off('agent:handoff_accepted');
      socket.off('agent:handoff_declined');
      socket.off('conversation:handoff_status');
    };
  }, []);

  async function setActiveAiMode(nextMode) {
    if (!activeConversation || aiModeUpdating || activeConversation.aiAvailable === false) return;
    const previousMode = activeConversation.aiMode;
    setAiModeUpdating(true);
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeConversation.id ? { ...conversation, aiMode: nextMode } : conversation
    )));
    try {
      const updated = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/ai-mode`, {
        ai_mode: nextMode,
      });
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id
          ? {
            ...conversation,
            aiMode: updated?.ai_mode || nextMode,
            status: updated?.status || conversation.status,
            sortTimestamp: updated?.updated_at || conversation.sortTimestamp,
            timestamp: updated?.updated_at ? formatTime(updated.updated_at) : conversation.timestamp,
          }
          : conversation
      )));
    } catch {
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id ? { ...conversation, aiMode: previousMode } : conversation
      )));
    } finally {
      setAiModeUpdating(false);
    }
  }

  function takeOverConversation() {
    if (activeConversation?.aiMode === 'auto') setActiveAiMode('manual');
  }

  async function requestHandoff(reason) {
    if (!activeConversationId || handoffBusy) return;
    setHandoffBusy(true);
    try {
      const data = await api.post(`/api/conversations/${encodeURIComponent(activeConversationId)}/handoff`, {
        reason,
      });
      setHandoff(data?.handoff || null);
    } catch {
      // Existing API returns 409 with the pending handoff when one already exists.
    } finally {
      setHandoffBusy(false);
    }
  }

  async function resolveHandoff(action) {
    if (!activeConversationId || !handoff?.id || handoffBusy) return;
    setHandoffBusy(true);
    try {
      const path = `/api/conversations/${encodeURIComponent(activeConversationId)}/handoff/${encodeURIComponent(handoff.id)}`;
      const data = action === 'cancel'
        ? await api.delete(path)
        : await api.post(`${path}/${action}`, {});
      setHandoff(data?.handoff?.status === 'pending' ? data.handoff : null);
      if (data?.conversation) {
        const normalized = normalizeConversation(data.conversation);
        setConversations((current) => current.map((conversation) => (
          conversation.id === normalized.id ? { ...conversation, ...normalized } : conversation
        )));
      }
    } catch {
      // Keep the current handoff visible on failure.
    } finally {
      setHandoffBusy(false);
    }
  }

  async function handleManualSend() {
    const content = composerValue.trim();
    if (!activeConversationId || !content || sending) return;

    const tempId = `tmp-${activeConversationId}-${Date.now()}`;
    const optimisticMessage = normalizeMessage({
      id: tempId,
      conversationId: activeConversationId,
      direction: 'outbound',
      sent_by: 'agent',
      content,
      timestamp: new Date().toISOString(),
      status: 'sending',
    }, activeConversationId);

    setComposerValue('');
    setSending(true);
    setMessages((current) => [...current, optimisticMessage]);
    requestAnimationFrame(() => {
      messageBottomRef.current?.scrollIntoView({ block: 'end' });
    });

    try {
      const response = await api.post(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`, {
        content,
      });
      const confirmed = normalizeMessage(response?.message || response, activeConversationId);
      setMessages((current) => {
        const withoutTemp = current.filter((message) => message.id !== tempId);
        return upsertMessage(withoutTemp, confirmed);
      });
      requestAnimationFrame(() => {
        messageBottomRef.current?.scrollIntoView({ block: 'end' });
      });
    } catch {
      setMessages((current) => current.map((message) => (
        message.id === tempId ? { ...message, status: 'failed' } : message
      )));
    } finally {
      setSending(false);
    }
  }

  return (
    <PrototypeLayoutShell theme={theme}>
      <PrototypeSidebarNav theme={theme} onThemeChange={setTheme} />
      <PrototypeConversationList
        conversations={visibleConversations}
        filters={filters}
        activeId={activeConversationId}
        filter={filter}
        count={conversations.length}
        emptyLabel={emptyLabel}
        onFilterChange={setFilter}
        onSelect={(conversation) => {
          setActiveConversationId(conversation.id);
          setConversations((current) => current.map((item) => (
            item.id === conversation.id ? { ...item, unread: 0 } : item
          )));
        }}
        mobileView={activeConversation ? 'thread' : 'list'}
      />
      {activeConversation ? (
        <>
          <section className={`${styles.threadColumn} ${styles.mobileVisible}`}>
            <PrototypeChatHeader
              conversation={activeConversation}
              onBack={() => {
                setActiveConversationId(null);
                setContextOpen(false);
              }}
              onOpenContext={() => setContextOpen(true)}
              onTakeOver={takeOverConversation}
            />
            <PrototypeAIStateBar
              conversation={activeConversation}
              updating={aiModeUpdating}
              onToggleAuto={() => setActiveAiMode(activeConversation.aiMode === 'auto' ? 'manual' : 'auto')}
            />
            <PrototypeMessageList
              conversation={activeConversation}
              messages={messages}
              loading={messagesLoading}
              emptyLabel={messagesError || 'No messages in this conversation yet.'}
              bottomRef={messageBottomRef}
              listRef={messageListRef}
            />
            <PrototypeComposer
              conversation={activeConversation}
              value={composerValue}
              onChange={setComposerValue}
              onSend={handleManualSend}
              sending={sending}
              onTakeOver={takeOverConversation}
            />
          </section>
          <PrototypeCustomerPanel
            conversation={activeConversation}
            handoff={handoff}
            currentUser={currentUser}
            onRequestHandoff={requestHandoff}
            onAcceptHandoff={() => resolveHandoff('accept')}
            onDeclineHandoff={() => resolveHandoff('decline')}
            onCancelHandoff={() => resolveHandoff('cancel')}
            handoffBusy={handoffBusy}
          />
          <PrototypeContextDrawerMobile
            open={contextOpen}
            conversation={activeConversation}
            onClose={() => setContextOpen(false)}
            handoff={handoff}
            currentUser={currentUser}
            onRequestHandoff={requestHandoff}
            onAcceptHandoff={() => resolveHandoff('accept')}
            onDeclineHandoff={() => resolveHandoff('decline')}
            onCancelHandoff={() => resolveHandoff('cancel')}
            handoffBusy={handoffBusy}
          />
        </>
      ) : (
        <section className={styles.liveReadOnlyPane}>
          <div className={styles.liveReadOnlyCard}>
            <strong>Select a conversation</strong>
            <p>
              The live list is connected. Choose a conversation to update the header,
              AI state, and customer panel. Messages are not loaded in this phase.
            </p>
          </div>
        </section>
      )}
    </PrototypeLayoutShell>
  );
}
