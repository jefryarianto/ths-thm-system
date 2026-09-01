'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import apiClient from '@/lib/api-client';
import { useFilters } from '@/lib/hooks/use-filters';
import DataTable from '@/components/ui/data-table';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import SummaryBar from '@/components/ui/summary-bar';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { FileText, ExternalLink } from 'lucide-react';
import { CanCreate } from '@/components/auth/can';
import { PermissionGuard } from '@/components/auth/permission-guard';
import type { LetterRow, TabValue } from './shared';
import Link from 'next/link';
import { statusColors, TAB_VALUES } from './shared';
import LetterDetailPanel from './letter-detail-panel';
import { useToast } from '@/components/ui/toast';


const columns = [
  { key: 'nomorSurat', label: 'No. Surat' },
  {
    key: 'type',
    label: 'Tipe',
    render: (l: LetterRow) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          l.type === 'masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
        }`}
      >
        {l.type === 'masuk' ? 'Masuk' : 'Keluar'}
      </span>
    ),
  },
  {
    key: 'pengirim',
    label: 'Pengirim / Tujuan',
    render: (l: LetterRow) => l.pengirim || l.tujuan || '-',
  },
  { key: 'perihal', label: 'Perihal' },
  {
    key: 'tanggalSurat',
    label: 'Tanggal',
    render: (l: LetterRow) => {
      const date = l.tanggalSurat || l.tanggalTerima || l.tanggalKirim;
      return date
        ? new Date(date).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : '-';
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (l: LetterRow) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status] || 'bg-gray-100 text-gray-600'}`}
      >
        {l.status || '-'}
      </span>
    ),
  },
];

export default function LettersPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [tab, setTab] = useState<TabValue>('all');
  const [data, setData] = useState<LetterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    hasActiveFilters: _hasActiveFilters,
    getApiParams,
    resetFilters,
  } = useFilters({
    filters: [{ key: 'status', defaultValue: '' }],
  });

  // Detail panel state
  const [selectedLetter, setSelectedLetter] = useState<LetterRow | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint: string;
      if (tab === 'all') endpoint = '/letters';
      else if (tab === 'incoming') endpoint = '/letters/incoming';
      else endpoint = '/letters/outgoing';
      const params = getApiParams({ limit: 10 });
      if (search) params.search = search;
      if (filters.status) params.status = filters.status;
      const { data: res } = await apiClient.get(endpoint, { params });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch {
      /* ignore */
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, search, filters.status]);

  const handleDelete = async (letter: import('./shared').LetterDetail) => {
    if (!(await confirm('Yakin ingin menghapus surat ini?'))) return;
    const type = letter.type || (letter.pengirim ? 'masuk' : 'keluar');
    const endpoint = type === 'masuk' ? '/letters/incoming' : '/letters/outgoing';
    setDeleting(true);
    try {
      await apiClient.delete(`${endpoint}/${letter.id}`);
      setSelectedLetter(null);
      fetchData();
    } catch (err: unknown) {
       toast('error',
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Gagal menghapus surat');
    }
    setDeleting(false);
  };

  const handleRowClick = (letter: LetterRow) => setSelectedLetter(letter);

  const closeDetail = () => setSelectedLetter(null);

  return (
    <PermissionGuard module="letters" action="view">
    <PageContainer>
      <PageHeader title="Surat" onRefresh={fetchData}>
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 mr-3">
          {TAB_VALUES.map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`px-3 py-1.5 text-sm rounded-md transition ${
                tab === value
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {value === 'all' ? 'Semua' : value === 'incoming' ? 'Masuk' : 'Keluar'}
            </button>
          ))}
        </div>
        <CanCreate module="letters">
          <Link
            href="/letters/incoming/new"
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <ExternalLink size={14} /> Surat Masuk
          </Link>
        </CanCreate>
        <CanCreate module="letters">
          <Link
            href="/letters/outgoing/new"
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <ExternalLink size={14} /> Surat Keluar
          </Link>
        </CanCreate>
      </PageHeader>

      <SummaryBar icon={FileText} label="Total Surat" total={meta.total} onRefresh={fetchData} />

      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari surat (no. surat, perihal, pengirim)..."
      >
        <FilterSelect
          value={filters.status}
          onChange={(v) => setFilter('status', v)}
          options={Object.keys(statusColors).map((status) => ({
            value: status,
            label: status.charAt(0).toUpperCase() + status.slice(1),
          }))}
          placeholder="Semua Status"
        />
      </SearchBar>

      {/* Table + Detail Panel */}
      <div className="flex gap-6">
        <div className={selectedLetter ? 'flex-1' : 'w-full'}>
          <DataTable
            data={data}
            loading={loading}
            page={page}
            totalPages={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
            columns={columns}
            onRowClick={handleRowClick}
            empty={{ icon: FileText, message: 'Tidak ada surat' }}
          />
        </div>
        {selectedLetter && (
          <LetterDetailPanel
            selectedLetter={selectedLetter}
            onClose={closeDetail}
            onDelete={handleDelete}
            deleting={deleting}
          />
        )}
      </div>

      {/* Create/Edit via dedicated pages: /letters/incoming/new, /letters/outgoing/new */}
      {confirmModal}
    </PageContainer>
    </PermissionGuard>
  );
}
