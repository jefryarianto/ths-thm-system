'use client';

import { useEffect, useState } from 'react';
import { PublicLayout } from '@/components';

interface Kepengurusan {
  id: string;
  nama: string;
  jabatan: string;
  foto?: string;
  periode: string;
}

export default function KepengurusanPage() {
  const [data, setData] = useState<Kepengurusan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/kepengurusan`);
    // const json = await res.json();
    // setData(json);
    setData([
      { id: '1', nama: 'Bpk. Antonius', jabatan: 'Ketua Umum', periode: '2024-2027' },
      { id: '2', nama: 'Ibu Maria', jabatan: 'Wakil Ketua', periode: '2024-2027' },
      { id: '3', nama: 'Bpk. Petrus', jabatan: 'Sekretaris', periode: '2024-2027' },
      { id: '4', nama: 'Ibu Yohanna', jabatan: 'Bendahara', periode: '2024-2027' },
    ]);
    setLoading(false);
  }, []);

  return (
    <PublicLayout>
      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <section className="max-w-4xl mx-auto px-4 py-16">
          <h1 className="text-4xl font-black text-blue-900 mb-8 text-center">Kepengurusan</h1>
          <p className="text-center text-gray-600 mb-12">Periode 2024 - 2027</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {data.map((pengurus) => (
              <div key={pengurus.id} className="bg-blue-50 rounded-2xl p-6 border border-blue-100 text-center hover:shadow-lg transition">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-3xl font-bold text-blue-900">
                    {pengurus.nama.charAt(0)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-blue-900 mb-1">{pengurus.nama}</h3>
                <p className="text-blue-700 font-medium mb-2">{pengurus.jabatan}</p>
                <p className="text-sm text-gray-500">{pengurus.periode}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </PublicLayout>
  );
}