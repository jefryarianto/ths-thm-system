'use client';

import { useEffect } from 'react';
import { logError } from '@/lib/error-logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, { module: 'GlobalError', action: 'global-error' });
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '3.75rem', fontWeight: 'bold', color: '#d1d5db' }}>500</h1>
            <h2
              style={{
                marginTop: '1rem',
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#1f2937',
              }}
            >
              Terjadi Kesalahan
            </h2>
            <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
              Maaf, terjadi kesalahan pada server. Silakan coba lagi.
            </p>
            <button
              onClick={() => reset()}
              style={{
                marginTop: '1.5rem',
                padding: '0.75rem 1.5rem',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
              }}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
