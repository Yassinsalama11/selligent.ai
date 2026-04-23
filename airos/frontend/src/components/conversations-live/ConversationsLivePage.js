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
  PrototypeMessageList,
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
  const leadScoreValue = row.lead_score ?? row.leadScore;

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
    leadScore: leadScoreValue == null ? null : Number(leadScoreValue),
    assignedTo: row.assigned_to || row.assignedTo || null,
    assignee: row.assignee_name || row.assigneeName || 'Unassigned',
    customerId: row.customer_id || row.customerId || row.customer?.id || null,
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
  const messagePreview = normalizedMessage?.type === 'internal_note'
    ? `Internal note: ${normalizedMessage?.content || 'Note added'}`
    : normalizedMessage?.content
      || (normalizedMessage?.type === 'image' ? 'Image attachment' : normalizedMessage?.type === 'file' || normalizedMessage?.type === 'document' ? 'File attachment' : '');

  return {
    ...existing,
    ...(normalizedIncoming || {}),
    id: String(normalizedIncoming?.id || existing.id || normalizedMessage?.conversationId || ''),
    lastMessage: messagePreview || normalizedIncoming?.lastMessage || existing.lastMessage || 'No messages yet',
    timestamp: sortTimestamp ? formatTime(sortTimestamp) || existing.timestamp || '' : existing.timestamp || '',
    sortTimestamp,
    unread: existing.unread || 0,
  };
}

function messageTimestamp(message = {}) {
  return message.timestamp || message.created_at || message.createdAt || message.sent_at || message.updated_at || message.updatedAt || '';
}

function parseJsonLike(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractMediaUrl(message = {}, parsedContent = null) {
  const metadata = message.metadata && typeof message.metadata === 'object'
    ? message.metadata
    : parseJsonLike(message.metadata);
  const firstAttachment = Array.isArray(message.attachments) ? message.attachments[0] : null;
  return message.media_url
    || message.mediaUrl
    || message.url
    || message.image_url
    || message.imageUrl
    || metadata?.media_url
    || metadata?.mediaUrl
    || metadata?.url
    || metadata?.attachment?.payload?.url
    || firstAttachment?.url
    || firstAttachment?.payload?.url
    || parsedContent?.media_url
    || parsedContent?.mediaUrl
    || parsedContent?.url
    || null;
}

function inferMessageType(message = {}, mediaUrl = null, parsedContent = null) {
  const type = String(message.type || message.message_type || message.messageType || parsedContent?.type || '').toLowerCase();
  if (type) return type;
  const mimeType = String(message.mime_type || message.mimeType || message.metadata?.mime_type || message.metadata?.mimeType || '').toLowerCase();
  if (mimeType.startsWith('image/')) return 'image';
  if (mediaUrl) return 'image';
  return 'text';
}

function normalizeMessage(message = {}, fallbackConversationId = '') {
  const sentBy = message.sent_by || message.sentBy || message.by || (message.auto ? 'ai' : message.direction === 'outbound' ? 'agent' : 'customer');
  const direction = message.direction
    || (message.dir === 'out' ? 'outbound' : message.dir === 'in' ? 'inbound' : '')
    || (['agent', 'ai'].includes(sentBy) ? 'outbound' : 'inbound');

  const parsedContent = parseJsonLike(message.content);
  const mediaUrl = extractMediaUrl(message, parsedContent);
  const type = inferMessageType(message, mediaUrl, parsedContent);
  const metadata = message.metadata && typeof message.metadata === 'object'
    ? message.metadata
    : parseJsonLike(message.metadata) || {};
  const content = parsedContent && mediaUrl
    ? String(parsedContent.caption || parsedContent.text || '')
    : String(message.content ?? message.text ?? '');

  return {
    id: String(message.id || `${fallbackConversationId}-${messageTimestamp(message) || Date.now()}`),
    conversationId: String(message.conversationId || message.conversation_id || fallbackConversationId || ''),
    direction: direction === 'out' ? 'outbound' : direction === 'in' ? 'inbound' : direction,
    sent_by: sentBy,
    content,
    timestamp: messageTimestamp(message) || '',
    type,
    mediaUrl,
    fileName: message.file_name || message.fileName || metadata.file_name || metadata.fileName || '',
    mimeType: message.mime_type || message.mimeType || metadata.mime_type || metadata.mimeType || '',
    size: message.size || metadata.size || null,
    status: message.status,
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
  const [theme] = useState('dark');
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
  const [teamMembers, setTeamMembers] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [cannedReplies, setCannedReplies] = useState([]);
  const [winning, setWinning] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
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
    async function loadCannedReplies() {
      try {
        const settings = await api.get('/api/settings');
        if (cancelled) return;
        const replies = [
          ...(Array.isArray(settings?.waTemplates) ? settings.waTemplates : []),
          ...(Array.isArray(settings?.emailTpls) ? settings.emailTpls : []),
        ].map((entry) => ({
          id: entry.id || entry.name || entry.title,
          title: entry.name || entry.title || 'Saved reply',
          text: entry.body || entry.content || entry.text || '',
        })).filter((entry) => entry.text);
        setCannedReplies(replies);
      } catch {
        if (!cancelled) setCannedReplies([]);
      }
    }
    loadCannedReplies();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTeam() {
      try {
        const data = await api.get('/api/auth/team');
        if (!cancelled && Array.isArray(data)) {
          setTeamMembers(data.filter((member) => ['owner', 'admin', 'agent'].includes(member.role)));
        }
      } catch {
        if (!cancelled) setTeamMembers([]);
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
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
  const canAssign = ['owner', 'admin'].includes(currentUser?.role);

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

    async function loadTickets() {
      if (!activeConversationId) {
        setTickets([]);
        setTicketsLoading(false);
        return;
      }
      setTicketsLoading(true);
      try {
        const data = await api.get(`/api/conversations/${encodeURIComponent(activeConversationId)}/tickets`);
        if (!cancelled) setTickets(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    }

    loadTickets();
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

  async function assignConversation(member) {
    if (!activeConversation || assigning) return;
    const previous = activeConversation;
    const nextAssignee = member?.id || null;
    const nextName = member?.name || member?.email || 'Unassigned';
    setAssigning(true);
    setAssignOpen(false);
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeConversation.id
        ? { ...conversation, assignedTo: nextAssignee, assignee: nextName }
        : conversation
    )));
    try {
      const updated = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/assign`, {
        user_id: nextAssignee,
      });
      const normalized = normalizeConversation(updated);
      setConversations((current) => current.map((conversation) => (
        conversation.id === normalized.id ? { ...conversation, ...normalized } : conversation
      )));
    } catch {
      setConversations((current) => current.map((conversation) => (
        conversation.id === previous.id ? { ...conversation, assignedTo: previous.assignedTo, assignee: previous.assignee } : conversation
      )));
    } finally {
      setAssigning(false);
    }
  }

  async function closeConversation() {
    if (!activeConversation || closing) return;
    const previousStatus = activeConversation.status;
    setClosing(true);
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeConversation.id ? { ...conversation, status: 'closed' } : conversation
    )));
    try {
      const updated = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/status`, {
        status: 'closed',
      });
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id
          ? {
            ...conversation,
            status: updated?.status || 'closed',
            sortTimestamp: updated?.updated_at || conversation.sortTimestamp,
            timestamp: updated?.updated_at ? formatTime(updated.updated_at) : conversation.timestamp,
          }
          : conversation
      )));
    } catch {
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id ? { ...conversation, status: previousStatus } : conversation
      )));
    } finally {
      setClosing(false);
    }
  }

  async function markConversationWon() {
    if (!activeConversation || winning) return;
    setWinning(true);
    try {
      await api.post(`/api/conversations/${encodeURIComponent(activeConversation.id)}/won`, {});
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id
          ? { ...conversation, status: 'won', intent: conversation.intent || 'ready_to_buy' }
          : conversation
      )));
    } finally {
      setWinning(false);
    }
  }

  function insertCannedReply(text) {
    if (!text) return;
    setComposerValue((current) => current ? `${current}\n${text}` : text);
  }

  function handleAttach(type) {
    if (type === 'image') imageInputRef.current?.click();
    else fileInputRef.current?.click();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleAttachmentSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !activeConversationId || attachmentUploading) return;

    setAttachmentUploading(true);
    try {
      const data = await readFileAsDataUrl(file);
      const uploaded = await api.post('/api/uploads', {
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
        data,
      });
      await sendAttachmentMessage(uploaded);
    } finally {
      setAttachmentUploading(false);
    }
  }

  async function sendAttachmentMessage(uploaded) {
    if (!activeConversationId || !uploaded?.url) return;
    const type = uploaded.type || (uploaded.mime_type?.startsWith('image/') ? 'image' : 'file');
    const tempId = `tmp-${activeConversationId}-${Date.now()}`;
    const optimisticMessage = normalizeMessage({
      id: tempId,
      conversationId: activeConversationId,
      direction: 'outbound',
      sent_by: 'agent',
      type,
      content: uploaded.file_name || (type === 'image' ? 'Image attachment' : 'File attachment'),
      media_url: uploaded.url,
      file_name: uploaded.file_name,
      mime_type: uploaded.mime_type,
      size: uploaded.size,
      timestamp: new Date().toISOString(),
      status: 'sending',
    }, activeConversationId);

    setMessages((current) => [...current, optimisticMessage]);
    requestAnimationFrame(() => messageBottomRef.current?.scrollIntoView({ block: 'end' }));

    try {
      const response = await api.post(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`, {
        content: uploaded.file_name,
        type,
        media_url: uploaded.url,
        file_name: uploaded.file_name,
        mime_type: uploaded.mime_type,
        size: uploaded.size,
      });
      const confirmed = normalizeMessage(response?.message || response, activeConversationId);
      setMessages((current) => upsertMessage(current.filter((message) => message.id !== tempId), confirmed));
    } catch {
      setMessages((current) => current.map((message) => (
        message.id === tempId ? { ...message, status: 'failed' } : message
      )));
    }
  }

  async function addTag(tag) {
    const clean = String(tag || '').trim();
    if (!activeConversation || !clean) return;
    const nextTags = [...new Set([...(activeConversation.tags || []), clean])];
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeConversation.id ? { ...conversation, tags: nextTags } : conversation
    )));
    try {
      const response = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/tags`, { tags: nextTags });
      const savedTags = Array.isArray(response?.tags) ? response.tags : nextTags;
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id ? { ...conversation, tags: savedTags } : conversation
      )));
    } catch {
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id
          ? { ...conversation, tags: activeConversation.tags || [] }
          : conversation
      )));
    }
  }

  async function removeTag(tag) {
    if (!activeConversation) return;
    const nextTags = (activeConversation.tags || []).filter((entry) => entry !== tag);
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeConversation.id ? { ...conversation, tags: nextTags } : conversation
    )));
    try {
      await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/tags`, { tags: nextTags });
    } catch {
      setConversations((current) => current.map((conversation) => (
        conversation.id === activeConversation.id
          ? { ...conversation, tags: activeConversation.tags || [] }
          : conversation
      )));
    }
  }

  async function createConversationTicket() {
    if (!activeConversation || ticketBusy) return;
    setTicketBusy(true);
    try {
      const ticket = await api.post(`/api/conversations/${encodeURIComponent(activeConversation.id)}/tickets`, {
        title: `Follow up with ${activeConversation.name}`,
        priority: 'medium',
      });
      setTickets((current) => [ticket, ...current.filter((entry) => entry.id !== ticket.id)]);
    } finally {
      setTicketBusy(false);
    }
  }

  async function createInternalNote() {
    if (!activeConversation || sending) return;
    const seeded = composerValue.trim();
    const content = seeded || window.prompt('Write an internal note for this conversation:')?.trim() || '';
    if (!content) return;

    const tempId = `note-${activeConversation.id}-${Date.now()}`;
    const optimisticMessage = normalizeMessage({
      id: tempId,
      conversationId: activeConversation.id,
      direction: 'internal',
      sent_by: 'agent',
      type: 'internal_note',
      content,
      timestamp: new Date().toISOString(),
      status: 'sending',
      metadata: { internal: true },
    }, activeConversation.id);

    setComposerValue('');
    setMessages((current) => [...current, optimisticMessage]);
    setConversations((current) => current.map((conversation) => (
      conversation.id === activeConversation.id
        ? {
          ...conversation,
          lastMessage: `Internal note: ${content}`,
          timestamp: formatTime(optimisticMessage.timestamp),
          sortTimestamp: optimisticMessage.timestamp,
        }
        : conversation
    )));

    try {
      const response = await api.post(`/api/conversations/${encodeURIComponent(activeConversation.id)}/internal-notes`, {
        content,
      });
      const confirmed = normalizeMessage(response?.message || response, activeConversation.id);
      setMessages((current) => {
        const withoutTemp = current.filter((message) => message.id !== tempId);
        return upsertMessage(withoutTemp, confirmed);
      });
    } catch {
      setMessages((current) => current.map((message) => (
        message.id === tempId ? { ...message, status: 'failed' } : message
      )));
    } finally {
      requestAnimationFrame(() => {
        messageBottomRef.current?.scrollIntoView({ block: 'end' });
      });
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
    <div className={`${styles.dashboardShell} ${theme === 'light' ? styles.light : styles.dark}`}>
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleAttachmentSelected} />
      <input ref={fileInputRef} type="file" hidden onChange={handleAttachmentSelected} />
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
              onAssign={() => setAssignOpen(true)}
              onClose={closeConversation}
              onWon={markConversationWon}
              assignDisabled={assigning || !canAssign}
              closeDisabled={closing || activeConversation.status === 'closed'}
              wonDisabled={winning}
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
              cannedReplies={cannedReplies}
              onInsertCanned={insertCannedReply}
              onAttach={handleAttach}
              onInternalNote={createInternalNote}
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
            tickets={tickets}
            ticketsLoading={ticketsLoading}
            onCreateTicket={createConversationTicket}
            ticketBusy={ticketBusy}
            onAddTag={addTag}
            onRemoveTag={removeTag}
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
            tickets={tickets}
            ticketsLoading={ticketsLoading}
            onCreateTicket={createConversationTicket}
            ticketBusy={ticketBusy}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
        </>
      ) : (
        <section className={styles.liveReadOnlyPane}>
          <div className={styles.liveReadOnlyCard}>
            <strong>Select a conversation</strong>
            <p>
              Choose a conversation to view messages, manage AI mode, assignment,
              handoff, and customer context.
            </p>
          </div>
        </section>
      )}
      {assignOpen && (
        <div className={styles.liveModalLayer} role="dialog" aria-modal="true">
          <div className={styles.liveModal}>
            <div className={styles.liveModalHeader}>
              <strong>Assign conversation</strong>
              <button type="button" onClick={() => setAssignOpen(false)}>×</button>
            </div>
            <div className={styles.liveModalBody}>
              <button type="button" className={styles.agentOption} onClick={() => assignConversation(null)}>
                Unassigned
                <span>Remove the current owner.</span>
              </button>
              {teamMembers.length === 0 ? (
                <div className={styles.emptyListState}>No team members available.</div>
              ) : teamMembers.map((member) => (
                <button key={member.id} type="button" className={styles.agentOption} onClick={() => assignConversation(member)}>
                  {member.name || member.email}
                  <span>{member.role} · {member.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
