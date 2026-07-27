'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Plus, Send, RefreshCw } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Link from 'next/link';

interface Room {
  id: string;
  name: string;
  type: string;
  memberCount?: number;
  messageCount?: number;
}

export default function ChatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await apiClient.get('/chat/rooms');
      if (res.success) setRooms(res.data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const typeLabel = (type: string) => {
    switch (type) {
      case 'public':
        return 'Publik';
      case 'group':
        return 'Grup';
      case 'role':
        return 'Berdasarkan Peran';
      case 'private':
        return 'Pribadi';
      default:
        return type;
    }
  };

  const typeBadge = (type: string) => {
    const colors: Record<string, string> = {
      public: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
      group: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
      role: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
      private: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-600';
  };

  return (
    <PermissionGuard module="chat" action="view">
      <PageContainer>
        <PageHeader title="Chat" onRefresh={fetchRooms}>
          <button
            onClick={fetchRooms}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <RefreshCw size={14} /> Segarkan
          </button>
        </PageHeader>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Memuat ruang chat...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-30" />
            <p>Belum ada ruang chat</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-950 rounded-lg">
                    <MessageSquare size={22} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {room.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge(room.type)}`}>
                        {typeLabel(room.type)}
                      </span>
                    </div>
                    {(room.memberCount !== undefined || room.messageCount !== undefined) && (
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        {room.memberCount !== undefined && (
                          <span>{room.memberCount} anggota</span>
                        )}
                        {room.messageCount !== undefined && (
                          <span>{room.messageCount} pesan</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageContainer>
    </PermissionGuard>
  );
}
