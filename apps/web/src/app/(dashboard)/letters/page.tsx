'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import { Plus, FileText, Search, RefreshCw } from 'lucide-react';
import type { LetterRow, LetterDetail, LetterType, TabValue } from './shared';
import { statusColors, TAB_VALUES } from './shared';
import LetterDetailPanel from './letter-detail-panel';
import LetterFormModal from './letter-form-modal';

const columns = [
  { key: 'nomorSurat', label: 'No. Surat' },
  {
    key: 'type', label: 'Tipe',
    render: (l: LetterRow) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        l.type === 'masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
      }`}>
        {l.type === 'masuk' ? 'Masuk' : 'Keluar'}
      </span>
    ),
  },
  { key: 'pengirim', label: 'Pengirim / Tujuan', render: (l: LetterRow) => l.pengirim || l.tujuan || '-' },
  { key: 'perihal', label: 'Perihal' },
  {
    key: 'tanggalSurat', label: 'Tanggal',
    render: (l: LetterRow) => {
      const date = l.tanggalSurat || l.tanggalTerima || l.tanggalKirim;
      return date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    },
  },
  {
    key: 'status', label: 'Status',
    render: (l: LetterRow) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status] || 'bg-gray-100 text-gray-600'}`}>
        {l.status || '-'}
      </span>
    ),
  },
];

export default function LettersPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [data, setData] = useState<LetterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Detail panel state
  const [selectedLetter, setSelectedLetter] = useState<LetterRow | null>(null);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<LetterType>('masuk');
  const [editLetter, setEditLetter] = useState<LetterDetail | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setPage(1); }, [tab, search, filterStatus]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint: string;
      if (tab === 'all') endpoint = '/letters';
      else if (tab === 'incoming') endpoint = '/letters/incoming';
      else endpoint = '/letters/outgoing';
      const params: Record<string, unknown> = { page, limit: 10 };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      const { data: res } = await apiClient.get(endpoint, { params });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetFilters = () => { setSearch(''); setFilterStatus(''); setPage(1); };

  const openCreate = (type: LetterType) => {
    setFormType(type);
    setEditLetter(null);
    setShowForm(true);
  };

  const openEdit = (detail: LetterDetail) => {
    setFormType((detail.type === 'masuk' || detail.type === 'keluar') ? detail.type : (detail.pengirim ? 'masuk' : 'keluar'));
    setEditLetter(detail);
    setShowForm(true);
  };

  const handleDelete = async (letter: LetterDetail) => {
    if (!confirm('Yakin ingin menghapus surat ini?')) return;
    const type = letter.type || (letter.pengirim ? 'masuk' : 'keluar');
    const endpoint = type === 'masuk' ? '/letters/incoming' : '/letters/outgoing';
    setDeleting(true);
    try {
      await apiClient.delete(`${endpoint}/${letter.id}`);
      setSelectedLetter(null);
      fetchData();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menghapus surat');
    }
    setDeleting(false);
  };

  const handleRowClick = (letter: LetterRow) => setSelectedLetter(letter);

  const closeDetail = () => setSelectedLetter(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Surat</h1>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {TAB_VALUES.map((value) => (
              <button key={value} onClick={() => setTab(value)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  tab === value
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}>
                {value === 'all' ? 'Semua' : value === 'incoming' ? 'Masuk' : 'Keluar'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openCreate('masuk')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <Plus size={14} /> Surat Masuk
          </button>
          <button onClick={() => openCreate('keluar')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            <Plus size={14} /> Surat Keluar
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-blue-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Total Surat: <strong className="text-gray-900 dark:text-white">{meta.total}</strong>
          </span>
        </div>
        <button onClick={() => fetchData()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari surat (no. surat, perihal, pengirim)..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Semua Status</option>
            {Object.keys(statusColors).map(status => (
              <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
            ))}
          </select>
          <button onClick={resetFilters}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Reset
          </button>
        </div>
      </div>

      {/* Table + Detail Panel */}
      <div className="flex gap-6">
        <div className={selectedLetter ? 'flex-1' : 'w-full'}>
          <DataTable data={data} loading={loading} page={page} totalPages={meta.totalPages}
            total={meta.total} onPageChange={setPage} columns={columns} onRowClick={handleRowClick} />
        </div>
        {selectedLetter && (
          <LetterDetailPanel selectedLetter={selectedLetter} onClose={closeDetail}
            onEdit={openEdit} onDelete={handleDelete} deleting={deleting} />
        )}
      </div>

      {/* Create/Edit Modal */}
      <LetterFormModal key={editLetter?.id || `new-${formType}`} show={showForm} onClose={() => setShowForm(false)} onSaved={() => fetchData()}
        editLetter={editLetter} formType={formType} />
    </div>
  );
}
