'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { ArrowLeft, Save, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface Member {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
}

export default function NewDuesPage() {
  const router = useRouter();
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [periode, setPeriode] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [status, setStatus] = useState('lunas');
  const [tanggalBayar, setTanggalBayar] = useState(new Date().toISOString().split('T')[0]);
  const [metodeBayar, setMetodeBayar] = useState('manual');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);

  // Set default periode to current month
  useEffect(() => {
    const now = new Date();
    setPeriode(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  // Debounced search for members
  const debouncedSearch = useDebounce(memberSearch, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    apiClient.get('/members', {
      params: { search: debouncedSearch, limit: 10 },
    })
      .then(({ data: res }) => setSearchResults(res.data || []))
      .catch(() => { /* ignore */ })
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setError('Pilih anggota terlebih dahulu');
      return;
    }
    if (!periode) {
      setError('Periode harus diisi');
      return;
    }
    if (!jumlah || parseFloat(jumlah) <= 0) {
      setError('Jumlah harus valid');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/dues', {
        anggotaId: selectedMember.id,
        periode,
        jumlah: parseFloat(jumlah),
        status,
        tanggalBayar: status === 'lunas' ? tanggalBayar : null,
        metodeBayar,
      });
      router.push('/dues');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Gagal menyimpan iuran');
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/dues')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Tambah Iuran</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5">
        {/* Member Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anggota *</label>
          {selectedMember ? (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedMember.namaLengkap}</p>
                <p className="text-xs text-gray-500">{selectedMember.nomorAnggota}</p>
              </div>
              <button type="button" onClick={() => { setSelectedMember(null); setMemberSearch(''); }} className="text-xs text-red-500 hover:underline">Ganti</button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Cari nama atau nomor anggota..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
                {searching && <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
              </div>
              {searchResults.length > 0 && (
                <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{m.namaLengkap}</span>
                      <span className="ml-2 text-xs text-gray-400">{m.nomorAnggota}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Periode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periode *</label>
          <input
            type="month"
            value={periode}
            onChange={(e) => setPeriode(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Jumlah */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah (Rp) *</label>
          <input
            type="number"
            value={jumlah}
            onChange={(e) => setJumlah(e.target.value)}
            required
            min="0"
            step="1000"
            placeholder="50000"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="lunas">Lunas</option>
              <option value="belum_dibayar">Belum Dibayar</option>
              <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Metode Bayar</label>
            <select
              value={metodeBayar}
              onChange={(e) => setMetodeBayar(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="manual">Manual (Tunai)</option>
              <option value="transfer">Transfer</option>
              <option value="online">Online</option>
            </select>
          </div>
        </div>

        {status === 'lunas' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tanggal Bayar</label>
            <input
              type="date"
              value={tanggalBayar}
              onChange={(e) => setTanggalBayar(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => router.push('/dues')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Batal
          </button>
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition">
            <Save size={14} />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
