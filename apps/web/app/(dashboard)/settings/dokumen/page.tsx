'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import { useConfirm } from '@/components/ui/confirm-modal';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Save, RefreshCw, RotateCcw, IdCard, FileText, Award, FileCheck2, AlertCircle, Loader2 } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import PageContainer from '@/components/ui/page-container';
import FormField from '@/components/ui/form-field';
import { useToast } from '@/components/ui/toast';

// ─── Konfigurasi field template ───

interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  textarea?: boolean;
  hint?: string;
}

interface TemplateGroup {
  key: string;
  title: string;
  icon: typeof FileText;
  description: string;
  fields: TemplateField[];
}

const FIELD_GROUPS: TemplateGroup[] = [
  {
    key: 'umum',
    title: 'Umum (semua dokumen)',
    icon: FileText,
    description: 'Nama organisasi & teks kaki yang tampil di seluruh dokumen yang digenerate.',
    fields: [
      { key: 'docTemplate.orgNama', label: 'Nama Organisasi', placeholder: 'THS-THM System Manajemen' },
      { key: 'docTemplate.orgAlamat', label: 'Alamat / Keterangan Organisasi', placeholder: 'Kosongkan untuk tidak ditampilkan' },
      { key: 'docTemplate.footer', label: 'Teks Kaki (footer)', placeholder: 'Dokumen ini valid dan terverifikasi…', textarea: true },
    ],
  },
  {
    key: 'kartu_anggota',
    title: 'Kartu Anggota (KTA)',
    icon: IdCard,
    description: 'Judul dokumen kartu tanda anggota.',
    fields: [{ key: 'docTemplate.kartu_anggota.judul', label: 'Judul', placeholder: 'KARTU ANGGOTA' }],
  },
  {
    key: 'sertifikat_pendadaran',
    title: 'Sertifikat Pendadaran',
    icon: FileCheck2,
    description: 'Judul & sub-judul pada sertifikat kelulusan pendadaran.',
    fields: [
      { key: 'docTemplate.sertifikat_pendadaran.judul', label: 'Judul', placeholder: 'SERTIFIKAT' },
      { key: 'docTemplate.sertifikat_pendadaran.subJudul', label: 'Sub Judul', placeholder: 'PENDADARAN' },
    ],
  },
  {
    key: 'sertifikat_pelatihan',
    title: 'Sertifikat Pelatihan',
    icon: FileCheck2,
    description: 'Judul sertifikat keikutsertaan pelatihan.',
    fields: [{ key: 'docTemplate.sertifikat_pelatihan.judul', label: 'Judul', placeholder: 'SERTIFIKAT PELATIHAN' }],
  },
  {
    key: 'piagam_prestasi',
    title: 'Piagam Prestasi / Penghargaan',
    icon: Award,
    description: 'Judul piagam penghargaan prestasi.',
    fields: [{ key: 'docTemplate.piagam_prestasi.judul', label: 'Judul', placeholder: 'PIAGAM PRESTASI' }],
  },
];

const ALL_FIELD_KEYS = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

export default function DocTemplateSettingsPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
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

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500';

  return (
    <PermissionGuard module="settings" action="view">
      <PageContainer>
        <PageHeader
          title="Template Dokumen"
          subtitle="Atur teks yang tampil di kartu anggota, sertifikat pendadaran, sertifikat pelatihan, dan piagam penghargaan"
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
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Menyimpan…' : 'Simpan Template'}
          </button>
        </PageHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <RefreshCw size={20} className="animate-spin" />
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
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">{group.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{group.description}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {group.fields.map((field) => (
                      <FormField key={field.key} label={field.label}>
                        {field.textarea ? (
                          <textarea
                            value={values[field.key] ?? ''}
                            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            rows={2}
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        ) : (
                          <input
                            type="text"
                            value={values[field.key] ?? ''}
                            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            className={inputClass}
                          />
                        )}
                        {field.hint && <p className="text-xs text-gray-400 mt-1">{field.hint}</p>}
                      </FormField>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-400 lg:col-span-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p>
                Kosongkan kolom untuk memakai teks bawaan template. Nama penandatangan diatur terpisah di halaman{' '}
                <b>Penandatangan</b>.
              </p>
            </div>
          </div>
        )}
      </PageContainer>
      {confirmModal}
    </PermissionGuard>
  );
}
