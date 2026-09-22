'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { usePaginatedList } from '@/lib/hooks/use-api';
import { useFilters } from '@/lib/hooks/use-filters';
import { useDebounce } from '@/lib/hooks/use-debounce';
import type { Member } from '@/types';
import { Plus, Upload, Users, Printer, X } from 'lucide-react';
import MultiFormatExport from '@/components/ui/MultiFormatExport';
import SavedViews from '@/components/ui/SavedViews';
import ExportMenu from '@/components/ui/export-menu';
import { CanCreate, CanExport } from '@/components/auth/can';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageContainer from '@/components/ui/page-container';
import PageHeader from '@/components/ui/page-header';
import DataTable from '@/components/ui/data-table';
import SearchBar from '@/components/ui/search-bar';
import FilterSelect from '@/components/ui/filter-select';
import { useToast } from '@/components/ui/toast';
import { StatCardGridSkeleton } from '@/components/ui/skeletons';
import MemberActions from '@/components/members/MemberActions';
import MembersBulkAction from '@/components/members/MembersBulkAction';
import MutationModal from '@/components/members/MutationModal';
import MemberStatCards from '@/components/members/MemberStatCards';
import ColumnVisibility from '@/components/ui/ColumnVisibility';
import DateRangeFilter from '@/components/ui/DateRangeFilter';
import { StatusBadge, STATUS_LABELS, formatDate, toProperCase } from '@/components/members/constants';
import { useAuth } from '@/hooks/use-auth';

// ─── Page ───


export default function MembersPage() {
  const router = useRouter();
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mutasiMember, setMutasiMember] = useState<Member | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchPrinting, setBatchPrinting] = useState(false);
  const [isApproveLoading, setIsApproveLoading] = useState(false);
  const [dadars, setDadars] = useState({ from: '', to: '' });
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['namaLengkap', 'nomorAnggota', 'statusKeanggotaan']);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.length === members.length ? [] : members.map((m) => m.id),
    );

  const handleBatchPrint = async () => {
    if (selectedIds.length === 0) return;
    setBatchPrinting(true);
    try {
      const { data: res } = await apiClient.post('/members/print-batch', {
        memberIds: selectedIds,
        reason: 'baru',
      });
      toast('success', `${res?.data?.issued?.length ?? 0} kartu fisik diterbitkan`);
      if (res?.data?.pdfUrl) {
        window.open(`${window.location.origin}${res.data.pdfUrl}`, '_blank');
      }
      setSelectedIds([]);
    } catch {
      toast('error', 'Gagal mencetak batch kartu fisik');
    }
    setBatchPrinting(false);
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    setIsApproveLoading(true);
    try {
      await apiClient.post('/members/batch-action', {
        memberIds: selectedIds,
        action: 'approve',
      });
      toast('success', `Berhasil menyetujui ${selectedIds.length} anggota`);
      setSelectedIds([]);
      refetch();
    } catch {
      toast('error', `Gagal menyetujui ${selectedIds.length} anggota`);
    }
    setIsApproveLoading(false);
  };

  // Stats
  const [stats, setStats] = useState({ total: 0, aktif: 0, pendingValidasi: 0, incomplete: 0 });

  const {
    page,
    setPage,
    search,
    setSearch,
    filters,
    setFilter,
    sort,
    setSort,
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
    if (dadars.from) params.dadarFrom = dadars.from;
    if (dadars.to) params.dadarTo = dadars.to;
    return apiClient.get('/members', { params }).then((r) => r.data);
  }, [
    page,
    debouncedSearch,
    sort?.key,
    sort?.direction,
    filters.statusKeanggotaan,
    filters.statusData,
    filters.statusValidasi,
    filters.distrikId,
    filters.wilayahId,
    filters.rantingId,
    dadars.from,
    dadars.to,
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

  const handleUploadPhoto = async (id: string, file: File) => {
    setActionLoading(id);
    try {
      const token = localStorage.getItem('accessToken');
      const formData = new FormData();
      formData.append('photo', file);
      const res = await fetch(`/api/upload/member-photo/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        toast('success', 'Foto berhasil diupload');
        refetch();
      } else {
        toast('error', data.message || 'Gagal upload foto');
      }
    } catch {
      toast('error', 'Gagal upload foto. Silakan coba lagi.');
    }
    setActionLoading(null);
  };

  const handleAction = async (id: string, action: string) => {
    if (action === 'remove') {
      if (!window.confirm('Yakin ingin menghapus anggota ini? Tindakan ini tidak dapat dibatalkan.')) {
        return;
      }
    }

    setActionLoading(id);
    try {
      if (action === 'suspend' || action === 'reactivate') {
        await apiClient.patch(`/members/${id}/${action}`, {});
      } else if (action === 'remove') {
        await apiClient.delete(`/members/${id}`);
      } else {
        await apiClient.post(`/members/${id}/${action}`, {});
      }
      refetch();
      fetchStats();
      if (action === 'remove') toast('success', 'Anggota berhasil dihapus');
    } catch (err) {
      const msg =
        (err as { message?: string })?.message ||
        (action === 'remove' ? 'Gagal menghapus anggota' : 'Tindakan gagal, coba lagi');
      toast('error', msg);
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
      key: '__select',
      label: '',
      header: () => (
        <input
          type="checkbox"
          className="accent-indigo-600"
          checked={members.length > 0 && selectedIds.length === members.length}
          onChange={toggleSelectAll}
          aria-label="Pilih semua di halaman ini"
        />
      ),
      render: (m: Member) => (
        <input
          type="checkbox"
          className="accent-indigo-600"
          checked={selectedIds.includes(m.id)}
          onChange={() => toggleSelect(m.id)}
          aria-label={`Pilih ${m.namaLengkap}`}
        />
      ),
    },
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
            <img src="/logo.svg" alt="" className="w-8 h-8 rounded-full object-cover" />
          </div>
          <Link
            href={`/members/${m.id}`}
            className="font-medium text-gray-900 dark:text-white hover:text-gold-500 dark:hover:text-gold-400 hover:underline transition"
            title="Lihat detail anggota"
          >
            {toProperCase(m.namaLengkap)}
          </Link>
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
        <span className="text-xs font-medium text-navy-700 dark:text-navy-400 bg-navy-50 dark:bg-navy-950 px-2 py-0.5 rounded-full">{m.tingkat || '-'}</span>
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
        <MultiFormatExport serverType="members" filename="anggota-export" selectedIds={selectedIds} />
      </CanExport>
      <CanCreate module="members">
        <button
          onClick={() => router.push('/members/new')}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold-400 text-navy-900 rounded-xl text-sm font-bold hover:bg-gold-300 transition-all duration-200"
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
        onClear={() => setSearch('')}
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

      {/* Date Range Filter, Column Visibility & Saved Views */}
      <div className="flex flex-wrap items-center gap-3 -mt-2 mb-2">
        <DateRangeFilter
          from={dadars.from}
          to={dadars.to}
          onFromChange={(v) => setDadars(prev => ({ ...prev, from: v }))}
          onToChange={(v) => setDadars(prev => ({ ...prev, to: v }))}
        />
        <ColumnVisibility
          columns={[
            { key: 'namaLengkap', label: 'Nama' },
            { key: 'nomorAnggota', label: 'NRA' },
            { key: 'ttl', label: 'Tempat, Tgl Lahir' },
            { key: 'dadar', label: 'Tempat - Tahun Dadar' },
            { key: 'ranting', label: 'Ranting' },
            { key: 'tingkat', label: 'Tingkatan' },
            { key: 'statusKeanggotaan', label: 'Status' },
          ]}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
        />
        <SavedViews
          onApply={(view) => {
            Object.entries(view.filters).forEach(([key, value]) => {
              setFilter(key, value);
            });
            if (view.sort) {
              setSort(view.sort);
            }
          }}
          onReset={resetFilters}
        />
      </div>

      {/* Quick Filter Presets & Active Filter Chips */}
      <div className="flex flex-wrap items-center gap-2 -mt-2 mb-2">
        <span className="text-xs font-medium text-muted">Quick:</span>
        <button
          onClick={() => {
            setFilter('statusKeanggotaan', 'aktif');
            setFilter('statusData', '');
            setFilter('statusValidasi', '');
          }}
          className="px-2.5 py-1 text-xs bg-success-50 dark:bg-success-950 text-success-700 dark:text-success-300 rounded-full hover:opacity-80 transition"
        >
          Aktif
        </button>
        <button
          onClick={() => {
            setFilter('statusData', 'incomplete');
            setFilter('statusKeanggotaan', '');
            setFilter('statusValidasi', '');
          }}
          className="px-2.5 py-1 text-xs bg-warning-50 dark:bg-warning-950 text-warning-700 dark:text-warning-300 rounded-full hover:opacity-80 transition"
        >
          Data Belum Lengkap
        </button>
        <button
          onClick={() => {
            setFilter('statusValidasi', 'pending');
            setFilter('statusKeanggotaan', '');
            setFilter('statusData', '');
          }}
          className="px-2.5 py-1 text-xs bg-info-50 dark:bg-info-950 text-info-700 dark:text-info-300 rounded-full hover:opacity-80 transition"
        >
          Pending Validasi
        </button>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 -mt-1 mb-2">
          {filters.distrikId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs">
              Distrik: {distrikOptions.find((d) => d.value === filters.distrikId)?.label || filters.distrikId}
              <button onClick={() => setFilter('distrikId', '')} className="p-0.5 hover:opacity-70" aria-label="Hapus filter distrik">
                <X size={10} />
              </button>
            </span>
          )}
          {filters.wilayahId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs">
              Wilayah: {wilayahOptions.find((d) => d.value === filters.wilayahId)?.label || filters.wilayahId}
              <button onClick={() => setFilter('wilayahId', '')} className="p-0.5 hover:opacity-70" aria-label="Hapus filter wilayah">
                <X size={10} />
              </button>
            </span>
          )}
          {filters.rantingId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs">
              Ranting: {rantingOptions.find((d) => d.value === filters.rantingId)?.label || filters.rantingId}
              <button onClick={() => setFilter('rantingId', '')} className="p-0.5 hover:opacity-70" aria-label="Hapus filter ranting">
                <X size={10} />
              </button>
            </span>
          )}
          {filters.statusKeanggotaan && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs">
              Status: {STATUS_LABELS.keanggotaan[filters.statusKeanggotaan] || filters.statusKeanggotaan}
              <button onClick={() => setFilter('statusKeanggotaan', '')} className="p-0.5 hover:opacity-70" aria-label="Hapus filter status">
                <X size={10} />
              </button>
            </span>
          )}
          {filters.statusData && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs">
              Data: {filters.statusData === 'complete' ? 'Lengkap' : 'Belum Lengkap'}
              <button onClick={() => setFilter('statusData', '')} className="p-0.5 hover:opacity-70" aria-label="Hapus filter data">
                <X size={10} />
              </button>
            </span>
          )}
          {filters.statusValidasi && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-full text-xs">
              Validasi: {filters.statusValidasi === 'pending' ? 'Pending' : filters.statusValidasi === 'approved' ? 'Disetujui' : 'Ditolak'}
              <button onClick={() => setFilter('statusValidasi', '')} className="p-0.5 hover:opacity-70" aria-label="Hapus filter validasi">
                <X size={10} />
              </button>
            </span>
          )}
          <button onClick={resetFilters} className="text-xs text-primary hover:underline ml-1">
            Reset semua
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={refetch} className="underline hover:no-underline text-xs">
            Coba lagi
          </button>
        </div>
      )}

      {/* Batch Actions */}
      <MembersBulkAction
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
        onApprove={handleBatchApprove}
        onPrint={handleBatchPrint}
        isApproveLoading={isApproveLoading}
        isPrintLoading={batchPrinting}
      />
      {/* Cetak batch kartu fisik (hapus setelah menggunakan MembersBulkAction) */}
      {selectedIds.length > 0 && !isApproveLoading && (
        <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl mb-4">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            {selectedIds.length} anggota dipilih untuk cetak kartu fisik
          </p>
          <button
            onClick={handleBatchPrint}
            disabled={batchPrinting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Printer size={14} />
            {batchPrinting ? 'Menerbitkan...' : 'Terbitkan & Cetak Kartu Fisik (Batch)'}
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns.filter(c => !c.key || visibleColumns.includes(c.key))}
        data={members}
        loading={loading}
        sort={sort}
        onSort={setSort}
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
            onMutate={isAdmin ? (id) => setMutasiMember(members.find((x) => x.id === id) ?? null) : undefined}
            onUploadPhoto={isAdmin ? handleUploadPhoto : undefined}
          />
        )}
        renderMobileCard={(m: Member) => (
          <Link href={`/members/${m.id}`} className="block p-4 border-b border-border last:border-0 active:bg-surface-variant">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative shrink-0">
                  {m.fotoPath ? (
                    <img
                      src={`/api/uploads/${m.fotoPath}`}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex'; }}
                    />
                  ) : null}
                  <div className="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center shrink-0">
                    <span className="font-semibold text-sm text-text">{m.namaLengkap.charAt(0)}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">{toProperCase(m.namaLengkap)}</p>
                  <p className="text-xs text-muted font-mono">{m.nomorAnggota}</p>
                </div>
              </div>
              <StatusBadge status={m.statusKeanggotaan} />
            </div>
          </Link>
        )}
      />

      <MutationModal
        open={!!mutasiMember}
        onClose={() => setMutasiMember(null)}
        onSuccess={refetch}
        member={mutasiMember}
      />
    </PageContainer>
    </PermissionGuard>
  );
}
