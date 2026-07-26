'use client';

import { useState } from 'react';
import { PermissionGuard } from '@/components/auth/permission-guard';
import {
  Users, Mail, Bell, Settings, Trash2, Edit3, Plus, Eye, Download, Search,
  XCircle, CheckCircle, AlertTriangle, Clock, Info, RefreshCw,
} from 'lucide-react';
import Badge from '@/components/ui/badge';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import DataTable from '@/components/ui/data-table';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import InfoRow from '@/components/ui/info-row';
import DetailRow from '@/components/ui/detail-row';
import { UserAvatar } from '@/components/ui/user-avatar';
import SearchBar from '@/components/ui/search-bar';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import Pagination from '@/components/ui/pagination';

// ─── Theme Toggle for Preview ─────────────────────────

function ThemeToggle({ theme, onChange }: { theme: string; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
        theme === 'dark'
          ? 'bg-gray-700 text-gray-100 border border-gray-600'
          : 'bg-gray-100 text-gray-800 border border-gray-300'
      }`}
    >
      {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}

// ─── Section Wrapper ─────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Showcase({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

function DualThemePreview({ children }: { children: (theme: string) => React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Light theme */}
      <div className="bg-white p-5 space-y-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">☀️ Light</p>
        {children('light')}
      </div>
      {/* Dark theme */}
      <div className="dark bg-gray-900 p-5 space-y-5" style={{ transition: 'none !important' }}>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">🌙 Dark</p>
        {children('dark')}
      </div>
    </div>
  );
}

// ─── Mock Data ───────────────────────────────────────

const MOCK_MEMBERS = [
  { id: '1', nama: 'Ahmad Fauzi', nomorAnggota: '0114-0101-001-2026', status: 'aktif', email: 'ahmad@example.com' },
  { id: '2', nama: 'Siti Nurhaliza', nomorAnggota: '0114-0101-002-2026', status: 'aktif', email: 'siti@example.com' },
  { id: '3', nama: 'Budi Santoso', nomorAnggota: '0114-0101-003-2026', status: 'nonaktif', email: 'budi@example.com' },
  { id: '4', nama: 'Dewi Lestari', nomorAnggota: '0114-0101-004-2026', status: 'aktif', email: 'dewi@example.com' },
  { id: '5', nama: 'Rudi Hermawan', nomorAnggota: '0114-0101-005-2026', status: 'aktif', email: 'rudi@example.com' },
];

// ─── Main Page ───────────────────────────────────────

export default function StyleGuidePage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);

  return (
    <PermissionGuard module="settings" action="view">
      <PageContainer>
        <Breadcrumbs />
        <PageHeader title="Style Guide / Design System" subtitle="Referensi visual semua komponen UI dalam tema Light & Dark" />

        {/* ─── Navigasi Cepat ─── */}
        <div className="flex flex-wrap gap-2 mb-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800">
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 mr-2 self-center">Lompat ke:</span>
          {[
            { id: 'typography', label: 'Tipografi' },
            { id: 'colors', label: 'Warna' },
            { id: 'buttons', label: 'Button' },
            { id: 'badges', label: 'Badge' },
            { id: 'inputs', label: 'Input' },
            { id: 'avatars', label: 'Avatar' },
            { id: 'tables', label: 'Table' },
            { id: 'modals', label: 'Modal' },
            { id: 'info-rows', label: 'Info Row' },
            { id: 'search-bar', label: 'Search' },
            { id: 'pagination', label: 'Pagination' },
            { id: 'page-header', label: 'Page Header' },
          ].map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-gray-700 border border-blue-200 dark:border-blue-700 transition"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* ─── 1. Tipografi ─── */}
        <Section id="typography" title="1. Tipografi">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-4">
                <Showcase label="Heading">
                  <p className="text-[10px] text-gray-400">text-2xl font-bold</p>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white w-full">Dashboard THS-THM</h1>
                  <p className="text-[10px] text-gray-400">text-xl font-semibold</p>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white w-full">Manajemen Anggota</h2>
                  <p className="text-[10px] text-gray-400">text-base font-semibold</p>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white w-full">Daftar Iuran Bulanan</h3>
                </Showcase>
                <Showcase label="Body">
                  <p className="text-sm text-gray-700 dark:text-gray-300 w-full">Text body utama — Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 w-full">Text secondary — digunakan untuk caption, metadata, dan label pendukung.</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 w-full">Text tertiary — untuk informasi paling rendah hierarkinya.</p>
                </Showcase>
                <Showcase label="Links">
                  <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Link standar</a>
                  <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5">
                    Link dengan icon <Eye size={12} />
                  </a>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 2. Warna ─── */}
        <Section id="colors" title="2. Warna Semantic">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-3">
                <Showcase label="Background & Text">
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-blue-500" /><span className="text-xs text-gray-600 dark:text-gray-400">Primary</span></div>
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-green-500" /><span className="text-xs text-gray-600 dark:text-gray-400">Success</span></div>
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-yellow-500" /><span className="text-xs text-gray-600 dark:text-gray-400">Warning</span></div>
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-red-500" /><span className="text-xs text-gray-600 dark:text-gray-400">Danger</span></div>
                    <div className="flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-purple-500" /><span className="text-xs text-gray-600 dark:text-gray-400">Info/Purple</span></div>
                  </div>
                </Showcase>
                <Showcase label="Status Badge Backgrounds">
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2.5 py-1 text-xs rounded-full bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">Aktif</span>
                    <span className="px-2.5 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Nonaktif</span>
                    <span className="px-2.5 py-1 text-xs rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">Ditolak</span>
                    <span className="px-2.5 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">Pending</span>
                    <span className="px-2.5 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">Diproses</span>
                    <span className="px-2.5 py-1 text-xs rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400">Selesai</span>
                  </div>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 3. Button ─── */}
        <Section id="buttons" title="3. Button">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-5">
                <Showcase label="Variants">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="ghost">Ghost</Button>
                </Showcase>
                <Showcase label="Sizes">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </Showcase>
                <Showcase label="With Icons">
                  <Button variant="primary"><Plus size={16} /> Tambah</Button>
                  <Button variant="secondary"><Edit3 size={16} /> Edit</Button>
                  <Button variant="danger"><Trash2 size={16} /> Hapus</Button>
                  <Button variant="ghost"><Download size={16} /> Export</Button>
                </Showcase>
                <Showcase label="Disabled & Loading">
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                  <Button variant="danger" disabled><Trash2 size={16} /> Hapus</Button>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 4. Badge ─── */}
        <Section id="badges" title="4. Badge">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-3">
                <Showcase label="Variants">
                  <Badge variant="default" label="Default" />
                  <Badge variant="success" label="Success" />
                  <Badge variant="warning" label="Warning" />
                  <Badge variant="danger" label="Danger" />
                  <Badge variant="info" label="Info" />
                </Showcase>
                <Showcase label="With Icons (inline)">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400">
                    <CheckCircle size={12} /> Active
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400">
                    <Clock size={12} /> Pending
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400">
                    <XCircle size={12} /> Rejected
                  </span>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 5. Input & Select ─── */}
        <Section id="inputs" title="5. Input & Select">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-4">
                <Showcase label="Input">
                  <div className="w-full max-w-xs space-y-3">
                    <Input label="Nama Lengkap" placeholder="Masukkan nama..." />
                    <Input label="Email" type="email" placeholder="user@example.com" />
                    <Input label="Dengan Error" error="Field ini wajib diisi" placeholder="..." />
                    <Input label="Disabled" disabled value="Tidak bisa diubah" />
                  </div>
                </Showcase>
                <Showcase label="Select">
                  <div className="w-full max-w-xs space-y-3">
                    <Select label="Pilih Ranting" options={[
                      { value: '', label: 'Pilih...' },
                      { value: 'r1', label: 'Ranting A' },
                      { value: 'r2', label: 'Ranting B' },
                      { value: 'r3', label: 'Ranting C' },
                    ]} placeholder="Pilih..." />
                    <Select label="Dengan Error" error="Pilih salah satu" options={[
                      { value: '', label: 'Pilih...' },
                      { value: 'opt1', label: 'Opsi 1' },
                    ]} />
                  </div>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 6. Avatar ─── */}
        <Section id="avatars" title="6. User Avatar">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-3">
                <Showcase label="With Initials (no photo)">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar namaLengkap="Ahmad Fauzi" size="sm" />
                      <span className="text-[10px] text-gray-400">sm</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar namaLengkap="Siti Nurhaliza" size="md" />
                      <span className="text-[10px] text-gray-400">md</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar namaLengkap="Budi Santoso" size="lg" />
                      <span className="text-[10px] text-gray-400">lg</span>
                    </div>
                  </div>
                </Showcase>
                <Showcase label="With Profile Card (sidebar style)">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl w-full max-w-xs">
                    <UserAvatar
                      namaLengkap="Super Admin"
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">Super Admin</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">admin@ths-thm.org</p>
                    </div>
                  </div>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 7. Data Table ─── */}
        <Section id="tables" title="7. Data Table">
          <DualThemePreview>
            {(theme) => (
              <div className="min-w-[500px]">
                <Showcase label="Full Featured">
                  <DataTable
                    columns={[
                      { key: 'name', label: 'Nama', render: (r: typeof MOCK_MEMBERS[0]) => (
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.nama}</span>
                      )},
                      { key: 'nomorAnggota', label: 'No. Anggota', hidden: 'hidden sm:table-cell' },
                      { key: 'status', label: 'Status', align: 'center', render: (r: typeof MOCK_MEMBERS[0]) => (
                        <Badge variant={r.status === 'aktif' ? 'success' : 'danger'} label={r.status} />
                      )},
                      { key: 'email', label: 'Email', hidden: 'hidden md:table-cell' },
                    ]}
                    data={MOCK_MEMBERS}
                    loading={false}
                    page={1}
                    totalPages={1}
                    total={5}
                    empty={{ icon: Users, message: 'Tidak ada data' }}
                    actions={(r: typeof MOCK_MEMBERS[0]) => (
                      <div className="flex items-center justify-end gap-1">
                        <button className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition">
                          <Eye size={14} className="text-blue-600" />
                        </button>
                        <button className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition">
                          <Edit3 size={14} className="text-green-600" />
                        </button>
                      </div>
                    )}
                  />
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 8. Modal ─── */}
        <Section id="modals" title="8. Modal & Confirm Modal">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-4">
                <Showcase label="Modal Trigger">
                  <Button variant="primary" onClick={() => setModalOpen(true)}>
                    <Eye size={16} /> Buka Modal
                  </Button>
                  <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                    <AlertTriangle size={16} /> Buka Konfirmasi
                  </Button>
                </Showcase>
                <Showcase label="Sample Content (non-modal)">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Contoh Card</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Ini adalah contoh card standar dengan background putih dan border abu-abu.
                      Style ini digunakan di seluruh halaman dashboard.
                    </p>
                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <Button size="sm" variant="primary">Simpan</Button>
                      <Button size="sm" variant="ghost">Batal</Button>
                    </div>
                  </div>
                </Showcase>
              </div>
            )}
          </DualThemePreview>

          {/* Actual Modal */}
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Contoh Modal">
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ini adalah komponen Modal standar. Background gelap dengan backdrop blur, border rounded, dan close button di pojok kanan.
              </p>
              <Input label="Nama" placeholder="Masukkan nama..." />
              <Input label="Email" type="email" placeholder="email@example.com" />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Batal</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>Simpan</Button>
              </div>
            </div>
          </Modal>

          {/* Actual Confirm Modal */}
          {confirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
                <button onClick={() => setConfirmOpen(false)} className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  <XCircle size={18} />
                </button>
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-950 text-red-500">
                    <AlertTriangle size={22} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Hapus Data</h3>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">Batal</button>
                  <button onClick={() => setConfirmOpen(false)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"><Trash2 size={14} /> Ya, Hapus</button>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* ─── 9. Info Row ─── */}
        <Section id="info-rows" title="9. Info Row & Detail Row">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-4">
                <Showcase label="InfoRow (simple label:value)">
                  <div className="w-full max-w-sm space-y-2">
                    <InfoRow label="Nama Lengkap" value="Ahmad Fauzi" />
                    <InfoRow label="No. Anggota" value="0114-0101-001-2026" />
                    <InfoRow label="Email" value="ahmad@example.com" />
                    <InfoRow label="No. HP" value="0812-3456-7890" />
                    <InfoRow label="Alamat" value="Jl. Merdeka No. 123, Jakarta" />
                  </div>
                </Showcase>
                <Showcase label="DetailRow (icon + label + value)">
                  <div className="w-full max-w-sm space-y-2">
                    <DetailRow icon={Users} label="Nama Lengkap" value="Siti Nurhaliza" />
                    <DetailRow icon={Mail} label="Email" value="siti@example.com" />
                    <DetailRow icon={Bell} label="Status" value="Aktif" />
                    <DetailRow icon={Info} label="Tidak Ada" value={null} />
                  </div>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 10. Search Bar ─── */}
        <Section id="search-bar" title="10. Search Bar & Filter">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-4">
                <Showcase label="Default">
                  <SearchBar
                    search={searchText}
                    onSearchChange={setSearchText}
                    onReset={() => setSearchText('')}
                    placeholder="Cari anggota..."
                  />
                </Showcase>
                <Showcase label="With Filter">
                  <div className="w-full">
                    <SearchBar
                      search={searchText}
                      onSearchChange={setSearchText}
                      onReset={() => setSearchText('')}
                      placeholder="Cari..."
                    >
                      <Select
                        options={[
                          { value: '', label: 'Semua Status' },
                          { value: 'aktif', label: 'Aktif' },
                          { value: 'nonaktif', label: 'Nonaktif' },
                        ]}
                        className="min-w-[140px]"
                      />
                    </SearchBar>
                  </div>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 11. Pagination ─── */}
        <Section id="pagination" title="11. Pagination">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-4">
                <Showcase label="Default">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 w-full">
                    <Pagination page={page} totalPages={5} total={47} onPageChange={setPage} />
                  </div>
                </Showcase>
                <Showcase label="Edge — Single Page">
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 w-full">
                    <Pagination page={1} totalPages={1} total={3} onPageChange={() => {}} />
                  </div>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── 12. Page Header ─── */}
        <Section id="page-header" title="12. Page Header">
          <DualThemePreview>
            {(theme) => (
              <div className="space-y-4">
                <Showcase label="Default">
                  <PageHeader title="Daftar Anggota" subtitle="Kelola data anggota THS-THM" onRefresh={() => {}}>
                    <Button variant="primary" size="sm"><Plus size={14} /> Tambah Anggota</Button>
                  </PageHeader>
                </Showcase>
                <Showcase label="With Back Link">
                  <PageHeader title="Detail Anggota" subtitle="Ahmad Fauzi — 0114-0101-001-2026" backHref="/members" backLabel="Kembali ke Anggota" />
                </Showcase>
                <Showcase label="With Tabs">
                  <PageHeader
                    title="Pengaturan Email"
                    tabs={[
                      { key: 'config', label: 'Konfigurasi', icon: Settings },
                      { key: 'templates', label: 'Template', icon: Mail, count: 12 },
                      { key: 'logs', label: 'Logs', icon: Search, count: 3 },
                    ]}
                    activeTab="config"
                    onTabChange={() => {}}
                  >
                    <Button variant="secondary" size="sm"><RefreshCw size={14} /> Sync</Button>
                  </PageHeader>
                </Showcase>
              </div>
            )}
          </DualThemePreview>
        </Section>

        {/* ─── Footer Legend ─── */}
        <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">📋 CSS Variable Reference</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-2">Background Tokens</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-white border border-gray-300" /><span className="text-gray-700 dark:text-gray-300">bg-white</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:bg-gray-800</span></div>
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-gray-50 border border-gray-300" /><span className="text-gray-700 dark:text-gray-300">bg-gray-50</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:bg-gray-800/50</span></div>
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-gray-100 border border-gray-300" /><span className="text-gray-700 dark:text-gray-300">bg-gray-100</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:bg-gray-700</span></div>
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-gray-900 border border-gray-600" /><span className="text-gray-700 dark:text-gray-300">bg-gray-900</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:bg-gray-950</span></div>
              </div>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-2">Text Tokens</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-900 text-white">#111827</span><span className="text-gray-700 dark:text-gray-300">text-gray-900</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:text-gray-100</span></div>
                <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-500 text-white">#6b7280</span><span className="text-gray-700 dark:text-gray-300">text-gray-500</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:text-gray-400</span></div>
                <div className="flex items-center gap-2"><span className="px-2 py-0.5 rounded text-xs bg-gray-400 text-white">#9ca3af</span><span className="text-gray-700 dark:text-gray-300">text-gray-400</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:text-gray-500</span></div>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-3 mb-2">Border Tokens</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border-2 border-gray-200" /><span className="text-gray-700 dark:text-gray-300">border-gray-200</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:border-gray-700</span></div>
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded border-2 border-gray-300" /><span className="text-gray-700 dark:text-gray-300">border-gray-300</span><span className="text-gray-400">→</span><span className="text-gray-700 dark:text-gray-300">dark:border-gray-600</span></div>
              </div>
            </div>
          </div>
        </div>

      </PageContainer>
    </PermissionGuard>
  );
}
