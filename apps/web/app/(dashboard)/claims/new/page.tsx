'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { ArrowLeft, Save, Search, RefreshCw } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';

interface Member {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
}

export default function NewClaimPage() {
  const router = useRouter();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [tipe, setTipe] = useState('sertifikat');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  // Debounced search for members
  const debouncedSearch = useDebounce(memberSearch, 300);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    apiClient.get('/members', { params: { search: debouncedSearch, limit: 10 } })
      .then(({ data: res }) => setSearchResults(res.data || []))
      .catch(() => {})
      .finally(() => setSearching(false));
  }, [debouncedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      alert('Pilih anggota terlebih dahulu');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/claims', {
        anggotaId: selectedMember.id,
        tipe,
        catatan: catatan || undefined,
      });
      router.push('/claims');
    } catch {
      alert('Gagal menyimpan');
    }
    setSaving(false);
  };

  return (
      <PermissionGuard module="claims" action="create">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/claims')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                  <ArrowLeft size={18} className="text-gray-500" />
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Klaim Baru</h1>
              </div>
        
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
        
                {/* Tipe Klaim */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipe Klaim</label>
                  <select value={tipe} onChange={(e) => setTipe(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="sertifikat">Sertifikat</option>
                    <option value="piagam">Piagam</option>
                    <option value="kartu_anggota">Kartu Anggota</option>
                    <option value="dokumen_lainnya">Dokumen Lainnya</option>
                  </select>
                </div>
        
                {/* Catatan */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                  <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                </div>
        
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => router.push('/claims')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    Batal
                  </button>
                  <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    <Save size={14} /> {saving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
