import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket;

  // Use relative URL so it always connects to the current host.
  // This works for localhost dev, staging, and production without needing
  // a build-time NEXT_PUBLIC_* env var that would bake in a fixed URL.
  socket = io({
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
