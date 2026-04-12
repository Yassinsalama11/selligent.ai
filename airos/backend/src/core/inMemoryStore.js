/**
 * In-memory store for conversations and messages.
 * Used when PostgreSQL is not yet connected.
 * Keyed by tenantId (phone_number_id for WhatsApp accounts).
 */

const store = {
  conversations: new Map(), // id → conversation
  messages:      new Map(), // conversationId → message[]
  customers:     new Map(), // phone → customer
};

function getOrCreateConversation(phone, name, channel) {
  const key = `${channel}:${phone}`;
  if (!store.conversations.has(key)) {
    store.conversations.set(key, {
      id:         key,
      channel,
      customerPhone: phone,
      customerName:  name || phone,
      unread:     0,
      createdAt:  Date.now(),
      updatedAt:  Date.now(),
      lastMessage: '',
      score:      0,
      intent:     'inquiry',
    });
    store.messages.set(key, []);
  }
  return store.conversations.get(key);
}

function addMessage(conversationId, message) {
  if (!store.messages.has(conversationId)) {
    store.messages.set(conversationId, []);
  }
  store.messages.get(conversationId).push(message);

  // Update conversation
  const conv = store.conversations.get(conversationId);
  if (conv) {
    conv.lastMessage = message.content || message.text || '';
    conv.updatedAt   = Date.now();
    if (message.direction === 'inbound') conv.unread = (conv.unread || 0) + 1;
  }
}

function getMessages(conversationId) {
  return store.messages.get(conversationId) || [];
}

function getAllConversations() {
  return Array.from(store.conversations.values())
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

function updateConversation(conversationId, fields) {
  const conv = store.conversations.get(conversationId);
  if (conv) Object.assign(conv, fields);
}

function markRead(conversationId) {
  updateConversation(conversationId, { unread: 0 });
}

module.exports = { getOrCreateConversation, addMessage, getMessages, getAllConversations, updateConversation, markRead };
