'use client';

import Link from 'next/link';
import { Download, FileText, CreditCard } from 'lucide-react';

interface ExportTabProps {
  exportType: string;
  onExportTypeChange: (value: string) => void;
  exportLoading: boolean;
  onExport: () => void;
}

export default function ExportTab({
  exportType,
  onExportTypeChange,
  exportLoading,
  onExport,
}: ExportTabProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Ekspor Data</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Download data dalam format CSV untuk analisis lebih lanjut
      </p>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <select
          value={exportType}
          onChange={(e) => onExportTypeChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
        >
          <option value="members">Data Anggota</option>
          <option value="dues">Data Iuran</option>
          <option value="graduates">Data Lulusan</option>
        </select>
        <button
          onClick={onExport}
          disabled={exportLoading}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
        >
          <Download size={14} />
          {exportLoading ? 'Menyiapkan...' : 'Download CSV'}
        </button>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <strong>Informasi:</strong> Data yang diexport dibatasi hingga 5000 baris. Gunakan filter
          scope (ranting/wilayah/distrik) untuk data yang lebih spesifik.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/settings/email"
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <FileText size={18} className="text-blue-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Laporan Email</p>
            <p className="text-xs text-gray-500">Statistik pengiriman & engagement email</p>
          </div>
        </Link>
        <Link
          href="/dues"
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <CreditCard size={18} className="text-yellow-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Laporan Iuran</p>
            <p className="text-xs text-gray-500">Rekap pembayaran iuran anggota</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
