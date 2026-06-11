'use client';

import { useEffect, useState } from 'react';
import { X, Trash2, Edit3 } from 'lucide-react';
import apiClient from '@/lib/api-client';
import type { LetterRow, LetterDetail } from './shared';
import { statusColors, DetailRow, FilePreview } from './shared';

interface Props {
  selectedLetter: LetterRow;
  onClose: () => void;
  onEdit: (detail: LetterDetail) => void;
  onDelete: (detail: LetterDetail) => void;
  deleting: boolean;
}

export default function LetterDetailPanel({ selectedLetter, onClose, onEdit, onDelete, deleting }: Props) {
  const [detailData, setDetailData] = useState<LetterDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedLetter?.id) return;
    let cancelled = false;
    setLoading(true);
    const type = selectedLetter.type || (selectedLetter.pengirim ? 'masuk' : 'keluar');
    const endpoint = type === 'masuk' ? `/letters/incoming/${selectedLetter.id}` : `/letters/outgoing/${selectedLetter.id}`;
    apiClient.get(endpoint).then(({ data: res }) => {
      if (!cancelled) {
        setDetailData({ ...res.data, type } as LetterDetail);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) { setDetailData(null); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [selectedLetter?.id]);

  return (
    <div className="w-96 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Detail Surat</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <X size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Memuat data...</div>
      ) : detailData ? (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              detailData.type === 'masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
            }`}>
              Surat {detailData.type === 'masuk' ? 'Masuk' : 'Keluar'}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[detailData.status] || 'bg-gray-100 text-gray-600'}`}>
              {detailData.status}
            </span>
          </div>

          <DetailRow label="No. Surat" value={detailData.nomorSurat} />
          <DetailRow label={detailData.type === 'masuk' ? 'Pengirim' : 'Tujuan'} value={detailData.pengirim || detailData.tujuan} />
          <DetailRow label="Perihal" value={detailData.perihal} />
          <DetailRow label="Tanggal Surat" value={detailData.tanggalSurat
            ? new Date(detailData.tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} />
          {detailData.tanggalTerima && (
            <DetailRow label="Tanggal Terima" value={new Date(detailData.tanggalTerima).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
          )}

          {detailData.isi && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Isi / Konten</p>
              <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed bg-gray-50 dark:bg-gray-900 rounded-lg p-3 whitespace-pre-wrap">{detailData.isi}</p>
            </div>
          )}

          {(detailData.fileScanPath || detailData.filePath) && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Lampiran / File</p>
              <FilePreview fileUrl={(detailData.fileScanPath || detailData.filePath)!} fileName={detailData.nomorSurat} />
            </div>
          )}

          {detailData.type === 'masuk' && detailData.disposisi && detailData.disposisi.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Disposisi</p>
              <div className="space-y-2">
                {detailData.disposisi.map((d, i) => (
                  <div key={d.id || String(i)} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Kepada: {d.kepadaUserId}</p>
                    <p className="text-sm text-gray-900 mt-1">{d.isi}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">Dibuat: {new Date(detailData.createdAt).toLocaleString('id-ID')}</p>
            {detailData.updatedAt && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Diperbarui: {new Date(detailData.updatedAt).toLocaleString('id-ID')}</p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => onEdit(detailData)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition">
              <Edit3 size={14} /> Edit
            </button>
            <button onClick={() => onDelete(detailData)} disabled={deleting}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50">
              <Trash2 size={14} /> {deleting ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-gray-500">Gagal memuat data</div>
      )}
    </div>
  );
}
