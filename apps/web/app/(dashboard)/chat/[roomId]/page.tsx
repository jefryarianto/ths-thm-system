'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { ArrowLeft, Send, RefreshCw, Trash2 } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import apiClient from '@/lib/api-client';
import { getSocket, disconnectSocket } from '@/lib/socket';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/ui/toast';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    namaLengkap: string;
    nomorAnggota: string;
    fotoPath?: string;
  };
}

interface Room {
  id: string;
  name: string;
  type: string;
}

export default function ChatRoomPage() {
  const { confirm, confirmModal } = useConfirm();
  const params = useParams();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const toast = useToast();

  const fetchMessages = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get(`/chat/rooms/${roomId}/messages`, {
        params: { limit: 100 },
      });
      if (res.success) {
        setMessages(res.data || []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    let mounted = true;
    let socket: ReturnType<typeof getSocket> | null = null;

    (async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (mounted) setCurrentUserId(payload.sub || payload.id);
        }
      } catch {
        /* ignore */
      }

      try {
        const { data: roomsRes } = await apiClient.get('/chat/rooms');
        if (roomsRes.success && mounted) {
          const found = roomsRes.data.find((r: Room) => r.id === roomId);
          if (found) setRoom(found);
        }
      } catch {
        /* ignore */
      }

      if (mounted) {
        await fetchMessages();
        markAsRead();
      }

      try {
        const token = localStorage.getItem('accessToken') || '';
        socket = getSocket(token);

        socket.on('connect', () => {
          if (mounted) setRealtimeConnected(true);
        });

        socket.on('disconnect', () => {
          if (mounted) setRealtimeConnected(false);
        });

        socket.on('chat:message', (msg: Message & { userId: string; email: string; role: string; roomId: string }) => {
          if (mounted && msg.roomId === roomId) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        });

        socket.emit('joinRoom', { roomId });
      } catch {
        /* ignore */
      }
    })();

    return () => {
      mounted = false;
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('chat:message');
        socket.emit('leaveRoom', { roomId });
      }
      disconnectSocket();
    };
  }, [roomId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markAsRead = async () => {
    setMarkingRead(true);
    try {
      await apiClient.post(`/chat/rooms/${roomId}/read`);
    } catch {
      /* ignore */
    }
    setMarkingRead(false);
  };

  const handleSend = async () => {
    if (!content.trim() || sending) return;
    setSending(true);
    try {
      await apiClient.post(`/chat/rooms/${roomId}/messages`, {
        content: content.trim(),
        type: 'text',
      });
      setContent('');
    } catch (err: unknown) {
      toast('error', (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal mengirim pesan');
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!(await confirm('Hapus pesan ini?'))) return;
    try {
      await apiClient.delete(`/chat/messages/${messageId}`);
      await fetchMessages();
    } catch (err: any) {
      toast('error', err?.response?.data?.message || 'Gagal menghapus pesan');
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'public':
        return 'Publik';
      case 'group':
        return 'Grup';
      case 'role':
        return 'Peran';
      case 'private':
        return 'Pribadi';
      default:
        return type;
    }
  };

  return (
    <PermissionGuard module="chat" action="view">
      <PageContainer>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/chat" className="hover:text-blue-600">
            Chat
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium truncate">
            {room?.name || roomId}
          </span>
          {room?.type && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {typeLabel(room.type)}
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-220px)]">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Memuat pesan...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Belum ada pesan. Kirim pesan pertama!
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender.id === currentUserId ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-blue-600">
                      {msg.sender.namaLengkap.charAt(0)}
                    </span>
                  </div>
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.sender.id === currentUserId
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-xs font-medium opacity-80">
                        {msg.sender.namaLengkap}
                      </div>
                      {msg.sender.id === currentUserId && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="text-[10px] opacity-60 hover:opacity-100 transition-opacity"
                          title="Hapus pesan"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                    <div className="text-sm whitespace-pre-wrap break-words">{msg.content}</div>
                    <div
                      className={`text-[10px] mt-1 ${
                        msg.sender.id === currentUserId ? 'text-blue-100' : 'text-gray-400'
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tulis pesan... (Enter untuk kirim)"
                className="flex-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={sending || !content.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Send size={14} /> {sending ? '...' : 'Kirim'}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-gray-400">
                {realtimeConnected ? (
                  <span className="text-green-600 dark:text-green-400">● Real-time aktif</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">○ Menghubungkan...</span>
                )}
              </span>
              {markingRead && (
                <span className="text-[10px] text-blue-500">Menandai dibaca...</span>
              )}
            </div>
          </div>
        </div>
        {confirmModal}
      </PageContainer>
    </PermissionGuard>
  );
}
