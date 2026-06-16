'use client';

import type { LucideIcon } from 'lucide-react';
import StatCard from '@/components/cards/stat-card';

interface ReportsStatCardProps {
  label: string;
  value: string | number;
  color: string;
  icon: LucideIcon;
}

// Map ReportsStatCard raw color strings to StatCard color keys
type StatCardColor =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'red'
  | 'purple'
  | 'orange'
  | 'indigo'
  | 'teal'
  | 'pink'
  | 'cyan'
  | 'amber'
  | 'slate';

const colorMap: Record<string, StatCardColor> = {
  'text-blue-600': 'blue',
  'text-purple-600': 'purple',
  'text-green-600': 'green',
  'text-yellow-600': 'yellow',
  'text-orange-600': 'orange',
  'text-red-600': 'red',
  'text-indigo-600': 'indigo',
  'text-teal-600': 'teal',
  'text-pink-600': 'pink',
  'text-cyan-600': 'cyan',
  'text-amber-600': 'amber',
  'text-gray-600': 'slate',
};

export default function ReportsStatCard({ label, value, color, icon: Icon }: ReportsStatCardProps) {
  return (
    <StatCard
      label={label}
      value={value}
      icon={<Icon size={18} />}
      color={colorMap[color] || 'blue'}
      variant="mini"
    />
  );
}
