'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Download,
  Save,
  Trash2,
} from 'lucide-react';

interface PreviewRow {
  no: number;
  aspek: string;
  item: string;
  deskripsi: string;
  skorMaksimal: number;
}

interface ImportResult {
  importedAspects: number;
  importedItems: number;
  total: number;
}

export default function ImportAssessmentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const parseCSV = useCallback(async (csvFile: File) => {
    setParsing(true);
    setError('');
    try {
      const text = await csvFile.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setError('File CSV harus memiliki header dan minimal 1 baris data');
        setParsing(false);
        return;
      }

      // Parse header
      const headers = lines[0].trim().toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
      const colIndices: Record<string, number> = {};
      headers.forEach((h, i) => {
        const cleaned = h.replace(/[^a-z_]/g, '');
        if (cleaned === 'no' || cleaned === 'nomor') colIndices.no = i;
        else if (cleaned === 'aspek' || cleaned === 'aspe') colIndices.aspek = i;
        else if (cleaned === 'item' || cleaned === 'items') colIndices.item = i;
        else if (cleaned === 'deskripsi' || cleaned === 'deskri') colIndices.deskripsi = i;
        else if (cleaned === 'skor_max' || cleaned === 'skormax' || cleaned === 'skor maksimal' || cleaned === 'nilai_max') colIndices.skorMax = i;
      });

      if (colIndices.aspek === undefined || colIndices.item === undefined) {
        setError('Format CSV tidak valid. Kolom "ASPEK" dan "ITEM" diperlukan. Format: NO,ASPEK,ITEM,DESKRIPSI,SKOR_MAX');
        setParsing(false);
        return;
      }

      const rows: PreviewRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Parse CSV line with quote handling
        const values = parseCSVLine(line);
        if (values.length >= Math.max(colIndices.aspek, colIndices.item) + 1) {
          rows.push({
            no: colIndices.no !== undefined ? parseInt(values[colIndices.no]?.trim() || '0', 10) || i : i,
            aspek: values[colIndices.aspek]?.trim() || '',
            item: values[colIndices.item]?.trim() || '',
            deskripsi: colIndices.deskripsi !== undefined ? values[colIndices.deskripsi]?.trim() || '' : '',
            skorMaksimal: colIndices.skorMax !== undefined ? parseInt(values[colIndices.skorMax]?.trim() || '100', 10) || 100 : 100,
          });
        }
      }

      if (rows.length === 0) {
        setError('Tidak ada baris data yang valid dalam file CSV');
        setParsing(false);
        return;
      }

      setPreview(rows);
    } catch (err) {
      setError('Gagal membaca file: ' + (err as Error).message);
    }
    setParsing(false);
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!f.name.endsWith('.csv')) {
      setError('File harus berformat CSV');
      return;
    }
    setFile(f);
    setResult(null);
    parseCSV(f);
  }, [parseCSV]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleImport = async () => {
    if (preview.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const res = await apiClient.post('/assessments/import-from-list', {
        data: preview.map(row => ({
          no: row.no,
          aspek: row.aspek,
          item: row.item,
          deskripsi: row.deskripsi || undefined,
          skorMaksimal: row.skorMaksimal || undefined,
        })),
      });
      setResult(res.data.data);
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal import data');
    }
    setImporting(false);
  };

  const downloadTemplate = async () => {
    const template = 'NO,ASPEK,ITEM,DESKRIPSI,SKOR_MAX\n1,Aspek Spiritual,Menyebutkan 10 nama santo/santa,,100\n2,Aspek Pengetahuan,Menjelaskan sejarah THS,,90\n3,Aspek Sikap,Bersikap sopan dan hormat,,100\n';
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_aspek_item.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Group preview by aspek for display
  const groupedPreview = preview.reduce<Record<string, PreviewRow[]>>((acc, row) => {
    const key = row.aspek;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return (
    <PermissionGuard module="assessments" action="create">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/assessments" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={20} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Import Aspek &amp; Item Penilaian</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Upload file CSV untuk mengimport aspek dan item penilaian sekaligus
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Success Result */}
        {result && (
          <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Import Berhasil!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {result.importedAspects} aspek dan {result.importedItems} item penilaian berhasil diimport
                  (total {result.total} baris)
                </p>
                <button
                  onClick={() => router.push('/assessments')}
                  className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:underline"
                >
                  ← Kembali ke daftar aspek
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload Area */}
        {!result && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Upload File CSV</h3>
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition">
                <Download size={14} /> Download Template
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                dragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              <Upload size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {file ? file.name : 'Tarik file CSV ke sini atau klik untuk memilih'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Format: NO, ASPEK, ITEM, DESKRIPSI, SKOR_MAX
              </p>
            </div>

            {/* Parsing indicator */}
            {parsing && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Memproses file...
              </div>
            )}

            {/* Preview Table */}
            {preview.length > 0 && !parsing && (
              <div className="mt-6 space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Pratinjau: {preview.length} baris ditemukan
                </h4>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  {Object.entries(groupedPreview).map(([aspekName, rows]) => (
                    <div key={aspekName} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{aspekName}</span>
                        <span className="text-xs text-gray-400">({rows.length} item)</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-800">
                        {rows.map((row, i) => (
                          <div key={i} className="px-4 py-2 flex items-center gap-4 text-sm">
                            <span className="text-xs text-gray-400 w-6">{row.no}.</span>
                            <span className="flex-1 text-gray-900 dark:text-white">{row.item}</span>
                            <span className="text-xs text-gray-400 w-12 text-right">
                              {row.deskripsi && <span title={row.deskripsi} className="cursor-help">📝</span>}
                            </span>
                            <span className="text-xs font-mono text-gray-500 w-16 text-right">
                              Max: {row.skorMaksimal}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Group Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Total Baris</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{preview.length}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Aspek</p>
                    <p className="text-lg font-bold text-blue-600">{Object.keys(groupedPreview).length}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Item</p>
                    <p className="text-lg font-bold text-emerald-600">{preview.length}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Rata-rata Skor Max</p>
                    <p className="text-lg font-bold text-purple-600">
                      {Math.round(preview.reduce((sum, r) => sum + r.skorMaksimal, 0) / preview.length)}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => { setFile(null); setPreview([]); setResult(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    <Trash2 size={14} /> Pilih File Lain
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || preview.length === 0}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition shadow-sm ${
                      importing
                        ? 'bg-blue-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Save size={16} />
                    {importing ? 'Mengimport...' : `Import ${Object.keys(groupedPreview).length} Aspek (${preview.length} Item)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Format Info */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm">
          <p className="font-medium text-blue-800 dark:text-blue-300 mb-1">Format File CSV</p>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1 ml-4 list-disc">
            <li>Baris pertama harus header: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">NO,ASPEK,ITEM,DESKRIPSI,SKOR_MAX</code></li>
            <li><strong>NO</strong>: Nomor urut aspek (angka)</li>
            <li><strong>ASPEK</strong>: Nama aspek penilaian (akan digabung otomatis jika baris berurutan memiliki aspek yang sama)</li>
            <li><strong>ITEM</strong>: Nama item penilaian</li>
            <li><strong>DESKRIPSI</strong> (opsional): Keterangan item</li>
            <li><strong>SKOR_MAX</strong> (opsional): Nilai maksimal untuk item (default 100)</li>
            <li>Gunakan tanda kutip ganda (<code>"</code>) untuk nilai yang mengandung koma</li>
          </ul>
        </div>
      </div>
    </PermissionGuard>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
