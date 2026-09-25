'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import {
  ChevronRight,
  Heart,
  Copy,
  Check,
  Building,
  AlertCircle,
  X,
  QrCode,
  HeartHandshake,
} from 'lucide-react';
import { logError } from '@/lib/error-logger';

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<DonasiProgram | null>(null);

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
        logError(error, { module: 'Donasi', action: 'fetch' });
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatRupiah = (angka: number | string) => {
    return `Rp ${Number(angka).toLocaleString('id-ID')}`;
  };

  const handleCopyAccount = (id: string, accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const hasActivePrograms = programDonasi.length > 0;
  const qrisImage = bankInfo.find((b) => b.qrisImageUrl)?.qrisImageUrl;

  return (
    <PublicLayout>
      {/* Page Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">{t.nav.donasi}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">{t.donasi.title}</h1>
          <p className="text-white/70 mt-3 max-w-2xl text-base">{t.donasi.subtitle}</p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      {loading ? (
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
        </div>
      ) : (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          {/* Kondisi 1: Tidak Ada Program Donasi Aktif */}
          {!hasActivePrograms && (
            <div className="bg-gradient-to-br from-navy-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 sm:p-12 text-center border border-navy-100 dark:border-gray-700 shadow-sm max-w-3xl mx-auto">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center text-navy-800 dark:text-gold-400 mb-6">
                <HeartHandshake size={32} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-navy-800 dark:text-white mb-4">
                {t.donasi.noActiveNoticeTitle}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-base mb-6 max-w-xl mx-auto">
                {t.donasi.noActiveNoticeDesc}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/10 text-navy-800 dark:text-gold-300 text-sm font-semibold border border-gold-400/20">
                <AlertCircle size={16} />
                <span>Nomor rekening disembunyikan sampai kegiatan donasi dibuka kembali</span>
              </div>
            </div>
          )}

          {/* Kondisi 2: Ada Program Donasi Aktif */}
          {hasActivePrograms && (
            <>
              {/* Program Donasi Section */}
              <div>
                <h2 className="text-2xl font-bold text-navy-800 dark:text-white mb-6 font-serif flex items-center gap-2">
                  <Heart className="text-gold-500 fill-gold-400" size={24} />
                  {t.donasi.programTitle}
                </h2>

                <div className="grid gap-6">
                  {programDonasi.map((prog) => {
                    const persen = Math.min(
                      100,
                      Math.round((Number(prog.terkumpul) / Number(prog.targetDana)) * 100)
                    );
                    return (
                      <div
                        key={prog.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <h3 className="text-xl font-bold text-navy-800 dark:text-white">{prog.nama}</h3>
                          <span className="text-sm font-bold text-navy-900 dark:text-gold-400 px-3 py-1 bg-gold-100 dark:bg-navy-900 rounded-full">
                            {persen}%
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
                          {prog.deskripsi}
                        </p>

                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-gold-400 to-gold-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${persen}%` }}
                          />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-gray-500 dark:text-gray-400 mb-6 gap-2">
                          <span>
                            {t.donasi.terkumpul}:{' '}
                            <span className="font-bold text-navy-800 dark:text-gold-400 text-base">
                              {formatRupiah(Number(prog.terkumpul))}
                            </span>
                          </span>
                          <span>
                            {t.donasi.target}:{' '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {formatRupiah(Number(prog.targetDana))}
                            </span>
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedProgram(prog)}
                          className="flex items-center justify-center gap-2 w-full bg-gold-400 text-navy-900 py-3.5 rounded-xl hover:bg-gold-300 font-bold transition-all shadow-sm"
                        >
                          <Heart size={18} />
                          {t.donasi.donasiSekarang}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rekening Bank Section (Ditampilkan HANYA saat ada program donasi aktif) */}
              <div>
                <h2 className="text-2xl font-bold text-navy-800 dark:text-white mb-6 font-serif flex items-center gap-2">
                  <Building className="text-navy-800 dark:text-gold-400" size={24} />
                  {t.donasi.rekeningTitle}
                </h2>

                {bankInfo.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                    {bankInfo.map((rek) => (
                      <div
                        key={rek.id}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 text-center hover:shadow-md transition-all relative flex flex-col justify-between"
                      >
                        <div>
                          <div className="w-14 h-14 mx-auto rounded-2xl bg-navy-50 dark:bg-navy-900/50 flex items-center justify-center mb-4 text-navy-800 dark:text-gold-400">
                            <Building size={26} />
                          </div>
                          <h3 className="text-lg font-bold text-navy-800 dark:text-white mb-1">
                            {rek.bankName}
                          </h3>
                          <p className="font-mono text-xl text-navy-900 dark:text-gold-400 mb-1 font-bold tracking-wider">
                            {rek.accountNumber}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                            a.n. <span className="font-medium">{rek.accountName}</span>
                          </p>
                        </div>

                        <button
                          onClick={() => handleCopyAccount(rek.id, rek.accountNumber)}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            copiedId === rek.id
                              ? 'bg-green-600 text-white'
                              : 'bg-navy-50 dark:bg-gray-700 text-navy-800 dark:text-white hover:bg-navy-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          {copiedId === rek.id ? (
                            <>
                              <Check size={14} />
                              {t.donasi.accountCopied}
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              {t.donasi.copyAccount}
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">{t.donasi.emptyRekening}</p>
                )}
              </div>

              {/* QRIS Section */}
              {qrisImage && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-navy-50 dark:bg-navy-900 text-navy-800 dark:text-gold-400 font-semibold text-xs mb-4">
                    <QrCode size={16} />
                    <span>QRIS PAYMENT</span>
                  </div>
                  <h3 className="text-xl font-bold text-navy-800 dark:text-white mb-2 font-serif">
                    {t.donasi.qrisTitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 max-w-md mx-auto">
                    {t.donasi.qrisDesc}
                  </p>
                  <div className="p-4 bg-white rounded-2xl inline-block shadow-inner border border-gray-100">
                    <img
                      src={qrisImage}
                      alt="QRIS THS-THM"
                      className="w-56 h-56 mx-auto object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Modal Petunjuk Transfer Donasi */}
          {selectedProgram && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center text-navy-800 dark:text-gold-400">
                    <Heart size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-navy-800 dark:text-white">
                      {selectedProgram.nama}
                    </h3>
                    <p className="text-xs text-gray-500">{t.donasi.confirmTitle}</p>
                  </div>
                </div>

                <div className="space-y-4 my-6">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t.donasi.confirmDesc}
                  </p>

                  {bankInfo.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 flex justify-between items-center"
                    >
                      <div>
                        <div className="text-xs font-semibold text-gold-600 dark:text-gold-400">
                          {b.bankName}
                        </div>
                        <div className="font-mono font-bold text-navy-900 dark:text-white text-base">
                          {b.accountNumber}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">a.n. {b.accountName}</div>
                      </div>
                      <button
                        onClick={() => handleCopyAccount(b.id, b.accountNumber)}
                        className="px-3 py-1.5 rounded-lg bg-navy-800 text-white text-xs font-medium hover:bg-navy-700 transition-colors flex items-center gap-1 shrink-0"
                      >
                        {copiedId === b.id ? <Check size={12} /> : <Copy size={12} />}
                        {copiedId === b.id ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSelectedProgram(null)}
                  className="w-full py-3 bg-gold-400 text-navy-900 rounded-xl font-bold hover:bg-gold-300 transition-colors"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </PublicLayout>
  );
}
