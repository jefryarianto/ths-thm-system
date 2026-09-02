'use client';

import { Plus, X, BookOpen } from 'lucide-react';

export interface MateriItem {
  kategori: string;
  detail: string;
}

export const KATEGORI_MATERI_OPTIONS = [
  { value: 'pencak_silat', label: 'Pencak Silat', icon: '🥋' },
  { value: 'organisasi', label: 'Organisasi', icon: '🏛️' },
  { value: 'mental_spiritual', label: 'Mental Spiritual', icon: '🧘' },
  { value: 'rekreasi', label: 'Rekreasi', icon: '🎉' },
] as const;

export const KATEGORI_MATERI_LABELS: Record<string, string> = Object.fromEntries(
  KATEGORI_MATERI_OPTIONS.map((o) => [o.value, o.label]),
);

interface MateriMultiSelectProps {
  value: MateriItem[];
  onChange: (items: MateriItem[]) => void;
  disabled?: boolean;
}

/**
 * Multi-select card UI for choosing training material categories
 * (Pencak Silat, Organisasi, Mental Spiritual, Rekreasi) with
 * free-form detail text per category.
 */
export default function MateriMultiSelect({ value, onChange, disabled }: MateriMultiSelectProps) {
  const selectedKategoris = new Set(value.map((v) => v.kategori));

  const toggle = (kategori: string) => {
    if (selectedKategoris.has(kategori)) {
      onChange(value.filter((v) => v.kategori !== kategori));
    } else {
      onChange([...value, { kategori, detail: '' }]);
    }
  };

  const updateDetail = (kategori: string, detail: string) => {
    onChange(value.map((v) => (v.kategori === kategori ? { ...v, detail } : v)));
  };

  return (
    <div className="space-y-3">
      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {KATEGORI_MATERI_OPTIONS.map((opt) => {
          const active = selectedKategoris.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                active
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
              {active && <X size={14} className="ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* Detail inputs for selected categories */}
      {value.length > 0 && (
        <div className="space-y-3 mt-3">
          {value.map((item) => {
            const opt = KATEGORI_MATERI_OPTIONS.find((o) => o.value === item.kategori);
            if (!opt) return null;
            return (
              <div key={item.kategori} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <BookOpen size={14} className="text-gray-400" />
                  {opt.icon} {opt.label}
                </label>
                <textarea
                  value={item.detail}
                  onChange={(e) => updateDetail(item.kategori, e.target.value)}
                  disabled={disabled}
                  rows={2}
                  placeholder={`Detail materi ${opt.label} (opsional)...`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                />
              </div>
            );
          })}
        </div>
      )}

      {value.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
          <Plus size={12} />
          Klik kategori di atas untuk menambahkan materi latihan
        </p>
      )}
    </div>
  );
}
