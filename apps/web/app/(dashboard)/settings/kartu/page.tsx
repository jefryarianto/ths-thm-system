'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { IdCard, Upload, CheckCircle2, Trash2, RefreshCw, Pencil, Globe } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';

interface CardTemplateItem {
  id: string;
  name: string;
  label: string;
  frontImage: string | null;
  backImage: string | null;
  overlayConfig: Record<string, unknown>;
  isActive: boolean;
  distrikId?: string | null;
  distrik?: { id: string; nama: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface DistrictOption {
  id: string;
  nama: string;
  kodeDistrik?: string;
}

/** Preset overlayConfig default — hanya lapisan keamanan, data anggota tetap overlay bawaan. */
const DEFAULT_OVERLAY = JSON.stringify(
  {
    guilloche: {
      enabledFront: true,
      enabledBack: true,
      strokeFront: 'rgba(29,78,216,0.3)',
      strokeBack: 'rgba(191,219,254,0.4)',
    },
    watermark: { enabledFront: true, enabledBack: true },
  },
  null,
  2,
);

export default function KartuSettingsPage() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const { role } = useAuth();
  const [templates, setTemplates] = useState<CardTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [overlayText, setOverlayText] = useState(DEFAULT_OVERLAY);
  const [showOverlay, setShowOverlay] = useState(false);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  // Cakupan: '' = Global (Nasional), selain itu id distrik
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [scope, setScope] = useState('');
  const [scopeName, setScopeName] = useState('');
  const isSuperadmin = role === 'superadmin';

  const fetchDistricts = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/org-structure/distrik', { params: { limit: 200 } });
      const list = (res.data ?? res ?? []) as DistrictOption[];
      setDistricts(list);
    } catch {
      // silent
    }
  }, []);

  // Fetch user scope on mount (auto-set for admin_distrik)
  useEffect(() => {
    if (!isSuperadmin && role) {
      apiClient.get('/auth/scope').then(({ data: res }) => {
        if (res?.distrikId) {
          setScope(res.distrikId);
          fetchDistricts().then(() => {
            // Pakai daftar distrik dari response scope bila tersedia, else fetch
          });
          apiClient.get('/org-structure/distrik', { params: { limit: 200 } }).then(({ data: dRes }) => {
            const list = (dRes.data ?? dRes ?? []) as DistrictOption[];
            const match = list.find((d) => d.id === res.distrikId);
            setScopeName(match?.nama || 'Distrik');
          }).catch(() => {});
        }
      }).catch(() => {});
    } else {
      fetchDistricts();
    }
  }, [isSuperadmin, role, fetchDistricts]);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data } = await apiClient.get('/card-templates');
      setTemplates(Array.isArray(data) ? data : data?.data || []);
    } catch {
      toast('error', 'Gagal memuat template kartu');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const scopeLabel = scope
    ? (isSuperadmin ? districts.find((d) => d.id === scope)?.nama || 'Distrik' : scopeName || 'Distrik')
    : 'Global (Nasional)';

  /** Template yang relevan untuk scope aktif (API sudah ter-scope; filter client sebagai jaring pengaman). */
  const scopedTemplates = templates.filter((t) => (t.distrikId ?? null) === (scope || null));

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setLabel('');
    setOverlayText(DEFAULT_OVERLAY);
    setShowOverlay(false);
    if (frontRef.current) frontRef.current.value = '';
    if (backRef.current) backRef.current.value = '';
  };

  const startEdit = (t: CardTemplateItem) => {
    setEditingId(t.id);
    setName(t.name);
    setLabel(t.label);
    setOverlayText(JSON.stringify(t.overlayConfig || {}, null, 2));
    setShowOverlay(true);
    if (frontRef.current) frontRef.current.value = '';
    if (backRef.current) backRef.current.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const errMessage = (err: unknown, fallback: string) =>
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast('error', 'Nama template wajib diisi (huruf kecil/angka/strip)');
      return;
    }
    let overlay: unknown = {};
    if (overlayText.trim()) {
      try {
        overlay = JSON.parse(overlayText);
      } catch {
        toast('error', 'overlayConfig bukan JSON yang valid');
        return;
      }
    }
    const fd = new FormData();
    fd.append('name', name.trim());
    if (label.trim()) fd.append('label', label.trim());
    fd.append('overlayConfig', JSON.stringify(overlay));
    // Superadmin memilih scope lewat selector; admin_distrik dikunci backend ke distriknya.
    if (isSuperadmin && scope) fd.append('distrikId', scope);
    const front = frontRef.current?.files?.[0];
    const back = backRef.current?.files?.[0];
    if (front) fd.append('front', front);
    if (back) fd.append('back', back);

    setSaving(true);
    try {
      if (editingId) {
        await apiClient.patch(`/card-templates/${editingId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast('success', 'Template diperbarui');
      } else {
        await apiClient.post('/card-templates', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast('success', `Template dibuat untuk ${scopeLabel} — klik "Set Aktif" untuk menerapkannya`);
      }
      resetForm();
      fetchTemplates();
    } catch (err) {
      toast('error', errMessage(err, editingId ? 'Gagal memperbarui template' : 'Gagal membuat template'));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (t: CardTemplateItem) => {
    const targetScope = t.distrikId
      ? (isSuperadmin ? districts.find((d) => d.id === t.distrikId)?.nama || 'Distrik' : scopeName || 'Distrik')
      : 'Global (Nasional)';
    const ok = await confirm({
      title: 'Set template aktif?',
      message: `Semua kartu pada scope ${targetScope} (web, mobile, PDF/PNG) akan memakai desain "${t.label}". Template lain pada scope yang sama otomatis non-aktif.`,
    });
    if (!ok) return;
    try {
      await apiClient.patch(`/card-templates/${t.id}/activate`, {});
      toast('success', `Template "${t.label}" sekarang aktif untuk ${targetScope}`);
      fetchTemplates();
    } catch (err) {
      toast('error', errMessage(err, 'Gagal mengaktifkan template'));
    }
  };

  const handleRemove = async (t: CardTemplateItem) => {
    const ok = await confirm({
      title: 'Hapus template?',
      message: `Template "${t.label}" akan dihapus permanen (termasuk gambarnya).`,
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/card-templates/${t.id}`);
      toast('success', 'Template dihapus');
      fetchTemplates();
    } catch (err) {
      toast('error', errMessage(err, 'Gagal menghapus template'));
    }
  };

  // ── UI: Header + Form ──

  const activeTemplate = scopedTemplates.find((t) => t.isActive);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IdCard size={24} className="text-blue-500" />
          Template Kartu Anggota
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload desain kartu (sisi depan + belakang, rasio kartu ID 856:540 ≈ 1,58, PNG/JPG max 5MB).
          Data anggota, foto, QR, tanda tangan & stempel digambar sistem <strong>di atas</strong> desain Anda.
          Setiap distrik bisa punya template sendiri; bila distrik belum punya template aktif, kartunya
          otomatis memakai template <strong>Global</strong>.
        </p>
        {activeTemplate && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <CheckCircle2 size={14} /> Aktif ({scopeLabel}): {activeTemplate.label}
          </div>
        )}
        {!activeTemplate && scopedTemplates.length > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-xs font-semibold">
            <RefreshCw size={14} /> Belum ada template aktif untuk {scopeLabel} — fallback ke Global / desain bawaan
          </div>
        )}
      </div>

      {/* ─── Scope Distrik ─── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-start gap-2.5">
          <Globe size={16} className="shrink-0 mt-0.5 text-indigo-500" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Cakupan Template</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Kelola template kartu per <strong>distrik</strong> (setiap distrik bisa punya desain sendiri)
              atau <strong>global</strong>. Bila satu distrik belum diatur, kartunya otomatis memakai
              template global.
            </p>
          </div>
        </div>
        {isSuperadmin ? (
          <div className="mt-4 max-w-md">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Sedang mengelola template untuk:
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Global (Nasional)</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {scopeLabel}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              (ditentukan otomatis oleh sistem)
            </span>
          </div>
        )}
      </div>

      {/* Form buat/edit */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          {editingId ? 'Edit Template' : `Upload Template Baru — ${scopeLabel}`}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Nama (slug)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="contoh: kta-larantuka-2026"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Label tampilan (opsional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="contoh: KTA Larantuka 2026"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sisi Depan</label>
            <input
              ref={frontRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 file:text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sisi Belakang</label>
            <input
              ref={backRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 dark:file:bg-blue-950 file:text-blue-700 dark:file:text-blue-300 file:text-xs"
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowOverlay((v) => !v)}
            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {showOverlay ? 'Tutup' : 'Edit konfigurasi overlay lanjutan'} (guilloche, watermark)
          </button>
          {showOverlay && (
            <textarea
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              rows={8}
              spellCheck={false}
              className="mt-2 w-full px-3 py-2 font-mono text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
            />
          )}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            <Upload size={16} /> {saving ? 'Menyimpan…' : editingId ? 'Simpan Perubahan' : `Upload Template (${scopeLabel})`}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300"
            >
              Batal
            </button>
          )}
        </div>
      </div>
      {/* Galeri template */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Galeri Template {scopeLabel} ({scopedTemplates.length})
        </h2>
        {loading ? (
          <p className="text-sm text-gray-400">Memuat…</p>
        ) : scopedTemplates.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Belum ada template untuk {scopeLabel}. Desain bawaan (klasik) sedang dipakai — upload template
            pertama untuk menggantinya.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {scopedTemplates.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border bg-white dark:bg-gray-800 overflow-hidden shadow-sm ${
                  t.isActive
                    ? 'border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-950'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="grid grid-cols-2 gap-1 p-2 bg-gray-50 dark:bg-gray-900">
                  <div className="aspect-[856/540] rounded overflow-hidden border border-gray-200 dark:border-gray-700 bg-white">
                    {t.frontImage ? (
                      <img
                        src={`/api/uploads/${encodeURIComponent(t.frontImage)}`}
                        alt="Depan"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Depan</div>
                    )}
                  </div>
                  <div className="aspect-[856/540] rounded overflow-hidden border border-gray-200 dark:border-gray-700 bg-white">
                    {t.backImage ? (
                      <img
                        src={`/api/uploads/${encodeURIComponent(t.backImage)}`}
                        alt="Belakang"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">Belakang</div>
                    )}
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{t.label}</p>
                      <p className="text-xs text-gray-400 truncate">{t.name}</p>
                    </div>
                    {t.isActive && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                        <CheckCircle2 size={12} /> Aktif
                      </span>
                    )}
                  </div>
                  {t.distrikId && (
                    <p className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[11px] font-medium">
                      <Globe size={10} /> {isSuperadmin ? districts.find((d) => d.id === t.distrikId)?.nama || 'Distrik' : scopeName || 'Distrik'}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!t.isActive && (
                      <button
                        type="button"
                        onClick={() => handleActivate(t)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        <CheckCircle2 size={14} /> Set Aktif
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(t)}
                      disabled={t.isActive}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold disabled:opacity-40"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal}
    </div>
  );
}