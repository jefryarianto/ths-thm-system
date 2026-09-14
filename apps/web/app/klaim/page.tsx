'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IdCard,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  PlusCircle,
  XCircle,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Ranting {
  id: string;
  nama: string;
}
interface Wilayah {
  id: string;
  nama: string;
  rantings: Ranting[];
}
interface Distrik {
  id: string;
  nama: string;
  wilayahs: Wilayah[];
}

interface BuktiItem {
  tipe: 'sertifikat' | 'kartu_anggota';
  url: string;
}

const BUKTI_LABEL: Record<BuktiItem['tipe'], string> = {
  sertifikat: 'Sertifikat Pendadaran',
  kartu_anggota: 'Kartu Anggota',
};

export default function KlaimPage() {
  const [step, setStep] = useState<'form' | 'success' | 'error'>('form');
  const [loading, setLoading] = useState(false);
  const [loadingTree, setLoadingTree] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [tree, setTree] = useState<Distrik[]>([]);
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');

  const [form, setForm] = useState({
    namaLengkap: '',
    jenisKelamin: 'L',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    noHp: '',
    email: '',
    catatan: '',
  });
  const [buktiDokumen, setBuktiDokumen] = useState<BuktiItem[]>([]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    fetch(`${API_URL}/api/org-structure/public-tree`)
      .then((r) => r.json())
      .then((res) => {
        setTree(res?.data || []);
      })
      .catch(() => setTree([]))
      .finally(() => setLoadingTree(false));
  }, []);

  const distrik = tree.find((d) => d.id === distrikId);
  const wilayah = distrik?.wilayahs.find((w) => w.id === wilayahId);
  const rantings = wilayah?.rantings || [];

  const handleDistrikChange = (id: string) => {
    setDistrikId(id);
    setWilayahId('');
    setRantingId('');
  };
  const handleWilayahChange = (id: string) => {
    setWilayahId(id);
    setRantingId('');
  };

  const addBukti = (tipe: BuktiItem['tipe']) => {
    setBuktiDokumen((prev) => [...prev, { tipe, url: '' }]);
  };
  const updateBukti = (index: number, url: string) => {
    setBuktiDokumen((prev) => prev.map((b, i) => (i === index ? { ...b, url } : b)));
  };
  const removeBukti = (index: number) => {
    setBuktiDokumen((prev) => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (form.namaLengkap.trim().length < 3) errs.namaLengkap = 'Nama lengkap minimal 3 karakter';
    if (!rantingId) errs.rantingId = 'Pilih ranting asal keanggotaan';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = 'Format email tidak valid';
    if (form.noHp && !/^(\+?62|0)\d{8,13}$/.test(form.noHp.replace(/[\s-]/g, '')))
      errs.noHp = 'Format No. HP tidak valid (mulai 0 atau +62, 9-14 digit)';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const payload: Record<string, unknown> = {
        tipe: 'keanggotaan',
        namaLengkap: form.namaLengkap.trim(),
        jenisKelamin: form.jenisKelamin,
        rantingId,
      };
      if (form.tempatLahir.trim()) payload.tempatLahir = form.tempatLahir.trim();
      if (form.tanggalLahir) payload.tanggalLahir = form.tanggalLahir;
      if (form.alamat.trim()) payload.alamat = form.alamat.trim();
      if (form.noHp.trim()) payload.noHp = form.noHp.trim();
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.catatan.trim()) payload.catatan = form.catatan.trim();
      const bukti = buktiDokumen.filter((b) => b.url.trim());
      if (bukti.length > 0) payload.buktiDokumen = bukti;

      const res = await fetch(`${API_URL}/api/claims`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Pengajuan klaim gagal. Silakan coba lagi.');
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Klaim Keanggotaan Terkirim!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Pengajuan klaim Anda telah kami terima. Admin akan memproses dan menghubungi Anda
            melalui email atau nomor HP yang didaftarkan.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            <ArrowLeft size={18} />
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <IdCard size={28} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Klaim Keanggotaan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sudah menjadi anggota THS-THM tapi belum terdaftar di sistem? Ajukan klaim di sini.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-900/20">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-blue-500" />
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Jika memungkinkan, lampirkan bukti keanggotaan (sertifikat pendadaran dan/atau kartu
            anggota) untuk mempercepat proses verifikasi.
          </p>
        </div>

        {/* Error Alert */}
        {step === 'error' && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{errorMsg}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm ${
                  fieldErrors.namaLengkap
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
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
              <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                {(['L', 'P'] as const).map((jk) => (
                  <button
                    key={jk}
                    type="button"
                    onClick={() => updateField('jenisKelamin', jk)}
                    className={`flex-1 py-2.5 text-sm font-medium transition ${
                      form.jenisKelamin === jk
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </button>
                ))}
              </div>
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
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
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
                max={new Date().toISOString().split('T')[0]}
                value={form.tanggalLahir}
                onChange={(e) => updateField('tanggalLahir', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
              />
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
                className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm ${
                  fieldErrors.noHp
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
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
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => {
                  updateField('email', e.target.value);
                  if (fieldErrors.email) setFieldErrors((x) => ({ ...x, email: '' }));
                }}
                className={`w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm ${
                  fieldErrors.email
                    ? 'border-red-400 dark:border-red-600'
                    : 'border-gray-300 dark:border-gray-600'
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
                Alamat
              </label>
              <textarea
                value={form.alamat}
                onChange={(e) => updateField('alamat', e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
                placeholder="Alamat lengkap"
              />
            </div>
          </div>

          {/* Ranting Asal */}
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ranting Asal <span className="text-red-500">*</span>
            </span>
            {loadingTree ? (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2.5">
                <Loader2 size={16} className="animate-spin" />
                Memuat daftar organisasi...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={distrikId}
                  onChange={(e) => handleDistrikChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                >
                  <option value="">Pilih Distrik</option>
                  {tree.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama}
                    </option>
                  ))}
                </select>
                <select
                  value={wilayahId}
                  onChange={(e) => handleWilayahChange(e.target.value)}
                  disabled={!distrikId}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm disabled:opacity-50"
                >
                  <option value="">Pilih Wilayah</option>
                  {distrik?.wilayahs.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama}
                    </option>
                  ))}
                </select>
                <select
                  value={rantingId}
                  onChange={(e) => {
                    setRantingId(e.target.value);
                    if (fieldErrors.rantingId) setFieldErrors((x) => ({ ...x, rantingId: '' }));
                  }}
                  disabled={!wilayahId}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm disabled:opacity-50"
                >
                  <option value="">Pilih Ranting</option>
                  {rantings.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {fieldErrors.rantingId && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.rantingId}</p>
            )}
          </div>

          {/* Bukti Keanggotaan */}
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bukti Keanggotaan
            </span>
            <div className="flex gap-2">
              {(['sertifikat', 'kartu_anggota'] as const).map((tipe) => (
                <button
                  key={tipe}
                  type="button"
                  onClick={() => addBukti(tipe)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
                >
                  <PlusCircle size={16} />
                  {tipe === 'sertifikat' ? 'Sertifikat' : 'Kartu Anggota'}
                </button>
              ))}
            </div>
            {buktiDokumen.length > 0 && (
              <div className="mt-3 space-y-2">
                {buktiDokumen.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-40 shrink-0">
                      {BUKTI_LABEL[b.tipe]}
                    </span>
                    <input
                      type="url"
                      value={b.url}
                      onChange={(e) => updateBukti(i, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                      placeholder="URL tautan dokumen (opsional)"
                    />
                    <button
                      type="button"
                      onClick={() => removeBukti(i)}
                      className="text-gray-400 hover:text-red-500 transition"
                      aria-label="Hapus bukti"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catatan
            </label>
            <textarea
              value={form.catatan}
              onChange={(e) => updateField('catatan', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm resize-none"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <IdCard size={18} />
                Ajukan Klaim
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Sudah punya akun?{' '}
          <Link
            href="/login"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Masuk
          </Link>{' '}
          · Belum menjadi anggota?{' '}
          <Link
            href="/daftar"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Daftar Calon Anggota
          </Link>
        </p>
      </div>
    </div>
  );
}