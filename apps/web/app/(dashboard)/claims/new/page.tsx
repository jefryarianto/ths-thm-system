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
  const [buktiFiles, setBuktiFiles] = useState<File[]>([]);
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
    if (!namaLengkap.trim()) {
      toast('error', 'Nama lengkap wajib diisi');
      return;
    }
    if (!tempatDadar.trim()) {
      toast('error', 'Tempat dadar wajib diisi');
      return;
    }
    if (!tahunDadar.trim()) {
      toast('error', 'Tahun dadar wajib diisi');
      return;
    }
    if (!email.trim()) {
      toast('error', 'Email wajib diisi');
      return;
    }
    if (!rantingId) {
      toast('error', 'Ranting asal wajib dipilih');
      return;
    }
    if (buktiFiles.length === 0) {
      toast('error', 'Minimal 1 bukti keanggotaan wajib diupload');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('tipe', 'keanggotaan');
      formData.append('namaLengkap', namaLengkap.trim());
      formData.append('jenisKelamin', jenisKelamin);
      formData.append('tempatLahir', tempatLahir);
      formData.append('tanggalLahir', tanggalLahir);
      formData.append('tempatDadar', tempatDadar.trim());
      formData.append('tahunDadar', tahunDadar.trim());
      if (pekerjaan.trim()) formData.append('pekerjaan', pekerjaan.trim());
      if (pelantikan.trim()) formData.append('pelantikan', pelantikan.trim());
      formData.append('alamat', alamat);
      formData.append('noHp', noHp);
      formData.append('email', email.trim());
      formData.append('rantingId', rantingId);
      formData.append('catatan', catatan);
      buktiFiles.forEach((file) => {
        formData.append('buktiFiles', file);
      });

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
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
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
                  Tempat Lahir
                </label>
                <input
                  type="text"
                  value={tempatLahir}
                  onChange={(e) => setTempatLahir(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  value={tanggalLahir}
                  onChange={(e) => setTanggalLahir(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Alamat
              </label>
              <textarea
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tempat Dadar *
                </label>
                <input
                  type="text"
                  value={tempatDadar}
                  onChange={(e) => setTempatDadar(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tahun Dadar *
                </label>
                <input
                  type="text"
                  value={tahunDadar}
                  onChange={(e) => setTahunDadar(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: 2015"
                />
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
                  onChange={(e) => setNoHp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
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
                  onChange={(e) => setDistrikId(e.target.value)}
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
              </div>

              {/* Wilayah */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Wilayah
                </label>
                <select
                  value={wilayahId}
                  onChange={(e) => setWilayahId(e.target.value)}
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
              </div>

              {/* Ranting */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Ranting
                </label>
                <select
                  value={rantingId}
                  onChange={(e) => setRantingId(e.target.value)}
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
              </div>
            </div>
          </div>

          {/* Bukti Dokumen */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Bukti Keanggotaan *
            </h3>
            <FileUploadZone
              label="Upload bukti keanggotaan (sertifikat pendadaran, kartu anggota, dll)"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              maxFiles={10}
              maxSizeMB={5}
              files={buktiFiles.map((f) => ({
                file: f,
                preview: URL.createObjectURL(f),
                progress: 100,
                status: 'done' as const,
              }))}
              onFilesChange={(files) => setBuktiFiles(files.map((f) => f.file))}
              onRemoveFile={(index) => setBuktiFiles(buktiFiles.filter((_, i) => i !== index))}
              uploading={saving}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Maksimal 10 file (JPG, PNG, WebP, PDF), 5MB per file. Minimal 1 file wajib diupload.
            </p>
          </div>

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
