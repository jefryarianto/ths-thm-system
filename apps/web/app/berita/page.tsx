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
    // TODO: Replace with actual API call
    // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/berita`);
    // const json = await res.json();
    // setData(json);
    setData([
      {
        id: '1',
        judul: 'Pelantikan Kepengurusan Baru Periode 2024-2027',
        ringkasan: 'Acara pelantikan kepengurusan THS-THM cabang Pusat dilaksanakan di Gedung Serbaguna...',
        tanggal: '2024-01-15',
        slug: 'pelantikan-kepengurusan-baru',
      },
      {
        id: '2',
        judul: 'Latihan Rutin Mingguan Dibuka untuk Umum',
        ringkasan: 'Setiap hari Minggu pukul 07:00 WIB di Lapangan THS-THM, semua warga diundang ikut latihan...',
        tanggal: '2024-01-10',
        slug: 'latihan-rutin-mingguan',
      },
      {
        id: '3',
        judul: 'Donasi untuk Korban Bencana Alam',
        ringkasan: 'THS-THM menggalang dana untuk membantu saudara-saudara yang terdampak bencana banjir...',
        tanggal: '2024-01-05',
        slug: 'donasi-bencana-alam',
      },
    ]);
    setLoading(false);
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