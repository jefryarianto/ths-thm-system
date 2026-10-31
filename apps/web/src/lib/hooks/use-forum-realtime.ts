import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

type Handler = (data: any) => void;

/**
 * Subscribe ke event realtime forum via Socket.IO.
 * Aman dipakai walaupun realtime dinonaktifkan (socket noop) — handler hanya
 * berjalan bila server mengirim event. Token diambil dari localStorage.
 */
export function useForumRealtime(handlers: {
  threadCreated?: Handler;
  threadUpdated?: Handler;
  threadDeleted?: Handler;
  postCreated?: Handler;
  postUpdated?: Handler;
  postDeleted?: Handler;
}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;
    const socket = getSocket(token);

    const listeners: Array<[string, Handler]> = [
      ['forum:threadCreated', (d: any) => handlersRef.current.threadCreated?.(d)],
      ['forum:threadUpdated', (d: any) => handlersRef.current.threadUpdated?.(d)],
      ['forum:threadDeleted', (d: any) => handlersRef.current.threadDeleted?.(d)],
      ['forum:postCreated', (d: any) => handlersRef.current.postCreated?.(d)],
      ['forum:postUpdated', (d: any) => handlersRef.current.postUpdated?.(d)],
      ['forum:postDeleted', (d: any) => handlersRef.current.postDeleted?.(d)],
    ];

    listeners.forEach(([event, handler]) => socket.on(event, handler));
    return () => {
      listeners.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, []);
}
