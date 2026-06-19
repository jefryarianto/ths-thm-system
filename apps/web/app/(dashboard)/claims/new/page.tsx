'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewClaimPage() {
  const router = useRouter();
  const [form, setForm] = useState({ anggotaId: '', tipe: 'sertifikat', catatan: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await apiClient.post('/claims', form); router.push('/claims'); }
    catch { alert('Gagal menyimpan'); }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.push('/claims')} className="p-1.5 rounded hover:bg-gray-100 transition"><ArrowLeft size={18} /></button>
        <h1 className="text-xl font-semibold">Klaim Baru</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
        <div><label className="block text-sm font-medium mb-1">ID Anggota</label><input type="text" value={form.anggotaId} onChange={(e) => setForm({ ...form, anggotaId: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-sm font-medium mb-1">Tipe Klaim</label>
          <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="sertifikat">Sertifikat</option>
            <option value="piagam">Piagam</option>
            <option value="kartu_anggota">Kartu Anggota</option>
            <option value="dokumen_lainnya">Dokumen Lainnya</option>
          </select>
        </div>
        <div><label className="block text-sm font-medium mb-1">Catatan</label><textarea value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => router.push('/claims')} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
          <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Save size={14} /> Simpan</button>
        </div>
      </form>
    </div>
  );
}
