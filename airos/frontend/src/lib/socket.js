'use client';
import { io } from 'socket.io-client';
import { getApiBase } from '@/lib/api';

let socket = null;

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('airos_token') || localStorage.getItem('auth_token');
}

function decodeJwtPayload(token) {
  try {
    if (!token) return null;
    // Decode JWT payload (base64) to extract tenantId
    const payload = token.split('.')[1];
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function getTenantFromToken(token = getToken()) {
  const decoded = decodeJwtPayload(token);
  return decoded?.tenantId || decoded?.tenant_id || null;
}

function getSessionId(tenantId) {
  if (typeof window === 'undefined') return null;
  const key = `airos_socket_session_${tenantId || 'default'}`;
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = `dash_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export function getSocket(token = getToken()) {
  const tenantId = getTenantFromToken(token);
  const sessionId = getSessionId(tenantId);

  if (!socket) {
    const apiBase = getApiBase();

    socket = io(apiBase, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      query: tenantId ? { tenantId, token, sessionId } : undefined,
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });
  }
  return socket;
}

export function connectSocket(token = getToken()) {
  const s = getSocket(token);
  // Re-initialize if tenant changed
  const tenantId = getTenantFromToken(token);
  const sessionId = getSessionId(tenantId);
  const nextQuery = tenantId ? { tenantId, token, sessionId } : undefined;

  if (tenantId && s.io.opts.query?.tenantId !== tenantId) {
    s.disconnect();
    s.io.opts.query = nextQuery;
  } else if (token) {
    s.io.opts.query = { ...s.io.opts.query, ...nextQuery };
  }
  s.auth = { token };
  s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
