'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useToast } from '@/components/ui/toast';

export default function NewOrgDocumentPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ judul: '', kategoriId: '', deskripsi: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await apiClient.post('/org-documents', form); router.push('/org-documents'); }
    catch { toast('error', 'Gagal menyimpan'); }
    setSaving(false);
  };

  return (
      <PermissionGuard module="org-documents" action="create">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/org-documents')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"><ArrowLeft size={18} /></button>
                <h1 className="text-xl font-semibold">Dokumen Organisasi Baru</h1>
              </div>
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
                <div><label className="block text-sm font-medium mb-1">Judul</label><input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Kategori ID</label><input type="text" value={form.kategoriId} onChange={(e) => setForm({ ...form, kategoriId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Deskripsi</label><textarea value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => router.push('/org-documents')} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Save size={14} /> Simpan</button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
