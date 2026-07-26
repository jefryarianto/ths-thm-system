'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function NewDocumentPage() {
  const router = useRouter();
  const [form, setForm] = useState({ anggotaId: '', tipe: 'kartu_anggota' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await apiClient.post('/documents', form); router.push('/documents'); }
    catch { alert('Gagal menyimpan'); }
    setSaving(false);
  };

  return (
      <PermissionGuard module="documents" action="create">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/documents')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"><ArrowLeft size={18} /></button>
                <h1 className="text-xl font-semibold">Dokumen Baru</h1>
              </div>
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
                <div><label className="block text-sm font-medium mb-1">ID Anggota</label><input type="text" value={form.anggotaId} onChange={(e) => setForm({ ...form, anggotaId: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Tipe Dokumen</label>
                  <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="kartu_anggota">Kartu Anggota</option>
                    <option value="sertifikat_pendadaran">Sertifikat Pendadaran</option>
                    <option value="sertifikat_pelatihan">Sertifikat Pelatihan</option>
                    <option value="piagam_prestasi">Piagam Prestasi</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => router.push('/documents')} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Save size={14} /> Simpan</button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
