'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchAnggota } from '@/lib/kta/api';
import { KtaAdminPreview } from '@/components/kta/KtaAdminPreview';
import type { Anggota } from '@/components/kta/types';

/**
 * Fetches KTA data on the client so the bearer token from localStorage is
 * available (server components cannot read it).
 */
export function KtaAdminLoader({ id }: { id: string }) {
  const router = useRouter();
  const [anggota, setAnggota] = useState<Anggota | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setAnggota(null);
    setError(null);
    fetchAnggota(id)
      .then((data) => {
        if (!active) return;
        if (!data) {
          setError('Anggota tidak ditemukan');
          return;
        }
        setAnggota(data);
      })
      .catch(() => {
        if (active) setError('Anggota tidak ditemukan');
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return (
      <main className="container mx-auto p-6 max-w-4xl space-y-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Kembali
        </button>
      </main>
    );
  }

  if (!anggota) {
    return (
      <div className="flex justify-center py-20" role="status" aria-label="Memuat data KTA">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="container mx-auto p-6 max-w-4xl">
      <KtaAdminPreview anggota={anggota} />
    </main>
  );
}
