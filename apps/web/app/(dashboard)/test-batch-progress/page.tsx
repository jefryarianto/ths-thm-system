'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  Play,
  Square,
  Sliders,
  RotateCcw,
  Bug,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Code,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  XSquare,
  Loader2,
  Layers,
} from 'lucide-react';
import { formatBatchType } from '@/lib/hooks/use-batch-progress';

// ─── Mock Data Types ───

interface MockBatch {
  id: string;
  type: string;
  total: number;
  completed: number;
  failed: number;
  status: 'pending' | 'processing' | 'completed' | 'completed_with_errors' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  jobs: MockJob[];
}

interface MockJob {
  id: string;
  memberId: string;
  nomorDokumen: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error: string | null;
  retryCount: number;
  startedAt: string | null;
  completedAt: string | null;
}

// ─── Mock Store (module-level, persists across re-renders) ───

const mockBatches = new Map<string, MockBatch>();
const mockBatchList: MockBatch[] = [];
let mockIdCounter = 0;

function generateMockId(): string {
  mockIdCounter++;
  return `mock-batch-${String(mockIdCounter).padStart(3, '0')}`;
}

function randomMemberId(): string {
  const prefix = ['THM', 'THS', 'ANG'][Math.floor(Math.random() * 3)];
  const num = Math.floor(Math.random() * 9999);
  return `${prefix}-${String(num).padStart(4, '0')}`;
}

function randomDocNumber(type: string, idx: number): string {
  const prefixes: Record<string, string> = {
    kta: 'KTA',
    sertifikat_pendadaran: 'SPD',
    sertifikat_pelatihan: 'SPL',
    piagam_prestasi: 'PP',
  };
  const prefix = prefixes[type] || 'DOC';
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(idx).padStart(4, '0')}`;
}

function randomError(): string {
  const errors = [
    'Gagal render PDF: font tidak ditemukan',
    'Data anggota tidak lengkap (foto)',
    'QR Code generation timeout',
    'Disk full: tidak dapat menulis file',
    'Member data inconsistent',
    'Template rendering error',
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

function createMockBatch(
  type: string,
  total: number,
): MockBatch {
  const id = generateMockId();
  const now = new Date();
  const jobs: MockJob[] = [];

  for (let i = 0; i < total; i++) {
    jobs.push({
      id: `${id}-job-${i}`,
      memberId: randomMemberId(),
      nomorDokumen: null,
      status: 'pending',
      error: null,
      retryCount: 0,
      startedAt: null,
      completedAt: null,
    });
  }

  return {
    id,
    type,
    total,
    completed: 0,
    failed: 0,
    status: 'pending',
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    jobs,
  };
}

// ─── Simulation Types ───

type SimulatorState = 'idle' | 'running';

interface SimulationConfig {
  batchSize: number;
  speed: number;
  errorRate: number;
  docType: string;
}

function createDefaultConfig(): SimulationConfig {
  return {
    batchSize: 20,
    speed: 300,
    errorRate: 0.1,
    docType: 'kta',
  };
}

// ─── Status Helpers (shared by mock components) ───

const MOCK_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={16} className="text-yellow-600" />,
  processing: <Loader2 size={16} className="text-blue-600 animate-spin" />,
  completed: <CheckCircle2 size={16} className="text-green-600" />,
  completed_with_errors: <AlertTriangle size={16} className="text-orange-600" />,
  cancelled: <XCircle size={16} className="text-gray-500" />,
};

const MOCK_STATUS_LABELS: Record<string, string> = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  completed_with_errors: 'Selesai (Error)',
  cancelled: 'Dibatalkan',
};

const MOCK_JOB_STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock size={14} className="text-gray-400" />,
  processing: <Loader2 size={14} className="text-blue-500 animate-spin" />,
  completed: <CheckCircle2 size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
};

// ═══════════════════════════════════════════════════════════════
//  Demo Page
// ═══════════════════════════════════════════════════════════════

export default function TestBatchProgressPage() {
  const [simulatorState, setSimulatorState] = useState<SimulatorState>('idle');
  const [config, setConfig] = useState<SimulationConfig>(createDefaultConfig());
  const [showConfig, setShowConfig] = useState(true);
  const [activeBatchIds, setActiveBatchIds] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const batchRef = useRef<MockBatch | null>(null);
  const queueRef = useRef<MockJob[]>([]);

  // ── Start simulation ──
  const startSimulation = useCallback(() => {
    if (simulatorState === 'running') return;

    const batch = createMockBatch(config.docType, config.batchSize);
    batch.status = 'processing';
    batchRef.current = batch;
    mockBatches.set(batch.id, batch);
    mockBatchList.unshift(batch);
    setActiveBatchIds((prev) => [batch.id, ...prev]);

    queueRef.current = [...batch.jobs];
    setSimulatorState('running');

    timerRef.current = setInterval(() => {
      if (queueRef.current.length === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        if (batch.failed > 0) {
          batch.status = 'completed_with_errors';
        } else {
          batch.status = 'completed';
        }
        batch.updatedAt = new Date().toISOString();
        setSimulatorState('idle');
        setRefreshKey((k) => k + 1);
        return;
      }

      const job = queueRef.current.shift()!;
      const willFail = Math.random() < config.errorRate;

      job.status = willFail ? 'failed' : 'completed';
      job.startedAt = new Date(Date.now() - Math.random() * 1000).toISOString();
      job.completedAt = new Date().toISOString();
      job.nomorDokumen = willFail
        ? null
        : randomDocNumber(config.docType, batch.completed + 1);

      if (willFail) {
        job.error = randomError();
        batch.failed++;
      } else {
        batch.completed++;
      }

      batch.updatedAt = new Date().toISOString();
      setRefreshKey((k) => k + 1);
    }, config.speed);
  }, [config, simulatorState]);

  // ── Stop/cancel simulation ──
  const stopSimulation = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const batch = batchRef.current;
    if (batch && batch.status === 'processing') {
      batch.status = 'cancelled';
      batch.updatedAt = new Date().toISOString();
      setRefreshKey((k) => k + 1);
    }
    setSimulatorState('idle');
  }, []);

  // ── Reset all mock data ──
  const resetAll = useCallback(() => {
    stopSimulation();
    mockBatches.clear();
    mockBatchList.length = 0;
    mockIdCounter = 0;
    setActiveBatchIds([]);
    setRefreshKey((k) => k + 1);
  }, [stopSimulation]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Generate seed history batches ──
  const seedHistory = useCallback(() => {
    const types = ['kta', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'];
    const statuses: MockBatch['status'][] = [
      'completed',
      'completed',
      'completed_with_errors',
      'completed',
      'cancelled',
    ];

    for (let i = 0; i < 5; i++) {
      const type = types[i % types.length];
      const total = Math.floor(Math.random() * 50) + 10;
      const batch = createMockBatch(type, total);

      const completed = Math.floor(total * (0.7 + Math.random() * 0.3));
      const failed = total - completed;

      for (let j = 0; j < total; j++) {
        const job = batch.jobs[j];
        if (j < completed) {
          job.status = 'completed';
          job.nomorDokumen = randomDocNumber(type, j);
        } else {
          job.status = 'failed';
          job.error = randomError();
        }
        job.startedAt = new Date(Date.now() - (total - j) * 500).toISOString();
        job.completedAt = new Date(Date.now() - (total - j) * 200).toISOString();
      }

      batch.completed = completed;
      batch.failed = failed;
      batch.status = statuses[i % statuses.length];
      batch.createdAt = new Date(Date.now() - (5 - i) * 3600000).toISOString();
      batch.updatedAt = batch.createdAt;

      mockBatches.set(batch.id, batch);
      mockBatchList.push(batch);
    }

    setRefreshKey((k) => k + 1);
  }, []);

  // Seed on first mount
  useEffect(() => {
    seedHistory();
  }, [seedHistory]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Breadcrumbs />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ═══ Header ═══ */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
              <FlaskConical size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Demo Progress Batch
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Uji coba komponen BatchProgressCard &amp; BatchHistoryPanel secara live
              </p>
            </div>
          </div>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <Trash2 size={12} />
            Reset Semua
          </button>
        </div>

        {/* ═══ Control Panel ═══ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition"
          >
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-gray-500" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Kontrol Simulasi
              </span>
            </div>
            {showConfig ? (
              <ChevronUp size={16} className="text-gray-400" />
            ) : (
              <ChevronDown size={16} className="text-gray-400" />
            )}
          </button>

          {showConfig && (
            <div className="px-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Batch Size */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Jumlah Dokumen: <strong className="text-gray-800 dark:text-gray-200">{config.batchSize}</strong>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={config.batchSize}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, batchSize: Number(e.target.value) }))
                    }
                    disabled={simulatorState === 'running'}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>1</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Speed */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Kecepatan: <strong className="text-gray-800 dark:text-gray-200">
                      {config.speed < 200 ? 'Cepat' : config.speed < 500 ? 'Normal' : 'Lambat'}
                    </strong>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={1000}
                    step={50}
                    value={config.speed}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, speed: Number(e.target.value) }))
                    }
                    disabled={simulatorState === 'running'}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>Cepat</span>
                    <span>Normal</span>
                    <span>Lambat</span>
                  </div>
                </div>

                {/* Error Rate */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                    Error Rate: <strong className="text-gray-800 dark:text-gray-200">
                      {Math.round(config.errorRate * 100)}%
                    </strong>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={50}
                    value={config.errorRate * 100}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, errorRate: Number(e.target.value) / 100 }))
                    }
                    disabled={simulatorState === 'running'}
                    className="w-full accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                  </div>
                </div>
              </div>

              {/* Document Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                  Tipe Dokumen
                </label>
                <div className="flex flex-wrap gap-2">
                  {['kta', 'sertifikat_pendadaran', 'sertifikat_pelatihan', 'piagam_prestasi'].map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() =>
                          setConfig((c) => ({ ...c, docType: type }))
                        }
                        disabled={simulatorState === 'running'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          config.docType === type
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {formatBatchType(type)}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                {simulatorState !== 'running' ? (
                  <button
                    onClick={startSimulation}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition shadow-sm"
                  >
                    <Play size={14} />
                    Jalankan Batch Dummy
                  </button>
                ) : (
                  <button
                    onClick={stopSimulation}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition shadow-sm"
                  >
                    <Square size={14} />
                    Hentikan
                  </button>
                )}

                <button
                  onClick={seedHistory}
                  disabled={simulatorState === 'running'}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  Tambah Riwayat
                </button>
              </div>

              {/* Running info */}
              {simulatorState === 'running' && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-400">
                  <Bug size={16} className="shrink-0" />
                  Simulasi berjalan — progress bar akan bergerak secara real-time.
                  Batch dummy menggunakan data in-memory (tidak ada API call).
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══ Active Batch (live progress) ═══ */}
        {activeBatchIds.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Play size={16} className="text-green-500" />
              Batch Aktif
            </h2>
            <div className="space-y-3">
              {activeBatchIds.map((batchId) => {
                const batch = mockBatches.get(batchId);
                if (!batch) return null;
                return (
                  <MockBatchProgressCard
                    key={batchId + refreshKey}
                    batch={batch}
                    onComplete={() => setRefreshKey((k) => k + 1)}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ Batch History ═══ */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Code size={16} className="text-purple-500" />
            Riwayat Batch (Mock Data)
          </h2>
          <MockBatchHistoryPanel />
        </section>

        {/* ═══ API Integration Guide ═══ */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-sm">
          <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-2 flex items-center gap-2">
            <FlaskConical size={16} />
            Mode Demo — Mock Data
          </h3>
          <p className="text-amber-700 dark:text-amber-500 leading-relaxed">
            Halaman ini menggunakan data palsu (in-memory) untuk demonstrasi komponen.{' '}
            <strong>BatchProgressCard</strong> dan <strong>BatchHistoryPanel</strong> yang
            sesungguhnya membutuhkan endpoint API berikut:
          </p>
          <ul className="mt-2 space-y-1 text-amber-600 dark:text-amber-500 font-mono text-xs">
            <li><code>GET    /documents/batch</code> — daftar batch (pagination)</li>
            <li><code>POST   /documents/batch</code> — buat batch baru</li>
            <li><code>GET    /documents/batch/:id</code> — detail batch + jobs</li>
            <li><code>PATCH  /documents/batch/:id/cancel</code> — batalkan batch</li>
            <li><code>POST   /documents/batch/:id/retry</code> — ulangi job gagal</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Mock Progress Bar
// ═══════════════════════════════════════════════════════════════

function MockProgressBar({
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
  const isIndeterminate = status === 'processing' && completed === 0 && failed === 0;

  return (
    <div className="relative h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 bg-green-500 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${isIndeterminate ? 30 : pctComplete}%` }}
      />
      {pctFailed > 0 && (
        <div
          className="absolute inset-y-0 bg-red-500 transition-all duration-500 ease-out"
          style={{ left: `${pctComplete}%`, width: `${pctFailed}%` }}
        />
      )}
      <div
        className="absolute inset-y-0 right-0 bg-gray-200 dark:bg-gray-600 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.max(0, 100 - pctComplete - pctFailed)}%` }}
      />
      {isIndeterminate && (
        <div className="absolute inset-y-0 w-1/3 bg-blue-400/50 rounded-full animate-pulse" />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Mock BatchProgressCard — visual clone of the real component
//  Uses in-memory data, not API calls
// ═══════════════════════════════════════════════════════════════

function MockBatchProgressCard({
  batch,
  onComplete,
}: {
  batch: MockBatch;
  onComplete?: (batchId: string) => void;
}) {
  const progress =
    batch.total > 0
      ? Math.round(((batch.completed + batch.failed) / batch.total) * 100)
      : 0;
  const isFinal = ['completed', 'completed_with_errors', 'cancelled'].includes(batch.status);
  const hasFailed = batch.failed > 0;
  const [showJobs, setShowJobs] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Notify parent when batch reaches final state
  useEffect(() => {
    if (isFinal) {
      onComplete?.(batch.id);
    }
    // Only fire on status change, not onComplete reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batch.status, isFinal, batch.id]);

  const handleCancel = () => {
    setCancelling(true);
    setTimeout(() => {
      batch.status = 'cancelled';
      setCancelling(false);
    }, 300);
  };

  const jobSummary = () => {
    const pending = batch.jobs.filter((j) => j.status === 'pending').length;
    const processing = batch.jobs.filter((j) => j.status === 'processing').length;
    const parts: string[] = [];
    if (batch.completed > 0) parts.push(`${batch.completed} selesai`);
    if (batch.failed > 0) parts.push(`${batch.failed} gagal`);
    if (processing > 0) parts.push(`${processing} diproses`);
    if (pending > 0) parts.push(`${pending} antri`);
    parts.push(`dari ${batch.total}`);
    return parts.join(' • ');
  };

  const borderColor =
    batch.status === 'processing'
      ? 'border-blue-200 dark:border-blue-800 shadow-md shadow-blue-100 dark:shadow-blue-950'
      : batch.status === 'completed'
        ? 'border-green-200 dark:border-green-800'
        : hasFailed
          ? 'border-orange-200 dark:border-orange-800'
          : 'border-gray-200 dark:border-gray-700';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border transition-shadow ${borderColor} shadow-sm`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`p-2.5 rounded-lg shrink-0 ${
                batch.status === 'completed'
                  ? 'bg-green-50 dark:bg-green-950'
                  : hasFailed
                    ? 'bg-orange-50 dark:bg-orange-950'
                    : 'bg-blue-50 dark:bg-blue-950'
              }`}
            >
              <FileText
                size={18}
                className={
                  batch.status === 'completed'
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
                  {formatBatchType(batch.type)}
                </h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border border-current opacity-80">
                  {MOCK_STATUS_ICONS[batch.status] || null}
                  {MOCK_STATUS_LABELS[batch.status] || batch.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{jobSummary()}</p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="inline-block px-1.5 py-0.5 bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-[10px] font-mono rounded">
              MOCK
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <MockProgressBar
            completed={batch.completed}
            failed={batch.failed}
            total={batch.total}
            status={batch.status}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'Total', value: batch.total, color: 'text-gray-900 dark:text-white' },
            { label: 'Berhasil', value: batch.completed, color: 'text-green-600 dark:text-green-400' },
            {
              label: 'Gagal',
              value: batch.failed,
              color: batch.failed > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400',
            },
            { label: 'Progress', value: `${progress}%`, color: 'text-blue-600 dark:text-blue-400' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          {(batch.status === 'pending' || batch.status === 'processing') && (
            <button
              onClick={handleCancel}
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

          {isFinal && batch.failed > 0 && (
            <button
              onClick={() => {
                batch.jobs
                  .filter((j) => j.status === 'failed')
                  .forEach((j) => {
                    j.status = 'completed';
                    j.error = null;
                    j.retryCount++;
                    j.nomorDokumen = randomDocNumber(batch.type, batch.completed + 1);
                    batch.completed++;
                    batch.failed--;
                  });
                if (batch.failed === 0 && batch.status === 'completed_with_errors') {
                  batch.status = 'completed';
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950 transition"
            >
              <RotateCcw size={12} />
              Ulangi {batch.failed} Gagal
            </button>
          )}

          {isFinal && (
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
              {batch.status === 'completed'
                ? `${batch.completed} dokumen berhasil digenerate`
                : batch.status === 'cancelled'
                  ? 'Dibatalkan'
                  : `${batch.completed} berhasil, ${batch.failed} gagal`}
            </span>
          )}

          {batch.jobs.length > 0 && (
            <button
              onClick={() => setShowJobs(!showJobs)}
              className="flex items-center gap-1 ml-auto text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              {showJobs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {batch.jobs.length} job
            </button>
          )}
        </div>
      </div>

      {/* Job List */}
      {showJobs && (
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
            {batch.jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-3 px-3 py-2 text-xs border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors rounded-sm"
              >
                <span className="shrink-0">{MOCK_JOB_STATUS_ICONS[job.status]}</span>
                <span className="font-mono text-gray-500 truncate min-w-0 flex-1">
                  {job.nomorDokumen || '—'}
                </span>
                <span className="text-gray-400">{job.memberId.slice(0, 8)}...</span>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Mock BatchHistoryPanel — visual clone of the real component
// ═══════════════════════════════════════════════════════════════

function MockBatchHistoryPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const batches = mockBatchList;

  if (batches.length === 0) {
    return (
      <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <FileText size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Belum ada batch generate
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((batch) => {
        const isExpanded = expandedId === batch.id;
        return (
          <div key={batch.id} className="group">
            <button
              onClick={() => setExpandedId(isExpanded ? null : batch.id)}
              className={`w-full bg-white dark:bg-gray-800 rounded-xl border transition-all text-left hover:shadow-md ${
                isExpanded
                  ? 'border-blue-300 dark:border-blue-700 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
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

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatBatchType(batch.type)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        batch.status === 'completed'
                          ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                          : batch.status === 'completed_with_errors'
                            ? 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
                            : batch.status === 'cancelled'
                              ? 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                              : 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {MOCK_STATUS_ICONS[batch.status] || null}
                      {MOCK_STATUS_LABELS[batch.status] || batch.status}
                    </span>
                    <span className="bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 text-[9px] px-1.5 py-0.5 rounded font-mono">
                      MOCK
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{batch.total} dokumen</span>
                    <span className="text-green-600 font-medium">{batch.completed} selesai</span>
                    {batch.failed > 0 && (
                      <span className="text-red-500 font-medium">{batch.failed} gagal</span>
                    )}
                    <span>
                      {Math.floor(
                        (Date.now() - new Date(batch.createdAt).getTime()) / 3600000,
                      )}
                      j lalu
                    </span>
                  </div>
                </div>

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

                <div className="shrink-0">
                  {batch.status === 'completed' ? (
                    <CheckCircle2 size={18} className="text-green-500" />
                  ) : batch.status === 'processing' ? (
                    <Loader2 size={18} className="text-blue-500 animate-spin" />
                  ) : (
                    <ChevronDown
                      size={18}
                      className={`text-gray-400 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="mt-2">
                <MockBatchProgressCard batch={batch} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
