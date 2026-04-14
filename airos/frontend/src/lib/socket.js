'use client';
import { io } from 'socket.io-client';
import { getApiBase } from '@/lib/api';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(getApiBase(), {
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function connectSocket(token) {
  const s = getSocket();
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
