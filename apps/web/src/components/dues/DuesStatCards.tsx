'use client';

import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Users,
  BarChart3,
} from 'lucide-react';
import StatCard from '@/components/cards/stat-card';

interface DuesStats {
  totalIuran: number;
  totalTransaksi: number;
  totalLunas: number;
  totalMenunggak: number;
  iuranBulanIni: number;
  lunasBulanIni: number;
  anggotaAktif: number;
}

export function formatRupiah(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}rb`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

interface DuesStatCardsProps {
  stats: DuesStats;
}

export default function DuesStatCards({ stats }: DuesStatCardsProps) {
  const complianceRate =
    stats.anggotaAktif > 0 ? Math.round((stats.lunasBulanIni / stats.anggotaAktif) * 100) : 0;

  const mainCards = [
    {
      label: 'Total Iuran',
      value: formatRupiah(stats.totalIuran),
      icon: DollarSign,
      color: 'blue' as const,
      sub: 'Keseluruhan',
    },
    {
      label: 'Iuran Bulan Ini',
      value: formatRupiah(stats.iuranBulanIni),
      icon: TrendingUp,
      color: 'green' as const,
      sub: `${stats.lunasBulanIni}/${stats.anggotaAktif} anggota`,
    },
    {
      label: 'Menunggak',
      value: `${stats.totalMenunggak} anggota`,
      icon: AlertTriangle,
      color: 'red' as const,
      sub: 'Perlu tindak lanjut',
    },
    {
      label: 'Kepatuhan',
      value: `${complianceRate}%`,
      icon: CheckCircle,
      color: 'purple' as const,
      sub: 'Bulan ini',
    },
  ];

  const miniCards = [
    {
      label: 'Total Lunas',
      value: stats.totalLunas.toLocaleString('id-ID'),
      icon: ArrowUp,
      color: 'green' as const,
    },
    {
      label: 'Total Menunggak',
      value: stats.totalMenunggak.toLocaleString('id-ID'),
      icon: ArrowDown,
      color: 'red' as const,
    },
    {
      label: 'Anggota Aktif',
      value: stats.anggotaAktif.toLocaleString('id-ID'),
      icon: Users,
      color: 'blue' as const,
    },
    {
      label: 'Total Transaksi',
      value: stats.totalTransaksi.toLocaleString('id-ID'),
      icon: BarChart3,
      color: 'purple' as const,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map(({ label, value, icon: Icon, color, sub }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            icon={<Icon size={20} />}
            color={color}
            sub={sub}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {miniCards.map(({ label, value, icon: Icon, color }) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            icon={<Icon size={14} />}
            color={color}
            variant="mini"
          />
        ))}
      </div>
    </>
  );
}
