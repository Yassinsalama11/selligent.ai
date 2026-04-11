import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  tenant: null,
  token: null,

  setAuth: (user, tenant, token) => {
    if (typeof window !== 'undefined') localStorage.setItem('airos_token', token);
    set({ user, tenant, token });
  },

  logout: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('airos_token');
    set({ user: null, tenant: null, token: null });
  },

  initFromStorage: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('airos_token');
    if (token) set({ token });
  },
}));

export const useConversationsStore = create((set, get) => ({
  conversations: [],
  active: null,
  messages: {},
  suggestions: {},

  setConversations: (list) => set({ conversations: list }),

  setActive: (conv) => set({ active: conv }),

  addMessage: (convId, msg) => set((s) => ({
    messages: {
      ...s.messages,
      [convId]: [...(s.messages[convId] || []), msg],
    },
  })),

  setMessages: (convId, msgs) => set((s) => ({
    messages: { ...s.messages, [convId]: msgs },
  })),

  setSuggestion: (convId, suggestion) => set((s) => ({
    suggestions: { ...s.suggestions, [convId]: suggestion },
  })),
}));
