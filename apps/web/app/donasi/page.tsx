'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { ChevronRight, Heart } from 'lucide-react';

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
  const { t } = useI18n();
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

  const qrisImage = bankInfo.find((b) => b.qrisImageUrl)?.qrisImageUrl;

  return (
    <PublicLayout>
      {/* Page Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">{t.nav.donasi}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white font-serif">{t.donasi.title}</h1>
          <p className="text-white/70 mt-3 max-w-2xl">{t.donasi.subtitle}</p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      ) : (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          {/* Bank Info */}
          <div>
            <h2 className="text-2xl font-bold text-navy-800 mb-6 font-serif">{t.donasi.rekeningTitle}</h2>
            {bankInfo.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {bankInfo.map((rek) => (
                  <div key={rek.id} className="bg-white rounded-xl p-6 border border-gray-100 text-center hover:shadow-lg transition-all group">
                    <div className="w-14 h-14 mx-auto rounded-xl bg-gold-50 flex items-center justify-center mb-4 group-hover:bg-navy-800 transition-colors">
                      <span className="text-2xl">🏦</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{rek.bankName}</h3>
                    <p className="font-mono text-lg text-navy-800 mb-1 font-semibold">{rek.accountNumber}</p>
                    <p className="text-sm text-gray-500">a.n. {rek.accountName}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">{t.donasi.emptyRekening}</p>
            )}
          </div>

          {/* Program Donasi */}
          <div>
            <h2 className="text-2xl font-bold text-navy-800 mb-6 font-serif">{t.donasi.programTitle}</h2>
            {programDonasi.length > 0 ? (
              <div className="grid gap-6">
                {programDonasi.map((prog) => {
                  const persen = Math.round((Number(prog.terkumpul) / Number(prog.targetDana)) * 100);
                  return (
                    <div key={prog.id} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900">{prog.nama}</h3>
                        <span className="text-sm text-navy-800 font-bold">{persen}%</span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{prog.deskripsi}</p>
                      <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
                        <div
                          className="bg-gradient-to-r from-navy-400 to-navy-800 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${persen}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm text-gray-500 mb-4">
                        <span>Terkumpul: <span className="font-semibold text-navy-800">{formatRupiah(Number(prog.terkumpul))}</span></span>
                        <span>Target: <span className="font-semibold text-gray-700">{formatRupiah(Number(prog.targetDana))}</span></span>
                      </div>
                      <Link
                        href="/daftar"
                        className="flex items-center justify-center gap-2 w-full bg-gold-400 text-white py-2.5 rounded-xl hover:bg-gold-500 transition-all duration-200 font-bold transition-colors"
                      >
                        <Heart size={16} />
                        {t.donasi.donasiSekarang}
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-400 py-8">{t.donasi.emptyProgram}</p>
            )}
          </div>

          {/* QRIS */}
          {qrisImage && (
            <div className="bg-navy-50 rounded-xl p-8 text-center border border-navy-100">
              <h3 className="text-xl font-bold text-navy-800 mb-3 font-serif">{t.donasi.qrisTitle}</h3>
              <p className="text-gray-600 mb-4">{t.donasi.qrisDesc}</p>
              <img
                src={qrisImage}
                alt="QRIS THS-THM"
                className="w-48 h-48 mx-auto object-contain rounded-lg"
              />
            </div>
          )}
        </section>
      )}
    </PublicLayout>
  );
}
