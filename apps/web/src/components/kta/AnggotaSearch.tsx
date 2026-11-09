'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { searchAnggota } from '@/lib/kta/api';
import type { Anggota } from '@/components/kta/types';

export function AnggotaSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Anggota[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      try {
        const data = await searchAnggota(q);
        setResults(data);
      } catch {
        setResults([]);
      }
    });
  };

  return (
    <section className="space-y-4">
      <div className="relative">
        <input
          type="search"
          placeholder="Cari nama atau nomor anggota..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
        />
        {isPending && (
          <span className="text-sm text-gray-500 block mt-2">Mencari...</span>
        )}
      </div>

      <ul className="results divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-sm">
        {results.map((a) => (
          <li key={a.nomor} className="hover:bg-gray-50 transition-colors">
            <Link
              href={`/admin/kta/${a.nomor}`}
              className="block p-4 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <strong>{a.nama}</strong> — {a.nomor} ({a.ranting})
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
