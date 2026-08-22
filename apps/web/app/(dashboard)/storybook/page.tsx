'use client';

import { useState, useCallback } from 'react';
import {
  Plus,
  Search,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Shield,
  Bell,
  Users,
  RefreshCw,
  Activity,
  Archive,
  HelpCircle,
  Inbox,
  Edit,
  AlertCircle,
} from 'lucide-react';

import Button from '@/components/ui/button';
import Badge from '@/components/ui/badge';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import DataTable from '@/components/ui/data-table';
import PaginationComponent from '@/components/ui/pagination';
import { UserAvatar } from '@/components/ui/user-avatar';
import SearchBar from '@/components/ui/search-bar';
import EmptyState from '@/components/ui/empty-state';
import DetailRow from '@/components/ui/detail-row';
import InfoRow from '@/components/ui/info-row';
import FilterSelect from '@/components/ui/filter-select';
import PageHeader from '@/components/ui/page-header';
import ConfirmModal from '@/components/ui/confirm-modal';
import Modal from '@/components/ui/modal';
import FormField from '@/components/ui/form-field';
import ExportMenu from '@/components/ui/export-menu';
import SummaryBar from '@/components/ui/summary-bar';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { StatCardSkeleton, StatCardGridSkeleton } from '@/components/ui/skeletons';
import { ChartSkeleton } from '@/components/ui/skeleton';
import TableSkeleton from '@/components/ui/table-skeleton';
import { ToastProvider, useToast } from '@/components/ui/toast';

// ─── Types ───

type ThemeMode = 'light' | 'dark';
type ViewMode = 'grid' | 'list';

interface StorySection {
  id: string;
  title: string;
  description: string;
}

// ─── Constants ───

const SECTIONS: StorySection[] = [
  { id: 'button', title: 'Button', description: '4 variants × 3 sizes × 5 states — all combinations' },
  { id: 'badge', title: 'Badge', description: '5 variants — default, success, warning, danger, info' },
  { id: 'input', title: 'Input', description: 'All states: normal, focused, error, disabled, with icon' },
  { id: 'select', title: 'Select', description: 'Normal, error, disabled, with placeholder' },
  { id: 'data-table', title: 'DataTable', description: 'Loading, empty, 1 row, 50 rows, error recovery' },
  { id: 'pagination', title: 'Pagination', description: 'Edge cases: 1 page, 3 pages, 20 pages' },
  { id: 'avatar', title: 'UserAvatar', description: '3 sizes × with photo / initials / long name' },
  { id: 'modal', title: 'Modal', description: 'Live demo with 3 sizes + ConfirmModal variants' },
  { id: 'toast', title: 'Toast', description: 'Success, error, info — with auto-dismiss demo' },
  { id: 'breadcrumbs', title: 'Breadcrumbs', description: '2-level, 3-level, 5-level with ellipsis, with suffix' },
  { id: 'search', title: 'Search & Filter', description: 'SearchBar empty/with value, FilterSelect, combined' },
  { id: 'detail', title: 'DetailRow & InfoRow', description: 'With/without value, with href, null handling' },
  { id: 'empty-state', title: 'EmptyState', description: 'With action, without action, in DataTable context' },
  { id: 'page-header', title: 'PageHeader', description: 'Default, with back link, with actions, with tabs' },
  { id: 'skeleton', title: 'Skeleton', description: 'StatCard, Chart, Table — loading placeholders' },
  { id: 'form', title: 'Form Components', description: 'FormField required/optional, ExportMenu, SummaryBar' },
];

const NAV_ITEMS = SECTIONS.map((s) => ({ id: s.id, label: s.title }));

// ─── Mock Data ───

const MOCK_MEMBERS = Array.from({ length: 50 }, (_, i) => ({
  id: `m-${i + 1}`,
  nama: i === 0 ? 'Budi Santoso' : `Anggota ${i + 1}`,
  nra: `0114-0101-${String(i + 1).padStart(3, '0')}-2024`,
  ranting: 'Ranting A',
  status: (['aktif', 'aktif', 'aktif', 'nonaktif', 'keluar'] as const)[i % 5],
  email: `anggota${i + 1}@example.com`,
  noHp: `0812${String(i).padStart(8, '0')}`,
}));



// ─── Section Wrapper ───

function SectionCard({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8">
        {children}
      </div>
    </section>
  );
}

// ─── State Matrix Grid ───

function StateMatrixGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-5">
      {children}
    </div>
  );
}

function StateCell({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 min-h-[100px] ${className}`}>
      <div className="flex items-center justify-center flex-1">{children}</div>
      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

// ─── Quick Nav ───

function QuickNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-8 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mr-2 py-1.5">Lompat ke:</span>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="px-2.5 py-1.5 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}

// ─── Story: Toggle Theme Preview ───

function StorybookPageContent() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [view, setView] = useState<ViewMode>('grid');
  const toast = useToast();

  // ── Interactive States ──
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<string | null>(null);
  const [paginationTestPage, setPaginationTestPage] = useState(1);

  const handlePaginationTestChange = useCallback((p: number) => {
    setPaginationTestPage(p);
  }, []);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-20">
        {/* ── Theme & View Controls ── */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">Component Storybook</h1>
              <Badge variant="info" label={`${SECTIONS.length} Sections`} />
            </div>
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button
                  onClick={() => setTheme('light')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    theme === 'light'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  ☀️ Light
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    theme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  🌙 Dark
                </button>
              </div>
              {/* View mode toggle */}
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    view === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="max-w-7xl mx-auto px-4 pt-6">
          {/* Intro */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">📚 UI Component Library — All States Matrix</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
              Setiap komponen ditampilkan dalam semua state yang mungkin: normal, loading, empty, error, disabled, 
              dan edge cases. Gunakan halaman ini untuk QA visual, regression testing, dan onboarding developer baru.
            </p>
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Ready</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Interactive</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Live Demo</span>
            </div>
          </div>

          <QuickNav items={NAV_ITEMS} />

          {/* ════════════════════════════════════════ */}
          {/* 1. BUTTON STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="button" title="📌 Button" description="Button — 4 variants × 3 sizes × 5 states = 60 live examples">
            {/* Size × Variant Matrix */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Size × Variant Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Variant</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-400">sm</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-400">md</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-400">lg</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-500 dark:text-gray-400">w/ Icon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['primary', 'secondary', 'danger', 'ghost'] as const).map((variant) => (
                      <tr key={variant} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="px-4 py-3">
                          <Badge variant={variant === 'primary' ? 'info' : variant === 'danger' ? 'danger' : 'default'} label={variant} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant={variant} size="sm">Simpan</Button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant={variant} size="md">Simpan</Button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant={variant} size="lg">Simpan</Button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button variant={variant} size="md"><Plus size={14} />Tambah</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* All States */}
            <div className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">All States</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {(['primary', 'secondary', 'danger', 'ghost'] as const).map((variant) => (
                  <div key={variant} className="space-y-2 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <p className="text-[10px] font-mono text-gray-400 uppercase mb-2">{variant}</p>
                    <Button variant={variant} size="sm">Normal</Button>
                    <Button variant={variant} size="sm" disabled>Disabled</Button>
                    <Button variant={variant} size="sm" loading>Loading</Button>
                    <Button variant={variant} size="sm"><Eye size={12} />Icon</Button>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 2. BADGE STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="badge" title="🏷️ Badge" description="Badge — 5 variants for status indicators">
            <StateMatrixGrid>
              {(Object.entries({
                default: 'Default',
                success: 'Lulus',
                warning: 'Pending',
                danger: 'Gagal',
                info: 'Info',
              }) as [string, string][]).map(([variant, label]) => (
                <StateCell key={variant} label={label}>
                  <Badge variant={variant as 'default' | 'success' | 'warning' | 'danger' | 'info'} label={label} />
                </StateCell>
              ))}
            </StateMatrixGrid>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 3. INPUT STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="input" title="⌨️ Input" description="Input — all validation states and edge cases">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Basic</h3>
                <Input label="Normal Input" placeholder="Masukkan teks..." />
                <Input label="With Value" placeholder="Placeholder" defaultValue="Budi Santoso" />
                <Input label="Required" placeholder="Required field" required />
                <Input label="Disabled" placeholder="Disabled" disabled />
                <Input label="Disabled with Value" defaultValue="Tidak bisa diubah" disabled />
              </div>
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Validation & Edge</h3>
                <Input label="Error State" placeholder="Email" defaultValue="invalid-email" error="Format email tidak valid" />
                <Input label="Error — Empty" placeholder="Nama lengkap" error="Field ini wajib diisi" />
                <Input label="Long Value" placeholder="..." defaultValue="Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore" />
                <Input label="Number Type" type="number" placeholder="0" />
                <Input label="Password" type="password" placeholder="••••••••" defaultValue="secret123" />
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 4. SELECT STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="select" title="📋 Select" description="Select — dropdown with all states">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-5">
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Normal</h3>
                <Select label="Ranting" placeholder="Pilih ranting" options={[
                  { value: 'r1', label: 'Ranting A' },
                  { value: 'r2', label: 'Ranting B' },
                  { value: 'r3', label: 'Ranting C' },
                ]} />
                <Select label="With Selection" options={[
                  { value: 'aktif', label: 'Aktif' },
                  { value: 'nonaktif', label: 'Nonaktif' },
                  { value: 'keluar', label: 'Keluar' },
                ]} defaultValue="aktif" />
              </div>
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Validation</h3>
                <Select label="Error State" placeholder="Pilih..." options={[
                  { value: 'a', label: 'Opsi A' },
                  { value: 'b', label: 'Opsi B' },
                ]} error="Pilihan wajib dipilih" />
                <Select label="Disabled" disabled options={[
                  { value: 'a', label: 'Tidak bisa dipilih' },
                ]} placeholder="Disabled dropdown" />
              </div>
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Edge Cases</h3>
                <Select label="Many Options (15)" placeholder="Pilih..." options={Array.from({ length: 15 }, (_, i) => ({
                  value: String(i),
                  label: `Opsi Panjang Nomor ${i + 1}`,
                }))} />
                <Select label="Single Option" options={[{ value: 'only', label: 'Hanya satu pilihan' }]} defaultValue="only" />
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 5. DATATABLE STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="data-table" title="📊 DataTable" description="DataTable — loading / empty / 1 row / 50 rows / error / with actions + row click">

            {view === 'grid' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
                {/* Loading */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" /> Loading
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm"><tbody><TableSkeleton rows={5} columns={4} /></tbody></table>
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                      <span className="text-sm text-gray-400" />
                      <div className="flex gap-1"><div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /><div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" /></div>
                    </div>
                  </div>
                </div>

                {/* Empty */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Empty State
                  </h3>
                  <DataTable
                    columns={[{ key: 'nama', label: 'Nama' }, { key: 'nra', label: 'NRA' }, { key: 'status', label: 'Status' }]}
                    data={[]}
                    loading={false}
                    empty={{ icon: Users, message: 'Belum ada data anggota', title: 'Kosong', action: { label: 'Tambah Anggota', onClick: () => {} } }}
                    page={1} totalPages={1} total={0}
                  />
                </div>

                {/* Single Row */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> 1 Row
                  </h3>
                  <DataTable
                    columns={[
                      { key: 'nama', label: 'Nama' },
                      { key: 'nra', label: 'NRA', hidden: 'hidden sm:table-cell' },
                      { key: 'status', label: 'Status', render: (item: { status: string }) => (
                        <Badge variant={item.status === 'aktif' ? 'success' : 'danger'} label={item.status} />
                      )},
                    ]}
                    data={[MOCK_MEMBERS[0]]}
                    loading={false}
                    empty={{ icon: Users, message: '' }}
                    page={1} totalPages={1} total={1}
                    actions={(item: { nama: string }) => (
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="sm"><Eye size={14} /></Button>
                        <Button variant="ghost" size="sm"><Edit size={14} /></Button>
                      </div>
                    )}
                  />
                </div>

                {/* Error State */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Error — Retry
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-8 text-center">
                    <AlertCircle size={36} className="mx-auto text-red-400 dark:text-red-500 mb-3" />
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Gagal Memuat Data</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Terjadi kesalahan saat mengambil data anggota dari server.</p>
                    <Button variant="danger" size="sm"><RefreshCw size={12} />Coba Lagi</Button>
                  </div>
                </div>

                {/* 50 Rows */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> 50 Rows + Pagination
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900">
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs">#</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs">Nama</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs hidden sm:table-cell">NRA</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 text-xs">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_MEMBERS.slice(0, 50).map((m, i) => (
                          <tr key={m.id} className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-xs text-gray-500">{i + 1}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{m.nama}</td>
                            <td className="px-4 py-2 text-xs font-mono text-gray-500 dark:text-gray-400 hidden sm:table-cell">{m.nra}</td>
                            <td className="px-4 py-2"><Badge variant={m.status === 'aktif' ? 'success' : 'danger'} label={m.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">50 total</span>
                      <div className="flex gap-1">
                        <button className="px-2.5 py-1 text-sm rounded-md text-gray-400 bg-gray-100 dark:bg-gray-700">1</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 p-5">
                {/* List view: show each state sequentially */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5 mb-3">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" /> Loading State
                  </h3>
                  <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                    <tbody><TableSkeleton rows={3} columns={4} /></tbody>
                  </table>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5 mb-3">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Empty State
                  </h3>
                  <DataTable
                    columns={[{ key: 'nama', label: 'Nama' }, { key: 'nra', label: 'NRA' }, { key: 'status', label: 'Status' }]}
                    data={[]}
                    loading={false}
                    empty={{ icon: Users, message: 'Belum ada data anggota', action: { label: 'Tambah', onClick: () => {} } }}
                    page={1} totalPages={1} total={0}
                  />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1.5 mb-3">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> 1 Row
                  </h3>
                  <DataTable
                    columns={[{ key: 'nama', label: 'Nama' }, { key: 'nra', label: 'NRA' }, { label: 'Status', render: (item: { status: string }) => <Badge variant="success" label={item.status} /> }]}
                    data={[MOCK_MEMBERS[0]]}
                    loading={false}
                    empty={{ icon: Users, message: '' }}
                    page={1} totalPages={1} total={1}
                  />
                </div>
              </div>
            )}

            {/* Column variants demonstration */}
            <div className="px-5 pb-5 border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">Column Alignment Variants</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Left (default)</th>
                      <th className="px-4 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Center</th>
                      <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Right</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3].map((i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">Left aligned text</td>
                        <td className="px-4 py-2 text-sm text-center text-gray-900 dark:text-white">Center</td>
                        <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-white">Rp {i}0.000</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 6. PAGINATION STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="pagination" title="🔢 Pagination" description="Pagination — edge cases: hidden, few pages, many pages, first/middle/last">
            <div className="space-y-6 p-5">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">1 Page (hidden) — totalPages &le; 1 = tidak muncul</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PaginationComponent page={1} totalPages={1} total={5} onPageChange={() => {}} />
                  <p className="text-xs text-gray-400 mt-2 italic">(tidak ada output — component returns null)</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">3 Pages (interactive)</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PaginationComponent page={paginationTestPage} totalPages={3} total={27} onPageChange={handlePaginationTestChange} />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">10 Pages — Start</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PaginationComponent page={1} totalPages={10} total={95} onPageChange={() => {}} />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">10 Pages — Middle (page 5)</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PaginationComponent page={5} totalPages={10} total={95} onPageChange={() => {}} />
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">20 Pages — End (page 20)</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PaginationComponent page={20} totalPages={20} total={500} onPageChange={() => {}} />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 7. USERAVATAR STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="avatar" title="👤 UserAvatar" description="UserAvatar — 3 sizes × with photo / with initials / long name / edge cases">
            <StateMatrixGrid>
              <StateCell label="sm — Initials">
                <UserAvatar namaLengkap="Budi Santoso" size="sm" />
              </StateCell>
              <StateCell label="md — Initials">
                <UserAvatar namaLengkap="Budi Santoso" size="md" />
              </StateCell>
              <StateCell label="lg — Initials">
                <UserAvatar namaLengkap="Budi Santoso" size="lg" />
              </StateCell>
              <StateCell label="Long Name (sm)">
                <UserAvatar namaLengkap="Dr. Ir. H. Muhammad Abdul Rahman Sp.KJ" size="sm" />
              </StateCell>
              <StateCell label="Long Name (md)">
                <UserAvatar namaLengkap="Dr. Ir. H. Muhammad Abdul Rahman Sp.KJ" size="md" />
              </StateCell>
              <StateCell label="Long Name (lg)">
                <UserAvatar namaLengkap="Dr. Ir. H. Muhammad Abdul Rahman Sp.KJ" size="lg" />
              </StateCell>
              <StateCell label="Single Name (sm)">
                <UserAvatar namaLengkap="Budi" size="sm" />
              </StateCell>
              <StateCell label="Two Characters (lg)">
                <UserAvatar namaLengkap="Ani" size="lg" />
              </StateCell>
              <StateCell label="Photo Error Fallback">
                <UserAvatar namaLengkap="Siti Rahmawati" fotoPath="nonexistent.jpg" size="lg" />
              </StateCell>
            </StateMatrixGrid>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 8. MODAL STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="modal" title="🪟 Modal & ConfirmModal" description="Modal — live demo with 3 sizes. ConfirmModal — danger, warning, info variants">
            <div className="p-5 space-y-6">
              {/* Modal sizes */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Modal Sizes</h3>
                <div className="flex flex-wrap gap-3">
                  {(['sm', 'md', 'lg'] as const).map((size) => (
                    <Button key={size} variant="secondary" size="sm" onClick={() => {
                      setModalSize(size);
                      setModalOpen(true);
                    }}>
                      Open {size.toUpperCase()} Modal
                    </Button>
                  ))}
                  {modalOpen && (
                    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Example Modal (${modalSize.toUpperCase()})`} size={modalSize}>
                      <div className="space-y-4">
                        <Input label="Nama Lengkap" placeholder="Masukkan nama" />
                        <Select label="Role" placeholder="Pilih role" options={[
                          { value: 'admin', label: 'Administrator' },
                          { value: 'user', label: 'User' },
                          { value: 'viewer', label: 'Viewer' },
                        ]} />
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Batal</Button>
                          <Button variant="primary" size="sm">Simpan</Button>
                        </div>
                      </div>
                    </Modal>
                  )}
                </div>
              </div>

              {/* ConfirmModal variants */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">ConfirmModal Variants</h3>
                <div className="flex flex-wrap gap-3">
                  {(['danger', 'warning', 'info'] as const).map((variant) => (
                    <Button
                      key={variant}
                      variant={variant === 'danger' ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => setConfirmOpen(variant)}
                    >
                      {variant === 'danger' ? '🗑️ ' : variant === 'warning' ? '⚠️ ' : 'ℹ️ '}
                      {variant}
                    </Button>
                  ))}
                </div>
                {['danger', 'warning', 'info'].map((variant) => (
                  <ConfirmModal
                    key={variant}
                    open={confirmOpen === variant}
                    title={variant === 'danger' ? 'Hapus Data' : variant === 'warning' ? 'Konfirmasi' : 'Informasi'}
                    message={variant === 'danger' ? 'Data yang dihapus tidak bisa dikembalikan. Yakin ingin menghapus?' : variant === 'warning' ? 'Data akan diproses. Lanjutkan?' : 'Proses ini akan mengirim notifikasi ke semua anggota.'}
                    confirmLabel={variant === 'danger' ? 'Ya, Hapus' : 'Ya, Lanjutkan'}
                    variant={variant as 'danger' | 'warning' | 'info'}
                    onConfirm={() => setConfirmOpen(null)}
                    onCancel={() => setConfirmOpen(null)}
                  />
                ))}
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 9. TOAST STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="toast" title="🍞 Toast" description="Toast — success, error, info notifications with auto-dismiss">
            <div className="p-5">
              <div className="flex flex-wrap gap-3 mb-4">
                <Button variant="primary" size="sm" onClick={() => toast('success', 'Data berhasil disimpan!')}>
                  ✅ Success Toast
                </Button>
                <Button variant="danger" size="sm" onClick={() => toast('error', 'Gagal menyimpan data. Coba lagi.')}>
                  ❌ Error Toast
                </Button>
                <Button variant="secondary" size="sm" onClick={() => toast('info', 'Proses sedang berjalan...')}>
                  ℹ️ Info Toast
                </Button>
                <Button variant="ghost" size="sm" onClick={() => {
                  toast('success', 'Toast 1 — Sukses!');
                  setTimeout(() => toast('error', 'Toast 2 — Error!'), 200);
                  setTimeout(() => toast('info', 'Toast 3 — Info!'), 400);
                }}>
                  📚 Stacked (3x)
                </Button>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Toast akan muncul di pojok kanan bawah dan auto-dismiss setelah 5 detik.
              </p>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 10. BREADCRUMBS STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="breadcrumbs" title="🔗 Breadcrumbs" description="Breadcrumbs — 2-level, 3-level, 5-level with mobile ellipsis, with suffix">
            <div className="space-y-4 p-5">
              {[
                { label: '2 Levels', segments: [{ href: '/', label: 'Dashboard' }, { href: '/members', label: 'Anggota' }] },
                { label: '3 Levels', segments: [{ href: '/', label: 'Dashboard' }, { href: '/members', label: 'Anggota' }, { href: '/members/123', label: 'Detail' }] },
                { label: '5 Levels (ellipsis on mobile)', segments: [
                  { href: '/', label: 'Dashboard' },
                  { href: '/settings', label: 'Settings' },
                  { href: '/settings/organization', label: 'Organization' },
                  { href: '/settings/organization/ranting', label: 'Ranting' },
                  { href: '#', label: 'Ranting A' },
                ]},
                { label: 'With Suffix (entity name)', segments: [{ href: '/', label: 'Dashboard' }, { href: '/members', label: 'Anggota' }], suffix: { href: '#', label: 'Budi Santoso' } },
                { label: 'Deep — 7 Levels', segments: [
                  { href: '/', label: 'Dashboard' },
                  { href: '/admin', label: 'Admin' },
                  { href: '/admin/users', label: 'Users' },
                  { href: '/admin/users/roles', label: 'Roles' },
                  { href: '/admin/users/roles/manage', label: 'Manage' },
                  { href: '/admin/users/roles/manage/1', label: 'Edit Role' },
                  { href: '#', label: 'Super Admin' },
                ]},
              ].map(({ label, segments, suffix }) => (
                <div key={label} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">{label}</span>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-800">
                    <Breadcrumbs segments={segments} suffix={suffix} responsive />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 11. SEARCH & FILTER STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="search" title="🔍 Search & Filter" description="SearchBar — empty, with value, with filters. FilterSelect — standalone state">
            <div className="space-y-5 p-5">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">SearchBar — Empty</span>
                </div>
                <SearchBar search="" onSearchChange={() => {}} onReset={() => {}} placeholder="Cari anggota..." />
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">SearchBar — With Value + Filters</span>
                </div>
                <SearchBar search="Budi" onSearchChange={() => {}} onReset={() => {}} placeholder="Cari anggota...">
                  <FilterSelect value="" onChange={() => {}} options={[
                    { value: 'aktif', label: 'Aktif' },
                    { value: 'nonaktif', label: 'Nonaktif' },
                    { value: 'keluar', label: 'Keluar' },
                  ]} placeholder="Status" />
                  <FilterSelect value="" onChange={() => {}} options={[
                    { value: 'r1', label: 'Ranting A' },
                    { value: 'r2', label: 'Ranting B' },
                  ]} placeholder="Ranting" />
                </SearchBar>
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">FilterSelect — Standalone</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 flex flex-wrap gap-3">
                  <FilterSelect value="" onChange={() => {}} options={[
                    { value: 'all', label: 'Semua' },
                    { value: 'aktif', label: 'Aktif' },
                    { value: 'nonaktif', label: 'Nonaktif' },
                  ]} />
                  <FilterSelect value="aktif" onChange={() => {}} options={[
                    { value: 'all', label: 'Semua' },
                    { value: 'aktif', label: 'Aktif' },
                    { value: 'nonaktif', label: 'Nonaktif' },
                  ]} />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 12. DETAILROW & INFORMROW STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="detail" title="📋 DetailRow & InfoRow" description="DetailRow — with value, null/empty value, with href. InfoRow — with value, null">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">DetailRow</h3>
                <DetailRow icon={User} label="Nama Lengkap" value="Budi Santoso" />
                <DetailRow icon={Mail} label="Email" value="budi@example.com" />
                <DetailRow icon={Phone} label="No. HP" value="081234567890" />
                <DetailRow icon={MapPin} label="Alamat" value={null} />
                <DetailRow icon={Calendar} label="Tanggal Lahir" value="17 Agustus 1990" />
                <DetailRow icon={FileText} label="Dokumen" value="KTA-2024-001" href="https://example.com" />
                <DetailRow icon={HelpCircle} label="Non-hoverable" value="Ini tidak bisa di-hover" hoverable={false} />
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">InfoRow</h3>
                <div className="space-y-2 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50">
                  <InfoRow label="Nama" value="Budi Santoso" />
                  <InfoRow label="NRA" value="0114-0101-001-2024" />
                  <InfoRow label="Email" value="budi@example.com" />
                  <InfoRow label="No. HP" value={null} />
                  <InfoRow label="Alamat" value={null} />
                  <InfoRow label="Keterangan" value="Ini adalah contoh InfoRow dengan data lengkap" />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 13. EMPTYSTATE STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="empty-state" title="📭 EmptyState" description="EmptyState — with action button, without action, with title">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Without Action</span>
                </div>
                <table className="w-full"><tbody>
                  <EmptyState icon={Inbox} message="Belum ada data yang tersedia." title="Kosong" />
                </tbody></table>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">With Action</span>
                </div>
                <table className="w-full"><tbody>
                  <EmptyState icon={Search} message="Tidak ada hasil untuk pencarian Anda." title="Tidak Ditemukan" action={{ label: 'Reset Filter', onClick: () => {} }} />
                </tbody></table>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Minimal</span>
                </div>
                <table className="w-full"><tbody>
                  <EmptyState icon={Archive} message="Arsip masih kosong." />
                </tbody></table>
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 14. PAGEHEADER STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="page-header" title="📐 PageHeader" description="PageHeader — default, with back link, with actions, with tabs">
            <div className="space-y-6 p-5">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">Default — with Breadcrumbs</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PageHeader title="Daftar Anggota" breadcrumbSuffix={{ href: '#', label: 'Anggota' }} />
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">With Back Link</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PageHeader title="Detail Anggota" subtitle="Informasi lengkap anggota" backHref="/members" />
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">With Actions</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PageHeader title="Manajemen Iuran" subtitle="Total 150 anggota aktif" onRefresh={() => {}}>
                    <Button variant="primary" size="sm"><Plus size={14} />Tambah Iuran</Button>
                    <ExportMenu label="Export" serverType="dues" />
                  </PageHeader>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">With Tabs</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PageHeader
                    title="Notifikasi"
                    onRefresh={() => {}}
                    tabs={[
                      { key: 'all', label: 'Semua', count: 12 },
                      { key: 'success', label: 'Terkirim', icon: CheckCircle2, count: 8 },
                      { key: 'failed', label: 'Gagal', icon: XCircle, count: 3 },
                      { key: 'pending', label: 'Menunggu', icon: Clock, count: 1 },
                    ]}
                    activeTab="all"
                    onTabChange={() => {}}
                  />
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-1.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase">All Features — Breadcrumbs + Title + Subtitle + Actions + Tabs</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800">
                  <PageHeader
                    title="Data Anggota"
                    subtitle="Kelola seluruh data anggota THS-THM"
                    onRefresh={() => {}}
                    breadcrumbSuffix={{ href: '#', label: 'Anggota' }}
                    tabs={[
                      { key: 'aktif', label: 'Aktif', count: 42 },
                      { key: 'nonaktif', label: 'Nonaktif', count: 5 },
                      { key: 'keluar', label: 'Keluar', count: 3 },
                    ]}
                    activeTab="aktif"
                    onTabChange={() => {}}
                  >
                    <Button variant="primary" size="sm"><Plus size={14} />Tambah</Button>
                    <ExportMenu serverType="members" />
                  </PageHeader>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 15. SKELETON STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="skeleton" title="🦴 Skeleton" description="Skeleton — loading placeholders for stat cards, charts, and tables">
            <div className="space-y-6 p-5">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">StatCardSkeleton — Single</h3>
                <div className="max-w-xs">
                  <StatCardSkeleton />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">StatCardGridSkeleton — 4 Grid</h3>
                <StatCardGridSkeleton count={4} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">ChartSkeleton (height 200px)</h3>
                <ChartSkeleton height={200} />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">TableSkeleton — 3 Rows × 4 Columns</h3>
                <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                  <tbody><TableSkeleton rows={3} columns={4} /></tbody>
                </table>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">TableSkeleton — 8 Rows × 6 Columns (dense)</h3>
                <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                  <tbody><TableSkeleton rows={8} columns={6} /></tbody>
                </table>
              </div>
            </div>
          </SectionCard>

          {/* ════════════════════════════════════════ */}
          {/* 16. FORM COMPONENTS STORIES */}
          {/* ════════════════════════════════════════ */}
          <SectionCard id="form" title="📝 Form Components" description="FormField, ExportMenu, SummaryBar, and FormField required/optional states">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">FormField</h3>
                <FormField label="Nama Lengkap" required>
                  <Input placeholder="Masukkan nama lengkap" />
                </FormField>
                <FormField label="Email" required>
                  <Input type="email" placeholder="email@example.com" />
                </FormField>
                <FormField label="Keterangan (opsional)">
                  <Input placeholder="Tambahkan keterangan..." />
                </FormField>
                <FormField label="Form Error">
                  <Input placeholder="Field ini wajib" error="Field wajib diisi" />
                </FormField>
              </div>
              <div className="space-y-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ExportMenu</h3>
                <div className="flex flex-wrap gap-3">
                  <ExportMenu label="Export Data" serverType="members" />
                  <ExportMenu label="Disabled" disabled />
                </div>

                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-6">SummaryBar</h3>
                <SummaryBar icon={Users} label="Total Anggota" total={150} />
                <SummaryBar icon={Calendar} label="Total Iuran Bulan Ini" total={45} onRefresh={() => {}} />
                <SummaryBar icon={Activity} label="Latihan Aktif" total={3} />
                <SummaryBar icon={Bell} label="Notifikasi Pending" total={12} onRefresh={() => {}} />
              </div>
            </div>
          </SectionCard>

          {/* ── Footer ── */}
          <div className="mt-12 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
            <Shield size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Component Storybook — {SECTIONS.length} sections · 21 component types · Matrix grid testing
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Pastikan setiap perubahan kode dicek di sini untuk regression visual sebelum deploy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Wrapper (for ToastProvider) ───

export default function StorybookPage() {
  return (
    <ToastProvider>
      <StorybookPageContent />
    </ToastProvider>
  );
}
