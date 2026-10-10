'use client';

import { useConfirm } from '@/components/ui/confirm-modal';
import { SmallLogoSpinner } from '@/components/ui/logo-spinner';

import { useEffect, useState } from 'react';
import apiClient, { extractErrorMessage } from '@/lib/api-client';
import {
  Save,
  RotateCcw,
  IdCard,
  FileText,
  Award,
  FileCheck2,
  AlertCircle,
  Upload,
  Trash2,
} from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import { PermissionGuard } from '@/components/auth/permission-guard';
import PageContainer from '@/components/ui/page-container';
import FormField from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';
import { LogoSpinner } from '@/components/ui/logo-spinner';

// ─── Konfigurasi field template ───

interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  textarea?: boolean;
  /** Jumlah baris textarea (default 2). */
  rows?: number;
  hint?: string;
}

interface TemplateGroup {
  key: string;
  title: string;
  icon: typeof FileText;
  description: string;
  fields: TemplateField[];
  /** Key setting gambar latar — bila ada, grup menampilkan UI upload background. */
  imageKey?: string;
  /** Placeholder upload gambar latar (rasio yang disarankan). */
  imageHint?: string;
}

/** Batas ukuran upload gambar latar — selaras dengan backend (multer) & nginx. */
const MAX_IMAGE_MB = 10;

const FIELD_GROUPS: TemplateGroup[] = [
  {
    key: 'umum',
    title: 'Umum (semua dokumen)',
    icon: FileText,
    description: 'Nama organisasi & teks kaki yang tampil di seluruh dokumen yang digenerate.',
    fields: [
      {
        key: 'docTemplate.orgNama',
        label: 'Nama Organisasi',
        placeholder: 'THS-THM System Manajemen',
      },
      {
        key: 'docTemplate.orgAlamat',
        label: 'Alamat / Keterangan Organisasi',
        placeholder: 'Kosongkan untuk tidak ditampilkan',
      },
      {
        key: 'docTemplate.footer',
        label: 'Teks Kaki (footer)',
        placeholder: 'Dokumen ini valid dan terverifikasi?',
        textarea: true,
      },
    ],
  },
  {
    key: 'kartu_anggota',
    title: 'Kartu Anggota (KTA)',
    icon: IdCard,
    description: 'Judul dokumen kartu tanda anggota.',
    fields: [
      { key: 'docTemplate.kartu_anggota.judul', label: 'Judul', placeholder: 'KARTU ANGGOTA' },
    ],
  },
  {
    key: 'sertifikat_pendadaran',
    title: 'Sertifikat Pendadaran',
    icon: FileCheck2,
    description: 'Judul, sub-judul, isi & gambar latar sertifikat kelulusan pendadaran.',
    imageKey: 'docTemplate.sertifikat_pendadaran.image',
    imageHint: 'Rasio lanskap (mis. 1188×840 px) — menutupi seluruh halaman sertifikat.',
    fields: [
      { key: 'docTemplate.sertifikat_pendadaran.judul', label: 'Judul', placeholder: 'SERTIFIKAT' },
      {
        key: 'docTemplate.sertifikat_pendadaran.subJudul',
        label: 'Sub Judul',
        placeholder: 'PENDADARAN',
      },
      {
        key: 'docTemplate.sertifikat_pendadaran.body',
        label: 'Isi / Body Sertifikat',
        placeholder:
          'Diberikan kepada {{nama}}, atas kelulusan dalam kegiatan {{kegiatan}} di {{lokasi}}.',
        textarea: true,
        rows: 5,
        hint: 'Kosongkan untuk memakai teks bawaan. Placeholder: {{nama}}, {{nomor}}, {{kegiatan}}, {{lokasi}}, {{ranting}}, {{wilayah}}, {{distrik}}, {{nilai}}, {{predikat}}, {{status}}, {{tanggal}}',
      },
    ],
  },
  {
    key: 'sertifikat_pelatihan',
    title: 'Sertifikat Pelatihan',
    icon: FileCheck2,
    description: 'Judul, isi & gambar latar sertifikat keikutsertaan pelatihan.',
    imageKey: 'docTemplate.sertifikat_pelatihan.image',
    imageHint: 'Rasio lanskap (mis. 1188×840 px) — menutupi seluruh halaman sertifikat.',
    fields: [
      {
        key: 'docTemplate.sertifikat_pelatihan.judul',
        label: 'Judul',
        placeholder: 'SERTIFIKAT PELATIHAN',
      },
      {
        key: 'docTemplate.sertifikat_pelatihan.body',
        label: 'Isi / Body Sertifikat',
        placeholder: 'Diberikan kepada {{nama}} dengan Nomor {{nomor}}.',
        textarea: true,
        rows: 5,
        hint: 'Kosongkan untuk memakai teks bawaan. Placeholder: {{nama}}, {{nomor}}, {{tingkat}}, {{ranting}}, {{judul}}, {{orgNama}}, {{tanggal}}',
      },
    ],
  },
  {
    key: 'piagam_prestasi',
    title: 'Piagam Prestasi / Penghargaan',
    icon: Award,
    description: 'Judul, isi & gambar latar piagam penghargaan prestasi.',
    imageKey: 'docTemplate.piagam_prestasi.image',
    imageHint: 'Rasio lanskap (mis. 1188×840 px) — menutupi seluruh halaman piagam.',
    fields: [
      { key: 'docTemplate.piagam_prestasi.judul', label: 'Judul', placeholder: 'PIAGAM PRESTASI' },
      {
        key: 'docTemplate.piagam_prestasi.body',
        label: 'Isi / Body Piagam',
        placeholder: 'Diberikan kepada {{nama}} dengan Nomor {{nomor}}.',
        textarea: true,
        rows: 5,
        hint: 'Kosongkan untuk memakai teks bawaan. Placeholder: {{nama}}, {{nomor}}, {{tingkat}}, {{ranting}}, {{judul}}, {{orgNama}}, {{tanggal}}',
      },
    ],
  },
];

const ALL_FIELD_KEYS = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

export default function DocTemplateSettingsPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  /** Filename gambar latar per grup dokumen (key = group.key). */
  const [images, setImages] = useState<Record<string, string>>({});
  /** Grup yang sedang upload/hapus gambar (key = group.key). */
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/settings');
      const cfg = (data?.data ?? data) as Record<string, unknown> | undefined;
      const next: Record<string, string> = {};
      for (const key of ALL_FIELD_KEYS) {
        const v = cfg?.[key];
        next[key] = typeof v === 'string' ? v : '';
      }
      setValues(next);
      const nextImages: Record<string, string> = {};
      for (const group of FIELD_GROUPS) {
        if (!group.imageKey) continue;
        const v = cfg?.[group.imageKey];
        nextImages[group.key] = typeof v === 'string' ? v : '';
      }
      setImages(nextImages);
    } catch {
      toast('error', 'Gagal memuat pengaturan template');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const key of ALL_FIELD_KEYS) {
        payload[key] = (values[key] ?? '').trim();
      }
      await apiClient.patch('/settings', payload);
      toast('success', 'Template dokumen berhasil disimpan');
    } catch {
      toast('error', 'Gagal menyimpan pengaturan');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    if (
      !(await confirm({
        title: 'Reset Template Dokumen',
        message: 'Kembalikan semua teks template ke bawaan?',
        confirmLabel: 'Ya, Reset',
        variant: 'danger',
      }))
    ) {
      return;
    }
    try {
      const payload: Record<string, string> = {};
      for (const key of ALL_FIELD_KEYS) {
        payload[key] = '';
      }
      await apiClient.patch('/settings', payload);
      setValues({});
      toast('success', 'Template dikembalikan ke bawaan');
    } catch {
      toast('error', 'Gagal reset template');
    }
  };

  /** Upload gambar latar per tipe — langsung tersimpan (mirip halaman Template Kartu). */
  const handleUploadImage = async (group: TemplateGroup, file: File) => {
    if (!group.imageKey) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast(
        'error',
        `"${file.name}" (${(file.size / (1024 * 1024)).toFixed(1)}MB) melebihi batas ${MAX_IMAGE_MB}MB per gambar. Perkecil resolusi file lalu coba lagi.`,
      );
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    setUploadingKey(group.key);
    try {
      const { data } = await apiClient.post(`/settings/doc-template/${group.key}/image`, fd);
      const res = (data?.data ?? data) as { filename?: string } | undefined;
      setImages((prev) => ({ ...prev, [group.key]: res?.filename ?? '' }));
      toast('success', 'Gambar latar berhasil diupload');
    } catch (err) {
      toast('error', extractErrorMessage(err, 'Gagal mengupload gambar latar'));
    }
    setUploadingKey(null);
  };

  const handleDeleteImage = async (group: TemplateGroup) => {
    if (!group.imageKey) return;
    if (
      !(await confirm({
        title: 'Hapus Gambar Latar',
        message: `Hapus gambar latar "${group.title}"? PDF akan kembali memakai desain bawaan.`,
        confirmLabel: 'Ya, Hapus',
        variant: 'danger',
      }))
    ) {
      return;
    }
    setUploadingKey(group.key);
    try {
      await apiClient.delete(`/settings/doc-template/${group.key}/image`);
      setImages((prev) => ({ ...prev, [group.key]: '' }));
      toast('success', 'Gambar latar dihapus');
    } catch (err) {
      toast('error', extractErrorMessage(err, 'Gagal menghapus gambar latar'));
    }
    setUploadingKey(null);
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500';

  return (
    <PermissionGuard module="settings" action="view">
      <PageContainer>
        <PageHeader
          title="Template Dokumen"
          subtitle="Atur teks, isi dokumen & gambar latar untuk kartu anggota, sertifikat pendadaran, sertifikat pelatihan, dan piagam penghargaan"
          onRefresh={fetchConfig}
        >
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 transition"
          >
            <RotateCcw size={14} /> Reset ke Bawaan
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? <SmallLogoSpinner size={14} /> : <Save size={14} />}
            {saving ? 'Menyimpan?' : 'Simpan Template'}
          </button>
        </PageHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LogoSpinner size={64} message="Memuat template dokumen..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {FIELD_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.key}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                      <Icon size={18} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {group.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {group.fields.map((field) => (
                      <FormField key={field.key} label={field.label}>
                        {field.textarea ? (
                          <textarea
                            value={values[field.key] ?? ''}
                            onChange={(e) =>
                              setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            rows={field.rows ?? 2}
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        ) : (
                          <input
                            type="text"
                            value={values[field.key] ?? ''}
                            onChange={(e) =>
                              setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        )}
                        {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
                      </FormField>
                    ))}
                  </div>

                  {/* Upload gambar latar (background) — hanya grup yang mendukung */}
                  {group.imageKey && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <FormField label="Gambar Latar (Background)">
                        <div className="flex items-start gap-3">
                          <div className="w-40 shrink-0 aspect-[1188/840] rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-hidden flex items-center justify-center">
                            {images[group.key] ? (
                              <img
                                src={`/api/uploads/${encodeURIComponent(images[group.key])}`}
                                alt={`Latar ${group.title}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] text-gray-400 px-2 text-center">
                                Belum ada gambar
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <label
                              htmlFor={`bg-upload-${group.key}`}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-950 transition cursor-pointer disabled:opacity-50 ${
                                uploadingKey === group.key ? 'pointer-events-none opacity-50' : ''
                              }`}
                            >
                              {uploadingKey === group.key ? (
                                <SmallLogoSpinner size={14} />
                              ) : (
                                <Upload size={14} />
                              )}
                              {images[group.key] ? 'Ganti Gambar' : 'Upload Gambar'}
                            </label>
                            <input
                              id={`bg-upload-${group.key}`}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              className="hidden"
                              disabled={uploadingKey === group.key}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleUploadImage(group, file);
                                e.target.value = '';
                              }}
                            />
                            {images[group.key] && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteImage(group)}
                                disabled={uploadingKey === group.key}
                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50"
                              >
                                <Trash2 size={14} /> Hapus Gambar
                              </button>
                            )}
                            <p className="text-xs text-gray-400">
                              {group.imageHint} Format JPEG/PNG/WebP/GIF, maks. {MAX_IMAGE_MB}MB.
                            </p>
                          </div>
                        </div>
                      </FormField>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400 lg:col-span-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>
                Kosongkan kolom untuk memakai teks bawaan template. Nama penandatangan diatur
                terpisah di halaman <b>Penandatangan</b>.
              </p>
            </div>
          </div>
        )}
      </PageContainer>
      {confirmModal}
    </PermissionGuard>
  );
}
