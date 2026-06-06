'use client';

import { useEffect, useState, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import DataTable from '@/components/tables/data-table';
import {
  Plus, FileText, Download, X, ChevronRight, Trash2, Edit3,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  diterima: 'bg-green-100 text-green-700',
  diproses: 'bg-blue-100 text-blue-700',
  ditolak: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-700',
  terkirim: 'bg-green-100 text-green-700',
  dikirim: 'bg-green-100 text-green-700',
  dibatalkan: 'bg-red-100 text-red-700',
};

const columns = [
  { key: 'nomorSurat', label: 'No. Surat' },
  {
    key: 'type',
    label: 'Tipe',
    render: (l: any) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        l.type === 'masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
      }`}>
        {l.type === 'masuk' ? 'Masuk' : 'Keluar'}
      </span>
    ),
  },
  { key: 'pengirim', label: 'Pengirim / Tujuan', render: (l: any) => l.pengirim || l.tujuan || '-' },
  { key: 'perihal', label: 'Perihal' },
  {
    key: 'tanggalSurat',
    label: 'Tanggal',
    render: (l: any) => {
      const date = l.tanggalSurat || l.tanggalTerima || l.tanggalKirim;
      return date ? new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (l: any) => (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[l.status] || 'bg-gray-100 text-gray-600'}`}>
        {l.status || '-'}
      </span>
    ),
  },
];

type LetterType = 'masuk' | 'keluar';

interface LetterFormData {
  nomorSurat: string;
  tanggalSurat: string;
  pengirim: string;   // for masuk
  tujuan: string;     // for keluar
  perihal: string;
  isi: string;        // for keluar content
  fileScanPath: string; // for masuk
  filePath: string;     // for keluar
  tanggalTerima: string; // for masuk
  status: string;
}

const emptyForm: LetterFormData = {
  nomorSurat: '', tanggalSurat: '', pengirim: '', tujuan: '',
  perihal: '', isi: '', fileScanPath: '', filePath: '',
  tanggalTerima: '', status: 'draft',
};

export default function LettersPage() {
  const [tab, setTab] = useState<'incoming' | 'outgoing' | 'all'>('all');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 0 });

  // Detail panel state
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<LetterType>('masuk');
  const [editLetter, setEditLetter] = useState<any>(null);
  const [form, setForm] = useState<LetterFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete state
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { setPage(1); }, [tab]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let endpoint: string;
      if (tab === 'all') endpoint = '/letters';
      else if (tab === 'incoming') endpoint = '/letters/incoming';
      else endpoint = '/letters/outgoing';
      const { data: res } = await apiClient.get(endpoint, { params: { page, limit: 10 } });
      setData(res.data || []);
      setMeta(res.meta || { total: 0, totalPages: 0 });
    } catch { /* ignore */ }
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Open create modal ───
  const openCreate = (type: LetterType) => {
    setFormType(type);
    setEditLetter(null);
    setForm({ ...emptyForm, status: type === 'keluar' ? 'draft' : 'diterima' });
    setFormError('');
    setShowForm(true);
  };

  // ─── Open edit modal ───
  const openEdit = (letter: any) => {
    const type = letter.type || (letter.pengirim ? 'masuk' : 'keluar');
    setFormType(type);
    setEditLetter(letter);
    setForm({
      nomorSurat: letter.nomorSurat || '',
      tanggalSurat: letter.tanggalSurat ? letter.tanggalSurat.slice(0, 10) : '',
      pengirim: letter.pengirim || '',
      tujuan: letter.tujuan || '',
      perihal: letter.perihal || '',
      isi: letter.isi || '',
      fileScanPath: letter.fileScanPath || '',
      filePath: letter.filePath || '',
      tanggalTerima: letter.tanggalTerima ? letter.tanggalTerima.slice(0, 10) : '',
      status: letter.status || 'draft',
    });
    setFormError('');
    setShowForm(true);
  };

  // ─── Submit form (create / update) ───
  const handleSubmit = async () => {
    if (!form.nomorSurat.trim() || !form.perihal.trim()) {
      setFormError('Nomor surat dan perihal harus diisi');
      return;
    }
    if (formType === 'masuk' && !form.pengirim.trim()) {
      setFormError('Pengirim harus diisi');
      return;
    }
    if (formType === 'keluar' && !form.tujuan.trim()) {
      setFormError('Tujuan harus diisi');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload: any = {
        nomorSurat: form.nomorSurat,
        tanggalSurat: form.tanggalSurat || undefined,
        perihal: form.perihal,
        status: form.status,
      };

      if (formType === 'masuk') {
        payload.pengirim = form.pengirim;
        payload.tanggalTerima = form.tanggalTerima || undefined;
        if (form.fileScanPath) payload.fileScanPath = form.fileScanPath;
      } else {
        payload.tujuan = form.tujuan;
        if (form.isi) payload.isi = form.isi;
        if (form.filePath) payload.filePath = form.filePath;
      }

      const endpoint = formType === 'masuk' ? '/letters/incoming' : '/letters/outgoing';

      if (editLetter) {
        await apiClient.patch(`${endpoint}/${editLetter.id}`, payload);
      } else {
        await apiClient.post(endpoint, payload);
      }

      setShowForm(false);
      fetchData();
      // If detail panel is open, refresh it
      if (selectedLetter?.id === editLetter?.id) {
        handleRowClick(selectedLetter);
      }
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Gagal menyimpan surat');
    }
    setSaving(false);
  };

  // ─── Delete letter ───
  const handleDelete = async (letter: any) => {
    if (!confirm('Yakin ingin menghapus surat ini?')) return;
    const type = letter.type || (letter.pengirim ? 'masuk' : 'keluar');
    const endpoint = type === 'masuk' ? '/letters/incoming' : '/letters/outgoing';
    setDeleting(true);
    try {
      await apiClient.delete(`${endpoint}/${letter.id}`);
      closeDetail();
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menghapus surat');
    }
    setDeleting(false);
  };

  // ─── Row click → open detail ───
  const handleRowClick = async (letter: any) => {
    setSelectedLetter(letter);
    setLoadingDetail(true);
    try {
      const type = letter.type || (letter.pengirim ? 'masuk' : 'keluar');
      const endpoint = type === 'masuk' ? `/letters/incoming/${letter.id}` : `/letters/outgoing/${letter.id}`;
      const { data: res } = await apiClient.get(endpoint);
      setDetailData({ ...res.data, type });
    } catch { setDetailData(null); }
    setLoadingDetail(false);
  };

  const closeDetail = () => {
    setSelectedLetter(null);
    setDetailData(null);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Surat</h1>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {([
              { value: 'all', label: 'Semua' },
              { value: 'incoming', label: 'Masuk' },
              { value: 'outgoing', label: 'Keluar' },
            ] as const).map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition ${
                  tab === t.value
                    ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openCreate('masuk')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Plus size={14} /> Surat Masuk
          </button>
          <button
            onClick={() => openCreate('keluar')}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <Plus size={14} /> Surat Keluar
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Table */}
        <div className={selectedLetter ? 'flex-1' : 'w-full'}>
          <DataTable
            data={data}
            loading={loading}
            page={page}
            totalPages={meta.totalPages}
            total={meta.total}
            onPageChange={setPage}
            columns={columns}
            onRowClick={handleRowClick}
          />
        </div>

        {/* Detail Panel */}
        {selectedLetter && (
          <div className="w-96 flex-shrink-0 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Detail Surat</h3>
              <button onClick={closeDetail} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">Memuat data...</div>
            ) : detailData ? (
              <div className="p-5 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    detailData.type === 'masuk' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    Surat {detailData.type === 'masuk' ? 'Masuk' : 'Keluar'}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[detailData.status] || 'bg-gray-100 text-gray-600'}`}>
                    {detailData.status}
                  </span>
                </div>

                {/* Fields */}
                <DetailRow label="No. Surat" value={detailData.nomorSurat} />
                <DetailRow
                  label={detailData.type === 'masuk' ? 'Pengirim' : 'Tujuan'}
                  value={detailData.pengirim || detailData.tujuan}
                />
                <DetailRow label="Perihal" value={detailData.perihal} />
                <DetailRow
                  label="Tanggal Surat"
                  value={detailData.tanggalSurat
                    ? new Date(detailData.tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'}
                />
                {detailData.tanggalTerima && (
                  <DetailRow
                    label="Tanggal Terima"
                    value={new Date(detailData.tanggalTerima).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  />
                )}
                {detailData.isi && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Isi / Konten</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed bg-gray-50 dark:bg-gray-900 rounded-lg p-3 whitespace-pre-wrap">{detailData.isi}</p>
                  </div>
                )}

                {/* File Preview */}
                {(detailData.fileScanPath || detailData.filePath) && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Lampiran / File</p>
                    <FilePreview
                      fileUrl={detailData.fileScanPath || detailData.filePath}
                      fileName={detailData.nomorSurat}
                    />
                  </div>
                )}

                {/* Disposisi */}
                {detailData.type === 'masuk' && detailData.disposisi?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Disposisi</p>
                    <div className="space-y-2">
                      {detailData.disposisi.map((d: any, i: number) => (
                        <div key={d.id || i} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500">Kepada: {d.kepadaUserId}</p>
                          <p className="text-sm text-gray-900 mt-1">{d.isi}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Created / Updated */}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Dibuat: {new Date(detailData.createdAt).toLocaleString('id-ID')}
                  </p>
                  {detailData.updatedAt && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Diperbarui: {new Date(detailData.updatedAt).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => openEdit(detailData)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(detailData)}
                    disabled={deleting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-950 transition disabled:opacity-50"
                  >
                    <Trash2 size={14} /> {deleting ? 'Menghapus...' : 'Hapus'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-gray-500">Gagal memuat data</div>
            )}
          </div>
        )}
      </div>

      {/* ─── Create / Edit Modal ─── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeForm}>            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editLetter ? 'Edit Surat' : 'Tambah Surat'} {formType === 'masuk' ? 'Masuk' : 'Keluar'}
              </h2>
              <button onClick={closeForm} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X size={18} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Nomor Surat */}
            <Field label="Nomor Surat" required>
              <input
                type="text"
                value={form.nomorSurat}
                onChange={(e) => setForm((p) => ({ ...p, nomorSurat: e.target.value }))}
                placeholder="Contoh: 001/THS-THM/V/2026"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </Field>

            {/* Pengirim (masuk) / Tujuan (keluar) */}
            {formType === 'masuk' ? (
              <Field label="Pengirim" required>
                <input
                  type="text"
                  value={form.pengirim}
                  onChange={(e) => setForm((p) => ({ ...p, pengirim: e.target.value }))}
                  placeholder="Nama pengirim / instansi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </Field>
            ) : (
              <Field label="Tujuan" required>
                <input
                  type="text"
                  value={form.tujuan}
                  onChange={(e) => setForm((p) => ({ ...p, tujuan: e.target.value }))}
                  placeholder="Nama tujuan / instansi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </Field>
            )}

            {/* Perihal */}
            <Field label="Perihal" required>
              <input
                type="text"
                value={form.perihal}
                onChange={(e) => setForm((p) => ({ ...p, perihal: e.target.value }))}
                placeholder="Perihal surat"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </Field>

            {/* Tanggal Surat */}
            <Field label="Tanggal Surat">
              <input
                type="date"
                value={form.tanggalSurat}
                onChange={(e) => setForm((p) => ({ ...p, tanggalSurat: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </Field>

            {/* Tanggal Terima (masuk only) */}
            {formType === 'masuk' && (
              <Field label="Tanggal Terima">
                <input
                  type="date"
                  value={form.tanggalTerima}
                  onChange={(e) => setForm((p) => ({ ...p, tanggalTerima: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </Field>
            )}

            {/* Isi (keluar only) */}
            {formType === 'keluar' && (
              <Field label="Isi / Konten Surat">
                <textarea
                  value={form.isi}
                  onChange={(e) => setForm((p) => ({ ...p, isi: e.target.value }))}
                  placeholder="Isi surat (opsional)"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </Field>
            )}

            {/* File URL */}
            <Field label={formType === 'masuk' ? 'File Scan URL' : 'File Path'}>
              <input
                type="text"
                value={formType === 'masuk' ? form.fileScanPath : form.filePath}
                onChange={(e) => {
                  if (formType === 'masuk') setForm((p) => ({ ...p, fileScanPath: e.target.value }));
                  else setForm((p) => ({ ...p, filePath: e.target.value }));
                }}
                placeholder="URL file lampiran (opsional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </Field>

            {/* Status */}
            <Field label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {formType === 'masuk' ? (
                  <>
                    <option value="diterima">Diterima</option>
                    <option value="diproses">Diproses</option>
                    <option value="ditolak">Ditolak</option>
                  </>
                ) : (
                  <>
                    <option value="draft">Draft</option>
                    <option value="terkirim">Terkirim</option>
                    <option value="dibatalkan">Dibatalkan</option>
                  </>
                )}
              </select>
            </Field>

            {/* Error */}
            {formError && (
              <div className="text-sm px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400">{formError}</div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeForm}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {saving ? 'Menyimpan...' : editLetter ? 'Simpan Perubahan' : 'Tambah Surat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper components ───

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white font-medium">{value || '-'}</p>
    </div>
  );
}

function FilePreview({ fileUrl, fileName }: { fileUrl: string; fileName: string }) {
  const [expanded, setExpanded] = useState(false);
  const isPdf = fileUrl.endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition text-left"
      >
        <FileText size={16} className="text-blue-600 flex-shrink-0" />
        <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
        <ChevronRight size={14} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          {isPdf ? (
            <iframe src={fileUrl} className="w-full h-80" title={`Preview: ${fileName}`} />
          ) : isImage ? (
            <img src={fileUrl} alt={fileName} className="w-full h-auto max-h-80 object-contain bg-gray-50" />
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              <FileText size={32} className="mx-auto mb-2 text-gray-400" />
              <p>Preview tidak tersedia untuk file ini</p>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                <Download size={12} /> Download
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
