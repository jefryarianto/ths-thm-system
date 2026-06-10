'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import apiClient from '@/lib/api-client';
import type { LetterDetail, LetterFormData, LetterType } from './shared';
import { emptyForm, Field } from './shared';

interface Props {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
  editLetter: LetterDetail | null;
  formType: LetterType;
}

export default function LetterFormModal({ show, onClose, onSaved, editLetter, formType }: Props) {
  const [form, setForm] = useState<LetterFormData>(() => {
    if (editLetter) {
      return {
        nomorSurat: editLetter.nomorSurat || '',
        tanggalSurat: editLetter.tanggalSurat ? editLetter.tanggalSurat.slice(0, 10) : '',
        pengirim: editLetter.pengirim || '',
        tujuan: editLetter.tujuan || '',
        perihal: editLetter.perihal || '',
        isi: editLetter.isi || '',
        fileScanPath: editLetter.fileScanPath || '',
        filePath: editLetter.filePath || '',
        tanggalTerima: editLetter.tanggalTerima ? editLetter.tanggalTerima.slice(0, 10) : '',
        status: editLetter.status || 'draft',
      };
    }
    return { ...emptyForm, status: formType === 'keluar' ? 'draft' : 'diterima' };
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

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
      const payload: Record<string, unknown> = {
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

      onClose();
      onSaved();
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setFormError(apiErr || 'Gagal menyimpan surat');
    }
    setSaving(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {editLetter ? 'Edit Surat' : 'Tambah Surat'} {formType === 'masuk' ? 'Masuk' : 'Keluar'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <Field label="Nomor Surat" required>
          <input type="text" value={form.nomorSurat}
            onChange={(e) => setForm((p) => ({ ...p, nomorSurat: e.target.value }))}
            placeholder="Contoh: 001/THS-THM/V/2026"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </Field>

        {formType === 'masuk' ? (
          <Field label="Pengirim" required>
            <input type="text" value={form.pengirim} onChange={(e) => setForm((p) => ({ ...p, pengirim: e.target.value }))}
              placeholder="Nama pengirim / instansi"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </Field>
        ) : (
          <Field label="Tujuan" required>
            <input type="text" value={form.tujuan} onChange={(e) => setForm((p) => ({ ...p, tujuan: e.target.value }))}
              placeholder="Nama tujuan / instansi"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </Field>
        )}

        <Field label="Perihal" required>
          <input type="text" value={form.perihal} onChange={(e) => setForm((p) => ({ ...p, perihal: e.target.value }))}
            placeholder="Perihal surat"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </Field>

        <Field label="Tanggal Surat">
          <input type="date" value={form.tanggalSurat} onChange={(e) => setForm((p) => ({ ...p, tanggalSurat: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </Field>

        {formType === 'masuk' && (
          <Field label="Tanggal Terima">
            <input type="date" value={form.tanggalTerima} onChange={(e) => setForm((p) => ({ ...p, tanggalTerima: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
          </Field>
        )}

        {formType === 'keluar' && (
          <Field label="Isi / Konten Surat">
            <textarea value={form.isi} onChange={(e) => setForm((p) => ({ ...p, isi: e.target.value }))}
              placeholder="Isi surat (opsional)" rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
          </Field>
        )}

        <Field label={formType === 'masuk' ? 'File Scan URL' : 'File Path'}>
          <input type="text" value={formType === 'masuk' ? form.fileScanPath : form.filePath}
            onChange={(e) => { if (formType === 'masuk') setForm((p) => ({ ...p, fileScanPath: e.target.value })); else setForm((p) => ({ ...p, filePath: e.target.value })); }}
            placeholder="URL file lampiran (opsional)"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
        </Field>

        <Field label="Status">
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
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

        {formError && (
          <div className="text-sm px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400">{formError}</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Batal
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
            {saving ? 'Menyimpan...' : editLetter ? 'Simpan Perubahan' : 'Tambah Surat'}
          </button>
        </div>
      </div>
    </div>
  );
}
