'use client';

import { Users, Zap, Award, Target } from 'lucide-react';
import StatCard from '@/components/cards/stat-card';
import type { GamificationStats } from '@/app/(dashboard)/gamification/types';

const statConfigs = [
  { key: 'totalMembers' as const, label: 'Peserta Aktif', icon: Users, color: 'blue' as const },
  { key: 'totalPointsAwarded' as const, label: 'Total Poin', icon: Zap, color: 'yellow' as const },
  { key: 'badgesAwarded' as const, label: 'Badge Diraih', icon: Award, color: 'green' as const },
  { key: 'totalEvents' as const, label: 'Total Aktivitas', icon: Target, color: 'purple' as const },
];

interface StatCardsProps {
  stats: GamificationStats;
}

export default function StatCards({ stats }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statConfigs.map(({ key, label, icon: Icon, color }) => {
        const value = (stats[key] ?? 0).toLocaleString('id-ID');
        return (
          <StatCard key={key} label={label} value={value} icon={<Icon size={22} />} color={color} />
        );
      })}
    </div>
  );
}
