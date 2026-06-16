import { Calendar, FileText, CreditCard, Users } from 'lucide-react';
import DetailRow from '@/components/ui/detail-row';

export const STATUS_BADGES: Record<string, string> = {
  aktif: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400',
  nonaktif: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
  pending: 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400',
  approved: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400',
  rejected: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400',
  complete: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400',
  incomplete: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
};

export const STATUS_LABELS: Record<string, Record<string, string>> = {
  keanggotaan: {
    aktif: 'Aktif',
    nonaktif: 'Nonaktif',
    pindah: 'Pindah',
    keluar: 'Keluar',
    meninggal: 'Meninggal',
  },
  data: { complete: 'Lengkap', incomplete: 'Belum Lengkap' },
  validasi: { pending: 'Pending', approved: 'Disetujui', rejected: 'Ditolak' },
};

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface StatusBadgeProps {
  status: string;
  labels?: Record<string, string>;
}

// Border-style status styles for detail pages
const STATUS_STYLES: Record<string, string> = {
  aktif:
    'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  nonaktif:
    'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  pindah:
    'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  keluar:
    'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  meninggal:
    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  pending:
    'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  approved:
    'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  rejected:
    'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  complete:
    'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  incomplete:
    'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

export function StatusBadge({
  status,
  labels,
  bordered,
}: StatusBadgeProps & { bordered?: boolean }) {
  const label = labels?.[status] || status;
  const styleClass = bordered ? STATUS_STYLES[status] : STATUS_BADGES[status];
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${styleClass || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
    >
      {label}
    </span>
  );
}

// Flat labels map for detail pages (includes dues statuses)
export const FLAT_STATUS_LABELS: Record<string, string> = {
  aktif: 'Aktif',
  nonaktif: 'Nonaktif',
  pindah: 'Pindah',
  keluar: 'Keluar',
  meninggal: 'Meninggal',
  pending: 'Pending',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  complete: 'Lengkap',
  incomplete: 'Belum Lengkap',
  lunas: 'Lunas',
  menunggak: 'Menunggak',
  belum_dibayar: 'Belum Dibayar',
};

export const DUES_STATUS_STYLES: Record<string, string> = {
  lunas: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200',
  menunggak: 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200',
  belum_dibayar: 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200',
};

export const DOCUMENT_TYPES: Record<string, string> = {
  kta: 'KTA (Kartu Tanda Anggota)',
  sertifikat: 'Sertifikat',
  spg: 'SPG (Surat Penetapan Golongan)',
  lainnya: 'Dokumen Lainnya',
};

export function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

// ─── Info Row ───

export { DetailRow as InfoRow };

// ─── Detail Stats Cards ───

interface DetailStatsProps {
  createdAt: string;
  dokumenCount: number;
  paidDues: number;
  totalDues: number;
  rantingNama: string;
}

export function DetailStats({
  createdAt,
  dokumenCount,
  paidDues,
  totalDues,
  rantingNama,
}: DetailStatsProps) {
  const statCards = [
    { icon: Calendar, label: 'Tgl Daftar', value: formatDate(createdAt), color: 'blue' },
    { icon: FileText, label: 'Dokumen', value: String(dokumenCount), color: 'green' },
    { icon: CreditCard, label: 'Iuran Lunas', value: `${paidDues}/${totalDues}`, color: 'purple' },
    { icon: Users, label: 'Organisasi', value: rantingNama, color: 'yellow' },
  ] as const;

  const colorStyles: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statCards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colorStyles[card.color]}`}>
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[120px]">
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Detail Skeleton ───

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            <div className="flex gap-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-64" />
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 h-64" />
      </div>
    </div>
  );
}
