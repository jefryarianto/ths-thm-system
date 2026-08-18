'use client';

import Link from 'next/link';
import { PublicLayout } from '@/components';

export function LandingPageContent() {
  return (
    <PublicLayout>
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-black text-blue-900 mb-6">
          TUNGGAL HATI SEMINARI<br />
          <span className="text-yellow-600">TUNGGAL HATI MARIA</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10">
          Sistem Manajemen Organisasi THS-THM — Kelola anggota, iuran, latihan, pendadaran, dan dokumentasi secara digital.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/daftar" className="bg-blue-900 text-white px-8 py-3 rounded-xl text-lg font-bold hover:bg-blue-800 shadow-lg">
            Daftar Anggota Baru
          </Link>
          <Link href="/login" className="border-2 border-blue-900 text-blue-900 px-8 py-3 rounded-xl text-lg font-bold hover:bg-blue-50">
            Masuk ke Dashboard
          </Link>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-blue-900 mb-12">Fitur Utama</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-blue-50 rounded-2xl p-8 border border-blue-100 hover:shadow-lg transition">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="text-xl font-bold text-blue-900 mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

const features = [
  { icon: '👥', title: 'Manajemen Anggota', desc: 'Kelola data anggota, calon anggota, dan riwayat keanggotaan.' },
  { icon: '💳', title: 'Iuran Online', desc: 'Pembayaran iuran dengan bukti transfer, verifikasi admin, dan QRIS.' },
  { icon: '🏋️', title: 'Latihan & Absensi', desc: 'Jadwal latihan, absensi QR, dan evaluasi anggota.' },
  { icon: '🎓', title: 'Pendadaran', desc: 'Aspek penilaian, input nilai penguji, dan sertifikat kelulusan.' },
  { icon: '📄', title: 'Dokumen Digital', desc: 'Kartu anggota digital, sertifikat PDF, piagam, dan QR validasi.' },
  { icon: '📱', title: 'Aplikasi Mobile', desc: 'Akses data, scan QR, dan notifikasi push dari smartphone.' },
];
