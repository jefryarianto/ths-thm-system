'use client';
import { ShieldAlert } from 'lucide-react';

export default function AuditLogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-md">
        <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Gagal memuat Audit Log
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {error.message || 'Terjadi kesalahan saat memuat data audit log.'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
