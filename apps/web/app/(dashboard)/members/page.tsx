'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Member } from '@/types';
import { Plus, Download, Upload, Users } from 'lucide-react';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { StatCardGridSkeleton } from '@/components/ui/skeletons';
import MemberActions from '@/components/members/MemberActions';
import MemberStatCards from '@/components/members/MemberStatCards';
import { StatusBadge, STATUS_LABELS, formatDate } from '@/components/members/constants';

// ─── Page ───

export default function MembersPage() {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ total: 0, aktif: 0, pendingValidasi: 0, incomplete: 0 });

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    hasActiveFilters,
    getApiParams,
    resetFilters,
  } = useFilters({
    filters: [
      { key: 'statusKeanggotaan', defaultValue: '' },
      { key: 'statusData', defaultValue: '' },
      { key: 'statusValidasi', defaultValue: '' },
    ],
  });
  const debouncedSearch = useDebounce(search, 300);

  const {
    data: members,
    meta,
    loading,
    error,
    refetch,
  } = usePaginatedList<Member>(() => {
    const params = getApiParams({ limit: 15 });
    if (debouncedSearch) params.search = debouncedSearch;
    else delete params.search;
    if (filters.statusKeanggotaan) params.statusKeanggotaan = filters.statusKeanggotaan;
    if (filters.statusData) params.statusData = filters.statusData;
    if (filters.statusValidasi) params.statusValidasi = filters.statusValidasi;
    return apiClient.get('/members', { params }).then((r) => r.data);
  }, [
    page,
    debouncedSearch,
    filters.statusKeanggotaan,
    filters.statusData,
    filters.statusValidasi,
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/reports/dashboard');
      const d = res.data;
      setStats({
        total: d.totalMembers || 0,
        aktif: d.memberStatus?.find((s: { status: string }) => s.status === 'aktif')?.count || 0,
        pendingValidasi: d.pendingValidasi || 0,
        incomplete: d.incompleteData || 0,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Actions ───

  const handleAction = async (id: string, action: string) => {
    setActionLoading(id);
    try {
      if (action === 'suspend' || action === 'reactivate') {
        await apiClient.patch(`/members/${id}/${action}`, {});
      } else {
        await apiClient.post(`/members/${id}/${action}`, {});
      }
      refetch();
      fetchStats();
    } catch {
      /* ignore */
    }
    setActionLoading(null);
  };

  // ─── Column Definitions ───

  const columns = [
    {
      key: 'nomorAnggota',
      label: 'No. Anggota',
      render: (m: Member) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{m.nomorAnggota}</span>
      ),
    },
    {
      key: 'namaLengkap',
      label: 'Nama',
      render: (m: Member) => (
        <span className="font-medium text-gray-900 dark:text-white">{m.namaLengkap}</span>
      ),
    },
    {
      key: 'jenisKelamin',
      label: 'JK',
      hidden: 'hidden sm:table-cell',
      render: (m: Member) => (
        <span className="text-gray-600 dark:text-gray-400">{m.jenisKelamin}</span>
      ),
    },
    {
      key: 'noHp',
      label: 'No. HP',
      hidden: 'hidden md:table-cell',
      render: (m: Member) => (
        <span className="text-gray-600 dark:text-gray-400">{m.noHp || '-'}</span>
      ),
    },
    {
      key: 'ranting',
      label: 'Ranting',
      hidden: 'hidden lg:table-cell',
      render: (m: Member) => <span className="text-gray-500">{m.ranting?.nama || '-'}</span>,
    },
    {
      key: 'statusKeanggotaan',
      label: 'Status',
      render: (m: Member) => (
        <StatusBadge status={m.statusKeanggotaan} labels={STATUS_LABELS.keanggotaan} />
      ),
    },
    {
      key: 'statusData',
      label: 'Data',
      render: (m: Member) => <StatusBadge status={m.statusData} labels={STATUS_LABELS.data} />,
    },
    {
      key: 'statusValidasi',
      label: 'Validasi',
      render: (m: Member) => (
        <StatusBadge status={m.statusValidasi} labels={STATUS_LABELS.validasi} />
      ),
    },
    {
      key: 'createdAt',
      label: 'Tgl Daftar',
      hidden: 'hidden md:table-cell',
      render: (m: Member) => (
        <span className="text-xs text-gray-500">{formatDate(m.createdAt)}</span>
      ),
    },
  ];

  // ─── Render ───

  return (
    <PageContainer>
      <PageHeader title="Anggota" onRefresh={refetch}>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <Upload size={14} /> Import
        </button>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <Download size={14} /> Export
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          <Plus size={16} /> Tambah
        </button>
      </PageHeader>

      {/* Stats Cards */}
      {!stats.total ? <StatCardGridSkeleton count={4} /> : <MemberStatCards stats={stats} />}

      {/* Search & Filter Bar */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        onReset={resetFilters}
        placeholder="Cari nama, nomor anggota, email..."
      >
        <FilterSelect
          value={filters.statusKeanggotaan}
          onChange={(v) => setFilter('statusKeanggotaan', v)}
          options={[
            { value: 'aktif', label: 'Aktif' },
            { value: 'nonaktif', label: 'Nonaktif' },
            { value: 'pindah', label: 'Pindah' },
            { value: 'keluar', label: 'Keluar' },
            { value: 'meninggal', label: 'Meninggal' },
          ]}
          placeholder="Semua Status"
        />
        <FilterSelect
          value={filters.statusData}
          onChange={(v) => setFilter('statusData', v)}
          options={[
            { value: 'complete', label: 'Lengkap' },
            { value: 'incomplete', label: 'Belum Lengkap' },
          ]}
          placeholder="Semua Data"
        />
        <FilterSelect
          value={filters.statusValidasi}
          onChange={(v) => setFilter('statusValidasi', v)}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Disetujui' },
            { value: 'rejected', label: 'Ditolak' },
          ]}
          placeholder="Semua Validasi"
        />
      </SearchBar>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refetch} className="underline hover:no-underline text-xs">
            Coba lagi
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        empty={{
          icon: Users,
          message: hasActiveFilters
            ? 'Tidak ada anggota yang cocok dengan filter'
            : 'Belum ada anggota terdaftar',
          action: hasActiveFilters ? { label: 'Reset filter', onClick: resetFilters } : undefined,
        }}
        page={page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={(p) => {
          if (p >= 1 && p <= meta.totalPages) setPage(p);
        }}
        actions={(m: Member) => (
          <MemberActions
            member={m}
            actionLoading={actionLoading}
            onAction={handleAction}
            onViewDetail={(id) => router.push(`/members/${id}`)}
          />
        )}
      />
    </PageContainer>
  );
}
