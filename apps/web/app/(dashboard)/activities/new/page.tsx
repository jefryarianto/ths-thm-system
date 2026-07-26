'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { ArrowLeft, Save } from 'lucide-react';

import Breadcrumbs from '@/components/ui/breadcrumbs';

export default function NewActivityPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nama: '', tipe: 'latihan', lokasi: '', tanggalMulai: '', tanggalSelesai: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/activities', form);
      router.push('/activities');
    } catch { alert('Gagal menyimpan'); }
    setSaving(false);
  };

  return (
      <PermissionGuard module="activities" action="create">
        <Breadcrumbs />
        <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center gap-2">
                <button onClick={() => router.push('/activities')} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"><ArrowLeft size={18} /></button>
                <h1 className="text-xl font-semibold">Kegiatan Baru</h1>
              </div>
              <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nama Kegiatan</label>
                  <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipe</label>
                  <select value={form.tipe} onChange={(e) => setForm({ ...form, tipe: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="latihan">Latihan</option>
                    <option value="pendadaran">Pendadaran</option>
                    <option value="rapat">Rapat</option>
                    <option value="retret">Retret</option>
                    <option value="pelantikan">Pelantikan</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Lokasi</label><input type="text" value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Tanggal Mulai</label><input type="date" value={form.tanggalMulai} onChange={(e) => setForm({ ...form, tanggalMulai: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Tanggal Selesai</label><input type="date" value={form.tanggalSelesai} onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => router.push('/activities')} className="px-4 py-2 border rounded-lg text-sm">Batal</button>
                  <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"><Save size={14} /> Simpan</button>
                </div>
              </form>
            </div>
      </PermissionGuard>
    );
}
