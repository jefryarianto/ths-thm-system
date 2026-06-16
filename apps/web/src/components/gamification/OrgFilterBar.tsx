'use client';

import { Filter, X } from 'lucide-react';
import type { OrgNode } from '@/lib/hooks/use-org-filter';

interface OrgFilterBarProps {
  selectedDistrik: string;
  onDistrikChange: (value: string) => void;
  selectedWilayah: string;
  onWilayahChange: (value: string) => void;
  selectedRanting: string;
  onRantingChange: (value: string) => void;
  orgTree: OrgNode[];
  availableWilayahs: OrgNode[];
  availableRantings: OrgNode[];
  filterActive: boolean;
  onClearFilters: () => void;
}

export default function OrgFilterBar({
  selectedDistrik,
  onDistrikChange,
  selectedWilayah,
  onWilayahChange,
  selectedRanting,
  onRantingChange,
  orgTree,
  availableWilayahs,
  availableRantings,
  filterActive,
  onClearFilters,
}: OrgFilterBarProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase">Filter</span>

        {/* Distrik */}
        <select
          value={selectedDistrik}
          onChange={(e) => onDistrikChange(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Semua Distrik</option>
          {orgTree.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nama}
            </option>
          ))}
        </select>

        {/* Wilayah */}
        <select
          value={selectedWilayah}
          onChange={(e) => onWilayahChange(e.target.value)}
          disabled={!selectedDistrik}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Semua Wilayah</option>
          {availableWilayahs.map((w) => (
            <option key={w.id} value={w.id}>
              {w.nama}
            </option>
          ))}
        </select>

        {/* Ranting */}
        <select
          value={selectedRanting}
          onChange={(e) => onRantingChange(e.target.value)}
          disabled={!selectedWilayah}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Semua Ranting</option>
          {availableRantings.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nama}
            </option>
          ))}
        </select>

        {filterActive && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 ml-auto"
          >
            <X size={14} />
            Hapus filter
          </button>
        )}
      </div>
    </div>
  );
}
