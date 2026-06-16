'use client';

import { Users, UserCheck, Clock, AlertCircle } from 'lucide-react';
import StatCard from '@/components/cards/stat-card';

interface MemberStatCardsProps {
  stats: {
    total: number;
    aktif: number;
    pendingValidasi: number;
    incomplete: number;
  };
}

const statConfigs = [
  { label: 'Total Anggota', valueKey: 'total' as const, icon: Users, color: 'blue' as const },
  { label: 'Aktif', valueKey: 'aktif' as const, icon: UserCheck, color: 'green' as const },
  {
    label: 'Pending Validasi',
    valueKey: 'pendingValidasi' as const,
    icon: Clock,
    color: 'orange' as const,
  },
  {
    label: 'Data Incomplete',
    valueKey: 'incomplete' as const,
    icon: AlertCircle,
    color: 'slate' as const,
  },
];

export default function MemberStatCards({ stats }: MemberStatCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statConfigs.map(({ label, valueKey, icon: Icon, color }) => (
        <StatCard
          key={valueKey}
          label={label}
          value={stats[valueKey].toLocaleString('id-ID')}
          icon={<Icon size={18} />}
          color={color}
          variant="mini"
        />
      ))}
    </div>
  );
}
