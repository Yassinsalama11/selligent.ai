'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

// New UI Components
import { InboxSidebar } from './InboxSidebar';
import { ThreadList } from './ThreadList';
import { MessageThread } from './MessageThread';
import { CustomerPanel } from './CustomerPanel';
import { AssignModal } from './AssignModal';

function formatChannel(channel) {
  const value = String(channel || 'livechat').toLowerCase();
  if (value === 'whatsapp') return 'WhatsApp';
  if (value === 'instagram') return 'Instagram';
  if (value === 'messenger') return 'Messenger';
  if (value === 'livechat') return 'Live Chat';
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Live Chat';
}

function initialsFromName(name) {
  const parts = String(name || 'Unknown customer')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || 'U';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
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
    value: row.estimated_value || row.estimatedValue || row.value || 0,
    sentiment: row.sentiment || 'Neutral',
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
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'voice';
  if (mimeType) return 'document';
  if (mediaUrl) return 'document';
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
    timestamp: formatTime(messageTimestamp(message)) || '',
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
    const aTime = new Date(messageTimestamp(a) || 0).getTime();
    const bTime = new Date(messageTimestamp(b) || 0).getTime();
    return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
  });
}

export default function ConversationsLivePage() {
  const [filters, setFilters] = useState({
    status: 'open',
    channel: 'all',
    assigned_to: 'all',
    priority: 'all',
    search: '',
  });
  
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
  
  const [currentUser, setCurrentUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [cannedReplies, setCannedReplies] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState({}); // Keyed by conversation ID
  
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [closing, setClosing] = useState(false);
  const [handoff, setHandoff] = useState(null);
  const [handoffBusy, setHandoffBusy] = useState(false);
  
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketBusy, setTicketBusy] = useState(false);
  
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [winning, setWinning] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [tagLibrary, setTagLibrary] = useState([]);
  const [tagLibraryMeta, setTagLibraryMeta] = useState({});
  const [slaBreaches, setSlaBreaches] = useState({});
  
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageBottomRef = useRef(null);
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

  // Load team and canned replies
  useEffect(() => {
    let cancelled = false;
    async function loadResources() {
      try {
        const [team, replies, tenantSettings] = await Promise.all([
          api.get('/api/auth/team'),
          api.get('/api/settings/canned-responses').catch(() => null),
          api.get('/api/settings').catch(() => null),
        ]);
        if (!cancelled) {
          if (Array.isArray(team)) {
            setTeamMembers(team.filter((member) => ['owner', 'admin', 'agent'].includes(member.role)));
          }
          if (Array.isArray(replies)) {
            setCannedReplies(replies.map((r) => ({
              id: r.id || String(Math.random()),
              name: r.name || r.title || r.id || 'Reply',
              content: r.content || r.body || r.text || '',
            })));
          }
          if (tenantSettings) {
            setTagLibrary(Array.isArray(tenantSettings.tags) ? tenantSettings.tags : []);
            setTagLibraryMeta(tenantSettings.tagMeta && typeof tenantSettings.tagMeta === 'object' ? tenantSettings.tagMeta : {});
          }
        }
      } catch (err) {
        console.error('Failed to load resources', err);
      }
    }
    loadResources();
    return () => { cancelled = true; };
  }, []);

  // Main conversation list loader
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams();
      if (filters.status !== 'all') query.set('status', filters.status);
      if (filters.channel !== 'all') query.set('channel', filters.channel);
      if (filters.assigned_to !== 'all') query.set('assigned_to', filters.assigned_to);
      if (filters.priority !== 'all') query.set('priority', filters.priority);
      if (filters.search) query.set('search', filters.search);
      query.set('limit', '100');

      const data = await api.get(`/api/conversations?${query.toString()}`);
      const rows = (Array.isArray(data) ? data : []).map(normalizeConversation);
      
      setConversations((current) => {
        const previousById = new Map(current.map((c) => [c.id, c]));
        const merged = rows.map((c) => {
          const previous = previousById.get(c.id);
          return previous ? { ...c, unread: previous.unread || c.unread } : c;
        });
        const activeId = activeConversationIdRef.current;
        if (activeId && !merged.some((c) => c.id === activeId)) {
          const activePrevious = previousById.get(activeId);
          if (activePrevious) merged.unshift(activePrevious);
        }
        return merged;
      });
    } catch (err) {
      if (!silent) {
        setError(err?.message || 'Could not load conversations.');
        setConversations([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadConversations(false);
    const timer = setInterval(() => {
      if (document.visibilityState !== 'hidden') loadConversations(true);
    }, 30000);
    const onVisible = () => loadConversations(true);
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [loadConversations]);

  const activeConversation = useMemo(() => (
    conversations.find((c) => c.id === activeConversationId) || null
  ), [activeConversationId, conversations]);

  // Messages loader
  useEffect(() => {
    let cancelled = false;
    async function loadMessages() {
      if (!activeConversationId) { setMessages([]); setMessagesError(''); setMessagesLoading(false); return; }
      setMessagesLoading(true); setComposerValue('');
      try {
        const data = await api.get(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`);
        if (cancelled) return;
        const serverMessages = (Array.isArray(data) ? data : []).map((m) => normalizeMessage(m, activeConversationId));
        setMessages(serverMessages);
      } catch (err) {
        if (!cancelled) { setMessages([]); setMessagesError(err?.message || 'Could not load messages.'); }
      } finally { if (!cancelled) setMessagesLoading(false); }
    }
    loadMessages();
    return () => { cancelled = true; };
  }, [activeConversationId]);

  // Tickets loader
  useEffect(() => {
    let cancelled = false;
    async function loadTickets() {
      if (!activeConversationId) { setTickets([]); setTicketsLoading(false); return; }
      setTicketsLoading(true);
      try {
        const data = await api.get(`/api/conversations/${encodeURIComponent(activeConversationId)}/tickets`);
        if (!cancelled) setTickets(Array.isArray(data) ? data : []);
      } catch { if (!cancelled) setTickets([]); }
      finally { if (!cancelled) setTicketsLoading(false); }
    }
    loadTickets();
    return () => { cancelled = true; };
  }, [activeConversationId]);

  // Handoff loader
  useEffect(() => {
    let cancelled = false;
    async function loadHandoff() {
      if (!activeConversationId) { setHandoff(null); return; }
      try {
        const data = await api.get(`/api/conversations/${encodeURIComponent(activeConversationId)}/handoff`);
        if (!cancelled) setHandoff(data?.handoff || null);
      } catch { if (!cancelled) setHandoff(null); }
    }
    loadHandoff();
    return () => { cancelled = true; };
  }, [activeConversationId]);

  // Auto-scroll
  useEffect(() => {
    if (!activeConversationId || messagesLoading) return;
    requestAnimationFrame(() => { messageBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); });
  }, [activeConversationId, messagesLoading, messages.length]);

  // Socket setup
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('airos_token') : null;
    if (!token) return;
    
    const socket = connectSocket(token);
    
    function handleNewMessage(payload = {}) {
      const incomingConversation = payload.conversation || {};
      const normalized = normalizeMessage(payload.message || {}, incomingConversation.id || '');
      if (!normalized.conversationId) return;
      
      const activeId = activeConversationIdRef.current;
      const isActive = String(normalized.conversationId) === String(activeId);
      
      setConversations((current) => {
        const index = current.findIndex((c) => c.id === normalized.conversationId);
        const existing = index >= 0 ? current[index] : { id: normalized.conversationId };
        const updated = mergeConversation(existing, incomingConversation, normalized);
        if (!isActive && normalized.direction === 'inbound') {
          updated.unread = Number(existing.unread || 0) + 1;
        } else if (isActive) {
          updated.unread = 0;
        }
        const next = index >= 0 ? current.map((c, i) => i === index ? updated : c) : [updated, ...current];
        return next.sort((a, b) => new Date(b.sortTimestamp || 0) - new Date(a.sortTimestamp || 0));
      });
      
      // Clear SLA breach once an outbound reply lands
      if (normalized.direction === 'outbound') {
        setSlaBreaches((prev) => {
          if (!prev[normalized.conversationId]) return prev;
          const next = { ...prev };
          delete next[normalized.conversationId];
          return next;
        });
      }

      if (isActive) {
        setMessages((current) => upsertMessage(current, normalized));
        // Clear suggestion on new message
        setAiSuggestions(prev => {
          const next = { ...prev };
          delete next[normalized.conversationId];
          return next;
        });
      }
    }

    function handleSLABreach(payload = {}) {
      if (!payload.conversationId) return;
      setSlaBreaches((prev) => ({
        ...prev,
        [payload.conversationId]: {
          elapsedMinutes: payload.elapsedMinutes,
          slaTargetMinutes: payload.slaTargetMinutes,
          timestamp: payload.timestamp,
        },
      }));
      toast.error(
        `SLA breached — no reply after ${payload.slaTargetMinutes} min`,
        { duration: 6000, id: `sla:${payload.conversationId}` }
      );
    }

    function handleAiSuggestion(payload = {}) {
      if (!payload.conversation_id || !payload.suggestion) return;
      setAiSuggestions(prev => ({
        ...prev,
        [payload.conversation_id]: {
          text: payload.suggestion.suggested_reply || payload.suggestion.text,
          analysis: payload.analysis,
          deal: payload.deal
        }
      }));
      
      // Update conversation metrics if they changed
      if (payload.deal || payload.analysis) {
        setConversations(current => current.map(c => {
          if (c.id === String(payload.conversation_id)) {
            return {
              ...c,
              leadScore: payload.analysis?.lead_score ?? c.leadScore,
              intent: payload.analysis?.intent ?? c.intent,
              value: payload.deal?.estimated_value ?? c.value,
              sentiment: payload.analysis?.sentiment ?? c.sentiment
            };
          }
          return c;
        }));
      }
    }

    function handleHandoffRequested(payload = {}) {
      if (String(payload.conversation_id) === String(activeConversationIdRef.current)) {
        setHandoff(payload.handoff || null);
      }
    }

    socket.on('message:new', handleNewMessage);
    socket.on('ai:suggestion', handleAiSuggestion);
    socket.on('agent:handoff_requested', handleHandoffRequested);
    socket.on('sla:breach', handleSLABreach);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('ai:suggestion', handleAiSuggestion);
      socket.off('agent:handoff_requested', handleHandoffRequested);
      socket.off('sla:breach', handleSLABreach);
    };
  }, []);

  // Feature actions
  async function setActiveAiMode(nextMode) {
    if (!activeConversation || aiModeUpdating) return;
    setAiModeUpdating(true);
    try {
      const result = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/ai-mode`, { ai_mode: nextMode });
      const updated = result || { ...activeConversation, aiMode: nextMode };
      setConversations((current) => current.map((c) => c.id === activeConversation.id ? { ...c, aiMode: updated?.aiMode || updated?.ai_mode || nextMode } : c));
      toast.success(`AI Mode: ${nextMode}`);
    } catch {
      toast.error('Failed to switch AI mode');
    } finally { setAiModeUpdating(false); }
  }

  async function resolveHandoff(action) {
    if (!activeConversationId || !handoff?.id || handoffBusy) return;
    setHandoffBusy(true);
    try {
      const path = `/api/conversations/${encodeURIComponent(activeConversationId)}/handoff/${encodeURIComponent(handoff.id)}`;
      const result = action === 'cancel' ? await api.delete(path) : await api.post(`${path}/${action}`, {});
      const data = result || { handoff: { ...handoff, status: action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled' } };
      
      setHandoff(data?.handoff?.status === 'pending' ? data.handoff : null);
      if (data?.conversation || (result === null && action === 'accept')) {
        const normalized = data.conversation ? normalizeConversation(data.conversation) : { ...activeConversation, assignedTo: currentUser?.id, assignee: currentUser?.name };
        setConversations((current) => current.map((c) => c.id === normalized.id ? { ...c, ...normalized } : c));
      }
      toast.success(`Handoff ${action}ed`);
    } catch (err) {
      toast.error(err.message || 'Handoff action failed');
    } finally { setHandoffBusy(false); }
  }

  async function assignConversation(member) {
    if (!activeConversation || assigning) return;
    const nextAssignee = member?.id || null;
    setAssigning(true); setAssignOpen(false);
    try {
      const result = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/assign`, { user_id: nextAssignee });
      const updated = result || { ...activeConversation, assignedTo: nextAssignee, assignee: member?.name || 'Unassigned' };
      const normalized = normalizeConversation(updated);
      setConversations((current) => current.map((c) => c.id === normalized.id ? { ...c, ...normalized } : c));
      toast.success(member ? `Assigned to ${member.name || member.email}` : 'Conversation unassigned');
    } catch {
      toast.error('Assignment failed');
    } finally { setAssigning(false); }
  }

  async function closeConversation() {
    if (!activeConversation || closing) return;
    setClosing(true);
    const id = activeConversation.id;
    try {
      await api.patch(`/api/conversations/${encodeURIComponent(id)}/status`, { status: 'closed' });
      setActiveConversationId(null);
      setConversations((current) => current.filter((c) => c.id !== id));
      toast.success('Conversation archived');
    } catch {
      toast.error('Failed to close');
    } finally { setClosing(false); }
  }

  async function markConversationWon() {
    if (!activeConversation || winning) return;
    setWinning(true);
    const id = activeConversation.id;
    try {
      await api.post(`/api/conversations/${encodeURIComponent(id)}/won`, {});
      setActiveConversationId(null);
      setConversations((current) => current.filter((c) => c.id !== id));
      toast.success('Deal marked as WON!');
    } catch {
      toast.error('Action failed');
    } finally { setWinning(false); }
  }

  async function handleManualSend() {
    const content = composerValue.trim();
    if (!activeConversationId || !content || sending) return;
    setComposerValue(''); setSending(true);
    try {
      const response = await api.post(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`, { content });
      const confirmed = normalizeMessage(response?.message || response || { content, sent_by: 'agent', timestamp: new Date().toISOString() }, activeConversationId);
      setMessages((current) => upsertMessage(current, confirmed));
    } catch {
      setComposerValue(content);
      toast.error('Failed to send');
    } finally { setSending(false); }
  }

  async function addTag(tag) {
    if (!activeConversation || !tag) return;
    const nextTags = [...new Set([...(activeConversation.tags || []), tag])];
    try {
      const result = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/tags`, { tags: nextTags });
      const response = result || { tags: nextTags };
      setConversations((current) => current.map((c) => c.id === activeConversation.id ? { ...c, tags: response?.tags || nextTags } : c));
    } catch {}
  }

  async function removeTag(tag) {
    if (!activeConversation) return;
    const nextTags = (activeConversation.tags || []).filter((t) => t !== tag);
    try {
      const result = await api.patch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/tags`, { tags: nextTags });
      const response = result || { tags: nextTags };
      setConversations((current) => current.map((c) => c.id === activeConversation.id ? { ...c, tags: response?.tags || nextTags } : c));
    } catch {}
  }

  async function createConversationTicket() {
    if (!activeConversation || ticketBusy) return;
    setTicketBusy(true);
    try {
      const result = await api.post(`/api/conversations/${encodeURIComponent(activeConversation.id)}/tickets`, {
        title: `Follow up with ${activeConversation.name}`,
        priority: 'medium',
      });
      const ticket = result || {
        id: `demo-ticket-${Date.now()}`,
        title: `Follow up with ${activeConversation.name}`,
        priority: 'medium',
        status: 'open',
        created_at: new Date().toISOString()
      };
      setTickets((current) => [ticket, ...current]);
      toast.success('Ticket created');
    } catch {
      toast.error('Ticket creation failed');
    } finally { setTicketBusy(false); }
  }

  function handleAttach(type) {
    if (type === 'image') imageInputRef.current?.click();
    else fileInputRef.current?.click();
  }

  async function handleAttachmentSelected(event) {
    const file = event.target.files?.[0];
    if (!file || !activeConversationId || attachmentUploading) return;
    setAttachmentUploading(true);
    try {
      const reader = new FileReader();
      const data = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const uploaded = await api.post('/api/uploads', { file_name: file.name, mime_type: file.type, size: file.size, data });
      const msgType = uploaded.type || (file.type.startsWith('image/') ? 'image' : 'file');
      const response = await api.post(`/api/conversations/${encodeURIComponent(activeConversationId)}/messages`, {
        content: file.name, type: msgType, media_url: uploaded.url,
        mime_type: file.type, size: file.size,
      });
      const confirmed = normalizeMessage(response?.message || { content: file.name, type: msgType, media_url: uploaded.url, sent_by: 'agent', timestamp: new Date().toISOString() }, activeConversationId);
      setMessages((current) => upsertMessage(current, confirmed));
      toast.success('File uploaded');
    } catch {
      toast.error('Upload failed');
    } finally { setAttachmentUploading(false); event.target.value = ''; }
  }

  async function createInternalNote() {
    if (!activeConversation || sending) return;
    const content = composerValue.trim();
    if (!content) {
      toast('Type a note in the composer first', { icon: '📝' });
      return;
    }
    setComposerValue('');
    try {
      const result = await api.post(`/api/conversations/${encodeURIComponent(activeConversation.id)}/internal-notes`, { content });
      const confirmed = normalizeMessage(result?.message || result || { content, sent_by: 'agent', direction: 'internal', timestamp: new Date().toISOString() }, activeConversation.id);
      setMessages((current) => upsertMessage(current, confirmed));
    } catch {
      setComposerValue(content);
      toast.error('Failed to save note');
    }
  }

  const visibleConversations = useMemo(() => conversations, [conversations]);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleAttachmentSelected} />
      <input ref={fileInputRef} type="file" hidden onChange={handleAttachmentSelected} />
      
      <InboxSidebar 
        filters={filters} 
        onFilterChange={setFilters} 
        channels={['WhatsApp', 'Instagram', 'Messenger', 'LiveChat']}
        teamMembers={teamMembers}
      />

      <div className="w-[300px] border-r bg-card flex flex-col shrink-0">
        <header className="h-14 border-b px-4 flex items-center shrink-0 gap-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex-1">Conversations</h2>
        </header>
        <div className="px-3 py-2.5 border-b shrink-0">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search..."
              className="h-8 pl-9 text-xs bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-primary/40"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setFilters((f) => ({ ...f, search: searchValue }));
              }}
            />
          </div>
        </div>
        <ThreadList
          conversations={visibleConversations}
          activeId={activeConversationId}
          onSelect={(c) => setActiveConversationId(c.id)}
          loading={loading}
          emptyLabel={error || "No conversations found."}
          slaBreaches={slaBreaches}
        />
      </div>

      {activeConversation ? (
        <>
          <MessageThread 
            conversation={activeConversation}
            messages={messages}
            loading={messagesLoading}
            sending={sending}
            composerValue={composerValue}
            onComposerChange={setComposerValue}
            onSend={handleManualSend}
            onAssign={() => setAssignOpen(true)}
            onClose={closeConversation}
            onWon={markConversationWon}
            onToggleAi={() => setActiveAiMode(activeConversation.aiMode === 'auto' ? 'manual' : 'auto')}
            aiUpdating={aiModeUpdating}
            onAttach={handleAttach}
            onInternalNote={createInternalNote}
            bottomRef={messageBottomRef}
            panelOpen={panelOpen}
            onTogglePanel={() => setPanelOpen((v) => !v)}
            cannedReplies={cannedReplies}
            aiSuggestion={aiSuggestions[activeConversation.id]}
            onApplySuggestion={(text) => {
              setComposerValue(text);
              setAiSuggestions(prev => {
                const next = { ...prev };
                delete next[activeConversation.id];
                return next;
              });
            }}
            onDismissSuggestion={() => setAiSuggestions(prev => {
              const next = { ...prev };
              delete next[activeConversation.id];
              return next;
            })}
          />
          {panelOpen && <CustomerPanel
            conversation={activeConversation}
            handoff={handoff}
            currentUser={currentUser}
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
            tagLibrary={tagLibrary}
            tagLibraryMeta={tagLibraryMeta}
          />}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center space-y-4 max-w-sm px-6">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-black tracking-tight">Select a conversation</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose a thread from the list to start replying, manage AI automation, or update customer CRM details.
            </p>
          </div>
        </div>
      )}

      <AssignModal 
        open={assignOpen}
        onOpenChange={setAssignOpen}
        teamMembers={teamMembers}
        onAssign={assignConversation}
        currentAssigneeId={activeConversation?.assignedTo}
      />
    </div>
  );
}

function MessageSquare({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
