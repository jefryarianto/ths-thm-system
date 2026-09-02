import type { ComponentType } from 'react';
import DetailRow from '@/components/ui/detail-row';

export const MATERI_OPTIONS = [
  { value: '', label: 'Semua Materi' },
  { value: 'pencak_silat', label: 'Pencak Silat' },
  { value: 'organisasi', label: 'Organisasi' },
  { value: 'mental_spiritual', label: 'Mental Spiritual' },
  { value: 'rekreasi', label: 'Rekreasi' },
  { value: 'teknik_dasar', label: 'Teknik Dasar' },
  { value: 'kata', label: 'Kata' },
  { value: 'kumite', label: 'Kumite' },
  { value: 'fisik', label: 'Fisik' },
  { value: 'teori', label: 'Teori' },
  { value: 'lainnya', label: 'Lainnya' },
];

export const MATERI_LABELS: Record<string, string> = {
  pencak_silat: 'Pencak Silat',
  organisasi: 'Organisasi',
  mental_spiritual: 'Mental Spiritual',
  rekreasi: 'Rekreasi',
  teknik_dasar: 'Teknik Dasar',
  kata: 'Kata',
  kumite: 'Kumite',
  fisik: 'Fisik',
  teori: 'Teori',
  lainnya: 'Lainnya',
};

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface InfoRowProps {
  icon: ComponentType<{ size?: string | number; className?: string }>;
  label: string;
  value: string | null | undefined;
}

export function InfoRow({ icon, label, value }: InfoRowProps) {
  return <DetailRow icon={icon} label={label} value={value ?? null} hoverable={false} />;
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
      <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
