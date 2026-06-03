import { useState } from 'react';
import Button from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function MembersImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected?.type === 'text/csv' || selected?.name.endsWith('.csv')) {
      setFile(selected);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/members/import/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      setResult(data.data);
    } catch (e) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Import Anggota via CSV</h1>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Upload File CSV</h3>
        </div>
        <div className="p-6 pt-0 space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Drag & drop atau klik untuk memilih file CSV
            </p>
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" id="csv-input" />
            <label htmlFor="csv-input">
                <span className="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400 px-4 py-2 text-sm mt-4 cursor-pointer">
                  Pilih File
                </span>
              </label>
            {file && <p className="mt-2 text-sm font-medium">{file.name}</p>}
          </div>
          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {uploading ? 'Memproses...' : 'Import Data'}
          </Button>
        </div>
      </div>
      {error && (
        <div className="relative w-full rounded-lg border border-destructive/50 px-4 py-3 text-destructive bg-destructive/10 [&>svg]:text-destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="text-sm">{error}</div>
        </div>
      )}
      {result && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold leading-none tracking-tight flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" /> Import Selesai
            </h3>
          </div>
          <div className="p-6 pt-0 grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{result.success}</p>
              <p className="text-sm text-green-600">Berhasil</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-700">{result.incomplete}</p>
              <p className="text-sm text-yellow-600">Tidak Lengkap</p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-700">{result.errors}</p>
              <p className="text-sm text-red-600">Error</p>
            </div>
          </div>
        </div>
      )}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-col space-y-1.5 p-6">
          <h3 className="font-semibold leading-none tracking-tight">Format CSV</h3>
        </div>
        <div className="p-6 pt-0">
          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
{`nama,jenis_kelamin,no_hp,email,alamat,tempat_lahir,tanggal_lahir,tingkat
Budi Santoso,L,081234567890,budi@email.com,Jl. Merdeka 1,Jakarta,1990-01-01,Penggalang`}
          </pre>
          <p className="mt-2 text-sm text-muted-foreground">
            Kolom <code>nama</code> wajib. Baris yang tidak lengkap akan ditandai sebagai <code>incomplete</code> dan anggota akan menerima notifikasi FCM.
          </p>
        </div>
      </div>
    </div>
  );
}
