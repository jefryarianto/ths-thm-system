'use client';

import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import type { Badge } from '@/app/(dashboard)/gamification/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './constants';

interface BadgeDistributionChartProps {
  badges: Badge[];
}

export default function BadgeDistributionChart({ badges }: BadgeDistributionChartProps) {
  const categoryData = badges.reduce(
    (acc, b) => {
      acc[b.category] = (acc[b.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieData = Object.entries(categoryData).map(([cat, count]) => ({
    name: CATEGORY_LABELS[cat] || cat,
    value: count,
    color: CATEGORY_COLORS[cat] || '#6b7280',
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Distribusi Badge</h3>
        <p className="text-xs text-gray-500 mt-0.5">Berdasarkan kategori</p>
      </div>
      {pieData.length > 0 ? (
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [value.toLocaleString('id-ID'), 'Badge']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          Belum ada badge
        </div>
      )}
    </div>
  );
}
