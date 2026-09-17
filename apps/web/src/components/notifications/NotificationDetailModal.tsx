'use client';

import { useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { TIPE_OPTIONS, tipeColors } from './constants';

export interface NotificationDetail {
  id: string;
  judul: string;
  isi: string | null;
  tipe: string;
  isRead: boolean;
  createdAt: string;
  data?: unknown;
}

interface NotificationDetailModalProps {
  notification: NotificationDetail | null;
  onClose: () => void;
}

export default function NotificationDetailModal({
  notification,
  onClose,
}: NotificationDetailModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!notification) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [notification, onClose]);

  if (!notification) return null;

  const tipeLabel =
    TIPE_OPTIONS.find((t) => t.value === notification.tipe)?.label || notification.tipe;

  const createdAt = new Date(notification.createdAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipeColors[notification.tipe] || 'bg-gray-100 text-gray-600'}`}
              >
                {tipeLabel}
              </span>
              {!notification.isRead && (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  Baru
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white break-words">
              {notification.judul}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{createdAt}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
          >
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {notification.isi ? (
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
              {notification.isi}
            </p>
          ) : (
            <div className="text-center py-8">
              <Bell size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Notifikasi ini tidak memiliki isi pesan.
              </p>
            </div>
          )}

          {/* Metadata tambahan (jika ada) */}
          {notification.data != null &&
            typeof notification.data === 'object' &&
            Object.keys(notification.data as Record<string, unknown>).length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Info Tambahan
                </p>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-gray-600 dark:text-gray-400">
                  {JSON.stringify(notification.data, null, 2)}
                </pre>
              </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
