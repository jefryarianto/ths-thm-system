'use client';

import type { Badge } from '@/app/(dashboard)/gamification/types';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './constants';

interface BadgeGridProps {
  badges: Badge[];
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Semua Badge</h3>
        <p className="text-xs text-gray-500 mt-0.5">{badges.length} badge tersedia</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="relative p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-center group"
          >
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
              {badge.icon}
            </div>
            <p className="text-sm font-medium text-gray-900">{badge.name}</p>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{badge.description}</p>
            <span
              className="mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: CATEGORY_COLORS[badge.category] || '#6b7280' }}
            >
              {CATEGORY_LABELS[badge.category] || badge.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
