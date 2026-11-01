'use client';

import { useState } from 'react';
import { SmilePlus } from 'lucide-react';
import apiClient, { unwrap, extractErrorMessage } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '💡', '🎉', '👎'];

export interface ReactionState {
  reactions: Record<string, number>;
  currentUserEmoji: string | null;
}

interface ReactionBarProps {
  targetType: 'thread' | 'post';
  targetId: string;
  reactions?: Record<string, number>;
  currentUserEmoji?: string | null;
  onChange: (next: ReactionState) => void;
  compact?: boolean;
}

/**
 * Bar reaksi emoji untuk thread/post forum.
 * Menampilkan chip reaksi yang sudah ada + tombol picker untuk memilih/mengganti.
 * Toggle: emoji yang sama diklik lagi = hapus reaksi (perilaku server).
 */
export function ReactionBar({
  targetType,
  targetId,
  reactions = {},
  currentUserEmoji = null,
  onChange,
  compact = false,
}: ReactionBarProps) {
  const toast = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const active = Object.entries(reactions).filter(([, count]) => count > 0);

  const react = async (emoji: string) => {
    if (busy) return;
    setBusy(true);
    setPickerOpen(false);
    try {
      const path =
        targetType === 'thread'
          ? `/forum/threads/${targetId}/react`
          : `/forum/posts/${targetId}/react`;
      const res = await apiClient.post(path, { emoji });
      const next = unwrap<ReactionState>(res);
      if (next) onChange({ reactions: next.reactions ?? {}, currentUserEmoji: next.currentUserEmoji ?? null });
    } catch (err: unknown) {
      toast('error', extractErrorMessage(err, 'Gagal memberikan reaksi'));
    }
    setBusy(false);
  };

  const chipSize = compact ? 'px-2 py-0.5 text-sm' : 'px-2.5 py-1 text-sm';

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 mt-3">
      {active.map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => react(emoji)}
          disabled={busy}
          className={`${chipSize} rounded-full border transition-colors ${
            currentUserEmoji === emoji
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-950 ring-1 ring-blue-300'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-300'
          } disabled:opacity-50`}
          title={currentUserEmoji === emoji ? 'Hapus reaksi' : 'Beri reaksi'}
        >
          <span>{emoji}</span>
          <span className="ml-1 text-xs font-medium text-gray-600 dark:text-gray-300">{count}</span>
        </button>
      ))}

      <button
        onClick={() => setPickerOpen((v) => !v)}
        className={`${chipSize} rounded-full border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors`}
        title="Beri reaksi"
      >
        <SmilePlus size={compact ? 14 : 16} />
      </button>

      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
          <div className="absolute z-20 bottom-full mb-1 left-0 flex flex-wrap gap-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg w-max">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => react(emoji)}
                disabled={busy}
                className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-lg transition-colors ${
                  currentUserEmoji === emoji ? 'bg-blue-50 dark:bg-blue-950' : ''
                }`}
                title="Pasang reaksi ini"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
