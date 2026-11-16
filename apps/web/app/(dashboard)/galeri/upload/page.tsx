'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { AxiosError } from 'axios';
import apiClient from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

type Photo = {
  id: string;
  judul: string;
  kategori?: string | null;
  status: string;
  rejectedReason?: string | null;
  createdAt: string;
};

const KATEGORI = ['Kegiatan', 'Pelatihan', 'Upacara', 'Bakti Sosial', 'Lainnya'];

export default function GalleryUploadPage() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [kategori, setKategori] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => {
    const { data } = await apiClient.get('/galeri/mine');
    setPhotos(data.data ?? data);
  };
  useEffect(() => {
    load().catch(() => undefined);
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setNotice('Pilih foto terlebih dahulu.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('judul', title);
    if (deskripsi.trim()) form.append('deskripsi', deskripsi.trim());
    if (kategori) form.append('kategori', kategori);
    setBusy(true);
    setNotice('');
    try {
      await apiClient.post('/galeri/upload', form);
      setTitle('');
      setDeskripsi('');
      setKategori('');
      setFile(null);
      setNotice('Foto terkirim dan menunggu persetujuan admin.');
      await load();
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string | string[] }>;
      const msg = axiosErr.response?.data?.message ?? axiosErr.message;
      const friendlyMsg = Array.isArray(msg) ? msg.join('. ') : msg;
      setNotice(
        `Foto gagal dikirim. ${friendlyMsg || 'Pastikan JPEG/PNG/WebP dan maksimal 10 MB.'}`,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Kirim Foto Galeri</h1>
      <p>Unggahan Anda akan ditinjau admin sebelum tampil di galeri publik.</p>
      <form onSubmit={submit} className="space-y-4 rounded-xl border p-5">
        <label className="block">
          Judul
          <input
            required
            maxLength={180}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
          />
        </label>
        <label className="block">
          Kategori
          <select
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
          >
            <option value="">— Pilih kategori —</option>
            {KATEGORI.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Deskripsi (opsional, 20–1000 karakter)
          <textarea
            minLength={20}
            maxLength={1000}
            rows={4}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
          />
        </label>
        <label className="block">
          Foto (JPEG, PNG, WebP, HEIC; maks. 10 MB)
          <input
            required
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full"
          />
        </label>
        <button disabled={busy} className="rounded bg-blue-700 px-4 py-2 text-white">
          {busy ? 'Mengirim…' : 'Kirim untuk ditinjau'}
        </button>
        {notice && <p role="status">{notice}</p>}
      </form>
      <section>
        <h2 className="mb-3 text-xl font-semibold">
          Unggahan Saya{user?.namaLengkap ? ` — ${user.namaLengkap}` : ''}
        </h2>
        <ul className="space-y-2">
          {photos.map((p) => (
            <li key={p.id} className="rounded border p-3">
              <strong>{p.judul}</strong>
              {p.kategori ? ` · ${p.kategori}` : ''} — {p.status}
              {p.rejectedReason && <p>Alasan: {p.rejectedReason}</p>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
