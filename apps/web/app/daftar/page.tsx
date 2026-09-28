'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  UserPlus,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { z } from 'zod';
import { PublicLayout } from '@/components';
import { useI18n } from '@/i18n/context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const registrationSchema = z.object({
  namaLengkap: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  jenisKelamin: z.enum(['L', 'P']),
  noHp: z.string().min(10, 'Nomor HP minimal 10 digit').regex(/^[0-9]+$/, 'Nomor HP hanya boleh berisi angka').optional().or(z.literal('')),
  email: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.string().optional(),
  alamat: z.string().optional(),
  sumberInfo: z.string().optional(),
});

export default function DaftarPage() {
  const { t } = useI18n();
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    noHp: '',
    email: '',
    sumberInfo: '',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Client-side validation
      const validation = registrationSchema.safeParse(form);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const res = await fetch(`${API_URL}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Pendaftaran gagal. Silakan coba lagi.');
      }

      setStep('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
      setErrorMsg(message);
      setStep('error');
    } finally {
      setLoading(false);
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
              <span className="text-gold-400">{t.nav.daftar}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
              Pendaftaran Berhasil!
            </h1>
            <p className="text-white/70 mt-3 max-w-2xl text-base">
              Data Anda telah kami terima. Tim admin akan memproses pendaftaran Anda dan menghubungi
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
            <span className="text-gold-400">{t.nav.daftar}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white">
            Pendaftaran Calon Anggota
          </h1>
          <p className="text-white/70 mt-3 max-w-2xl text-base">
            Isi formulir berikut untuk menjadi calon anggota THS-THM
          </p>
          <div className="w-16 h-1 bg-gold-400 mt-4 rounded-full" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Switcher */}
        <div className="flex items-center space-x-4 mb-8 border-b border-gray-200 dark:border-gray-700">
          <span className="px-4 py-2 font-medium text-navy-600 border-b-2 border-navy-600">
            Daftar Calon Anggota
          </span>
          <Link
            href="/klaim"
            className="px-4 py-2 rounded-t-lg font-medium text-gray-500 hover:text-navy-600 transition-colors border-b-2 border-transparent"
          >
            Klaim Anggota
          </Link>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-lg w-full">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-navy-100 dark:bg-navy-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus size={28} className="text-navy-600 dark:text-navy-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Daftar Calon Anggota
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Isi formulir berikut untuk menjadi bagian dari komunitas THS-THM
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
                onChange={(e) => updateField('namaLengkap', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm"
                placeholder="Masukkan nama lengkap"
              />
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
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>

            {/* No HP */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No. HP
              </label>
              <input
                type="tel"
                value={form.noHp}
                onChange={(e) => updateField('noHp', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm"
                placeholder="08xxxxxxxxxx"
              />
            </div>

            {/* Tempat Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tempat Lahir
              </label>
              <input
                type="text"
                value={form.tempatLahir}
                onChange={(e) => updateField('tempatLahir', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm"
                placeholder="Kota lahir"
              />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={form.tanggalLahir}
                onChange={(e) => updateField('tanggalLahir', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm"
              />
            </div>

            {/* Email */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm"
                placeholder="email@contoh.com"
              />
            </div>

            {/* Alamat */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alamat
              </label>
              <textarea
                value={form.alamat}
                onChange={(e) => updateField('alamat', e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm resize-none"
                placeholder="Alamat lengkap"
              />
            </div>

            {/* Sumber Info */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dari mana Anda tahu THS-THM?
              </label>
              <input
                type="text"
                value={form.sumberInfo}
                onChange={(e) => updateField('sumberInfo', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-navy-500 focus:border-navy-500 outline-none transition text-sm"
                placeholder="Teman, media sosial, brosur, dll."
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-navy-600 hover:bg-navy-700 disabled:bg-navy-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Mendaftarkan...
              </>
            ) : (
              <>
                <UserPlus size={18} />
                Daftar Sekarang
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
          </Link>
        </p>
      </div>
    </form>
      </div>
    </PublicLayout>
  );
}
