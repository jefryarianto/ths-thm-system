'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  gambar?: string;
  tanggal: string;
  slug: string;
}

export default function BeritaPage() {
  const [data, setData] = useState<Berita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/public/berita');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json.data || []);
      } catch (error) {
        console.error('Error fetching berita:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatTanggal = (tanggal: string) => {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <PublicLayout>
      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <section className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-black text-blue-900 mb-8 text-center">Berita & Artikel</h1>
          <div className="grid gap-6">
            {data.map((berita) => (
              <article key={berita.id} className="bg-blue-50 rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-24 h-24 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-4xl">📰</span>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-blue-900 mb-2">{berita.judul}</h2>
                    <p className="text-gray-600 mb-3 line-clamp-2">{berita.ringkasan}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <time dateTime={berita.tanggal}>{formatTanggal(berita.tanggal)}</time>
                      <Link href={`/berita/${berita.slug}`} className="text-blue-700 hover:underline font-medium">
                        Baca selengkapnya
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </PublicLayout>
  );
}