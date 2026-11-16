'use client';

import { useCallback, useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { getSocket } from '@/lib/socket';

type PhotoStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type Photo = {
  id: string;
  judul: string;
  deskripsi?: string | null;
  kategori?: string | null;
  status: PhotoStatus;
  createdAt: string;
  uploader?: { namaLengkap: string; email: string };
  rejectedReason?: string | null;
};

type QueueMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counts: Record<PhotoStatus, number>;
};

const LIMIT = 20;
const TABS: Array<{ key: PhotoStatus; label: string }> = [
  { key: 'PENDING', label: 'Menunggu' },
  { key: 'APPROVED', label: 'Disetujui' },
  { key: 'REJECTED', label: 'Ditolak' },
];

/**
 * Pratinjau foto untuk moderator.
 *
 * `<img src>` biasa tidak bisa dipakai di sini: endpoint
 * /galeri/admin/:id/image dilindungi JWT yang hanya dibaca dari header
 * Authorization, sedangkan browser tidak mengirim header tersebut untuk elemen
 * <img> — hasilnya 401 dan thumbnail selalu rusak. Jadi file diambil lewat
 * apiClient (yang menyisipkan Bearer token) sebagai blob, lalu diubah menjadi
 * object URL lokal.
 */
function GaleriPreview({ id, title }: { id: string; title: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    apiClient
      .get(`/galeri/admin/${id}/image`, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data as Blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  if (failed) {
    return (
      <div className="flex h-40 w-56 items-center justify-center rounded border border-dashed p-2 text-center text-xs text-gray-500">
        Pratinjau gagal dimuat
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className="h-40 w-56 animate-pulse rounded bg-gray-200"
        role="img"
        aria-label={`Memuat pratinjau ${title}`}
      />
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className="h-40 w-56 rounded object-cover"
      // Respons 200 yang ternyata bukan gambar (mis. HTML error dari proxy)
      // tetap harus terlihat sebagai kegagalan, bukan thumbnail rusak.
      onError={() => setFailed(true)}
    />
  );
}

function messageOf(err: unknown, fallback: string): string {
  const message = (err as { message?: string } | null)?.message;
  return message?.trim() ? message : fallback;
}

export default function GalleryManagePage() {
  const [status, setStatus] = useState<PhotoStatus>('PENDING');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Photo[]>([]);
  const [meta, setMeta] = useState<QueueMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState<Record<string, string>>({});
  const [bulkReason, setBulkReason] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [counts, setCounts] = useState<Record<PhotoStatus, number>>({
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  });

  const load = useCallback(async (nextStatus: PhotoStatus, nextPage: number) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/galeri/admin', {
        params: { status: nextStatus, page: nextPage, limit: LIMIT },
      });
      setItems(Array.isArray(data.data) ? data.data : []);
      setMeta(data.meta ?? null);
      setCounts(data.meta?.counts ?? { PENDING: 0, APPROVED: 0, REJECTED: 0 });
      setError('');
    } catch {
      setError('Tidak dapat memuat foto galeri.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(status, page);
  }, [status, page, load]);

  // Pilihan tidak boleh terbawa ke tab/halaman lain.
  useEffect(() => {
    setSelected([]);
    setBulkReason('');
    setReason({});
  }, [status, page]);

  // Badge antrian realtime. Bila NEXT_PUBLIC_ENABLE_REALTIME bukan 'true',
  // getSocket() mengembalikan socket noop dan badge memakai angka dari respons
  // list terakhir (tanpa polling berkala).
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return;

    const socket = getSocket(token);
    const handleQueue = (data: { pending?: number }) => {
      if (typeof data?.pending === 'number') {
        setCounts((prev) => ({ ...prev, PENDING: data.pending as number }));
      }
    };
    socket.on('galeri:queue', handleQueue);
    return () => {
      socket.off('galeri:queue', handleQueue);
    };
  }, []);

  async function review(id: string, next: 'APPROVED' | 'REJECTED') {
    setError('');
    setNotice('');
    try {
      await apiClient.patch(`/galeri/${id}/review`, { status: next, reason: reason[id] });
      await load(status, page);
    } catch (err) {
      // Tampilkan pesan server (mis. 403 menilai unggahan sendiri / peran tidak berhak)
      // alih-alih menebak penyebabnya.
      setError(messageOf(err, 'Gagal mengubah status. Untuk penolakan, alasan wajib diisi.'));
    }
  }

  async function remove(id: string) {
    if (!confirm('Hapus foto ini secara permanen?')) return;
    setError('');
    setNotice('');
    try {
      await apiClient.delete(`/galeri/${id}`);
      await load(status, page);
    } catch (err) {
      setError(messageOf(err, 'Foto gagal dihapus.'));
    }
  }

  const selectableIds = items.filter((item) => item.status === 'PENDING').map((item) => item.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id));

  function toggleAll() {
    setSelected(allSelected ? [] : selectableIds);
  }

  function toggleOne(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function bulkReview(next: 'APPROVED' | 'REJECTED') {
    if (!selected.length || busy) return;
    if (next === 'REJECTED' && !bulkReason.trim()) {
      setError('Alasan penolakan wajib diisi untuk aksi massal.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { data } = await apiClient.patch('/galeri/review/bulk', {
        ids: selected,
        status: next,
        reason: bulkReason,
      });
      const result = (data.data ?? {}) as { updated?: number; failed?: unknown[] };
      setNotice(
        `${result.updated ?? 0} foto ${next === 'APPROVED' ? 'disetujui' : 'ditolak'}${
          result.failed?.length ? `, ${result.failed.length} gagal` : ''
        }.`,
      );
      setSelected([]);
      setBulkReason('');
      await load(status, page);
    } catch (err) {
      setError(messageOf(err, 'Aksi massal gagal.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Moderasi Galeri</h1>
        {counts.PENDING > 0 && (
          <span
            className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900"
            role="status"
            aria-live="polite"
          >
            {counts.PENDING} menunggu ditinjau
          </span>
        )}
      </div>

      {/* Tab per status */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter status galeri">
        {TABS.map((tab) => {
          const active = tab.key === status;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setStatus(tab.key);
                setPage(1);
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                active ? 'bg-navy-800 text-white' : 'bg-white text-navy-800 hover:bg-gray-50'
              }`}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded border border-green-300 bg-green-50 p-3 text-sm">
          {notice}
        </p>
      )}

      {/* Aksi massal */}
      {selectableIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-gray-50 p-3 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            Pilih semua di halaman ini
          </label>
          <span className="text-gray-600">{selected.length} dipilih</span>
          <input
            placeholder="Alasan penolakan (dipakai untuk aksi massal)"
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
            className="min-w-[240px] flex-1 rounded border p-2"
          />
          <button
            type="button"
            disabled={busy || !selected.length}
            onClick={() => bulkReview('APPROVED')}
            className="rounded bg-green-700 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            Setujui terpilih
          </button>
          <button
            type="button"
            disabled={busy || !selected.length}
            onClick={() => bulkReview('REJECTED')}
            className="rounded bg-red-700 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            Tolak terpilih
          </button>
        </div>
      )}

      {loading ? (
        <p role="status" className="py-10 text-center text-gray-500">
          Memuat antrian…
        </p>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-gray-500">
          Tidak ada foto pada status {TABS.find((tab) => tab.key === status)?.label.toLowerCase()}.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row">
              {p.status === 'PENDING' && (
                <input
                  type="checkbox"
                  aria-label={`Pilih ${p.judul}`}
                  checked={selected.includes(p.id)}
                  onChange={() => toggleOne(p.id)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
              )}
              <GaleriPreview id={p.id} title={p.judul} />
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{p.judul}</h2>
                <p>Kategori: {p.kategori ?? '-'}</p>
                {p.deskripsi && (
                  <p className="whitespace-pre-line text-sm">Deskripsi: {p.deskripsi}</p>
                )}
                <p>
                  Pengirim: {p.uploader?.namaLengkap ?? 'Tidak diketahui'} (
                  {p.uploader?.email ?? '-'})
                </p>
                <p>Status: {p.status}</p>
                {p.rejectedReason && <p>Alasan: {p.rejectedReason}</p>}
                {p.status === 'PENDING' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      placeholder="Alasan penolakan"
                      value={reason[p.id] ?? ''}
                      onChange={(e) => setReason({ ...reason, [p.id]: e.target.value })}
                      className="rounded border p-2"
                    />
                    <button
                      type="button"
                      onClick={() => review(p.id, 'APPROVED')}
                      className="rounded bg-green-700 px-3 py-2 text-white"
                    >
                      Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => review(p.id, 'REJECTED')}
                      className="rounded bg-red-700 px-3 py-2 text-white"
                    >
                      Tolak
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="mt-3 rounded border px-3 py-2"
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {meta && meta.total > 0 && (
        <div className="flex items-center justify-between gap-3 border-t pt-3 text-sm">
          <span>
            Halaman {meta.page} dari {meta.totalPages} · {meta.total} item
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={meta.page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={meta.page >= meta.totalPages || loading}
              onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              className="rounded border px-3 py-2 disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
