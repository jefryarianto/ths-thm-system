'use client';

import { useEffect, useState, type FormEvent } from 'react';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

type Photo = { id: string; judul: string; status: string; rejectedReason?: string | null; createdAt: string };

export default function GalleryUploadPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data } = await apiClient.get('/galeri/mine'); setPhotos(data.data ?? data); };
  useEffect(() => { load().catch(() => undefined); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!file) { setNotice('Pilih foto terlebih dahulu.'); return; }
    const form = new FormData(); form.append('file', file); form.append('judul', title);
    setBusy(true); setNotice('');
    try { await apiClient.post('/galeri/upload', form); setTitle(''); setFile(null); setNotice('Foto terkirim dan menunggu persetujuan admin.'); await load(); }
    catch { setNotice('Foto gagal dikirim. Pastikan JPEG/PNG/WebP dan maksimal 10 MB.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-6 p-6"><h1 className="text-2xl font-bold">Kirim Foto Galeri</h1><p>Unggahan Anda akan ditinjau admin sebelum tampil di galeri publik.</p>
    <form onSubmit={submit} className="space-y-4 rounded-xl border p-5"><label className="block">Judul<input required maxLength={180} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 block w-full rounded border p-2" /></label><label className="block">Foto (JPEG, PNG, WebP; maks. 10 MB)<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full" /></label><button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-white">{busy ? 'Mengirim…' : 'Kirim untuk ditinjau'}</button>{notice && <p role="status">{notice}</p>}</form>
    <section><h2 className="mb-3 text-xl font-semibold">Unggahan Saya{user?.namaLengkap ? ` — ${user.namaLengkap}` : ''}</h2><ul className="space-y-2">{photos.map(p => <li key={p.id} className="rounded border p-3"><strong>{p.judul}</strong> — {p.status}{p.rejectedReason && <p>Alasan: {p.rejectedReason}</p>}</li>)}</ul></section>
  </main>;
}
