import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

// In production behind nginx, API and Web share the same origin so a relative
// URL works. In local development (separate ports), connect directly to the API.
// Socket.io is disabled by default to avoid 404 noise from Next.js not proxying
// WebSocket. Set NEXT_PUBLIC_ENABLE_REALTIME=true at build time to enable
// real-time features. Next.js inlines NEXT_PUBLIC_* env vars at build time, so
// `process` is replaced with the actual value - no runtime typeof guard needed.
const ENABLED = process.env.NEXT_PUBLIC_ENABLE_REALTIME === 'true';

const IS_DEV = typeof window !== 'undefined' &&
    window.location.port !== '' &&
    window.location.port !== '443' &&
    window.location.port !== '80';
const API_URL = IS_DEV
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  : '';

// ── Mock socket for when realtime is disabled ──
// Returns a socket-like object that accepts .on()/.off()/.emit() calls
// but never connects, eliminating 404 noise from Next.js not proxying WebSocket.
function createNoopSocket(): Socket {
  const noop = () => noop;
  const handler = {
    on: noop,
    off: noop,
    emit: noop,
    once: noop,
    removeListener: noop,
    removeAllListeners: noop,
    addListener: noop,
    disconnect: noop,
    connect: noop,
    close: noop,
    compressed: false,
    connected: false,
    id: '',
    io: null,
    nsp: '/',
    receiveBuffer: [],
    sendBuffer: [],
    active: false,
    auth: {},
    recovered: false,
  } as unknown as Socket;
  return handler;
}

export function getSocket(token: string): Socket {
  if (!ENABLED) {
    return createNoopSocket();
  }

  if (socket?.connected) return socket;

  socket = io(API_URL || undefined, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
