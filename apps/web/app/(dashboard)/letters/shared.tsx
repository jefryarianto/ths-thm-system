'use client';

import { useState } from 'react';
import { FileText, ChevronRight, Download } from 'lucide-react';

// ─── Types ───

export interface LetterRow {
  [key: string]: unknown;
  id: string;
  nomorSurat: string;
  type: string;
  pengirim?: string;
  tujuan?: string;
  perihal: string;
  tanggalSurat?: string;
  tanggalTerima?: string;
  tanggalKirim?: string;
  status: string;
}

export interface LetterDetail {
  [key: string]: unknown;
  id: string;
  nomorSurat: string;
  type: string;
  pengirim?: string;
  tujuan?: string;
  perihal: string;
  tanggalSurat?: string;
  tanggalTerima?: string;
  tanggalKirim?: string;
  isi?: string;
  fileScanPath?: string;
  filePath?: string;
  status: string;
  disposisi?: Array<{ id: string; kepadaUserId: string; isi: string }>;
  createdAt: string;
  updatedAt?: string;
}

export interface LetterFormData {
  nomorSurat: string;
  tanggalSurat: string;
  pengirim: string;
  tujuan: string;
  perihal: string;
  isi: string;
  fileScanPath: string;
  filePath: string;
  tanggalTerima: string;
  status: string;
}

export type LetterType = 'masuk' | 'keluar';

export const emptyForm: LetterFormData = {
  nomorSurat: '', tanggalSurat: '', pengirim: '', tujuan: '',
  perihal: '', isi: '', fileScanPath: '', filePath: '',
  tanggalTerima: '', status: 'draft',
};

export const statusColors: Record<string, string> = {
  diterima: 'bg-green-100 text-green-700',
  diproses: 'bg-blue-100 text-blue-700',
  ditolak: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
  terkirim: 'bg-green-100 text-green-700',
  dikirim: 'bg-green-100 text-green-700',
  dibatalkan: 'bg-red-100 text-red-700',
};

export const TAB_VALUES = ['all', 'incoming', 'outgoing'] as const;
export type TabValue = (typeof TAB_VALUES)[number];

// ─── Helper Components ───

export function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

export function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white font-medium">{value || '-'}</p>
    </div>
  );
}

export function FilePreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [expanded, setExpanded] = useState(false);
  const isPdf = fileUrl.endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left"
      >
        <FileText size={16} className="text-blue-600 flex-shrink-0" />
        <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
        <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      {expanded && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-80" title={`Preview: ${fileName}`} />
          ) : isImage ? (
            <img src={fileUrl} alt={fileName} className="w-full h-auto max-h-80 object-contain bg-gray-50" />
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              <FileText size={32} className="mx-auto mb-2 text-gray-400" />
              <p>Preview tidak tersedia untuk file ini</p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                <Download size={12} /> Download
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
