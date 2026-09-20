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
  pending: 'bg-warning-50 dark:bg-warning-950 text-warning-800 dark:text-warning-400 border-warning-200 dark:border-warning-800',
  processing: 'bg-info-50 dark:bg-info-950 text-info-800 dark:text-info-400 border-info-200 dark:border-info-800',
  completed: 'bg-success-50 dark:bg-success-950 text-success-800 dark:text-success-400 border-success-200 dark:border-success-800',
  completed_with_errors: 'bg-warning-50 dark:bg-warning-950 text-warning-800 dark:text-warning-400 border-warning-200 dark:border-warning-800',
  cancelled: 'bg-surface-variant text-muted border-border',
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
    day: '2-digit',
    month: 'long',
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
          <div className="p-2 rounded-lg bg-primary-container">
            <Layers size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text">
              Riwayat Generate Dokumen
            </h3>
            <p className="text-xs text-muted">
              {total} batch generate
            </p>
          </div>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted border border-border rounded-lg hover:bg-surface-variant transition"
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
              className="bg-surface rounded-xl border border-border p-5 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-variant" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-surface-variant rounded w-1/2" />
                  <div className="h-3 bg-surface-variant rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && batches.length === 0 && (
        <div className="text-center py-8">
          <AlertTriangle size={36} className="mx-auto text-muted mb-3" />
          <p className="text-sm font-medium text-muted">
            Gagal memuat riwayat batch
          </p>
          <button
            onClick={refetch}
            className="mt-4 px-4 py-2 text-sm text-primary border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950 transition"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && batches.length === 0 && (
        <div className="text-center py-8">
          <FileText size={36} className="mx-auto text-muted mb-3" />
          <p className="text-sm font-medium text-muted">
            Belum ada batch generate
          </p>
          <p className="text-xs text-muted mt-1">
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
                className={`w-full bg-surface rounded-xl border transition-all text-left hover:shadow-md ${
                  expandedId === batch.id
                    ? 'border-primary-300 dark:border-primary-700 shadow-sm'
                    : 'border-border shadow-sm'
                }`}
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Icon */}
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      batch.status === 'completed'
                        ? 'bg-success-50 dark:bg-success-950'
                        : batch.failed > 0
                          ? 'bg-warning-50 dark:bg-warning-950'
                          : 'bg-primary-container'
                    }`}
                  >
                    <FileText
                      size={16}
                      className={
                        batch.status === 'completed'
                          ? 'text-success dark:text-success-400'
                          : batch.failed > 0
                            ? 'text-warning-600 dark:text-warning-400'
                            : 'text-primary'
                      }
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text">
                        {formatBatchType(batch.type)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[batch.status] || ''}`}
                      >
                        {STATUS_ICONS_SMALL[batch.status] || null}
                        {statusLabel(batch.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      <span>{batch.total} dokumen</span>
                      <span className="text-success font-medium">
                        {batch.completed} selesai
                      </span>
                      {batch.failed > 0 && (
                        <span className="text-error-500 font-medium">
                          {batch.failed} gagal
                        </span>
                      )}
                      <span>{formatRelativeTime(batch.createdAt)}</span>
                    </div>
                  </div>

                  {/* Mini progress bar */}
                  <div className="w-24 shrink-0">
                    <div className="relative h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success-500 rounded-full transition-all"
                        style={{
                          width: `${batch.total > 0 ? (batch.completed / batch.total) * 100 : 0}%`,
                        }}
                      />
                      {batch.failed > 0 && (
                        <div
                          className="absolute top-0 h-full bg-error-500 rounded-full transition-all"
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
                      <CheckCircle2 size={18} className="text-success-500" />
                    ) : batch.status === 'processing' ? (
                      <Loader2 size={18} className="text-primary animate-spin" />
                    ) : (
                      <ChevronRight
                        size={18}
                        className={`text-muted transition-transform duration-200 ${
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


