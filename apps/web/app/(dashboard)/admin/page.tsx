'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import PageContainer from '@/components/ui/page-container';

import {
  Users,
  UserPlus,
  GraduationCap,
  CreditCard,
  Calendar,
  FileText,
  Dumbbell,
  ClipboardCheck,
  Shield,
  Activity,
  BarChart3,
  Settings,
  Bell,
  Mail,
  Database,
  Clock,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Layers,
  BookOpen,
  MessageSquare,
  ShieldAlert,
  ListChecks,
  Server,
  Puzzle,
  Network,
  ScrollText,
  Wallet,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import Link from 'next/link';

// ─── Types ───

interface DashboardData {
  totalMembers: number;
  totalCandidates: number;
  totalGraduated: number;
  totalDuesCollected: number;
  pendingValidasi: number;
  incompleteData: number;
  totalKegiatan: number;
  totalLatihan: number;
  totalKlaim: number;
  totalDokumen: number;
  totalPendaftaran: number;
  totalUsers: number;
}

// ─── Stat Card ───

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType<LucideProps>;
  href: string;
  gradient: string;
  subtitle?: string;
}

function StatCard({ label, value, icon: Icon, href, gradient, subtitle }: StatCardProps) {
  return (
    <Link
      href={href}
      className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300 dark:hover:border-gray-700"
    >
      <div className={`p-3 rounded-lg shrink-0 ${gradient}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
          {label}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <ChevronRight
        size={16}
        className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0 mt-2"
      />
    </Link>
  );
}

// ─── Quick Link Card ───

interface QuickLinkProps {
  label: string;
  icon: React.ElementType<LucideProps>;
  href: string;
  description: string;
}

function QuickLink({ label, icon: Icon, href, description }: QuickLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all group"
    >
      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
          {label}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{description}</p>
      </div>
      <ChevronRight
        size={14}
        className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0"
      />
    </Link>
  );
}

// ─── Section Card ───

interface SectionCardProps {
  title: string;
  icon: React.ElementType<LucideProps>;
  children: React.ReactNode;
  className?: string;
}

function SectionCard({ title, icon: Icon, children, className = '' }: SectionCardProps) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
        <Icon size={18} className="text-gray-500 dark:text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h2>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reports/dashboard');
      setData(res.data?.data || res.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError((err as { message?: string })?.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Admin Quick Links — grouped by category ──

  const adminLinks: QuickLinkProps[] = [
    { label: 'Anggota', icon: Users, href: '/members', description: 'Kelola data anggota' },
    { label: 'Calon Anggota', icon: UserPlus, href: '/candidates', description: 'Manajemen calon anggota' },
    { label: 'Pendaftaran', icon: ScrollText, href: '/registrations', description: 'Pendaftaran baru' },
    { label: 'Pelatihan', icon: Dumbbell, href: '/trainings', description: 'Jadwal dan materi latihan' },
    { label: 'Kegiatan', icon: Calendar, href: '/activities', description: 'Semua kegiatan organisasi' },
    { label: 'Pendadaran', icon: GraduationCap, href: '/graduations', description: 'Ujian pendadaran' },
    { label: 'Penguji', icon: ClipboardCheck, href: '/examiners', description: 'Daftar penguji' },
    { label: 'Penilaian',    icon: ListChecks, href: '/assessments', description: 'Aspek dan item penilaian' },
    { label: 'Iuran', icon: CreditCard, href: '/dues', description: 'Manajemen iuran anggota' },
    { label: 'Pembayaran',    icon: Wallet, href: '/payments', description: 'Pengaturan pembayaran' },
    { label: 'Klaim', icon: Shield, href: '/claims', description: 'Pengajuan klaim' },
    { label: 'Persetujuan', icon: ShieldAlert, href: '/approvals', description: 'Proses persetujuan' },
    { label: 'Dokumen', icon: FileText, href: '/documents', description: 'Dokumen anggota' },
    { label: 'Dok. Organisasi', icon: BookOpen, href: '/org-documents', description: 'Dokumen organisasi' },
    { label: 'Surat', icon: Mail, href: '/letters', description: 'Surat masuk & keluar' },
    { label: 'Notifikasi', icon: Bell, href: '/notifications', description: 'Kirim & kelola notifikasi' },
    { label: 'Forum', icon: MessageSquare, href: '/forum', description: 'Forum diskusi' },
    { label: 'Forum Kategori', icon: Layers, href: '/forum?tab=categories', description: 'Kategori thread forum' },
    { label: 'Gamifikasi', icon: Puzzle, href: '/gamification', description: 'Poin, level & reward' },
    { label: 'Laporan', icon: BarChart3, href: '/reports', description: 'Laporan data & statistik' },
    { label: 'Pengaturan', icon: Settings, href: '/settings', description: 'Pengaturan sistem' },
    { label: 'Pengguna', icon: Users, href: '/users', description: 'Manajemen pengguna' },
    { label: 'Struktur Org', icon: Network, href: '/org-chart', description: 'Struktur organisasi' },
    { label: 'Kalender', icon: Calendar, href: '/calendar', description: 'Kalender kegiatan & hari libur' },
    { label: 'Monitor Antrean', icon: Activity, href: '/admin/queues', description: 'Status queue & dokumen' },
    { label: 'Audit Log', icon: Database, href: '/audit-logs', description: 'Log aktivitas sistem' },
  ];

  return (
    <PermissionGuard module="admin" action="view">
      <PageContainer>
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield size={24} className="text-blue-600" />
              Panel Admin
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Ringkasan sistem dan akses cepat ke seluruh modul
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
                Terakhir: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Error State ── */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button onClick={fetchStats} className="underline hover:no-underline text-xs font-medium shrink-0">
              Coba lagi
            </button>
          </div>
        )}

        {/* ── Stat Cards Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading && !data ? (
            // Skeleton loading
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                    <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                  </div>
                </div>
              </div>
            ))
          ) : data ? (
            <>
              <StatCard
                label="Total Anggota"
                value={data.totalMembers}
                icon={Users}
                href="/members"
                gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                subtitle={`${data.pendingValidasi} perlu validasi`}
              />
              <StatCard
                label="Calon Anggota"
                value={data.totalCandidates}
                icon={UserPlus}
                href="/candidates"
                gradient="bg-gradient-to-br from-purple-500 to-purple-700"
              />
              <StatCard
                label="Lulus Pendadaran"
                value={data.totalGraduated}
                icon={GraduationCap}
                href="/graduations"
                gradient="bg-gradient-to-br from-green-500 to-green-700"
              />
              <StatCard
                label="Iuran Terkumpul"
                value={data.totalDuesCollected > 0 ? `Rp ${(data.totalDuesCollected / 1000000).toFixed(1)}jt` : 'Rp 0'}
                icon={CreditCard}
                href="/dues"
                gradient="bg-gradient-to-br from-yellow-500 to-yellow-700"
              />
              <StatCard
                label="Kegiatan Aktif"
                value={data.totalKegiatan}
                icon={Calendar}
                href="/activities"
                gradient="bg-gradient-to-br from-indigo-500 to-indigo-700"
              />
              <StatCard
                label="Total Latihan"
                value={data.totalLatihan}
                icon={Dumbbell}
                href="/trainings"
                gradient="bg-gradient-to-br from-teal-500 to-teal-700"
              />
              <StatCard
                label="Dokumen Tersedia"
                value={data.totalDokumen}
                icon={FileText}
                href="/documents"
                gradient="bg-gradient-to-br from-cyan-500 to-cyan-700"
                subtitle={data.totalDokumen > 0 ? `${data.totalDokumen} dokumen siap` : ''}
              />
              <StatCard
                label="Pengguna Aktif"
                value={data.totalUsers}
                icon={Shield}
                href="/users"
                gradient="bg-gradient-to-br from-slate-500 to-slate-700"
              />
              <StatCard
                label="Klaim Diproses"
                value={data.totalKlaim}
                icon={ClipboardCheck}
                href="/claims"
                gradient="bg-gradient-to-br from-pink-500 to-pink-700"
              />
              <StatCard
                label="Pendaftaran Baru"
                value={data.totalPendaftaran}
                icon={UserPlus}
                href="/registrations"
                gradient="bg-gradient-to-br from-amber-500 to-amber-700"
                subtitle={data.totalPendaftaran > 0 ? 'Menunggu diproses' : ''}
              />
              <StatCard
                label="Data Tidak Lengkap"
                value={data.incompleteData}
                icon={AlertCircle}
                href="/members"
                gradient="bg-gradient-to-br from-red-500 to-red-700"
                subtitle={data.incompleteData > 0 ? 'Perlu diperbaiki' : 'Semua lengkap'}
              />


            </>
          ) : null}
        </div>

        {/* ── Quick Links ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Data Master ── */}
          <SectionCard title="Data Master" icon={Database}>
            <div className="space-y-1.5">
              {adminLinks.slice(0, 8).map((link) => (
                <QuickLink key={link.href} {...link} />
              ))}
            </div>
          </SectionCard>

          {/* ── Keuangan & Dokumen ── */}
          <SectionCard title="Keuangan & Dokumen" icon={FileText}>
            <div className="space-y-1.5">
              {adminLinks.slice(8, 17).map((link) => (
                <QuickLink key={link.href} {...link} />
              ))}
            </div>
          </SectionCard>

          {/* ── Pengaturan & Monitoring ── */}
          <SectionCard title="Pengaturan & Monitoring" icon={Settings}>
            <div className="space-y-1.5">
              {adminLinks.slice(17).map((link) => (
                <QuickLink key={link.href} {...link} />
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ── Footer Info ── */}
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pt-2 pb-4">
          <div className="flex items-center gap-1.5">
            <Server size={12} />
            <span>Sistem Manajemen THS-THM v1.0</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>Data diperbarui: {lastUpdated.toLocaleString('id-ID')}</span>
            </div>
          )}
        </div>
      </PageContainer>
    </PermissionGuard>
  );
}
