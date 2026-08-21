'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function AuditLogsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retried, setRetried] = useState(false);

  // Log the full error for debugging
  useEffect(() => {
    console.error('[AuditLogs Error Boundary]', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center max-w-md">
        <ShieldAlert size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Gagal memuat Audit Log
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {error.message || 'Terjadi kesalahan saat memuat data audit log.'}
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setRetried(true);
              reset();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
          >
            <RefreshCw size={14} className={retried ? 'animate-spin' : ''} />
            Coba Lagi
          </button>
          <a
            href="/members"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
