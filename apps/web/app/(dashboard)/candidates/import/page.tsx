'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

const REQUIRED_COLUMNS = ['nama', 'Name'];
const KNOWN_COLUMNS = [
  'nama', 'Name', 'name',
  'jenis_kelamin', 'jenis kelamin', 'Jenis Kelamin',
  'no_hp', 'no hp', 'No HP', 'phone', 'Phone',
  'email', 'Email',
  'alamat', 'Alamat', 'address', 'Address',
  'tempat_lahir', 'tempat lahir', 'Tempat Lahir',
  'tanggal_lahir', 'tanggal lahir', 'Tanggal Lahir',
  'ranting_id', 'rantingId', 'Ranting',
];

type RowValidation = {
  rowIndex: number;
  issues: string[];
};

function matchHeader(headers: string[], target: string): string | undefined {
  return headers.find((h) => h.toLowerCase() === target.toLowerCase());
}

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

export default function ImportCandidatesPage() {
  const router = useRouter();
  const [result, setResult] = useState<{ success: number; errors: number; details: Array<{ error?: string }> } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [csvData, setCsvData] = useState<Record<string, string>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerWarnings, setHeaderWarnings] = useState<string[]>([]);

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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);
    setCsvData(null);
    setHeaders([]);
    setHeaderWarnings([]);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      if (lines.length < 2) {
        setError('File CSV harus memiliki header dan minimal 1 baris data');
        return;
      }

      const hdrs = lines[0].split(',').map((h) => h.trim());
      setHeaders(hdrs);

      // Validate headers
      const warnings: string[] = [];
      const hasNameHdr = REQUIRED_COLUMNS.some((rc) =>
        hdrs.some((h) => h.toLowerCase() === rc.toLowerCase()),
      );
      if (!hasNameHdr) {
        warnings.push(
          `Kolom "nama" tidak ditemukan. Pastikan CSV memiliki kolom nama.`,
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

      setHeaderWarnings(warnings);

      // Parse data rows
      const data = lines.slice(1).map((line) => {
        const vals = line.split(',').map((v) => v.trim());
        const row: Record<string, string> = {};
        hdrs.forEach((h, i) => {
          row[h] = vals[i] || '';
        });
        return row;
      });

      setCsvData(data);
      setError('');
    } catch {
      setError('Gagal membaca file CSV. Pastikan file dalam format CSV valid.');
    }
  };

  const handleImport = async () => {
    if (!csvData || csvData.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const { data: res } = await apiClient.post('/candidates/import', csvData);
      setResult(res.data);
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(apiErr || 'Gagal import. Silakan coba lagi.');
    }
    setImporting(false);
  };

  return (
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
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle2 size={24} />
            <div>
              <p className="font-semibold">Import Selesai</p>
              <p className="text-sm text-gray-500">{result.success} berhasil, {result.errors} gagal</p>
            </div>
          </div>
          {result.details.length > 0 && (
            <div className="max-h-48 overflow-y-auto text-xs text-gray-500 space-y-1">
              {result.details.map((d, i) => (
                <p key={i} className="text-red-500">{d.error || 'Error'}</p>
              ))}
            </div>
          )}
          <button onClick={() => router.push('/candidates')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Ke Daftar Calon</button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-4">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">Pilih file CSV untuk diimport</p>
            <input type="file" accept=".csv" onChange={handleFile} className="mt-2 text-sm" />
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
              <div className="overflow-x-auto max-h-56 border border-gray-200 dark:border-gray-700 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 w-8">#</th>
                      {Object.keys(csvData[0]).map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                      ))}
                      <th className="px-2 py-1.5 text-left font-medium text-gray-500 w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 10).map((row, i) => {
                      const valid = rowValidations[i];
                      const hasRowIssues = valid && valid.issues.length > 0;
                      return (
                        <tr
                          key={i}
                          className={`border-b border-gray-100 dark:border-gray-700/50 ${hasRowIssues ? 'bg-red-50/50 dark:bg-red-950/20' : ''}`}
                        >
                          <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-2 py-1.5 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                              {v || <span className="text-gray-300 dark:text-gray-600 italic">—</span>}
                            </td>
                          ))}
                          <td className="px-2 py-1.5">
                            {hasRowIssues ? (
                              <span className="inline-flex items-center gap-1 text-red-500" title={valid!.issues.join('; ')}>
                                <XCircle size={12} />
                                {valid!.issues.length} err
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-500">
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
                        <td colSpan={Object.keys(csvData[0]).length + 2} className="px-2 py-2 text-center text-gray-400 text-xs">
                          ... dan {csvData.length - 10} baris lainnya
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Row-level error details */}
              {errorCount > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1.5 bg-red-50/50 dark:bg-red-950/10 rounded-xl p-3">
                  {rowValidations
                    .filter((r) => r.issues.length > 0)
                    .slice(0, 20)
                    .map((r) => (
                      <p key={r.rowIndex} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                        <AlertCircle size={12} className="mt-0.5 shrink-0" />
                        <span>
                          <strong>Baris {r.rowIndex + 2}:</strong>{' '}
                          {r.issues.join('; ')}
                        </span>
                      </p>
                    ))}
                  {errorCount > 20 && (
                    <p className="text-xs text-gray-400 text-center">
                      ... dan {errorCount - 20} masalah lainnya
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setCsvData(null)}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || hasErrors}
                  className={`px-6 py-2.5 rounded-xl text-sm font-medium transition shadow-sm flex items-center gap-2 ${
                    hasErrors
                      ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                  } disabled:opacity-50`}
                >
                  {importing ? (
                    <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg> Mengimpor...</>
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
  );
}
