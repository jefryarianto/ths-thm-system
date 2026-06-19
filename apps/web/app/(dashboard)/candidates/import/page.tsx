'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, Download } from 'lucide-react';

export default function ImportCandidatesPage() {
  const router = useRouter();
  const [result, setResult] = useState<{ success: number; errors: number; details: any[] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [csvData, setCsvData] = useState<any[] | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });
      setCsvData(data);
      setError('');
    } catch {
      setError('Gagal membaca file CSV');
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
      setError((err as any)?.response?.data?.message || 'Gagal import');
    }
    setImporting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/candidates')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
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
              <p className="text-sm text-gray-500">{csvData.length} baris data siap diimport</p>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {Object.keys(csvData[0]).map(h => <th key={h} className="px-2 py-1 text-left font-medium text-gray-500">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b">
                        {Object.values(row).map((v, j) => <td key={j} className="px-2 py-1 text-gray-700">{v as string}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setCsvData(null)} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                <button onClick={handleImport} disabled={importing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                  {importing ? 'Mengimpor...' : `Import ${csvData.length} Data`}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
