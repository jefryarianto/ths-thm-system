'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api-client';
import { Plus, Edit3, Trash2, RefreshCw, Users, Search, Download, Upload, Calendar, ArrowUpDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import Modal from '@/components/ui/modal';
import MemberSearchPicker from '@/components/members/MemberSearchPicker';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-modal';

interface Kepengurusan {
  id: string;
  userId: string;
  jabatanId: string;
  periodeId: string;
  distrikId: string | null;
  wilayahId: string | null;
  rantingId: string | null;
  parentId: string | null;
  startDate: string | null;
  endDate: string | null;
  user: { id: string; namaLengkap: string; email: string };
  jabatan: { id: string; nama: string; urutan: number };
  periode: { id: string; nama: string; isActive: boolean };
  distrik: { id: string; nama: string } | null;
  wilayah: { id: string; nama: string } | null;
  ranting: { id: string; nama: string } | null;
  parent: { id: string; user: { namaLengkap: string }; jabatan: { nama: string } } | null;
  children: { id: string; user: { namaLengkap: string }; jabatan: { nama: string } }[];
  status?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

type Level = 'nasional' | 'distrik' | 'wilayah' | 'ranting';

export default function KepengurusanPage() {
  const toast = useToast();
  const { confirm, confirmModal } = useConfirm();
  const [data, setData] = useState<Kepengurusan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState<Kepengurusan | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter state
  const [level, setLevel] = useState<Level>('distrik');
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');
  const [periodeId, setPeriodeId] = useState('');

  // Dropdown data
  const [distriks, setDistriks] = useState<{ id: string; nama: string }[]>([]);
  const [wilayahs, setWilayahs] = useState<{ id: string; nama: string }[]>([]);
  const [rantings, setRantings] = useState<{ id: string; nama: string }[]>([]);
  const [periodes, setPeriodes] = useState<{ id: string; nama: string; isActive: boolean }[]>([]);
  const [jabatans, setJabatans] = useState<{ id: string; nama: string; urutan: number }[]>([]);

  // Form state
  const INITIAL_FORM = {
    userId: '',
    anggotaId: '',
    selectedMemberName: '',
    jabatanId: '',
    periodeId: '',
    parentId: '',
    startDate: '',
    endDate: '',
  };
  const [form, setForm] = useState(INITIAL_FORM);

  // Import state
  const [importing, setImporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingCount, setPendingCount] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  // Load dropdowns
  useEffect(() => {
    apiClient.get('/org-structure/distrik').then(({ data }) => setDistriks(data.data || [])).catch(() => {});
    apiClient.get('/periode').then(({ data }) => {
      setPeriodes(data.data || []);
      const active = (data.data || []).find((p: any) => p.isActive);
      if (active) setPeriodeId(active.id);
    }).catch(() => {});
    apiClient.get('/jabatan').then(({ data }) => setJabatans(data.data || [])).catch(() => {});
  }, []);

  // Load wilayahs
  useEffect(() => {
    if (!distrikId) { setWilayahs([]); return; }
    apiClient.get(`/org-structure/wilayah?distrikId=${distrikId}`).then(({ data }) => setWilayahs(data.data || [])).catch(() => {});
  }, [distrikId]);

  // Load rantings
  useEffect(() => {
    if (!wilayahId) { setRantings([]); return; }
    apiClient.get(`/org-structure/ranting?wilayahId=${wilayahId}`).then(({ data }) => setRantings(data.data || [])).catch(() => {});
  }, [wilayahId]);

  // Fetch kepengurusan data
  useEffect(() => {
    apiClient.get('/kepengurusan', { params: { status: 'pending' } })
      .then(({ data: res }) => { setPendingCount((res.data || []).length); })
      .catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (level) params.level = level;
      const unitId = level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : level === 'distrik' ? distrikId : undefined;
      if (unitId) params.unitId = unitId;
      if (periodeId) params.periodeId = periodeId;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data: res } = await apiClient.get('/kepengurusan', { params });
      setData(res.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [level, distrikId, wilayahId, rantingId, periodeId, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getUnitName = (item: Kepengurusan) => {
    return item.ranting?.nama || item.wilayah?.nama || item.distrik?.nama || 'Nasional';
  };

  const getLevelTag = (item: Kepengurusan) => {
    if (item.rantingId) return 'Ranting';
    if (item.wilayahId) return 'Wilayah';
    if (item.distrikId) return 'Distrik';
    return 'Nasional';
  };

  const isExpired = (item: Kepengurusan) => {
    return item.endDate && new Date(item.endDate) < new Date();
  };

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.user.namaLengkap.toLowerCase().includes(q) || item.jabatan.nama.toLowerCase().includes(q) || getUnitName(item).toLowerCase().includes(q);
  });

  const handleSave = async () => {
    if (!form.userId && !form.anggotaId) return toast('error', 'Pilih pengurus / anggota');
    if (!form.jabatanId) return toast('error', 'Pilih jabatan');
    if (!form.periodeId && !periodeId) return toast('error', 'Pilih periode');

    try {
      const unitId = level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : distrikId;
      const payload: Record<string, string | null> = {
        userId: form.userId || null,
        anggotaId: form.anggotaId || null,
        jabatanId: form.jabatanId,
        periodeId: form.periodeId || periodeId,
        parentId: form.parentId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (level === 'distrik') payload.distrikId = unitId;
      else if (level === 'wilayah') payload.wilayahId = unitId;
      else if (level === 'ranting') payload.rantingId = unitId;

      if (editData) {
        await apiClient.patch(`/kepengurusan/${editData.id}`, {
          userId: form.userId || undefined,
          anggotaId: form.anggotaId || undefined,
          jabatanId: form.jabatanId,
          parentId: form.parentId || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
        });
        toast('success', 'Kepengurusan dikirim untuk persetujuan');
      } else {
        await apiClient.post('/kepengurusan', payload);
        toast('success', 'Kepengurusan dikirim untuk persetujuan');
      }
      setShowModal(false);
      setEditData(null);
      setForm(INITIAL_FORM);
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async (item: Kepengurusan) => {
    const ok = await confirm({ title: `Hapus ${item.user.namaLengkap} sebagai ${item.jabatan.nama}?`, message: item.children.length > 0 ? `Masih ada ${item.children.length} bawahan` : '' });
    if (!ok) return;
    try {
      await apiClient.delete(`/kepengurusan/${item.id}`);
      toast('success', 'Penghapusan menunggu persetujuan');
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menghapus');
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await apiClient.patch(`/kepengurusan/${id}/approve`);
      toast('success', 'Berhasil disetujui');
      fetchData();
      setPendingCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menyetujui');
    }
    setApprovingId(null);
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Alasan penolakan (opsional):');
    setApprovingId(id);
    try {
      await apiClient.patch(`/kepengurusan/${id}/reject`, { reason: reason || '' });
      toast('success', 'Berhasil ditolak');
      fetchData();
      setPendingCount((c) => Math.max(0, c - 1));
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menolak');
    }
    setApprovingId(null);
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const ok = await confirm({ title: 'Setujui ' + selectedIds.size + ' item?', message: 'Semua item yang dipilih akan disetujui.' });
    if (!ok) return;
    setBulkApproving(true);
    try {
      await apiClient.post('/kepengurusan/bulk-approve', { ids: Array.from(selectedIds) });
      toast('success', selectedIds.size + ' item berhasil disetujui');
      setSelectedIds(new Set());
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menyetujui');
    }
    setBulkApproving(false);
  };

  // Bulk reject
  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;
    const reason = prompt('Alasan penolakan (opsional):');
    setBulkApproving(true);
    try {
      await apiClient.post('/kepengurusan/bulk-reject', { ids: Array.from(selectedIds), reason: reason || '' });
      toast('success', selectedIds.size + ' item berhasil ditolak');
      setSelectedIds(new Set());
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal menolak');
    }
    setBulkApproving(false);
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pendingItems = filteredData.filter((item) => item.status === 'pending' || item.status === 'pending_deletion');
    if (selectedIds.size === pendingItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingItems.map((item) => item.id)));
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      const params: Record<string, string> = {};
      if (level) params.level = level;
      const unitId = level === 'ranting' ? rantingId : level === 'wilayah' ? wilayahId : level === 'distrik' ? distrikId : undefined;
      if (unitId) params.unitId = unitId;
      if (periodeId) params.periodeId = periodeId;
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data: res } = await apiClient.get('/kepengurusan/export', { params });
      const { headers, rows } = res.data || res;
      const csv = [headers.join(','), ...rows.map((r: Record<string, string>) => headers.map((h: string) => `"${(r[h.toLowerCase()] || '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `kepengurusan-${new Date().toISOString().split('T')[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast('success', 'Export berhasil');
    } catch (e: any) {
      toast('error', e?.response?.data?.message || 'Gagal export');
    }
  };

  // Import CSV
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) throw new Error('File kosong atau tidak ada data');
      const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });
      const { data: res } = await apiClient.post('/kepengurusan/import', { rows });
      const result = res.data || res;
      toast('success', `Import selesai: ${result.created} ditambahkan, ${result.skipped} dilewati`);
      if (result.errors?.length > 0) {
        toast('error', `${result.errors.length} error: ${result.errors.slice(0, 3).join('; ')}`);
      }
      fetchData();
    } catch (e: any) {
      toast('error', e?.response?.data?.message || e.message || 'Gagal import');
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <PageContainer>
      <PageHeader title="Kepengurusan" subtitle="Kelola struktur kepengurusan organisasi" />

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value as Level)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="nasional">Nasional</option>
              <option value="distrik">Distrik</option>
              <option value="wilayah">Wilayah</option>
              <option value="ranting">Ranting</option>
            </select>
          </div>
          {(level === 'distrik' || level === 'wilayah' || level === 'ranting') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Distrik</label>
              <select value={distrikId} onChange={(e) => setDistrikId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Semua</option>
                {distriks.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
            </div>
          )}
          {(level === 'wilayah' || level === 'ranting') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Wilayah</label>
              <select value={wilayahId} onChange={(e) => setWilayahId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Semua</option>
                {wilayahs.map((w) => <option key={w.id} value={w.id}>{w.nama}</option>)}
              </select>
            </div>
          )}
          {level === 'ranting' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Ranting</label>
              <select value={rantingId} onChange={(e) => setRantingId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Semua</option>
                {rantings.map((r) => <option key={r.id} value={r.id}>{r.nama}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Periode</label>
            <select value={periodeId} onChange={(e) => setPeriodeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Semua</option>
              {periodes.map((p) => <option key={p.id} value={p.id}>{p.nama} {p.isActive ? '(Aktif)' : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="all">Semua</option>
              <option value="approved">Disetujui</option>
              <option value="pending">Menunggu</option>
              <option value="rejected">Ditolak</option>
              <option value="pending_deletion">Hapus Dijadwalkan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex-1 min-w-0 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Cari nama atau jabatan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
          <Download size={16} /> Export
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
        <button onClick={() => fileInputRef.current?.click()} disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Upload size={16} /> {importing ? 'Importing...' : 'Import'}
        </button>
        {pendingCount > 0 && statusFilter === 'all' && (
          <button onClick={() => setStatusFilter('pending')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium">
            <AlertCircle size={16} /> {pendingCount} Menunggu Persetujuan
          </button>
        )}
        <button onClick={() => { setEditData(null); setForm(INITIAL_FORM); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
          <Plus size={16} /> Tambah
        </button>
        <button onClick={fetchData} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {selectedIds.size} item dipilih
          </span>
          <button onClick={handleBulkApprove} disabled={bulkApproving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            <CheckCircle size={16} /> {bulkApproving ? 'Memproses...' : 'Setujui Semua'}
          </button>
          <button onClick={handleBulkReject} disabled={bulkApproving}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
            <XCircle size={16} /> {bulkApproving ? 'Memproses...' : 'Tolak Semua'}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            Batal Pilihan
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Memuat data...</div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Tidak ada data kepengurusan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 w-10">
                    <input
                      type="checkbox"
                      checked={filteredData.filter((i) => i.status === 'pending' || i.status === 'pending_deletion').length > 0 && selectedIds.size === filteredData.filter((i) => i.status === 'pending' || i.status === 'pending_deletion').length}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Jabatan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Level</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Periode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredData.map((item) => (
                  <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isExpired(item) ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 w-10">
                      {(item.status === 'pending' || item.status === 'pending_deletion') && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{item.user.namaLengkap}</div>
                      {item.parent && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <ArrowUpDown size={10} className="inline mr-1" />
                          Bawahan dari {item.parent.user.namaLengkap}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.jabatan.nama}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.rantingId ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                        item.wilayahId ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                        item.distrikId ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>{getLevelTag(item)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{getUnitName(item)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.periode.nama}</td>
                    <td className="px-4 py-3">
                      {item.status === 'pending' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">Menunggu</span>
                      ) : item.status === 'rejected' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Ditolak</span>
                      ) : item.status === 'pending_deletion' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Hapus Dijadwalkan</span>
                      ) : isExpired(item) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">Selesai</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Aktif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {(item.status === 'pending' || item.status === 'pending_deletion') && (
                        <>
                          <button onClick={() => handleApprove(item.id)} disabled={approvingId === item.id}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 disabled:opacity-50" title="Setujui">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => handleReject(item.id)} disabled={approvingId === item.id}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 disabled:opacity-50" title="Tolak">
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      <button onClick={() => {
                        setEditData(item);
                        setForm({
                          userId: item.userId,
                          anggotaId: '',
                          selectedMemberName: item.user.namaLengkap,
                          jabatanId: item.jabatanId,
                          periodeId: item.periodeId,
                          parentId: item.parentId || '',
                          startDate: item.startDate ? item.startDate.split('T')[0] : '',
                          endDate: item.endDate ? item.endDate.split('T')[0] : '',
                        });
                        setShowModal(true);
                      }} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-800 dark:text-red-400">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setEditData(null); }} title={editData ? 'Edit Kepengurusan' : 'Tambah Kepengurusan'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pilih Anggota / Pengurus <span className="text-red-500">*</span>
            </label>
            {editData && !form.anggotaId ? (
              <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {form.selectedMemberName || 'Pengurus Terpilih'}
                </span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, userId: '', selectedMemberName: '' })}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Ganti Anggota
                </button>
              </div>
            ) : (
              <MemberSearchPicker
                value={form.anggotaId}
                onChange={(member) => {
                  setForm({
                    ...form,
                    anggotaId: member ? member.id : '',
                    userId: member ? member.id : '',
                    selectedMemberName: member ? member.namaLengkap : '',
                  });
                }}
                placeholder="Cari nama anggota, NRA, atau email..."
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jabatan</label>
            <select value={form.jabatanId} onChange={(e) => setForm({ ...form, jabatanId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Pilih Jabatan</option>
              {jabatans.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Periode</label>
            <select value={form.periodeId} onChange={(e) => setForm({ ...form, periodeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">Pilih Periode</option>
              {periodes.map((p) => <option key={p.id} value={p.id}>{p.nama} {p.isActive ? '(Aktif)' : ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar size={12} className="inline mr-1" /> Tanggal Mulai
              </label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar size={12} className="inline mr-1" /> Tanggal Selesai
              </label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => { setShowModal(false); setEditData(null); }}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Batal</button>
            <button onClick={handleSave}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
              {editData ? 'Update' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>
      {confirmModal}
    </PageContainer>
  );
}
