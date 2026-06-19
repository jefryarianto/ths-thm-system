'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { Download, Filter } from 'lucide-react';

interface OrgItem { id: string; nama: string; kodeDistrik?: string; kodeWilayah?: string; kodeRanting?: string; }

interface MemberReport {
  id: string;
  nomorAnggota: string;
  namaLengkap: string;
  jenisKelamin: string;
  tempatLahir?: string;
  tanggalLahir?: string;
  tempatDadar?: string;
  tahunDadar?: string;
  tingkat?: string;
  statusKeanggotaan: string;
  email?: string;
  noHp?: string;
  ranting?: { id: string; nama: string };
}

export default function MembersReportPage() {
  const router = useRouter();
  const [distriks, setDistriks] = useState<OrgItem[]>([]);
  const [wilayahs, setWilayahs] = useState<OrgItem[]>([]);
  const [rantings, setRantings] = useState<OrgItem[]>([]);
  const [members, setMembers] = useState<MemberReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ distrikId: '', wilayahId: '', rantingId: '' });

  useEffect(() => {
    apiClient.get('/org-structure/distrik').then(({ data }) => setDistriks(data.data || [])).catch(() => {});
  }, []);

  const loadWilayahs = async (distrikId: string) => {
    if (!distrikId) { setWilayahs([]); return; }
    const { data } = await apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`);
    setWilayahs(data.data || []);
  };

  const loadRantings = async (wilayahId: string) => {
    if (!wilayahId) { setRantings([]); return; }
    const { data } = await apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`);
    setRantings(data.data || []);
  };

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '200' };
      if (filters.rantingId) params.rantingId = filters.rantingId;
      const { data } = await apiClient.get('/members', { params });
      setMembers(data.data || []);
    } catch { setMembers([]); }
    setLoading(false);
  };

  const exportCsv = () => {
    const header = ['NRA', 'Nama', 'Jenis Kelamin', 'TTL', 'Tempat-Tahun Dadar', 'Ranting', 'Tingkat', 'Status', 'Email', 'No. HP'];
    const rows = members.map(m => [
      m.nomorAnggota, m.namaLengkap, m.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      [m.tempatLahir, m.tanggalLahir ? new Date(m.tanggalLahir).toLocaleDateString('id-ID') : ''].filter(Boolean).join(', '),
      [m.tempatDadar, m.tahunDadar].filter(Boolean).join(' - '),
      m.ranting?.nama || '-', m.tingkat || '-', m.statusKeanggotaan, m.email || '', m.noHp || '',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `laporan-anggota-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Laporan Anggota per Ranting</h1>
          <p className="text-sm text-gray-500">Filter anggota berdasarkan struktur organisasi</p>
        </div>
        {members.length > 0 && (
          <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 transition">
            <Download size={14} /> Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Distrik</label>
            <select value={filters.distrikId} onChange={async (e) => {
              const v = e.target.value;
              setFilters({ distrikId: v, wilayahId: '', rantingId: '' });
              await loadWilayahs(v);
              setRantings([]);
            }} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Semua Distrik</option>
              {distriks.map(d => <option key={d.id} value={d.id}>{d.nama} ({d.kodeDistrik})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Wilayah</label>
            <select value={filters.wilayahId} onChange={async (e) => {
              const v = e.target.value;
              setFilters(prev => ({ ...prev, wilayahId: v, rantingId: '' }));
              await loadRantings(v);
            }} disabled={!filters.distrikId} className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
              <option value="">Semua Wilayah</option>
              {wilayahs.map(w => <option key={w.id} value={w.id}>{w.nama} ({w.kodeWilayah})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Ranting</label>
            <select value={filters.rantingId} onChange={(e) => setFilters(prev => ({ ...prev, rantingId: e.target.value }))}
              disabled={!filters.wilayahId} className="w-full px-3 py-2 border rounded-lg text-sm disabled:opacity-50">
              <option value="">Semua Ranting</option>
              {rantings.map(r => <option key={r.id} value={r.id}>{r.nama} ({r.kodeRanting})</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button onClick={fetchMembers} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Filter size={14} /> Tampilkan
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-sm text-gray-400">Memuat data...</div>
      ) : members.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500">{members.length} anggota ditemukan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-2 font-medium text-gray-500">NRA</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Nama</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 hidden md:table-cell">TTL</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 hidden lg:table-cell">Dadar</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500 hidden md:table-cell">Ranting</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Tingkat</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer" onClick={() => router.push(`/members/${m.id}`)}>
                    <td className="px-4 py-2 font-mono text-xs">{m.nomorAnggota}</td>
                    <td className="px-4 py-2 font-medium">{m.namaLengkap}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 hidden md:table-cell">
                      {[m.tempatLahir, m.tanggalLahir ? new Date(m.tanggalLahir).toLocaleDateString('id-ID') : null].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 hidden lg:table-cell">
                      {[m.tempatDadar, m.tahunDadar].filter(Boolean).join(' - ') || '-'}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 hidden md:table-cell">{m.ranting?.nama || '-'}</td>
                    <td className="px-4 py-2 text-xs">{m.tingkat || '-'}</td>
                    <td className="px-4 py-2"><span className="text-xs capitalize">{m.statusKeanggotaan}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-sm text-gray-400">Pilih filter dan klik Tampilkan untuk melihat data</div>
      )}
    </div>
  );
}
