'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';

interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl?: string;
}

interface DonasiProgram {
  id: string;
  nama: string;
  deskripsi: string;
  targetDana: number;
  terkumpul: number;
}

export default function DonasiPage() {
  const [bankInfo, setBankInfo] = useState<BankInfo[]>([]);
  const [programDonasi, setProgramDonasi] = useState<DonasiProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bankRes, donasiRes] = await Promise.all([
          fetch('/api/public/bank-info'),
          fetch('/api/public/donasi-program'),
        ]);

        if (bankRes.ok) {
          const bankJson = await bankRes.json();
          setBankInfo(bankJson.data || []);
        }

        if (donasiRes.ok) {
          const donasiJson = await donasiRes.json();
          setProgramDonasi(donasiJson.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
  };

  // Find QRIS image from bank info (if any bank has qrisImageUrl)
  const qrisImage = bankInfo.find((b) => b.qrisImageUrl)?.qrisImageUrl;

  return (
    <PublicLayout>
      <section className="max-w-4xl mx-auto px-4 py-8 sm:py-16">
        <h1 className="text-2xl sm:text-4xl font-black text-blue-900 mb-4 text-center">Donasi</h1>
        <p className="text-center text-gray-600 mb-8 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base">
          Dukung kegiatan THS-THM dengan donasi Anda. Setiap kontribusi, besar maupun kecil,
          sangat berarti untuk kelangsungan program-program kami.
        </p>

        {/* Bank Info dari Backend */}
        <div className="mb-10 sm:mb-16">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4 sm:mb-6 text-center">Rekening Donasi</h2>
          {bankInfo.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {bankInfo.map((rek) => (
                <div key={rek.id} className="bg-blue-50 rounded-2xl p-4 sm:p-6 border border-blue-100 text-center hover:shadow-lg transition">
                  <div className="text-4xl mb-3">🏦</div>
                <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-2">{rek.bankName}</h3>
                <p className="font-mono text-base sm:text-lg text-blue-700 mb-1">{rek.accountNumber}</p>
                  <p className="text-gray-600">a.n. {rek.accountName}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">Informasi rekening belum tersedia</p>
          )}
        </div>

        {/* Program Donasi dari Backend */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-blue-900 mb-4 sm:mb-6 text-center">Program Donasi Saat Ini</h2>
          {programDonasi.length > 0 ? (
            <div className="grid gap-4 sm:gap-6">
              {programDonasi.map((prog) => {
                const persen = Math.round((Number(prog.terkumpul) / Number(prog.targetDana)) * 100);
                return (
                  <div key={prog.id} className="bg-blue-50 rounded-2xl p-4 sm:p-6 border border-blue-100 hover:shadow-lg transition">
                    <div className="flex justify-between mb-2">
                      <h3 className="text-lg font-bold text-blue-900">{prog.nama}</h3>
                      <span className="text-sm text-blue-700 font-medium">{persen}%</span>
                    </div>
                    <div className="w-full bg-blue-100 rounded-full h-2.5 mb-3">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${persen}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Terkumpul: <span className="font-medium text-blue-900">{formatRupiah(Number(prog.terkumpul))}</span></span>
                      <span>Target: <span className="font-medium text-blue-900">{formatRupiah(Number(prog.targetDana))}</span></span>
                    </div>
                    <Link
                      href="/daftar"
                      className="mt-4 block w-full text-center bg-blue-900 text-white py-2 rounded-lg hover:bg-blue-800 font-medium transition"
                    >
                      Donasi Sekarang
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500">Belum ada program donasi aktif</p>
          )}
        </div>

        {/* QRIS dari Backend (jika ada) */}
        {qrisImage && (
          <div className="mt-16 p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
            <h3 className="text-xl font-bold text-blue-900 mb-3">Donasi QRIS</h3>
            <p className="text-gray-600 mb-4">Scan kode QRIS di bawah untuk donasi cepat via e-wallet</p>
            <img
              src={qrisImage}
              alt="QRIS THS-THM"
              className="w-48 h-48 mx-auto object-contain"
            />
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
