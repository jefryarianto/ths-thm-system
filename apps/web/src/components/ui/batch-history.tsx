'use client';

import { useState } from 'react';
import {
  FileText,
  Layers,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
} from 'lucide-react';
import { BatchProgressCard } from './batch-progress';
import { useBatchHistory, formatBatchType } from '@/lib/hooks/use-batch-progress';
import Pagination from './pagination';

// ─── Status & Label Helpers ───

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  processing: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  completed: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  completed_with_errors: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  cancelled: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

const STATUS_ICONS_SMALL: Record<string, React.ReactNode> = {
  pending: <Clock size={12} />,
  processing: <Loader2 size={12} className="animate-spin" />,
  completed: <CheckCircle2 size={12} />,
  completed_with_errors: <AlertTriangle size={12} />,
  cancelled: <XCircle size={12} />,
};

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Menunggu',
    processing: 'Diproses',
    completed: 'Selesai',
    completed_with_errors: 'Selesai (Error)',
    cancelled: 'Dibatalkan',
  };
  return map[status] || status;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes}m lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}h lalu`;

  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

// ─── Batch History Panel ───

interface BatchHistoryPanelProps {
  /** Optional callback when a batch row is opened for detail view */
  onOpenBatch?: (batchId: string) => void;
}

export function BatchHistoryPanel({ onOpenBatch }: BatchHistoryPanelProps) {
  const { batches, loading, error, page, totalPages, total, setPage, refetch } =
    useBatchHistory();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
            <Layers size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Riwayat Generate Dokumen
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {total} batch generate
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Loading skeleton */}
      {loading && batches.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && batches.length === 0 && (
        <div className="text-center py-8">
          <AlertTriangle size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Gagal memuat riwayat batch
          </p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && batches.length === 0 && (
        <div className="text-center py-8">
          <FileText size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Belum ada batch generate
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Batch akan muncul setelah Anda membuat generate dokumen massal
          </p>
        </div>
      )}

      {/* Batch list */}
      {batches.length > 0 && (
        <div className="space-y-3">
          {batches.map((batch) => (
            <div key={batch.id} className="group">
              {/* Collapsed row */}
              <button
                onClick={() => {
                  const newId = expandedId === batch.id ? null : batch.id;
                  setExpandedId(newId);
                  if (newId) onOpenBatch?.(batch.id);
                }}
                className={`w-full bg-white dark:bg-gray-800 rounded-xl border transition-all text-left hover:shadow-md ${
                  expandedId === batch.id
                    ? 'border-blue-300 dark:border-blue-700 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      batch.status === 'completed'
                        ? 'bg-green-50 dark:bg-green-950'
                        : batch.failed > 0
                          ? 'bg-orange-50 dark:bg-orange-950'
                          : 'bg-blue-50 dark:bg-blue-950'
                    }`}
                  >
                    <FileText
                      size={16}
                      className={
                        batch.status === 'completed'
                          ? 'text-green-600 dark:text-green-400'
                          : batch.failed > 0
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-blue-600 dark:text-blue-400'
                      }
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatBatchType(batch.type)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[batch.status] || ''}`}
                      >
                        {STATUS_ICONS_SMALL[batch.status] || null}
                        {statusLabel(batch.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{batch.total} dokumen</span>
                      <span className="text-green-600 font-medium">
                        {batch.completed} selesai
                      </span>
                      {batch.failed > 0 && (
                        <span className="text-red-500 font-medium">
                          {batch.failed} gagal
                        </span>
                      )}
                      <span>{formatRelativeTime(batch.createdAt)}</span>
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-24 shrink-0">
                    <div className="relative h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{
                          width: `${batch.total > 0 ? (batch.completed / batch.total) * 100 : 0}%`,
                        }}
                      />
                      {batch.failed > 0 && (
                        <div
                          className="absolute top-0 h-full bg-red-500 rounded-full transition-all"
                          style={{
                            left: `${(batch.completed / batch.total) * 100}%`,
                            width: `${(batch.failed / batch.total) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="shrink-0">
                    {batch.status === 'completed' ? (
                      <CheckCircle2 size={18} className="text-green-500" />
                    ) : batch.status === 'processing' ? (
                      <Loader2 size={18} className="text-blue-500 animate-spin" />
                    ) : (
                      <ChevronRight
                        size={18}
                        className={`text-gray-400 transition-transform duration-200 ${
                          expandedId === batch.id ? 'rotate-90' : ''
                        }`}
                      />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === batch.id && (
                <div className="mt-2">
                  <BatchProgressCard
                    batchId={batch.id}
                    onComplete={() => refetch()}
                    compact={false}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}


