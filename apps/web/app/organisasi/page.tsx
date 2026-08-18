import Link from 'next/link';

export default function OrganisasiPage() {
  const struktur = [
    { jabatan: 'Ketua Umum', nama: '-', deskripsi: 'Memimpin seluruh organisasi' },
    { jabatan: 'Wakil Ketua', nama: '-', deskripsi: 'Membantu ketua umum' },
    { jabatan: 'Sekretaris', nama: '-', deskripsi: 'Mengurus administrasi' },
    { jabatan: 'Bendahara', nama: '-', deskripsi: 'Mengelola keuangan' },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black text-blue-900 mb-8 text-center">Struktur Organisasi</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {struktur.map((item, idx) => (
            <div key={idx} className="bg-blue-50 rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-blue-900 mb-2">{item.jabatan}</h3>
              <p className="text-blue-700 font-medium mb-2">{item.nama}</p>
              <p className="text-gray-600">{item.deskripsi}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}