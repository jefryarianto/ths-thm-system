'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Member } from '@/types';
import { Plus, Upload, Users } from 'lucide-react';
import ExportMenu from '@/components/ui/export-menu';
import { CanCreate, CanExport } from '@/components/auth/can';
import { PermissionGuard } from '@/components/auth/permission-guard';
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
      { key: 'distrikId', defaultValue: '' },
      { key: 'wilayahId', defaultValue: '' },
      { key: 'rantingId', defaultValue: '' },
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
    filters.distrikId,
    filters.wilayahId,
    filters.rantingId,
  ]);

  interface OrgNode { id: string; name: string; children?: OrgNode[]; }
  interface OrgChartResp { data?: { tree?: OrgNode[] }; }

  const [distrikOptions, setDistrikOptions] = useState<{ value: string; label: string }[]>([]);
  const [wilayahOptions, setWilayahOptions] = useState<{ value: string; label: string }[]>([]);
  const [rantingOptions, setRantingOptions] = useState<{ value: string; label: string }[]>([]);

  const loadOrgChart = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get<OrgChartResp>('/org-chart');
      const tree = res?.data?.tree ?? [];
      // Assumes a single Nasional root with children = distriks
      const distriks = tree.flatMap(n => n.children ?? []);
      setDistrikOptions(distriks.map(d => ({ value: d.id, label: d.name })));

      // Populate wilayahs for selected distrik
      const selDistrik = distriks.find(d => d.id === filters.distrikId);
      const wil = selDistrik?.children ?? [];
      setWilayahOptions(wil.map(w => ({ value: w.id, label: w.name })));

      // Populate rantings for selected wilayah
      const selWilayah = wil.find(w => w.id === filters.wilayahId);
      const rant = selWilayah?.children ?? [];
      setRantingOptions(rant.map(r => ({ value: r.id, label: r.name })));
    } catch {
      /* ignore */
    }
  }, [filters.distrikId, filters.wilayahId]);

  useEffect(() => {
    loadOrgChart();
  }, [loadOrgChart]);

  // ─── Fetch stats ───
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

  const formatTtl = (m: Member) => {
    const parts = [m.tempatLahir, m.tanggalLahir ? formatDate(m.tanggalLahir) : null].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  const formatDadar = (m: Member) => {
    if (m.tempatDadar && m.tahunDadar) return `${m.tempatDadar} - ${m.tahunDadar}`;
    if (m.tempatDadar) return m.tempatDadar;
    if (m.tahunDadar) return m.tahunDadar;
    return '-';
  };

  const columns = [
    {
      key: 'namaLengkap',
      label: 'Nama',
      render: (m: Member) => (
        <div className="flex items-center gap-2">
          {m.fotoPath ? (
            <img src={`/api/uploads/${m.fotoPath}`} alt="" className="w-8 h-8 rounded-full object-cover bg-gray-100 dark:bg-gray-700" 
              onError={(e) => { e.currentTarget.style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement)?.classList.remove('hidden'); }} />
          ) : null}
          <div className={`w-8 h-8 rounded-full ${m.fotoPath ? 'hidden' : ''}`}>
            <img src="/logo.png" alt="" className="w-8 h-8 rounded-full object-cover" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{m.namaLengkap}</span>
        </div>
      ),
    },
    {
      key: 'nomorAnggota',
      label: 'NRA',
      render: (m: Member) => (
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{m.nomorAnggota}</span>
      ),
    },
    {
      key: 'ttl',
      label: 'Tempat, Tgl Lahir',
      hidden: 'hidden md:table-cell',
      render: (m: Member) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{formatTtl(m)}</span>
      ),
    },
    {
      key: 'dadar',
      label: 'Tempat - Tahun Dadar',
      hidden: 'hidden lg:table-cell',
      render: (m: Member) => (
        <span className="text-xs text-gray-600 dark:text-gray-400">{formatDadar(m)}</span>
      ),
    },
    {
      key: 'ranting',
      label: 'Ranting',
      hidden: 'hidden xl:table-cell',
      render: (m: Member) => <span className="text-xs text-gray-500">{m.ranting?.nama || '-'}</span>,
    },
    {
      key: 'tingkat',
      label: 'Tingkatan',
      render: (m: Member) => (
        <span className="text-xs font-medium text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full">{m.tingkat || '-'}</span>
      ),
    },
    {
      key: 'statusKeanggotaan',
      label: 'Status',
      render: (m: Member) => (
        <StatusBadge status={m.statusKeanggotaan} labels={STATUS_LABELS.keanggotaan} />
      ),
    },
  ];

  // ─── Render ───

  return (
    <PermissionGuard module="members" action="view">
    <PageContainer>
      <PageHeader title="Anggota" onRefresh={refetch}>
        <CanCreate module="members">
          <button
            onClick={() => router.push('/members/import')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Upload size={14} /> Import
          </button>
        </CanCreate>
        <CanExport module="members">
          <ExportMenu serverType="members" filename="anggota-export" />
        </CanExport>
        <CanCreate module="members">
          <button
            onClick={() => router.push('/members/new')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={16} /> Tambah
          </button>
        </CanCreate>
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
        {/* Hierarchical filters: Distrik → Wilayah → Ranting */}
        <FilterSelect
          value={filters.distrikId}
          onChange={(v) => {
            setFilter('distrikId', v);
            setFilter('wilayahId', '');
            setFilter('rantingId', '');
          }}
          options={distrikOptions}
          placeholder="Semua Distrik"
        />
        <FilterSelect
          value={filters.wilayahId}
          onChange={(v) => {
            setFilter('wilayahId', v);
            setFilter('rantingId', '');
          }}
          options={wilayahOptions}
          placeholder={filters.distrikId ? 'Semua Wilayah' : 'Pilih Distrik'}
          disabled={!filters.distrikId}
        />
        <FilterSelect
          value={filters.rantingId}
          onChange={(v) => setFilter('rantingId', v)}
          options={rantingOptions}
          placeholder={filters.wilayahId ? 'Semua Ranting' : 'Pilih Wilayah'}
          disabled={!filters.wilayahId}
        />
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
    </PermissionGuard>
  );
}
