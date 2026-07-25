'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import apiClient from '@/lib/api-client';

// ─── Types ───

export interface BatchProgress {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
  progress: number; // 0–100
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'cancelled';
}

export interface BatchJobItem {
  id: string;
  memberId: string;
  nomorDokumen: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface BatchDetail extends BatchProgress {
  id: string;
  type: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  jobs: BatchJobItem[];
}

// ─── Hook ───

interface UseBatchProgressOptions {
  /** Polling interval in ms when Socket.IO is unavailable. Default 3000 */
  pollingInterval?: number;
  /** Auto-start tracking on mount */
  autoStart?: boolean;
}

export function useBatchProgress(
  batchId: string | null,
  options: UseBatchProgressOptions = {},
) {
  const { pollingInterval = 3000, autoStart = true } = options;

  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const enabledRef = useRef(autoStart);

  // ── Fetch batch detail from REST API (used for initial load + polling fallback) ──
  const fetchBatch = useCallback(async () => {
    if (!batchId) return;
    try {
      const { data: res } = await apiClient.get(`/documents/batch/${batchId}`);
      if (!res.success) throw new Error(res.message || 'Gagal memuat batch');
      const d = res.data as BatchDetail;
      setDetail(d);
      setProgress({
        batchId: d.id,
        total: d.total,
        completed: d.completed,
        failed: d.failed,
        progress: d.total > 0 ? Math.round(((d.completed + d.failed) / d.total) * 100) : 0,
        status: d.status,
      });
      setError(null);
      return d;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat progress';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  // ── Start Socket.IO listeners ──
  const startSocketListeners = useCallback(() => {
    if (!batchId) return;
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const socket = getSocket(token);
      socketRef.current = socket;

      const handleProgress = (data: BatchProgress) => {
        if (data.batchId === batchId) {
          setProgress(data);
          if (data.status === 'completed' || data.status === 'completed_with_errors') {
            // Final state — fetch full detail and stop polling
            fetchBatch();
          }
        }
      };

      const handleComplete = (data: { batchId: string }) => {
        if (data.batchId === batchId) {
          fetchBatch();
        }
      };

      socket.on('batch:progress', handleProgress);
      socket.on('batch:complete', handleComplete);

      return () => {
        socket.off('batch:progress', handleProgress);
        socket.off('batch:complete', handleComplete);
      };
    } catch {
      // Socket.IO unavailable — fallback to polling
      return undefined;
    }
  }, [batchId, fetchBatch]);

  // ── Start polling fallback ──
  const startPolling = useCallback(() => {
    if (!batchId) return;
    // Initial fetch
    fetchBatch();

    // Poll every N ms
    pollingRef.current = setInterval(() => {
      fetchBatch();
    }, pollingInterval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [batchId, fetchBatch, pollingInterval]);

  // ── Main effect — decide Socket.IO vs Polling ──
  useEffect(() => {
    if (!batchId || !enabledRef.current) return;

    setLoading(true);

    // Try Socket.IO first; if the noop socket is returned (realtime disabled),
    // the listener callbacks are no-ops and we fall through to polling.
    const cleanupSocket = startSocketListeners();

    // Start polling as fallback. The socket listeners will update state
    // faster than polling, but polling ensures we always get updates.
    const cleanupPolling = startPolling();

    return () => {
      cleanupSocket?.();
      cleanupPolling?.();
      socketRef.current = null;
    };
  }, [batchId, startSocketListeners, startPolling]);

  // ── Cancel batch ──
  const cancelBatch = useCallback(async () => {
    if (!batchId) return;
    try {
      await apiClient.patch(`/documents/batch/${batchId}/cancel`);
      await fetchBatch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membatalkan batch';
      setError(msg);
      throw err;
    }
  }, [batchId, fetchBatch]);

  // ── Retry failed jobs ──
  const retryFailed = useCallback(async () => {
    if (!batchId) return;
    try {
      await apiClient.post(`/documents/batch/${batchId}/retry`);
      await fetchBatch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengulang job gagal';
      setError(msg);
      throw err;
    }
  }, [batchId, fetchBatch]);

  return {
    progress,
    detail,
    loading,
    error,
    refetch: fetchBatch,
    cancelBatch,
    retryFailed,
  };
}

// ─── Shared Helper ───

export function formatBatchType(type: string): string {
  const labels: Record<string, string> = {
    kta: 'KTA',
    sertifikat_pendadaran: 'Sertifikat Pendadaran',
    sertifikat_pelatihan: 'Sertifikat Pelatihan',
    piagam_prestasi: 'Piagam Prestasi',
  };
  return (
    labels[type] ||
    type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// ─── Batch History Hook ───

export function useBatchHistory() {
  const [batches, setBatches] = useState<BatchDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchHistory = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get('/documents/batch', {
        params: { page: p, limit: 10 },
      });
      setBatches(res.data?.data || []);
      setTotalPages(res.data?.meta?.totalPages || 0);
      setTotal(res.data?.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat batch');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    batches,
    loading,
    error,
    page,
    totalPages,
    total,
    setPage,
    refetch: () => fetchHistory(page),
  };
}
