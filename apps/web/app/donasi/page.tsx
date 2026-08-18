import Link from 'next/link';

export default function DonasiPage() {
  const rekening = [
    { bank: 'Bank BCA', nomor: '1234567890', atasNama: 'Yayasan THS-THM' },
    { bank: 'Bank Mandiri', nomor: '0987654321', atasNama: 'Yayasan THS-THM' },
    { bank: 'Bank BRI', nomor: '1122334455', atasNama: 'Yayasan THS-THM' },
  ];

  const programDonasi = [
    { judul: 'Operasional Latihan', target: 'Rp 50.000.000', terkumpul: 'Rp 12.500.000', persen: 25 },
    { judul: 'Bantuan Sosial', target: 'Rp 100.000.000', terkumpul: 'Rp 45.000.000', persen: 45 },
    { judul: 'Pembangunan Gedung', target: 'Rp 500.000.000', terkumpul: 'Rp 125.000.000', persen: 25 },
  ];

  return (
    <div className="min-h-screen bg-white">
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-black text-blue-900 mb-4 text-center">Donasi</h1>
        <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
          Dukung kegiatan THS-THM dengan donasi Anda. Setiap kontribusi, besar maupun kecil,
          sangat berarti untuk kelangsungan program-program kami.
        </p>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center">Rekening Donasi</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {rekening.map((rek, idx) => (
              <div key={idx} className="bg-blue-50 rounded-2xl p-6 border border-blue-100 text-center hover:shadow-lg transition">
                <div className="text-4xl mb-3">🏦</div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">{rek.bank}</h3>
                <p className="font-mono text-lg text-blue-700 mb-1">{rek.nomor}</p>
                <p className="text-gray-600">a.n. {rek.atasNama}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center">Program Donasi Saat Ini</h2>
          <div className="grid gap-6">
            {programDonasi.map((prog, idx) => (
              <div key={idx} className="bg-blue-50 rounded-2xl p-6 border border-blue-100 hover:shadow-lg transition">
                <div className="flex justify-between mb-2">
                  <h3 className="text-lg font-bold text-blue-900">{prog.judul}</h3>
                  <span className="text-sm text-blue-700 font-medium">{prog.persen}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2.5 mb-3">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${prog.persen}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Terkumpul: <span className="font-medium text-blue-900">{prog.terkumpul}</span></span>
                  <span>Target: <span className="font-medium text-blue-900">{prog.target}</span></span>
                </div>
                <Link
                  href="/daftar"
                  className="mt-4 block w-full text-center bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800 font-medium transition"
                >
                  Donasi Sekarang
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
          <h3 className="text-xl font-bold text-blue-900 mb-3">Donasi Qris</h3>
          <p className="text-gray-600 mb-4">Scan kode QRIS di bawah untuk donasi cepat via e-wallet</p>
          <div className="w-48 h-48 mx-auto bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
            <span className="text-xl">📱 QRIS</span>
          </div>
        </div>
      </section>
    </div>
  );
}