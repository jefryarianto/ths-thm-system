'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { SmallLogoSpinner } from '@/components/ui/logo-spinner';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useToast } from '@/components/ui/toast';
import { FileUploadZone } from '@/components/claims/FileUploadZone';
import { validateClaimForm } from '@/components/claims/claim-form-validation';
import { buildAdminClaimFormData } from '@/components/claims/admin-claim-form-data';
import type { PublicClaimFormValues } from '@/components/claims/public-claim-payload';

interface Distrik {
  id: string;
  nama: string;
}
interface Wilayah {
  id: string;
  nama: string;
}
interface Ranting {
  id: string;
  nama: string;
}

export default function NewClaimPage() {
  const router = useRouter();
  const toast = useToast();

  // Org structure state
  const [distriks, setDistriks] = useState<Distrik[]>([]);
  const [wilayahs, setWilayahs] = useState<Wilayah[]>([]);
  const [rantings, setRantings] = useState<Ranting[]>([]);
  const [loadingDistriks, setLoadingDistriks] = useState(true);
  const [loadingWilayahs, setLoadingWilayahs] = useState(false);
  const [loadingRantings, setLoadingRantings] = useState(false);

  // Selected org
  const [distrikId, setDistrikId] = useState('');
  const [wilayahId, setWilayahId] = useState('');
  const [rantingId, setRantingId] = useState('');

  // Form state
  const [namaLengkap, setNamaLengkap] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P'>('L');
  const [tempatLahir, setTempatLahir] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [tempatDadar, setTempatDadar] = useState('');
  const [tahunDadar, setTahunDadar] = useState('');
  const [pekerjaan, setPekerjaan] = useState('');
  const [pelantikan, setPelantikan] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [catatan, setCatatan] = useState('');
  const [modeBukti, setModeBukti] = useState('unggah');
  const [ceritaHistori, setCeritaHistori] = useState('');
  const [buktiFiles, setBuktiFiles] = useState<File[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Fetch distriks on mount
  useEffect(() => {
    apiClient
      .get('/org-structure/distrik')
      .then(({ data }) => setDistriks(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingDistriks(false));
  }, []);

  // Fetch wilayahs when distrik changes
  useEffect(() => {
    if (!distrikId) {
      setWilayahs([]);
      setWilayahId('');
      setRantings([]);
      setRantingId('');
      return;
    }
    setLoadingWilayahs(true);
    setWilayahId('');
    setRantings([]);
    setRantingId('');
    apiClient
      .get('/org-structure/wilayah', { params: { distrikId } })
      .then(({ data }) => setWilayahs(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingWilayahs(false));
  }, [distrikId]);

  // Fetch rantings when wilayah changes
  useEffect(() => {
    if (!wilayahId) {
      setRantings([]);
      setRantingId('');
      return;
    }
    setLoadingRantings(true);
    setRantingId('');
    apiClient
      .get('/org-structure/ranting', { params: { wilayahId } })
      .then(({ data }) => setRantings(data.data || []))
      .catch(() => {})
      .finally(() => setLoadingRantings(false));
  }, [wilayahId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form: PublicClaimFormValues = {
      namaLengkap,
      jenisKelamin,
      tempatLahir,
      tanggalLahir,
      tempatDadar,
      tahunDadar,
      pekerjaan,
      pelantikan,
      alamat,
      noHp,
      email,
      catatan,
      modeBukti,
      ceritaHistori,
    };
    const errors = validateClaimForm(form, { distrikId, wilayahId, rantingId }, buktiFiles.length);
    setFieldErrors(errors);
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast('error', firstError);
      return;
    }
    setSaving(true);
    try {
      const formData = buildAdminClaimFormData(
        form,
        rantingId,
        buktiFiles.map((file) => ({ file })),
      );

      await apiClient.post('/claims', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast('success', 'Klaim keanggotaan berhasil diajukan');
      router.push('/claims');
    } catch {
      toast('error', 'Gagal menyimpan klaim');
    }
    setSaving(false);
  };

  return (
    <PermissionGuard module="claims" action="create">
      <Breadcrumbs />
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/claims')}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Klaim Keanggotaan Baru
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-5"
        >
          {/* Header Info */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Form ini untuk mendaftarkan anggota yang <strong>belum terdaftar</strong> dalam sistem
              tetapi pernah menjadi anggota. Silakan lengkapi data diri dan lampirkan bukti
              keanggotaan (sertifikat pendadaran dan/atau kartu anggota).
            </p>
          </div>

          {/* Data Diri */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Data Diri
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  value={namaLengkap}
                  onChange={(e) => {
                    setNamaLengkap(e.target.value);
                    if (fieldErrors.namaLengkap) setFieldErrors((x) => ({ ...x, namaLengkap: '' }));
                  }}
                  required
                  placeholder="Masukkan nama lengkap"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.namaLengkap ? 'border-red-400 dark:border-red-600' : ''
                  }`}
                />
                {fieldErrors.namaLengkap && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.namaLengkap}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Jenis Kelamin *
                </label>
                <select
                  value={jenisKelamin}
                  onChange={(e) => setJenisKelamin(e.target.value as 'L' | 'P')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tempat Lahir <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                  placeholder="Kota lahir"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Lahir <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tempat Pendadaran (Dadar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tempatDadar}
                  onChange={(e) => {
                    setTempatDadar(e.target.value);
                    if (fieldErrors.tempatDadar) setFieldErrors((x) => ({ ...x, tempatDadar: '' }));
                  }}
                  required
                  placeholder="Kota pendadaran"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.tempatDadar ? 'border-red-400 dark:border-red-600' : ''
                  }`}
                />
                {fieldErrors.tempatDadar && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.tempatDadar}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tahun Pendadaran (Dadar) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tahunDadar}
                  onChange={(e) => {
                    setTahunDadar(e.target.value);
                    if (fieldErrors.tahunDadar) setFieldErrors((x) => ({ ...x, tahunDadar: '' }));
                  }}
                  required
                  placeholder="2024"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.tahunDadar ? 'border-red-400 dark:border-red-600' : ''
                  }`}
                />
                {fieldErrors.tahunDadar && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.tahunDadar}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="pekerjaan"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Pekerjaan
                </label>
                <input
                  id="pekerjaan"
                  type="text"
                  maxLength={120}
                  value={pekerjaan}
                  onChange={(e) => setPekerjaan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="contoh: Guru"
                />
              </div>
              <div>
                <label
                  htmlFor="pelantikan"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Pelantikan
                </label>
                <input
                  id="pelantikan"
                  type="text"
                  maxLength={160}
                  value={pelantikan}
                  onChange={(e) => setPelantikan(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="contoh: 12 JULI 2020"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  No. HP
                </label>
                <input
                  type="tel"
                  value={noHp}
                  onChange={(e) => {
                    setNoHp(e.target.value);
                    if (fieldErrors.noHp) setFieldErrors((x) => ({ ...x, noHp: '' }));
                  }}
                  placeholder="08123456789"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.noHp ? 'border-red-400 dark:border-red-600' : ''
                  }`}
                />
                {fieldErrors.noHp && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.noHp}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((x) => ({ ...x, email: '' }));
                  }}
                  required
                  placeholder="email@contoh.com"
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.email ? 'border-red-400 dark:border-red-600' : ''
                  }`}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alamat <span className="text-red-500">*</span>
              </label>
              <textarea
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                rows={2}
                placeholder="Alamat lengkap"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Ranting Asal - Cascading Selectors */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Ranting Asal *
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Distrik */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Distrik
                </label>
                <select
                  value={distrikId}
                  onChange={(e) => {
                    setDistrikId(e.target.value);
                    if (fieldErrors.distrikId || fieldErrors.wilayahId || fieldErrors.rantingId)
                      setFieldErrors((x) => ({
                        ...x,
                        distrikId: '',
                        wilayahId: '',
                        rantingId: '',
                      }));
                  }}
                  disabled={loadingDistriks}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">{loadingDistriks ? 'Memuat...' : 'Pilih Distrik'}</option>
                  {distriks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nama}
                    </option>
                  ))}
                </select>
                {fieldErrors.distrikId && (
                  <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.distrikId}
                  </span>
                )}
              </div>

              {/* Wilayah */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Wilayah
                </label>
                <select
                  value={wilayahId}
                  onChange={(e) => {
                    setWilayahId(e.target.value);
                    if (fieldErrors.wilayahId || fieldErrors.rantingId)
                      setFieldErrors((x) => ({ ...x, wilayahId: '', rantingId: '' }));
                  }}
                  disabled={!distrikId || loadingWilayahs}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                >
                  <option value="">
                    {!distrikId
                      ? 'Pilih distrik dulu'
                      : loadingWilayahs
                        ? 'Memuat...'
                        : 'Pilih Wilayah'}
                  </option>
                  {wilayahs.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.nama}
                    </option>
                  ))}
                </select>
                {fieldErrors.wilayahId && (
                  <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.wilayahId}
                  </span>
                )}
              </div>

              {/* Ranting */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Ranting
                </label>
                <select
                  value={rantingId}
                  onChange={(e) => {
                    setRantingId(e.target.value);
                    if (fieldErrors.rantingId) setFieldErrors((x) => ({ ...x, rantingId: '' }));
                  }}
                  disabled={!wilayahId || loadingRantings}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                >
                  <option value="">
                    {!wilayahId
                      ? 'Pilih wilayah dulu'
                      : loadingRantings
                        ? 'Memuat...'
                        : 'Pilih Ranting'}
                  </option>
                  {rantings.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama}
                    </option>
                  ))}
                </select>
                {fieldErrors.rantingId && (
                  <span className="mt-1 block text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.rantingId}
                  </span>
                )}
              </div>
            </div>
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cara Pembuktian Keanggotaan <span className="text-red-500">*</span>
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['unggah', 'cerita'] as const).map((mode) => (
                <label
                  key={mode}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    modeBukti === mode
                      ? 'border-navy-500 bg-navy-50 dark:bg-navy-900/30'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="modeBukti"
                    value={mode}
                    checked={modeBukti === mode}
                    onChange={() => {
                      setModeBukti(mode);
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

          {modeBukti === 'unggah' ? (
            <div>
              <FileUploadZone
                label="Bukti Keanggotaan & Dokumen Pendukung (Sertifikat, Kartu Anggota, KTP, Surat Keterangan, dll)"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                maxFiles={6}
                maxSizeMB={5}
                onFilesChange={(files) => setBuktiFiles(files.map((f) => f.file))}
                files={buktiFiles.map((f) => ({
                  file: f,
                  preview: URL.createObjectURL(f),
                  progress: 100,
                  status: 'done' as const,
                }))}
                onRemoveFile={(index) => setBuktiFiles(buktiFiles.filter((_, i) => i !== index))}
                uploading={saving}
              />
              {fieldErrors.buktiFiles && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.buktiFiles}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maksimal 6 file (JPG, PNG, WebP, PDF), 5MB per file. Minimal 1 file wajib diupload.
              </p>
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
                value={ceritaHistori}
                onChange={(e) => {
                  setCeritaHistori(e.target.value.slice(0, 1000));
                  if (fieldErrors.ceritaHistori) setFieldErrors((x) => ({ ...x, ceritaHistori: '' }));
                }}
                rows={5}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Ceritakan secara singkat mulai awal berlatih hingga di dadar dan informasi minimal 2 orang yang mendadarnya"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {fieldErrors.ceritaHistori || 'Minimal 20 karakter, maksimal 1000 karakter'}
                </span>
                <span>{ceritaHistori.length}/1000</span>
              </div>
            </div>
          )}

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Catatan
            </label>
            <textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              placeholder="Catatan tambahan (opsional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push('/claims')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <SmallLogoSpinner size={14} /> : <Save size={14} />}{' '}
              {saving ? 'Menyimpan...' : 'Ajukan Klaim'}
            </button>
          </div>
        </form>
      </div>
    </PermissionGuard>
  );
}
