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
  pending: 'bg-warning-400',
  processing: 'bg-info-500 animate-pulse',
  completed: 'bg-success-500',
  completed_with_errors: 'bg-warning-500',
  cancelled: 'bg-muted',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={16} className="text-warning-600" />,
  processing: <Loader2 size={16} className="text-info-600 animate-spin" />,
  completed: <CheckCircle2 size={16} className="text-success" />,
  completed_with_errors: <AlertTriangle size={16} className="text-warning-600" />,
  cancelled: <XCircle size={16} className="text-muted" />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  completed_with_errors: 'Selesai (dengan error)',
  cancelled: 'Dibatalkan',
};

const JOB_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-muted" />,
  processing: <Loader2 size={14} className="text-primary animate-spin" />,
  completed: <CheckCircle2 size={14} className="text-success-500" />,
  failed: <XCircle size={14} className="text-error-500" />,
};

// ─── Single Job Row ───

function JobRow({ job }: { job: BatchJobItem }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs border-b border-border last:border-0 hover:bg-surface-variant/30 transition-colors rounded-sm">
      <span className="shrink-0">{JOB_STATUS_ICONS[job.status]}</span>
      <span className="font-mono text-muted truncate min-w-0 flex-1">
        {job.nomorDokumen || '-'}
      </span>
      <span className="text-muted">{job.memberId.slice(0, 8)}...</span>
      {job.error && (
        <span className="text-error-500 truncate max-w-[200px]" title={job.error}>
          {job.error}
        </span>
      )}
      {job.retryCount > 0 && (
        <span className="text-warning-600 font-medium shrink-0">
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
    <div className="relative h-2.5 bg-surface-variant rounded-full overflow-hidden">
      {/* Completed segment */}
      <div
        className="absolute inset-y-0 left-0 bg-success-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${isIndeterminate ? 30 : pctComplete}%` }}
      />
      {/* Failed segment */}
      {pctFailed > 0 && (
        <div
          className="absolute inset-y-0 bg-error-500 transition-all duration-500 ease-out"
          style={{ left: `${pctComplete}%`, width: `${pctFailed}%` }}
        />
      )}
      {/* Remaining segment */}
      <div
        className="absolute inset-y-0 right-0 bg-surface-variant rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pctRemaining}%` }}
      />
      {/* Indeterminate animation for processing with 0 progress */}
      {isIndeterminate && (
        <div className="absolute inset-y-0 w-1/3 bg-info-400/50 rounded-full animate-pulse" />
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
        className={`bg-surface rounded-xl border border-border shadow-sm p-5 ${
          elevated ? 'shadow-xl' : ''
        }`}
      >
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-surface-variant" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-variant rounded w-3/4" />
            <div className="h-3 bg-surface-variant rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !progress) {
    return (
      <div className="bg-surface rounded-xl border border-error-200 dark:border-error-800 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-error-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-error-700 dark:text-error-400">
              Gagal memuat progress
            </p>
            <p className="text-xs text-error-500 dark:text-error-400 mt-1">{error}</p>
            <button
              onClick={refetch}
              className="flex items-center gap-1.5 mt-3 text-xs text-link hover:text-link-dark transition"
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
      className={`bg-surface rounded-xl border transition-shadow ${
        progress.status === 'processing'
          ? 'border-primary-200 dark:border-primary-800 shadow-md shadow-primary-100 dark:shadow-primary-950'
          : progress.status === 'completed'
            ? 'border-success-200 dark:border-success-800'
            : hasFailed
              ? 'border-warning-200 dark:border-warning-800'
              : 'border-border'
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
                  ? 'bg-success-50 dark:bg-success-950'
                  : hasFailed
                    ? 'bg-warning-50 dark:bg-warning-950'
                    : 'bg-info-50 dark:bg-info-950'
              }`}
            >
              <FileText
                size={18}
                className={
                  progress.status === 'completed'
                    ? 'text-success dark:text-success-400'
                    : hasFailed
                      ? 'text-warning-600 dark:text-warning-400'
                      : 'text-primary'
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-text">
                  {formatBatchType(detail.type)}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                  style={{
                    borderColor: PROGRESS_COLORS[progress.status] || 'bg-muted',
                    backgroundColor: `${PROGRESS_COLORS[progress.status]}15`,
                  }}
                >
                  {STATUS_ICONS[progress.status] || null}
                  {STATUS_LABELS[progress.status] || progress.status}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                {jobSummary}
              </p>
            </div>
          </div>

          {/* Right: Timestamp + Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={refetch}
              className="p-1.5 text-muted hover:text-text hover:bg-surface-variant rounded-md transition"
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
            color="text-text"
          />
          <StatBox
            label="Berhasil"
            value={progress.completed}
            color="text-success dark:text-success-400"
          />
          <StatBox
            label="Gagal"
            value={progress.failed}
            color={progress.failed > 0 ? 'text-error-600 dark:text-error-400' : 'text-muted'}
          />
          <StatBox
            label="Progress"
            value={`${progress.progress}%`}
            color="text-primary"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-error-600 dark:text-error-400 border border-error-200 dark:border-error-800 rounded-lg hover:bg-error-50 dark:hover:bg-error-950 transition disabled:opacity-50"
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
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-warning-600 dark:text-warning-400 border border-warning-200 dark:border-warning-800 rounded-lg hover:bg-warning-50 dark:hover:bg-warning-950 transition"
            >
              <RotateCcw size={12} />
              Ulangi {progress.failed} Gagal
            </button>
          )}

          {isFinal && (
            <button
              onClick={downloadCsv}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950 transition disabled:opacity-50"
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
            <span className="text-xs text-muted ml-auto">
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
              className="flex items-center gap-1 ml-auto text-xs text-muted hover:text-text transition"
            >
              {showJobs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {detail.jobs.length} job
            </button>
          )}
        </div>
      </div>

      {/* ── Expandable Job List ── */}
      {showJobs && !compact && (
        <div className="border-t border-border">
          <div className="px-3 py-2 bg-surface-variant">
            <div className="flex items-center gap-3 text-[11px] font-medium text-muted uppercase tracking-wider">
              <span className="w-4" />
              <span className="flex-1">Nomor Dokumen</span>
              <span>Member ID</span>
              <span className="flex-1">Error</span>
              <span className="w-12 text-right">Retry</span>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-border">
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
      <p className="text-[11px] text-muted">{label}</p>
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
