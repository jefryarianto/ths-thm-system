'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Users,
  UserCheck,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { BatchProgressCard } from '@/components/ui/batch-progress';

// ─── Types ───

interface BatchGenerateModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when a batch is created - passes the batchId for redirect */
  onBatchCreated?: (batchId: string) => void;
}

type Step = 'form' | 'confirm' | 'progress';

const DOCUMENT_TYPES = [
  { value: 'kta', label: 'Kartu Tanda Anggota (KTA)', description: 'Generate KTA untuk anggota terpilih', icon: '🪪' },
  { value: 'sertifikat_pendadaran', label: 'Sertifikat Pendadaran', description: 'Sertifikat kelulusan pendadaran', icon: '📜' },
  { value: 'sertifikat_pelatihan', label: 'Sertifikat Pelatihan', description: 'Sertifikat keikutsertaan pelatihan', icon: '📋' },
  { value: 'piagam_prestasi', label: 'Piagam Prestasi', description: 'Piagam penghargaan prestasi', icon: '🏆' },
];

const MEMBER_RANGE_OPTIONS = [
  { value: 'all_active', label: 'Semua Anggota Aktif', description: 'Semua anggota dengan status aktif' },
  { value: 'by_ranting', label: 'Per Ranting', description: 'Pilih anggota berdasarkan ranting tertentu' },
  { value: 'by_ids', label: 'Daftar ID Anggota', description: 'Masukkan daftar ID anggota secara manual' },
  { value: 'graduated_only', label: 'Lulus Pendadaran', description: 'Anggota yang baru lulus pendadaran' },
];

// ─── Component ───

export default function BatchGenerateModal({
  open,
  onClose,
  onBatchCreated,
}: BatchGenerateModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [docType, setDocType] = useState('kta');
  const [memberRange, setMemberRange] = useState('all_active');
  const [rantingId, setRantingId] = useState('');
  const [memberIds, setMemberIds] = useState('');
  const [estimatedTotal, setEstimatedTotal] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBatchId, setCreatedBatchId] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('form');
      setDocType('kta');
      setMemberRange('all_active');
      setRantingId('');
      setMemberIds('');
      setEstimatedTotal(null);
      setError(null);
      setCreatedBatchId(null);
    }
  }, [open]);

  // Estimate member count
  const estimateCount = useCallback(async () => {
    setEstimating(true);
    setError(null);
    try {
      const { data: res } = await apiClient.get('/documents/batch/estimate', {
        params: { range: memberRange, rantingId: rantingId || undefined },
      });
      setEstimatedTotal(res.data?.count || 0);
    } catch {
      setEstimatedTotal(0);
      setError('Gagal memperkirakan jumlah anggota');
    } finally {
      setEstimating(false);
    }
  }, [memberRange, rantingId]);

  useEffect(() => {
    if (step === 'confirm' && estimatedTotal === null) {
      estimateCount();
    }
  }, [step, estimatedTotal, estimateCount]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { type: docType, range: memberRange };
      if (memberRange === 'by_ranting') payload.rantingId = rantingId;
      if (memberRange === 'by_ids') {
        payload.memberIds = memberIds
          .split('\n')
          .map((id) => id.trim())
          .filter(Boolean);
      }

      const { data: res } = await apiClient.post('/documents/batch', payload);

      if (res.success && res.data?.batchId) {
        setCreatedBatchId(res.data.batchId);
        setStep('progress');
        onBatchCreated?.(res.data.batchId);
      } else {
        throw new Error(res.message || 'Gagal membuat batch');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat batch generate';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => onClose();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
              <FileText size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {step === 'form' && 'Generate Dokumen Massal'}
                {step === 'confirm' && 'Konfirmasi Generate Massal'}
                {step === 'progress' && 'Memproses Generate Massal'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {step === 'form' && 'Pilih tipe dokumen dan anggota yang akan dibuatkan'}
                {step === 'confirm' && 'Periksa detail sebelum memulai'}
                {step === 'progress' && 'Dokumen sedang digenerate di background'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={step === 'progress'}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Step 1: Form ── */}
          {step === 'form' && (
            <div className="space-y-6">
              {/* Document Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Tipe Dokumen
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DOCUMENT_TYPES.map((dt) => (
                    <button
                      key={dt.value}
                      onClick={() => setDocType(dt.value)}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        docType === dt.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-600'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <span className="text-xl shrink-0">{dt.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {dt.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {dt.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Member Range */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Pilih Anggota
                </label>
                <div className="space-y-2">
                  {MEMBER_RANGE_OPTIONS.map((mr) => (
                    <button
                      key={mr.value}
                      onClick={() => setMemberRange(mr.value)}
                      className={`flex items-center gap-3 w-full p-3 rounded-xl border text-left transition-all ${
                        memberRange === mr.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-600'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                          memberRange === mr.value
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {memberRange === mr.value && (
                          <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {mr.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {mr.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Conditional inputs */}
                {memberRange === 'by_ranting' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Ranting ID
                    </label>
                    <input
                      type="text"
                      value={rantingId}
                      onChange={(e) => setRantingId(e.target.value)}
                      placeholder="Masukkan ID ranting"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                {memberRange === 'by_ids' && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Daftar ID Anggota (satu per baris)
                    </label>
                    <textarea
                      value={memberIds}
                      onChange={(e) => setMemberIds(e.target.value)}
                      placeholder={`ID-001\nID-002\nID-003`}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 2: Confirm ── */}
          {step === 'confirm' && (
            <div className="space-y-5">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-950 rounded-xl p-4 border border-blue-100 dark:border-blue-900">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                    Tipe Dokumen
                  </p>
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                    {DOCUMENT_TYPES.find((dt) => dt.value === docType)?.label || docType}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 rounded-xl p-4 border border-green-100 dark:border-green-900">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                    Rentang Anggota
                  </p>
                  <p className="text-sm font-bold text-green-800 dark:text-green-300">
                    {MEMBER_RANGE_OPTIONS.find((mr) => mr.value === memberRange)?.label || memberRange}
                  </p>
                </div>
              </div>

              {/* Estimated count */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                {estimating ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <Loader2 size={16} className="animate-spin" />
                    Menghitung jumlah anggota...
                  </div>
                ) : estimatedTotal !== null ? (
                  <div>
                    <p className="text-3xl font-black text-gray-900 dark:text-white">
                      {estimatedTotal}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      anggota akan dibuatkan dokumen
                    </p>
                    {estimatedTotal > 500 && (
                      <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                        <AlertTriangle size={12} />
                        Jumlah besar - proses akan berjalan di background
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-red-500">Gagal menghitung estimasi</p>
                )}
              </div>

              {/* Info notice */}
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-sm text-yellow-700 dark:text-yellow-400">
                <p className="font-medium mb-1">⏳ Proses akan berjalan di background</p>
                <p className="text-xs">
                  Anda bisa menutup modal ini setelah generate dimulai. Progress akan tetap
                  berjalan dan Anda bisa memantaunya dari tab Riwayat Batch.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 3: Progress ── */}
          {step === 'progress' && createdBatchId && (
            <div className="space-y-4">
              <BatchProgressCard
                batchId={createdBatchId}
                onComplete={() => {
                  // Auto-refresh is handled by the hook
                }}
                elevated
              />

              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-start gap-3">
                <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Batch generate dimulai
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Proses berjalan di background. Pantau progress di atas atau buka tab Riwayat Batch
                    untuk melihat semua batch.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {['form', 'confirm', 'progress'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : i < ['form', 'confirm', 'progress'].indexOf(step)
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                  }`}
                >
                  {i < ['form', 'confirm', 'progress'].indexOf(step) ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < 2 && (
                  <div
                    className={`w-8 h-0.5 ${
                      i < ['form', 'confirm', 'progress'].indexOf(step)
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {step === 'form' && (
              <>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setEstimatedTotal(null);
                    setStep('confirm');
                  }}
                  disabled={!docType}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  Lanjut
                </button>
              </>
            )}

            {step === 'confirm' && (
              <>
                <button
                  onClick={() => {
                    setEstimatedTotal(null);
                    setStep('form');
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || estimating}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Memulai...
                    </>
                  ) : (
                    <>
                      <FileText size={14} />
                      Generate {estimatedTotal ?? ''} Dokumen
                    </>
                  )}
                </button>
              </>
            )}

            {step === 'progress' && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-lg hover:bg-gray-700 transition"
              >
                Tutup
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modal-in {
          from {
            transform: scale(0.95) translateY(10px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
