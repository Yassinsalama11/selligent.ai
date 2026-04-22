'use client';

export const STORE_INIT = {
  activeId: null,
  autoReply: {},
  aiTyping: {},
  convs: {},
};

export const DEFAULT_CANNED = [];
export const TAGS = ['VIP', 'Follow Up', 'Discount', 'Urgent', 'Refund', 'New Lead'];

export const CHANNEL_LABEL = {
  whatsapp: 'WA',
  instagram: 'IG',
  messenger: 'MS',
  livechat: 'LC',
};

export const INTENT_COLOR = {
  ready_to_buy: '#10b981',
  interested: '#00E5FF',
  price_objection: '#f59e0b',
  inquiry: '#94a3b8',
  complaint: '#ef4444',
  other: '#64748b',
};

export function getInboxTheme(isLightMode) {
  return isLightMode ? {
    '--inbox-main': '#F8FAFC',
    '--inbox-surface': '#FFFFFF',
    '--inbox-card': '#F1F5F9',
    '--inbox-elevated': '#E2E8F0',
    '--inbox-text-primary': '#0F172A',
    '--inbox-text-secondary': '#475569',
    '--inbox-text-muted': '#64748B',
    '--inbox-border': 'rgba(15,23,42,0.10)',
    '--inbox-border-strong': 'rgba(15,23,42,0.14)',
    '--inbox-primary': '#FF5A1F',
    '--inbox-brand-from': '#FF7A18',
    '--inbox-brand-to': '#FF3D00',
    '--inbox-ai': '#00E5FF',
  } : {
    '--inbox-main': '#050816',
    '--inbox-surface': '#0B1220',
    '--inbox-card': '#111827',
    '--inbox-elevated': '#1A2235',
    '--inbox-text-primary': '#FFFFFF',
    '--inbox-text-secondary': '#9CA3AF',
    '--inbox-text-muted': '#6B7280',
    '--inbox-border': 'rgba(255,255,255,0.08)',
    '--inbox-border-strong': 'rgba(255,255,255,0.12)',
    '--inbox-primary': '#FF5A1F',
    '--inbox-brand-from': '#FF7A18',
    '--inbox-brand-to': '#FF3D00',
    '--inbox-ai': '#00E5FF',
  };
}

export function parseTs(ts) {
  if (!ts) return 0;
  const n = Number(ts);
  if (!Number.isNaN(n)) return n < 1e12 ? n * 1000 : n;
  const d = new Date(ts).getTime();
  return Number.isNaN(d) ? 0 : d;
}

export function messageTimestamp(message = {}) {
  return message.timestamp || message.created_at || message.createdAt || message.sent_at || message.updated_at || message.updatedAt;
}

export function normalizeMessage(message = {}, fallbackConversationId = null) {
  const conversationId = String(
    message.conversationId
      || message.conversation_id
      || message.conversation
      || fallbackConversationId
      || ''
  );
  const sentBy = message.sent_by || message.sentBy || message.by || (message.auto ? 'ai' : message.direction === 'outbound' ? 'agent' : 'customer');
  const direction = message.direction
    || (message.dir === 'out' ? 'outbound' : message.dir === 'in' ? 'inbound' : null)
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

export function sortMessages(messages) {
  return messages
    .map((m, i) => ({ m, i, t: parseTs(messageTimestamp(m)) }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map(x => x.m);
}

export function normalizeConversation(row = {}) {
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
    intent: row.intent || 'inquiry',
    score: Number(row.score || 0),
    lastMessage: row.last_message || row.lastMessage || '',
    updatedAt: parseTs(updatedAt),
  };
}

export function storeReducer(state, action) {
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
      return { ...state, activeId: state.activeId, convs };
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
      if (!existing || existing.messages.some(m => m.id === action.message.id)) return state;
      const outMsg = normalizeMessage({ ...action.message, direction: 'outbound', status: 'sending' }, action.convId);
      return {
        ...state,
        convs: {
          ...state.convs,
          [action.convId]: {
            ...existing,
            messages: sortMessages([...existing.messages, outMsg]),
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
      return {
        ...state,
        convs: {
          ...state.convs,
          [action.convId]: {
            ...existing,
            messages: existing.messages.map(m => m.id === action.tempId ? { ...m, status: 'failed' } : m),
          },
        },
      };
    }
    case 'UPDATE_CONV': {
      const conv = state.convs[action.convId];
      if (!conv) return state;
      return { ...state, convs: { ...state.convs, [action.convId]: { ...conv, ...action.fields } } };
    }
    case 'SET_ACTIVE': {
      const conv = state.convs[action.convId];
      if (!conv) return { ...state, activeId: action.convId };
      return { ...state, activeId: action.convId, convs: { ...state.convs, [action.convId]: { ...conv, unread: 0 } } };
    }
    case 'CLOSE_ACTIVE':
      return { ...state, activeId: null };
    case 'MARK_READ': {
      const conv = state.convs[action.convId];
      if (!conv) return state;
      return { ...state, convs: { ...state.convs, [action.convId]: { ...conv, unread: 0 } } };
    }
    case 'SET_AUTO_REPLY':
      return { ...state, autoReply: { ...state.autoReply, [action.convId]: action.value } };
    case 'SET_AI_TYPING':
      return { ...state, aiTyping: { ...state.aiTyping, [action.convId]: action.value } };
    default:
      return state;
  }
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

export function formatTime(value) {
  const parsed = parseTs(value);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(parsed));
}

export function formatDate(value) {
  const parsed = parseTs(value);
  if (!parsed) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(parsed));
}

export function formatAgo(ts) {
  const parsed = parseTs(ts);
  if (!parsed) return '';
  const diff = Date.now() - parsed;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(parsed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function isNearBottom(el, threshold = 96) {
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

