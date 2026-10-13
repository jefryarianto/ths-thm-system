'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

type Photo = { id: string; judul: string; status: string; createdAt: string; uploader?: { namaLengkap: string; email: string }; rejectedReason?: string | null };

export default function GalleryManagePage() {
  const [items, setItems] = useState<Photo[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const load = async () => { const { data } = await apiClient.get('/galeri/admin'); setItems(data.data ?? data); };
  useEffect(() => { load().catch(() => setError('Tidak dapat memuat foto galeri.')); }, []);
  async function review(id: string, status: 'APPROVED' | 'REJECTED') {
    try { await apiClient.patch(`/galeri/${id}/review`, { status, reason: reason[id] }); await load(); }
    catch { setError('Gagal mengubah status. Untuk penolakan, alasan wajib diisi.'); }
  }
  async function remove(id: string) { if (!confirm('Hapus foto ini secara permanen?')) return; try { await apiClient.delete(`/galeri/${id}`); await load(); } catch { setError('Foto gagal dihapus.'); } }
  return <main className="mx-auto max-w-5xl space-y-6 p-6"><h1 className="text-2xl font-bold">Moderasi Galeri</h1>{error && <p role="alert">{error}</p>}<ul className="space-y-4">{items.map(p => <li key={p.id} className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row"><img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/galeri/admin/${p.id}/image`} alt={p.judul} className="h-40 w-56 rounded object-cover" /><div className="flex-1"><h2 className="text-lg font-semibold">{p.judul}</h2><p>Pengirim: {p.uploader?.namaLengkap ?? 'Tidak diketahui'} ({p.uploader?.email ?? '-'})</p><p>Status: {p.status}</p>{p.status === 'PENDING' && <div className="mt-3 flex flex-wrap gap-2"><input placeholder="Alasan penolakan" value={reason[p.id] ?? ''} onChange={e => setReason({ ...reason, [p.id]: e.target.value })} className="rounded border p-2" /><button onClick={() => review(p.id, 'APPROVED')} className="rounded bg-green-700 px-3 py-2 text-white">Setujui</button><button onClick={() => review(p.id, 'REJECTED')} className="rounded bg-red-700 px-3 py-2 text-white">Tolak</button></div>}<button onClick={() => remove(p.id)} className="mt-3 rounded border px-3 py-2">Hapus</button></div></li>)}</ul></main>;
}
