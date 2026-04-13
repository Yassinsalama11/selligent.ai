'use client';
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || 'https://api.selligent.ai', {
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
