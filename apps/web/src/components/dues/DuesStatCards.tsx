'use client';

import { Wallet, Receipt, AlertTriangle, TrendingUp } from 'lucide-react';

interface DuesStats {
  totalIuran: number;
  totalTransaksi: number;
  totalLunas: number;
  totalMenunggak: number;
  iuranBulanIni: number;
  lunasBulanIni: number;
  belumBayarBulanIni: number;
  anggotaAktif: number;
}

export function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

const cards = [
  {
    key: 'totalIuran',
    label: 'Total Iuran Terkumpul',
    icon: Wallet,
    color: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    format: true,
  },
  {
    key: 'totalTransaksi',
    label: 'Total Transaksi',
    icon: Receipt,
    color: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
    format: false,
  },
  {
    key: 'totalMenunggak',
    label: 'Total Menunggak',
    icon: AlertTriangle,
    color: 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400',
    format: true,
  },
  {
    key: 'iuranBulanIni',
    label: 'Iuran Bulan Ini',
    icon: TrendingUp,
    color: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
    format: true,
  },
];

export default function DuesStatCards({ stats }: { stats: DuesStats | null }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof DuesStats] as number;
        return (
          <div
            key={card.key}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {card.format ? formatRupiah(value) : value.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
