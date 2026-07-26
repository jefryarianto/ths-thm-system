'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import Papa from 'papaparse';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Download,
  FileSpreadsheet,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

interface ImportResult {
  success: number;
  incomplete: number;
  errors: number;
  details: Array<{ row: Record<string, unknown>; missingFields?: string[]; error?: string }>;
}

const CSV_TEMPLATE =
  'nama,nama_lengkap,jenis_kelamin,no_hp,email,alamat,tempat_lahir,tanggal_lahir\n"John Doe","Johnathan Doe",L,08123456789,john@example.com,"Jl. Contoh No. 123",Jakarta,1990-01-01\n';

function formatFileSize(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

export default function ImportMembersPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith('.csv')) {
      setError('File harus berformat CSV');
      return;
    }

    setFile(selected);
    setError(null);
    setResult(null);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5) as Array<Record<string, string>>);
      },
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped || !dropped.name.endsWith('.csv')) {
      setError('File harus berformat CSV');
      return;
    }
    setFile(dropped);
    setError(null);
    setResult(null);

    Papa.parse(dropped, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreview(results.data.slice(0, 5) as Array<Record<string, string>>);
      },
    });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data } = await apiClient.post('/members/import', results.data);
          setResult(data.data as ImportResult);
        } catch (err: unknown) {
          const apiErr = err as { response?: { data?: { message?: string } } };
          setError(apiErr?.response?.data?.message || 'Import gagal');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_anggota.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setFile(null);
    setPreview([]);
    setResult(null);
    setError(null);
  };

  return (
      <PermissionGuard module="members" action="create">
        <Breadcrumbs />
        <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => router.back()}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <ArrowLeft size={18} className="text-gray-500" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Upload size={24} className="text-blue-600" />
                      Import Anggota
                    </h1>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload file CSV untuk menambah anggota secara massal
                  </p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <Download size={16} /> Download Template
                </button>
              </div>
        
              {/* NRA Format Info */}
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-400">
                <p className="font-medium mb-1">📋 Format NRA</p>
                <p>NRA akan digenerate otomatis dengan format: <strong>[kode_distrik]-[kode_wilayah][kode_ranting]-[3digit_urut]-[tahun_dadar]</strong></p>
                <p className="mt-1">Contoh: <code className="bg-white/50 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs font-mono">0114-0101-001-1993</code></p>
                <p className="mt-1">Jika CSV memiliki kolom <code className="bg-white/50 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs font-mono">nomor_anggota</code> yang sudah berisi NRA lama (contoh: <code className="bg-white/50 dark:bg-blue-900/50 px-1.5 py-0.5 rounded text-xs font-mono">001-1993</code>), sistem akan otomatis menambahkan kode distrik di depannya.</p>
              </div>
        
              {/* Upload Zone */}
              {!result && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-12 text-center hover:border-blue-500 transition bg-white dark:bg-gray-800"
                >
                  <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Drag & drop file CSV di sini
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    atau klik untuk memilih file
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    Pilih File
                  </button>
                  {file && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle size={16} className="text-green-500" />
                      {file.name} ({formatFileSize(file.size)} KB)
                    </div>
                  )}
                </div>
              )}
        
              {/* Error */}
              {error && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </span>
                  <button
                    onClick={() => setError(null)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
        
              {/* Preview */}
              {preview.length > 0 && !result && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Preview ({preview.length} baris pertama)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          {Object.keys(preview[0]).map((key) => (
                            <th
                              key={key}
                              className="text-left px-4 py-2 font-medium text-gray-500 dark:text-gray-400"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {preview.map((row, i) => (
                          <tr key={i} className="text-gray-600 dark:text-gray-400">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-4 py-2">
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
        
              {/* Actions */}
              {file && !result && (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={resetAll}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading && <RefreshCw size={16} className="animate-spin" />}
                    {loading ? 'Mengimport...' : 'Import Sekarang'}
                  </button>
                </div>
              )}
        
              {/* Result */}
              {result && (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-xs text-green-700 dark:text-green-400">Berhasil</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">
                            {result.success}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <AlertCircle size={24} className="text-orange-600 dark:text-orange-400" />
                        <div>
                          <p className="text-xs text-orange-700 dark:text-orange-400">Incomplete</p>
                          <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                            {result.incomplete}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4">
                      <div className="flex items-center gap-3">
                        <X size={24} className="text-red-600 dark:text-red-400" />
                        <div>
                          <p className="text-xs text-red-700 dark:text-red-400">Error</p>
                          <p className="text-xl font-bold text-red-700 dark:text-red-300">
                            {result.errors}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
        
                  {/* Details */}
                  {result.details.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Detail ({result.details.length} baris)
                        </h3>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {result.details.slice(0, 20).map((detail, i) => (
                          <div
                            key={i}
                            className="px-4 py-2 text-xs border-b border-gray-100 dark:border-gray-800 last:border-0"
                          >
                            <span className="text-gray-500">Row {i + 1}:</span>{' '}
                            {detail.missingFields
                              ? `Missing fields: ${detail.missingFields.join(', ')}`
                              : detail.error}
                          </div>
                        ))}
                        {result.details.length > 20 && (
                          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                            ...dan {result.details.length - 20} baris lainnya
                          </div>
                        )}
                      </div>
                    </div>
                  )}
        
                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-4">
                    <button
                      onClick={resetAll}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                    >
                      Import Lagi
                    </button>
                    <button
                      onClick={() => router.push('/members')}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      Kembali ke Daftar
                    </button>
                  </div>
                </div>
              )}
            </div>
      </PermissionGuard>
    );
}
