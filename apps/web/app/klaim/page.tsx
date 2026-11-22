'use client';

import { useEffect, useState } from 'react';
import { SmallLogoSpinner } from '@/components/ui/logo-spinner';
import Link from 'next/link';
import {
  IdCard,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';
import { FileUploadZone, FileWithPreview } from '@/components/claims/FileUploadZone';
import { buildPublicClaimFormData } from '@/components/claims/public-claim-payload';

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const INPUT_CLASS = "w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm";

interface Ranting {
  id: string;
  nama: string;
  kodeRanting?: string;
  wilayahId?: string;
}

interface Wilayah {
  id: string;
  nama: string;
  kodeWilayah?: string;
  distrikId?: string;
}

interface Distrik {
  id: string;
  nama: string;
  kodeDistrik?: string;
}

export default function KlaimPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Cascade dropdown states
  const [distriks, setDistriks] = useState<Distrik[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [rantings, setRantings] = useState<Ranting[]>([]);
  const [selectedDistrikId, setSelectedDistrikId] = useState<string>('');
  const [selectedWilayahId, setSelectedWilayahId] = useState<string>('');
  const [rantingId, setRantingId] = useState<string>('');

  const [form, setForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    tempatDadar: '',
    tahunDadar: '',
    alamat: '',
    noHp: '',
    email: '',
    catatan: '',
    modeBukti: 'unggah',
    ceritaHistori: '',
  });
  const [trackingToken, setTrackingToken] = useState('');
  const [buktiFiles, setBuktiFiles] = useState<FileWithPreview[]>([]);

  // Loading states for each dropdown
  const [distrikLoading, setDistrikLoading] = useState<boolean>(true);
  const [wilayahLoading, setWilayahLoading] = useState<boolean>(false);
  const [rantingLoading, setRantingLoading] = useState<boolean>(false);

  // Error states for dropdowns
  const [distrikError, setDistrikError] = useState<string | null>(null);
  const [wilayahError, setWilayahError] = useState<string | null>(null);
  const [rantingError, setRantingError] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Fetch all distriks on mount
  useEffect(() => {
    let active = true;
    const fetchDistriks = async () => {
      setDistrikLoading(true);
      setDistrikError(null);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${PUBLIC_API_URL}/api/public/struktur/distrik`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (active) {
          setDistriks(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (err) {
        if (active) {
          if (err instanceof Error && err.name === 'AbortError') {
            setDistrikError('Permintaan timeout. Silakan coba lagi.');
          } else {
            setDistrikError(`Gagal memuat: ${err instanceof Error ? err.message : 'Unknown error'}. Coba lagi?`);
          }
          setDistriks([]);
        }
      } finally {
        if (active) {
          setDistrikLoading(false);
        }
      }
    };

    fetchDistriks();
    return () => {
      active = false;
    };
  }, []);

  // Fetch wilayahs when distrik changes
  useEffect(() => {
    let active = true;
    const fetchWilayahs = async () => {
      if (!selectedDistrikId) {
        setWilayahs([]);
        setSelectedWilayahId('');
        setRantings([]);
        setRantingId('');
        setWilayahLoading(false);
        return;
      }

      setWilayahLoading(true);
      setWilayahError(null);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(
          `${PUBLIC_API_URL}/api/public/struktur/wilayah?distrikId=${encodeURIComponent(selectedDistrikId)}`,
          { signal: controller.signal },
        );
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (active) {
          setWilayahs(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (err) {
        if (active) {
          if (err instanceof Error && err.name === 'AbortError') {
            setWilayahError('Permintaan timeout. Silakan coba lagi.');
          } else {
            setWilayahError(`Gagal memuat: ${err instanceof Error ? err.message : 'Unknown error'}. Coba lagi?`);
          }
          setWilayahs([]);
        }
      } finally {
        if (active) {
          setWilayahLoading(false);
        }
      }
    };

    fetchWilayahs();
    return () => {
      active = false;
    };
  }, [selectedDistrikId]);

  // Fetch rantings when wilayah changes
  useEffect(() => {
    let active = true;
    const fetchRantings = async () => {
      if (!selectedWilayahId) {
        setRantings([]);
        setRantingId('');
        setRantingLoading(false);
        return;
      }

      setRantingLoading(true);
      setRantingError(null);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(
          `${PUBLIC_API_URL}/api/public/struktur/ranting?wilayahId=${encodeURIComponent(selectedWilayahId)}`,
          { signal: controller.signal },
        );
        clearTimeout(timeout);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (active) {
          setRantings(Array.isArray(data?.data) ? data.data : []);
        }
      } catch (err) {
        if (active) {
          if (err instanceof Error && err.name === 'AbortError') {
            setRantingError('Permintaan timeout. Silakan coba lagi.');
          } else {
            setRantingError(`Gagal memuat: ${err instanceof Error ? err.message : 'Unknown error'}. Coba lagi?`);
          }
          setRantings([]);
        }
      } finally {
        if (active) {
          setRantingLoading(false);
        }
      }
    };

    fetchRantings();
    return () => {
      active = false;
    };
  }, [selectedWilayahId]);

  const handleBuktiChange = (files: FileWithPreview[]) => setBuktiFiles(files);
  const handleBuktiRemove = (index: number) => {
    URL.revokeObjectURL(buktiFiles[index].preview);
    setBuktiFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.namaLengkap.trim().length < 3) errs.namaLengkap = 'Nama lengkap minimal 3 karakter';
    if (!selectedDistrikId) errs.distrikId = 'Pilih distrik';
    if (!selectedWilayahId) errs.wilayahId = 'Pilih wilayah';
    if (!rantingId) errs.rantingId = 'Pilih ranting';
    if (!form.tempatLahir.trim()) errs.tempatLahir = 'Tempat lahir wajib diisi';
    if (!form.tanggalLahir) errs.tanggalLahir = 'Tanggal lahir wajib diisi';
    if (!form.tempatDadar.trim()) errs.tempatDadar = 'Tempat pendadaran wajib diisi';
    if (!form.tahunDadar.trim()) errs.tahunDadar = 'Tahun pendadaran wajib diisi';
    if (!form.alamat.trim()) errs.alamat = 'Alamat wajib diisi';
    if (!form.email.trim()) errs.email = 'Email wajib diisi';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Format email tidak valid';
    if (form.noHp && !/^(\+?62|0)\d{8,13}$/.test(form.noHp.replace(/[\s-]/g, '')))
      errs.noHp = 'Format No. HP tidak valid (mulai 0 atau +62, 9-14 digit)';
    if (form.modeBukti === 'unggah' && buktiFiles.length === 0)
      errs.buktiFiles = 'Unggah minimal satu berkas bukti';
    if (form.modeBukti === 'cerita') {
      const panjang = form.ceritaHistori.trim().length;
      if (panjang < 20 || panjang > 1000)
        errs.ceritaHistori = 'Cerita histori harus antara 20 sampai 1000 karakter';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (submitting) return;

    setLoading(true);
    setSubmitting(true);
    setErrorMsg('');

    try {
      const formData = buildPublicClaimFormData(form, rantingId, buktiFiles);

      const res = await fetch(`${PUBLIC_API_URL}/api/claims`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Klaim gagal diajukan. Silakan coba lagi.');
      }

      setTrackingToken(data?.data?.trackingToken || '');
      setStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
      setErrorMsg(message);
      setStep('form');
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <PublicLayout>
        <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
              <Link href="/" className="hover:text-white transition-colors">
                Beranda
              </Link>
              <ChevronRight size={14} />
              <span className="text-gold-400">{t.nav.klaim}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              Klaim Berhasil!
            </h1>
            <p className="text-white/70 mt-3 max-w-2xl text-base">
              Klaim Anda telah kami terima. Tim admin akan memproses klaim Anda dan menghubungi
              melalui nomor HP atau email yang didaftarkan.
            </p>
            <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={36} className="text-green-600 dark:text-green-400" />
            </div>
            {trackingToken && (
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                Simpan tautan ini untuk memantau klaim Anda:{' '}
                <Link
                  href={`/klaim/${trackingToken}`}
                  className="font-medium text-navy-600 dark:text-navy-400 hover:underline"
                >
                  Lacak status klaim
                </Link>
              </p>
            )}
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition font-medium"
            >
              <ArrowLeft size={18} />
              Kembali ke Login
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="bg-gradient-to-r from-navy-700 to-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-white/60 text-sm mb-2">
            <Link href="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <ChevronRight size={14} />
            <span className="text-gold-400">{t.nav.klaim}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            Klaim Akun Anggota
          </h1>
          <p className="text-white/70 mt-3 max-w-2xl text-base">
            Ajukan klaim untuk mengaktifkan akun digital Anda sebagai anggota THS-THM yang sudah
            terdaftar
          </p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Switcher */}
        <div className="flex items-center space-x-4 mb-8 border-b border-gray-200 dark:border-gray-700">
          <Link
            href="/daftar"
            className="px-4 py-2 rounded-t-lg font-medium text-gray-500 hover:text-navy-600 transition-colors border-b-2 border-transparent"
          >
            Daftar Calon Anggota
          </Link>
          <span className="px-4 py-2 font-medium text-navy-600 border-b-2 border-navy-600">
            Klaim Anggota
          </span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center justify-center space-y-6 min-h-[400px]"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-lg w-full">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-navy-100 dark:bg-navy-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <IdCard size={28} className="text-navy-600 dark:text-navy-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Ajukan Klaim Keanggotaan
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Isi formulir berikut untuk mengajukan klaim akun digital Anda
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.namaLengkap}
                  onChange={(e) => {
                    updateField('namaLengkap', e.target.value);
                    if (fieldErrors.namaLengkap) setFieldErrors((x) => ({ ...x, namaLengkap: '' }));
                  }}
                  className={`${INPUT_CLASS} ${
                    fieldErrors.namaLengkap
                      ? 'border-red-400 dark:border-red-600'
                      : ''
                  }`}
                  placeholder="Masukkan nama lengkap"
                />
                {fieldErrors.namaLengkap && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.namaLengkap}
                  </p>
                )}
              </div>

              {/* Jenis Kelamin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jenis Kelamin <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.jenisKelamin}
                  onChange={(e) => updateField('jenisKelamin', e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>

              {/* Tempat Lahir */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tempat Lahir <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.tempatLahir}
                  onChange={(e) => updateField('tempatLahir', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Kota lahir"
                />
              </div>

              {/* Tanggal Lahir */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Lahir <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={form.tanggalLahir}
                  onChange={(e) => updateField('tanggalLahir', e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              {/* Tempat Pendadaran (Dadar) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tempat Pendadaran (Dadar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.tempatDadar}
                  onChange={(e) => {
                    updateField('tempatDadar', e.target.value);
                    if (fieldErrors.tempatDadar) setFieldErrors((x) => ({ ...x, tempatDadar: '' }));
                  }}
                  className={`${INPUT_CLASS} ${
                    fieldErrors.tempatDadar
                      ? 'border-red-400 dark:border-red-600'
                      : ''
                  }`}
                  placeholder="Kota pendadaran"
                />
                {fieldErrors.tempatDadar && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.tempatDadar}</p>
                )}
              </div>

              {/* Tahun Pendadaran (Dadar) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tahun Pendadaran (Dadar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  required
                  value={form.tahunDadar}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    updateField('tahunDadar', val);
                    if (fieldErrors.tahunDadar) setFieldErrors((x) => ({ ...x, tahunDadar: '' }));
                  }}
                  className={`${INPUT_CLASS} ${
                    fieldErrors.tahunDadar
                      ? 'border-red-400 dark:border-red-600'
                      : ''
                  }`}
                  placeholder="2024"
                />
                {fieldErrors.tahunDadar && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.tahunDadar}</p>
                )}
              </div>

              {/* No HP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  No. HP
                </label>
                <input
                  type="tel"
                  value={form.noHp}
                  onChange={(e) => {
                    updateField('noHp', e.target.value);
                    if (fieldErrors.noHp) setFieldErrors((x) => ({ ...x, noHp: '' }));
                  }}
                  className={`${INPUT_CLASS} ${
                    fieldErrors.noHp
                      ? 'border-red-400 dark:border-red-600'
                      : ''
                  }`}
                  placeholder="08123456789"
                />
                {fieldErrors.noHp && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.noHp}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => {
                    updateField('email', e.target.value);
                    if (fieldErrors.email) setFieldErrors((x) => ({ ...x, email: '' }));
                  }}
                  className={`${INPUT_CLASS} ${
                    fieldErrors.email
                      ? 'border-red-400 dark:border-red-600'
                      : ''
                  }`}
                  placeholder="email@contoh.com"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
                )}
              </div>

              {/* Alamat */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alamat <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.alamat}
                  onChange={(e) => updateField('alamat', e.target.value)}
                  rows={2}
                  className={`${INPUT_CLASS} resize-none`}
                  placeholder="Alamat lengkap"
                />
              </div>
            </div>

            {/* Struktur Organisasi (Cascade: Distrik → Wilayah → Ranting) */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Distrik <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedDistrikId}
                  onChange={(e) => {
                    setSelectedDistrikId(e.target.value);
                    setSelectedWilayahId('');
                    setRantingId('');
                    setWilayahs([]);
                    setRantings([]);
                    if (fieldErrors.distrikId || fieldErrors.wilayahId || fieldErrors.rantingId)
                      setFieldErrors((x) => ({
                        ...x,
                        distrikId: '',
                        wilayahId: '',
                        rantingId: '',
                      }));
                  }}
                  disabled={distrikLoading}
                  className={INPUT_CLASS}
                >
                  <option value="">
                    {distrikLoading
                      ? 'Memuat distrik...'
                      : distrikError
                        ? 'Gagal memuat - klik coba lagi'
                        : 'Pilih Distrik'}
                  </option>
                  {distriks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama}
                    </option>
                  ))}
                </select>
                {distrikError && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-1 text-xs text-navy-600 hover:underline"
                  >
                    Coba lagi
                  </button>
                )}
                {fieldErrors.distrikId && (
                  <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.distrikId}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Wilayah <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedWilayahId}
                  onChange={(e) => {
                    setSelectedWilayahId(e.target.value);
                    setRantingId('');
                    setRantings([]);
                    if (fieldErrors.wilayahId || fieldErrors.rantingId)
                      setFieldErrors((x) => ({ ...x, wilayahId: '', rantingId: '' }));
                  }}
                  disabled={!selectedDistrikId || wilayahLoading}
                  className={INPUT_CLASS}
                >
                  <option value="">
                    {!selectedDistrikId
                      ? 'Pilih Distrik terlebih dahulu'
                      : wilayahLoading
                        ? 'Memuat wilayah...'
                        : wilayahError
                          ? 'Gagal memuat - klik coba lagi'
                          : 'Pilih Wilayah'}
                  </option>
                  {wilayahs.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama}
                    </option>
                  ))}
                </select>
                {wilayahError && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-1 text-xs text-navy-600 hover:underline"
                  >
                    Coba lagi
                  </button>
                )}
                {fieldErrors.wilayahId && (
                  <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.wilayahId}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ranting Asal <span className="text-red-500">*</span>
                </label>
                <select
                  value={rantingId}
                  onChange={(e) => {
                    setRantingId(e.target.value);
                    if (fieldErrors.rantingId) setFieldErrors((x) => ({ ...x, rantingId: '' }));
                  }}
                  disabled={!selectedWilayahId || rantingLoading}
                  className={INPUT_CLASS}
                >
                  <option value="">
                    {!selectedWilayahId
                      ? 'Pilih Wilayah terlebih dahulu'
                      : rantingLoading
                        ? 'Memuat ranting...'
                        : rantingError
                          ? 'Gagal memuat - klik coba lagi'
                          : 'Pilih Ranting'}
                  </option>
                  {rantings.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama}
                    </option>
                  ))}
                </select>
                {rantingError && (
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mt-1 text-xs text-navy-600 hover:underline"
                  >
                    Coba lagi
                  </button>
                )}
                {fieldErrors.rantingId && (
                  <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.rantingId}
                  </span>
                )}
              </div>
            </div>

            {/* Mode Pembuktian */}
            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cara Pembuktian Keanggotaan <span className="text-red-500">*</span>
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['unggah', 'cerita'] as const).map((mode) => (
                  <label
                    key={mode}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      form.modeBukti === mode
                        ? 'border-navy-500 bg-navy-50 dark:bg-navy-900/30'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="modeBukti"
                      value={mode}
                      checked={form.modeBukti === mode}
                      onChange={() => {
                        updateField('modeBukti', mode);
                        setFieldErrors((x) => ({ ...x, buktiFiles: '', ceritaHistori: '' }));
                      }}
                      className="mt-0.5 h-4 w-4 accent-navy-600"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">
                        {mode === 'unggah' ? 'Unggah bukti' : 'Ceritakan histori'}
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {mode === 'unggah'
                          ? 'Sertifikat, kartu anggota, KTP, atau surat keterangan'
                          : 'Tulis riwayat keanggotaan Anda (20–1000 karakter)'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {form.modeBukti === 'unggah' ? (
              <div>
                <FileUploadZone
                  label="Bukti Keanggotaan & Dokumen Pendukung (Sertifikat, Kartu Anggota, KTP, Surat Keterangan, dll)"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  maxFiles={6}
                  maxSizeMB={5}
                  onFilesChange={handleBuktiChange}
                  files={buktiFiles}
                  onRemoveFile={handleBuktiRemove}
                  uploading={submitting}
                />
                {fieldErrors.buktiFiles && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.buktiFiles}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="ceritaHistori"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Cerita Histori Keanggotaan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="ceritaHistori"
                  value={form.ceritaHistori}
                  onChange={(e) => {
                    updateField('ceritaHistori', e.target.value.slice(0, 1000));
                    if (fieldErrors.ceritaHistori)
                      setFieldErrors((x) => ({ ...x, ceritaHistori: '' }));
                  }}
                  rows={5}
                  maxLength={1000}
                  className={`${INPUT_CLASS} resize-none ${
                    fieldErrors.ceritaHistori ? 'border-red-400 dark:border-red-600' : ''
                  }`}
                  placeholder="Ceritakan secara singkat mulai awal berlatih hingga di dadar dan informasi minimal 2 orang yang mendadarnya"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {fieldErrors.ceritaHistori || 'Minimal 20 karakter, maksimal 1000 karakter'}
                  </span>
                  <span>{form.ceritaHistori.length}/1000</span>
                </div>
              </div>
            )}

            {/* Catatan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Catatan
              </label>
              <textarea
                value={form.catatan}
                onChange={(e) => updateField('catatan', e.target.value)}
                rows={2}
                className={`${INPUT_CLASS} resize-none`}
                placeholder="Catatan tambahan (opsional)"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || submitting}
              className="w-full py-3 bg-navy-600 hover:bg-navy-700 disabled:bg-navy-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 text-sm"
            >
              {loading || submitting ? (
                <>
                  <SmallLogoSpinner size={18} />
                  Mengirim...
                </>
              ) : (
                <>
                  <IdCard size={18} />
                  Ajukan Klaim
                </>
              )}
            </button>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
              Sudah punya akun?{' '}
              <Link
                href="/login"
                className="text-navy-600 dark:text-navy-400 hover:underline font-medium"
              >
                Masuk
              </Link>{' '}
              · Belum menjadi anggota?{' '}
              <Link
                href="/daftar"
                className="text-navy-600 dark:text-navy-400 hover:underline font-medium"
              >
                Daftar Calon Anggota
              </Link>
            </p>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}
