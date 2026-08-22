'use client';

import Button from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ReactNode } from 'react';

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  children?: ReactNode;
}

export function ErrorFallback({ error, onRetry, children }: ErrorFallbackProps) {
  const errorMessage = error?.message || 'Terjadi kesalahan yang tidak diketahui';

  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
      role="alert"
    >
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Terjadi Kesalahan
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
        {errorMessage}
      </p>
      {children && (
        <div className="mb-4 text-sm text-gray-500 dark:text-gray-500">
          {children}
        </div>
      )}
      <Button
        onClick={onRetry}
        variant="primary"
        className="gap-2"
        aria-label="Coba lagi"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Coba Lagi
      </Button>
    </div>
  );
}