'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import {
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  XSquare,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useBatchProgress, formatBatchType, type BatchDetail, type BatchJobItem } from '@/lib/hooks/use-batch-progress';
import apiClient from '@/lib/api-client';

// ─── Status Helpers ───

const PROGRESS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-400',
  processing: 'bg-blue-500 animate-pulse',
  completed: 'bg-green-500',
  completed_with_errors: 'bg-orange-500',
  cancelled: 'bg-gray-400',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={16} className="text-yellow-600" />,
  processing: <Loader2 size={16} className="text-blue-600 animate-spin" />,
  completed: <CheckCircle2 size={16} className="text-green-600" />,
  completed_with_errors: <AlertTriangle size={16} className="text-orange-600" />,
  cancelled: <XCircle size={16} className="text-gray-500 dark:text-gray-400" />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  completed_with_errors: 'Selesai (dengan error)',
  cancelled: 'Dibatalkan',
};

const JOB_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-gray-400 dark:text-gray-500" />,
  processing: <Loader2 size={14} className="text-blue-500 animate-spin" />,
  completed: <CheckCircle2 size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
};

// ─── Single Job Row ───

function JobRow({ job }: { job: BatchJobItem }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors rounded-sm">
      <span className="shrink-0">{JOB_STATUS_ICONS[job.status]}</span>
      <span className="font-mono text-gray-500 dark:text-gray-400 truncate min-w-0 flex-1">
        {job.nomorDokumen || '—'}
      </span>
      <span className="text-gray-400 dark:text-gray-500">{job.memberId.slice(0, 8)}...</span>
      {job.error && (
        <span className="text-red-500 truncate max-w-[200px]" title={job.error}>
          {job.error}
        </span>
      )}
      {job.retryCount > 0 && (
        <span className="text-yellow-600 font-medium shrink-0">
          retry {job.retryCount}x
        </span>
      )}
    </div>
  );
}

// ─── Progress Bar ───

function ProgressBar({
  completed,
  failed,
  total,
  status,
}: {
  completed: number;
  failed: number;
  total: number;
  status: string;
}) {
  const pctComplete = total > 0 ? (completed / total) * 100 : 0;
  const pctFailed = total > 0 ? (failed / total) * 100 : 0;
  const pctRemaining = Math.max(0, 100 - pctComplete - pctFailed);
  const isIndeterminate = status === 'processing' && completed === 0 && failed === 0;

  return (
    <div className="relative h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      {/* Completed segment */}
      <div
        className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${isIndeterminate ? 30 : pctComplete}%` }}
      />
      {/* Failed segment */}
      {pctFailed > 0 && (
        <div
          className="absolute inset-y-0 bg-red-500 transition-all duration-500 ease-out"
          style={{ left: `${pctComplete}%`, width: `${pctFailed}%` }}
        />
      )}
      {/* Remaining segment */}
      <div
        className="absolute inset-y-0 right-0 bg-gray-200 dark:bg-gray-600 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pctRemaining}%` }}
      />
      {/* Indeterminate animation for processing with 0 progress */}
      {isIndeterminate && (
        <div className="absolute inset-y-0 w-1/3 bg-blue-400/50 rounded-full animate-pulse" />
      )}
    </div>
  );
}

// ─── Main Component ───

interface BatchProgressCardProps {
  batchId: string;
  /** Called when batch reaches a final state (completed/failed/cancelled) */
  onComplete?: (batchId: string) => void;
  /** Show compact variant (no job list) */
  compact?: boolean;
  /** Show in a modal/overlay context */
  elevated?: boolean;
}

export function BatchProgressCard({
  batchId,
  onComplete,
  compact = false,
  elevated = false,
}: BatchProgressCardProps) {
  const { progress, detail, loading, error, refetch, cancelBatch, retryFailed } =
    useBatchProgress(batchId);
  const [showJobs, setShowJobs] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const downloadCsv = async () => {
    if (!batchId || downloading) return;
    setDownloading(true);
    try {
      const response = await apiClient.get(`/documents/batch/${batchId}/export`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers?.['content-disposition'];
      const filename = disposition
        ? disposition.split('filename=')[1]?.replace(/['"]/g, '') || `batch-${batchId}.csv`
        : `batch-${batchId}.csv`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download CSV:', err);
    } finally {
      setDownloading(false);
    }
  };

  const finalStates = ['completed', 'completed_with_errors', 'cancelled'];

  // Notify parent when batch reaches final state
  useEffect(() => {
    if (
      progress &&
      finalStates.includes(progress.status) &&
      detail &&
      detail.jobs.every((j) => j.status === 'completed' || j.status === 'failed')
    ) {
      onComplete?.(batchId);
    }
  }, [progress?.status, batchId, onComplete]);

  // ── Initial loading ──
  if (loading && !progress) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 ${
          elevated ? 'shadow-xl' : ''
        }`}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !progress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-800 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Gagal memuat progress
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 mt-3 text-xs text-blue-600 hover:text-blue-700 transition"
            >
              <RefreshCw size={12} />
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!progress || !detail) return null;

  const isFinal = finalStates.includes(progress.status);
  const hasFailed = progress.failed > 0;
  const canCancel = progress.status === 'pending' || progress.status === 'processing';
  const canRetry = isFinal && hasFailed;
  const jobSummary = computeJobSummary(detail.jobs);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border transition-shadow ${
        progress.status === 'processing'
          ? 'border-blue-200 dark:border-blue-800 shadow-md shadow-blue-100 dark:shadow-blue-950'
          : progress.status === 'completed'
            ? 'border-green-200 dark:border-green-800'
            : hasFailed
              ? 'border-orange-200 dark:border-orange-800'
              : 'border-gray-200 dark:border-gray-700'
      } ${elevated ? 'shadow-xl' : 'shadow-sm'}`}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon + Info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                progress.status === 'completed'
                  ? 'bg-green-50 dark:bg-green-950'
                  : hasFailed
                    ? 'bg-orange-50 dark:bg-orange-950'
                    : 'bg-blue-50 dark:bg-blue-950'
              }`}
            >
              <FileText
                size={18}
                className={
                  progress.status === 'completed'
                    ? 'text-green-600 dark:text-green-400'
                    : hasFailed
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-blue-600 dark:text-blue-400'
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatBatchType(detail.type)}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                  style={{
                    borderColor: PROGRESS_COLORS[progress.status] || 'bg-gray-400',
                    backgroundColor: `${PROGRESS_COLORS[progress.status]}15`,
                  }}
                >
                  {STATUS_ICONS[progress.status] || null}
                  {STATUS_LABELS[progress.status] || progress.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {jobSummary}
              </p>
            </div>
          </div>

          {/* Right: Timestamp + Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={refetch}
              className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            completed={progress.completed}
            failed={progress.failed}
            total={progress.total}
            status={progress.status}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <StatBox
            label="Total"
            value={progress.total}
            color="text-gray-900 dark:text-white"
          />
          <StatBox
            label="Berhasil"
            value={progress.completed}
            color="text-green-600 dark:text-green-400"
          />
          <StatBox
            label="Gagal"
            value={progress.failed}
            color={progress.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}
          />
          <StatBox
            label="Progress"
            value={`${progress.progress}%`}
            color="text-blue-600 dark:text-blue-400"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          {canCancel && (
            <button
              onClick={async () => {
                setCancelling(true);
                try {
                  await cancelBatch();
                } finally {
                  setCancelling(false);
                }
              }}
              disabled={cancelling}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50"
            >
              {cancelling ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <XSquare size={12} />
              )}
              Batalkan
            </button>
          )}

          {canRetry && (
            <button
              onClick={retryFailed}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950 transition"
            >
              <RotateCcw size={12} />
              Ulangi {progress.failed} Gagal
            </button>
          )}

          {isFinal && (
            <button
              onClick={downloadCsv}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Download size={12} />
              )}
              {downloading ? 'Mengunduh...' : 'Download CSV'}
            </button>
          )}

          {isFinal && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {progress.status === 'completed'
                ? `${progress.completed} dokumen berhasil digenerate`
                : progress.status === 'cancelled'
                  ? 'Dibatalkan'
                  : `${progress.completed} berhasil, ${progress.failed} gagal`}
            </span>
          )}

          {/* Toggle job list */}
          {detail.jobs.length > 0 && !compact && (
            <button
              onClick={() => setShowJobs(!showJobs)}
              className="flex items-center gap-1 ml-auto text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              {showJobs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {detail.jobs.length} job
            </button>
          )}
        </div>
      </div>

      {/* ── Expandable Job List ── */}
      {showJobs && !compact && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-3 text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <span className="w-4" />
              <span className="flex-1">Nomor Dokumen</span>
              <span>Member ID</span>
              <span className="flex-1">Error</span>
              <span className="w-12 text-right">Retry</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
            {detail.jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Box ───

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}

// ─── Job Summary Builder ───

function computeJobSummary(jobs: BatchJobItem[]): string {
  if (jobs.length === 0) return 'Tidak ada job';

  const total = jobs.length;
  const pending = jobs.filter((j) => j.status === 'pending').length;
  const processing = jobs.filter((j) => j.status === 'processing').length;
  const completed = jobs.filter((j) => j.status === 'completed').length;
  const failed = jobs.filter((j) => j.status === 'failed').length;

  const parts: string[] = [];
  if (completed > 0) parts.push(`${completed} selesai`);
  if (failed > 0) parts.push(`${failed} gagal`);
  if (processing > 0) parts.push(`${processing} diproses`);
  if (pending > 0) parts.push(`${pending} antri`);
  parts.push(`dari ${total}`);

  return parts.join(' • ');
}
