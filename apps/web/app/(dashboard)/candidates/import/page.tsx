'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import {

  detectDelimiter,
  splitCsvLines,
  parseCsvLine,
  matchHeader,
} from '@/lib/csv-utils';
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, Info, XCircle, Download, FileText, Loader2 } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMPORT_ROWS = 500;

// Field mapping for preview: CSV column → backend field
const FIELD_MAPPINGS: { csvCol: string; field: string; required: boolean }[] = [
  { csvCol: 'nama_lengkap', field: 'Nama Lengkap', required: true },
  { csvCol: 'jenis_kelamin', field: 'Jenis Kelamin', required: false },
  { csvCol: 'tempat_lahir', field: 'Tempat Lahir', required: false },
  { csvCol: 'tanggal_lahir', field: 'Tanggal Lahir', required: false },
  { csvCol: 'alamat', field: 'Alamat', required: false },
  { csvCol: 'no_hp', field: 'No. HP', required: false },
  { csvCol: 'email', field: 'Email', required: false },
  { csvCol: 'tingkat', field: 'Tingkat', required: false },
  { csvCol: 'ranting_id', field: 'Ranting ID', required: false },
];

const REQUIRED_COLUMNS = ['nama_lengkap', 'nama', 'Name'];
const KNOWN_COLUMNS = [
  'nama_lengkap', 'Nama Lengkap',
  'nama', 'Name', 'name',
  'jenis_kelamin', 'Jenis Kelamin',
  'tempat_lahir', 'Tempat Lahir',
  'tanggal_lahir', 'Tanggal Lahir',
  'alamat', 'Alamat', 'address', 'Address',
  'no_hp', 'No HP', 'phone', 'Phone',
  'email', 'Email',
  'tingkat', 'Tingkat',
  'ranting_id', 'rantingId', 'Ranting',
];

type RowValidation = {
  rowIndex: number;
  issues: string[];
};

function validateRows(
  data: Record<string, string>[],
  headers: string[],
): RowValidation[] {
  return data.map((row, i) => {
    const issues: string[] = [];

    // Check required: at least one name column
    const nameCol = REQUIRED_COLUMNS.reduce<string | undefined>(
      (found, col) => found || matchHeader(headers, col),
      undefined,
    );
    const nameVal = nameCol ? (row[nameCol] || '') : (row[headers[0]] || '');
    if (!nameVal.trim()) {
      issues.push('Nama tidak boleh kosong');
    }

    // Validate email format if present
    const emailCol = matchHeader(headers, 'email');
    const emailVal = emailCol ? (row[emailCol] || '') : '';
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      issues.push('Format email tidak valid');
    }

    // Validate no HP format if present
    const hpCol = ['no_hp', 'no hp', 'No HP', 'phone', 'Phone']
      .reduce<string | undefined>((found, k) => found || matchHeader(headers, k), undefined);
    const hpVal = hpCol ? (row[hpCol] || '') : '';
    if (hpVal && !/^(\+?62|0)\d{8,13}$/.test(hpVal.replace(/[\s-]/g, ''))) {
      issues.push('Format nomor HP tidak valid (mulai 0/+62, 9-14 digit)');
    }

    return { rowIndex: i, issues };
  });
}

type ImportResult = {
  success: number;
  errors: number;
  details: Array<{ row?: Record<string, string>; error?: string }>;
};

type FailedRow = {
  row: Record<string, string>;
  error: string;
};

export default function ImportCandidatesPage() {
  const router = useRouter();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [csvData, setCsvData] = useState<Record<string, string>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerWarnings, setHeaderWarnings] = useState<string[]>([]);
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [editedFailedRows, setEditedFailedRows] = useState<Record<number, Record<string, string>>>({});

  const rowValidations = useMemo<RowValidation[]>(
    () => (csvData ? validateRows(csvData, headers) : []),
    [csvData, headers],
  );

  const hasErrors = useMemo(
    () => rowValidations.some((r) => r.issues.length > 0),
    [rowValidations],
  );

  const errorCount = useMemo(
    () => rowValidations.reduce((sum, r) => sum + r.issues.length, 0),
    [rowValidations],
  );

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setResult(null);
    setCsvData(null);
    setHeaders([]);
    setHeaderWarnings([]);
    setError('');

    // File size check
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`File terlalu besar (${mb} MB). Maksimal 5 MB.`);
      return;
    }

    // File type check
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Hanya file CSV yang didukung. Pilih file dengan ekstensi .csv.');
      return;
    }

    try {
      const text = await file.text();

      // Use multi-line-aware CSV line splitter (handles quoted fields with newlines)
      const allLines = splitCsvLines(text);
      const nonEmptyLines = allLines.filter((l) => l.trim().length > 0);

      // Detect delimiter from header line
      const headerLine = nonEmptyLines[0] || '';
      const delimiter = detectDelimiter(headerLine);

      // Batch size check (exclude header)
      const dataRowCount = nonEmptyLines.length - 1;
      if (dataRowCount > MAX_IMPORT_ROWS) {
        setError(`Maksimal ${MAX_IMPORT_ROWS} baris data per import. File Anda memiliki ${dataRowCount} baris.`);
        return;
      }

      if (nonEmptyLines.length < 2) {
        setError('File CSV harus memiliki header dan minimal 1 baris data');
        return;
      }

      const hdrs = parseCsvLine(headerLine, delimiter).map((h) => h.trim());
      setHeaders(hdrs);

      // Detect delimiter badge for info
      const delimiterLabels: Record<string, string> = { ',': 'koma', ';': 'titik koma', '\t': 'tab' };

      // Validate headers
      const warnings: string[] = [];
      const hasNameHdr = REQUIRED_COLUMNS.some((rc) =>
        hdrs.some((h) => h.toLowerCase() === rc.toLowerCase()),
      );
      if (!hasNameHdr) {
        warnings.push(
          'Kolom "nama" tidak ditemukan. Pastikan CSV memiliki kolom nama.',
        );
      }

      // Warn about unknown columns
      const unknownCols = hdrs.filter(
        (h) =>
          !KNOWN_COLUMNS.some((kc) => kc.toLowerCase() === h.toLowerCase()),
      );
      if (unknownCols.length > 0) {
        warnings.push(
          `Kolom tidak dikenal: ${unknownCols.join(', ')}. Kolom ini akan diabaikan.`,
        );
      }

      // Add delimiter info (only if not comma)
      if (delimiter !== ',') {
        warnings.push(`Pemisah terdeteksi: ${delimiterLabels[delimiter] || delimiter}.`);
      }

      setHeaderWarnings(warnings);

      // Parse data rows with proper quoted-field handling
      const data = nonEmptyLines.slice(1).map((line) => {
        const vals = parseCsvLine(line, delimiter);
        const row: Record<string, string> = {};
        hdrs.forEach((h, i) => {
          row[h] = vals[i] || '';
        });
        return row;
      });

      setCsvData(data);
    } catch {
      setError('Gagal membaca file CSV. Pastikan file dalam format CSV valid.');
    }
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const [importProgress, setImportProgress] = useState(0);
  const importTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up progress interval on unmount
  useEffect(() => {
    return () => {
      if (importTimerRef.current !== null) {
        clearInterval(importTimerRef.current);
        importTimerRef.current = null;
      }
    };
  }, []);

  const startProgressSimulation = useCallback((totalRows: number) => {
    setImportProgress(0);
    let progress = 0;
    // Simulate progress up to 90% while waiting for backend
    const increment = Math.max(1, Math.floor(90 / Math.max(totalRows, 10)));
    importTimerRef.current = setInterval(() => {
      progress = Math.min(progress + increment, 90);
      setImportProgress(progress);
      if (progress >= 90 && importTimerRef.current) {
        clearInterval(importTimerRef.current);
        importTimerRef.current = null;
      }
    }, 150);
  }, []);

  const stopProgressSimulation = useCallback(() => {
    if (importTimerRef.current) {
      clearInterval(importTimerRef.current);
      importTimerRef.current = null;
    }
    setImportProgress(100);
  }, []);

  const handleImport = async (data?: Record<string, string>[]) => {
    const payload = data || csvData;
    if (!payload || payload.length === 0) return;
    setImporting(true);
    setError('');
    const isRetry = !!data;
    if (!isRetry) setFailedRows([]);
    startProgressSimulation(payload.length);
    try {
      const { data: res } = await apiClient.post('/candidates/import', payload);
      stopProgressSimulation();
      setResult(res.data);

      // Extract failed rows with their data for retry capability
      if (res.data.details?.length > 0) {
        const failed = res.data.details
          .filter((d: { row?: Record<string, string> }) => d.row)
          .map((d: { row: Record<string, string>; error: string }) => ({
            row: d.row,
            error: d.error,
          }));
        setFailedRows(failed);
      }
    } catch (err: unknown) {
      stopProgressSimulation();
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(apiErr || 'Gagal import. Silakan coba lagi.');
    }
    setImporting(false);
  };

  const handleRetryFailed = async () => {
    if (failedRows.length === 0) return;
    setRetrying(true);
    setError('');
    setResult(null);
    startProgressSimulation(failedRows.length);
    try {
      // Apply inline edits before retrying
      const failedData = failedRows.map((f, i) => {
        const edits = editedFailedRows[i];
        if (!edits) return f.row;
        return { ...f.row, ...edits };
      });
      const { data: res } = await apiClient.post('/candidates/import', failedData);
      stopProgressSimulation();
      setResult(res.data);

      // Update failed rows with remaining failures
      if (res.data.details?.length > 0) {
        const stillFailed = res.data.details
          .filter((d: { row?: Record<string, string> }) => d.row)
          .map((d: { row: Record<string, string>; error: string }) => ({
            row: d.row,
            error: d.error,
          }));
        setFailedRows(stillFailed);
        setEditedFailedRows({});
      } else {
        setFailedRows([]);
        setEditedFailedRows({});
      }
    } catch (err: unknown) {
      stopProgressSimulation();
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(apiErr || 'Gagal mengirim ulang data. Silakan coba lagi.');
    }
    setRetrying(false);
  };

  const handleEditFailedRow = useCallback((index: number, field: string, value: string) => {
    setEditedFailedRows((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  }, []);

  const handleReset = () => {
    setResult(null);
    setCsvData(null);
    setHeaders([]);
    setHeaderWarnings([]);
    setError('');
    setFailedRows([]);
    setEditedFailedRows({});
  };

  return (
      <PermissionGuard module="candidates" action="create">
        <Breadcrumbs />
        <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <Link href="/candidates" className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <ArrowLeft size={18} className="text-gray-500" />
                </Link>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Import Calon Anggota</h1>
              </div>
        
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                  <AlertCircle size={16} /> {error}
                </div>
              )}
        
              {result ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-3" style={{ color: result.errors > 0 ? '#d97706' : '#16a34a' }}>
                    {result.errors > 0 ? <AlertCircle size={24} /> : <CheckCircle2 size={24} />}
                    <div>
                      <p className="font-semibold" style={{ color: result.errors > 0 ? '#92400e' : '#166534' }}>
                        {result.errors > 0 ? 'Import Selesai dengan Peringatan' : 'Import Berhasil'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {result.success} berhasil, {result.errors} gagal
                        {failedRows.length > 0 && result.errors > 0 && (
                          <span className="ml-1">- {failedRows.length} baris dapat dicoba ulang</span>
                        )}
                      </p>
                    </div>
                  </div>
        
                  {/* Failed rows detail table with inline editing */}
                  {failedRows.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
                        Baris Gagal ({failedRows.length}) - Klik nama/email untuk edit
                      </h4>
                      <div className="max-h-64 overflow-y-auto border border-red-200 dark:border-red-800 rounded-xl">
                        <table className="w-full text-xs">
                          <thead className="bg-red-50 dark:bg-red-950/30 sticky top-0">
                            <tr className="border-b border-red-200 dark:border-red-800">
                              <th className="px-2 py-1.5 text-left font-medium text-red-600 w-8">#</th>
                              <th className="px-2 py-1.5 text-left font-medium text-red-600">Nama</th>
                              <th className="px-2 py-1.5 text-left font-medium text-red-600">Email</th>
                              <th className="px-2 py-1.5 text-left font-medium text-red-600">Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {failedRows.slice(0, 50).map((f, i) => {
                              const edits = editedFailedRows[i] || {};
                              const editedName = edits.nama_lengkap ?? edits.nama ?? edits.name;
                              const editedEmail = edits.email;
                              const origName = f.row?.nama_lengkap || f.row?.nama || f.row?.name || '';
                              const origEmail = f.row?.email || '';
                              const hasEdit = !!editedName || !!editedEmail;
                              return (
                                <tr key={i} className={`border-b border-red-100 dark:border-red-900/30 ${hasEdit ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                                  <td className="px-2 py-1 text-red-400">{i + 1}</td>
                                  <td className="px-2 py-1">
                                    <input
                                      defaultValue={origName}
                                      onChange={(e) => handleEditFailedRow(i, 'nama_lengkap', e.target.value)}
                                      className="w-full bg-transparent border-b border-transparent hover:border-red-300 focus:border-amber-500 focus:outline-none text-red-700 dark:text-red-300 font-medium px-0.5 py-0.5 transition-colors truncate"
                                      placeholder="Nama..."
                                      title={origName}
                                    />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      defaultValue={origEmail}
                                      onChange={(e) => handleEditFailedRow(i, 'email', e.target.value)}
                                      className="w-full bg-transparent border-b border-transparent hover:border-red-300 focus:border-amber-500 focus:outline-none text-red-600 dark:text-red-400 px-0.5 py-0.5 transition-colors truncate"
                                      placeholder="Email..."
                                      title={origEmail}
                                    />
                                  </td>
                                  <td className="px-2 py-1 text-red-500 max-w-[200px]">
                                    <span className="line-clamp-2 text-[11px]" title={f.error}>{f.error}</span>
                                  </td>
                                </tr>
                              );
                            })}
                            {failedRows.length > 50 && (
                              <tr>
                                <td colSpan={4} className="px-2 py-2 text-center text-gray-400">
                                  ... dan {failedRows.length - 50} baris lainnya
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      {Object.keys(editedFailedRows).length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Info size={12} />
                          {Object.keys(editedFailedRows).length} baris telah diedit
                        </p>
                      )}
                    </div>
                  )}
        
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {failedRows.length > 0 && (
                      <button
                        onClick={handleRetryFailed}
                        disabled={retrying}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition flex items-center gap-2 disabled:opacity-50"
                      >
                        {retrying ? (
                          <><Loader2 size={14} className="animate-spin" /> Mencoba Ulang...</>
                        ) : (
                          <><Upload size={14} /> Coba Ulang {failedRows.length} Baris Gagal</>
                        )}
                      </button>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <button onClick={handleReset} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                        Import Lagi
                      </button>
                      <button onClick={() => router.push('/candidates')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition">
                        Ke Daftar Calon
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
                  {/* Upload zone */}
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                      dragOver
                        ? 'border-purple-400 bg-purple-50 dark:border-purple-500 dark:bg-purple-900/20 scale-[1.02]'
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFile}
                      className="hidden"
                    />
                    <div className={`transition-transform duration-200 ${dragOver ? 'scale-110' : ''}`}>
                      {dragOver ? (
                        <FileText size={40} className="mx-auto text-purple-500 mb-3" />
                      ) : (
                        <Upload size={40} className="mx-auto text-gray-400 mb-3" />
                      )}
                    </div>
                    {dragOver ? (
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        Lepaskan file di sini
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tarik & lepas file CSV di sini
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          atau klik untuk memilih file
                        </p>
                      </>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      Format: .csv &middot; Maks: 5 MB
                    </p>
                  </div>
        
                  {/* Template info + download */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <span className="text-xs text-gray-400">Belum punya file CSV?</span>
                    <a
                      href="/templates/template_csv_calon_anggota.csv"
                      download
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
                    >
                      <Download size={14} />
                      Download Template CSV
                    </a>
                  </div>
        
                  {/* Column mapping preview */}
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      Mapping Kolom
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                      {FIELD_MAPPINGS.map((m) => {
                        const matchedHeader = matchHeader(headers, m.csvCol);
                        return (
                          <div
                            key={m.csvCol}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                              matchedHeader
                                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                : m.required
                                  ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {matchedHeader ? (
                              <CheckCircle2 size={12} className="shrink-0" />
                            ) : (
                              <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${m.required ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`} />
                            )}
                            <span className="font-mono">{m.field}</span>
                            {matchedHeader && (
                              <span className="text-gray-400 dark:text-gray-500">
                                ← <span className="font-mono">{matchedHeader}</span>
                              </span>
                            )}
                            {!matchedHeader && !m.required && (
                              <span className="text-gray-400">(opsional)</span>
                            )}
                            {!matchedHeader && m.required && (
                              <span className="text-red-400">(wajib)</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
        
                  {csvData && (
                    <>
                      {/* Header warnings */}
                      {headerWarnings.length > 0 && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                          {headerWarnings.map((w, i) => (
                            <p key={i} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                              <Info size={15} /> {w}
                            </p>
                          ))}
                        </div>
                      )}
        
                      {/* Validation summary */}
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          {csvData.length} baris data
                          {errorCount > 0 && (
                            <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                              · {errorCount} masalah validasi
                            </span>
                          )}
                        </p>
                        {hasErrors && (
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <XCircle size={12} />
                            Perbaiki data sebelum import
                          </span>
                        )}
                      </div>
        
                      {/* Preview table with row validation */}
                      <div className="overflow-x-auto max-h-56 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm dark:shadow-gray-900/30">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 w-8">#</th>
                              {Object.keys(csvData[0]).map(h => (
                                <th key={h} className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                              ))}
                              <th className="px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {csvData.slice(0, 10).map((row, i) => {
                              const valid = rowValidations[i];
                              const hasRowIssues = valid && valid.issues.length > 0;
                              return (
                                <tr
                                  key={i}
                                  className={`${
                                    hasRowIssues
                                      ? 'bg-red-50/50 dark:bg-red-950/20'
                                      : 'odd:bg-white dark:odd:bg-gray-900/50 even:bg-gray-50/50 dark:even:bg-gray-800/30'
                                  } hover:bg-gray-100/50 dark:hover:bg-gray-800 transition-colors`}
                                >
                                  <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500 font-mono">{i + 1}</td>
                                  {Object.values(row).map((v, j) => (
                                    <td key={j} className="px-2 py-1.5 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                                      {v ? (
                                        <span title={v}>{v}</span>
                                      ) : (
                                        <span className="text-gray-300 dark:text-gray-600 italic">-</span>
                                      )}
                                    </td>
                                  ))}
                                  <td className="px-2 py-1.5">
                                    {hasRowIssues ? (
                                      <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400" title={valid!.issues.join('; ')}>
                                        <XCircle size={12} />
                                        {valid!.issues.length} err
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <CheckCircle2 size={12} />
                                        OK
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                            {csvData.length > 10 && (
                              <tr>
                                <td colSpan={Object.keys(csvData[0]).length + 2} className="px-2 py-2 text-center text-gray-400 dark:text-gray-500 text-xs">
                                  ... dan {csvData.length - 10} baris lainnya
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
        
                      {/* Row-level error details */}
                      {errorCount > 0 && (
                        <div className="max-h-32 overflow-y-auto space-y-1.5 bg-red-50/50 dark:bg-red-950/20 rounded-xl p-3 border border-red-100 dark:border-red-900/50">
                          {rowValidations
                            .filter((r) => r.issues.length > 0)
                            .slice(0, 20)
                            .map((r) => (
                              <p key={r.rowIndex} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                                <AlertCircle size={12} className="mt-0.5 shrink-0 text-red-400 dark:text-red-500" />
                                <span>
                                  <strong className="text-red-700 dark:text-red-300">Baris {r.rowIndex + 2}:</strong>{' '}
                                  {r.issues.join('; ')}
                                </span>
                              </p>
                            ))}
                          {errorCount > 20 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                              ... dan {errorCount - 20} masalah lainnya
                            </p>
                          )}
                        </div>
                      )}
        
                      {/* Progress indicator */}
                      {importing && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                              <Loader2 size={13} className="animate-spin" />
                              {retrying ? 'Mencoba ulang baris gagal...' : 'Memproses data...'}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500 font-mono">
                              {importProgress}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                              style={{ width: `${importProgress}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                            {retrying
                              ? `Mengirim ${failedRows.length} baris...`
                              : `Mengirim ${csvData?.length || 0} baris ke server...`}
                          </p>
                        </div>
                      )}
        
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => setCsvData(null)}
                          disabled={importing}
                          className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-30"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleImport()}
                          disabled={importing || hasErrors}
                          className={`px-6 py-2.5 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2 ${
                            hasErrors
                              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                          } disabled:opacity-50`}
                        >
                          {importing ? (
                            <><Loader2 size={16} className="animate-spin" /> Mengimpor...</>
                          ) : (
                            <><Upload size={15} /> Import {csvData.length} Data</>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
      </PermissionGuard>
    );
}
