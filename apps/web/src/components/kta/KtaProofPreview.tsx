'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/lib/api-client';
import BuktiPreviewModal from '@/components/bukti-preview-modal';

interface KtaProofPreviewProps {
  applicationId: string;
  buktiBayarPath?: string | null;
  anggotaName?: string;
}

interface ProofPreviewState {
  url: string;
  mimeType: string;
  fileName: string;
}

function readHeader(headers: unknown, key: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  const candidate = headers as Record<string, unknown> & { get?: (name: string) => unknown };
  const fromGet = candidate.get?.(key);
  if (typeof fromGet === 'string') return fromGet;
  const value = candidate[key.toLowerCase()];
  return typeof value === 'string' ? value : undefined;
}

function fileNameFromDisposition(value: string | undefined): string | null {
  if (!value) return null;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(value);
  if (encoded) {
    const raw = encoded[1].trim().replace(/^"|"$/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const match = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(value);
  return match ? (match[1] ?? match[2]).trim() : null;
}

function previewKind(mimeType: string, fileName: string): 'pdf' | 'image' | 'other' {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('pdf') || /\.pdf$/i.test(fileName)) return 'pdf';
  if (normalized.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(fileName)) return 'image';
  return 'other';
}

export default function KtaProofPreview({
  applicationId,
  buktiBayarPath,
  anggotaName,
}: KtaProofPreviewProps) {
  const [preview, setPreview] = useState<ProofPreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const openAfterLoadRef = useRef(false);

  const release = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    if (!buktiBayarPath) return;
    const requestId = ++requestRef.current;
    setError(null);
    try {
      const response = await apiClient.get(`/kta-applications/${applicationId}/proof`, {
        responseType: 'blob',
      });
      if (requestId !== requestRef.current) return;

      const blob = response.data as Blob;
      const mimeType = readHeader(response.headers, 'content-type') || blob.type;
      const fileName =
        fileNameFromDisposition(readHeader(response.headers, 'content-disposition')) ||
        buktiBayarPath.split('/').pop() ||
        'bukti-pembayaran';

      release();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setPreview({ url, mimeType, fileName });
      if (openAfterLoadRef.current) {
        openAfterLoadRef.current = false;
        setModalOpen(true);
      }
    } catch {
      if (requestId !== requestRef.current) return;
      release();
      openAfterLoadRef.current = false;
      setPreview(null);
      setModalOpen(false);
      setError('Gagal memuat bukti pembayaran');
    }
  }, [applicationId, buktiBayarPath, release]);

  useEffect(() => {
    if (!buktiBayarPath) {
      requestRef.current += 1;
      release();
      setPreview(null);
      setError(null);
      setModalOpen(false);
      return;
    }
    void load();
    return () => {
      requestRef.current += 1;
      release();
    };
  }, [buktiBayarPath, load, release]);

  const handleOpen = () => {
    if (preview) {
      setModalOpen(true);
      return;
    }
    openAfterLoadRef.current = true;
    void load();
  };

  const handleClose = () => {
    openAfterLoadRef.current = false;
    setModalOpen(false);
    release();
    setPreview(null);
  };

  if (!buktiBayarPath) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
        <h3 className="text-sm font-semibold mb-2">Bukti Pembayaran</h3>
        <p className="text-sm text-muted">Bukti tidak tersedia</p>
      </div>
    );
  }

  const kind = preview ? previewKind(preview.mimeType, preview.fileName) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Bukti Pembayaran</h3>
          <p className="text-xs text-muted font-mono truncate max-w-xs">
            {preview?.fileName || buktiBayarPath.split('/').pop()}
          </p>
        </div>
        {kind === 'image' && (
          <button
            type="button"
            onClick={handleOpen}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
          >
            Lihat Bukti
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {preview && kind === 'pdf' && (
        <div className="mt-4 space-y-3">
          <iframe
            src={preview.url}
            title="Pratinjau Bukti PDF"
            className="w-full h-96 rounded-lg border border-border"
          />
          <a
            href={preview.url}
            download={preview.fileName}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition"
          >
            Unduh PDF
          </a>
        </div>
      )}

      {preview && kind === 'image' && (
        <BuktiPreviewModal
          open={modalOpen}
          onClose={handleClose}
          buktiPath={preview.url}
          displayName={preview.fileName}
          downloadName={preview.fileName}
          anggotaName={anggotaName}
        />
      )}

      {preview && kind === 'other' && (
        <a
          href={preview.url}
          download={preview.fileName}
          className="mt-4 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Unduh Bukti
        </a>
      )}
    </div>
  );
}
