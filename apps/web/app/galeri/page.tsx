'use client';

import { useEffect, useState } from 'react';

interface GambarGaleri {
  id: string;
  url: string;
  judul: string;
  deskripsi?: string;
  kategori: string;
}

export default function GaleriPage() {
  const [data, setData] = useState<GambarGaleri[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/galeri`);
    // const json = await res.json();
    // setData(json);
    setData([
      { id: '1', url: '/placeholder-1.jpg', judul: 'Latihan Rutin', deskripsi: 'Anggota latihan di lapangan', kategori: 'Latihan' },
      { id: '2', url: '/placeholder-2.jpg', judul: 'Pelantikan', deskripsi: 'Acara pelantikan kepengurusan', kategori: 'Acara' },
      { id: '3', url: '/placeholder-3.jpg', judul: 'Bakti Sosial', deskripsi: 'Kegiatan bakti sosial komunitas', kategori: 'Sosial' },
      { id: '4', url: '/placeholder-4.jpg', judul: 'Pendadaran', deskripsi: 'Proses pendadaran anggota', kategori: 'Pendidikan' },
      { id: '5', url: '/placeholder-5.jpg', judul: 'Rapat Tahunan', deskripsi: 'Rapat kerja tahunan', kategori: 'Rapat' },
      { id: '6', url: '/placeholder-6.jpg', judul: 'Outing Anggota', deskripsi: 'Kegiatan outing bersama', kategori: 'Kegiatan' },
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black text-blue-900 mb-8 text-center">Galeri</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <div key={item.id} className="group relative bg-blue-50 rounded-2xl overflow-hidden border border-blue-100 hover:shadow-lg transition aspect-[4/3]">
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                <span className="text-6xl opacity-50 group-hover:opacity-100 transition-opacity">🖼️</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4">
                <div className="absolute bottom-0 left-0 right-0 text-white">
                  <p className="text-xs text-blue-200 uppercase tracking-wide mb-1">{item.kategori}</p>
                  <h3 className="font-bold text-lg">{item.judul}</h3>
                  {item.deskripsi && <p className="text-sm opacity-80 mt-1">{item.deskripsi}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {data.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-2">Belum ada foto</p>
            <p>Galeri akan segera diisi dengan momen-momen indah THS-THM</p>
          </div>
        )}
      </section>
    </div>
  );
}