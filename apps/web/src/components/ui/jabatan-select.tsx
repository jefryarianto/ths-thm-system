'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

/** Preset fallback — dipakai bila tabel jabatan kosong / belum dimuat / gagal diambil. */
const FALLBACK_PRESETS = ['Koordinator Distrik', 'Pastor Moderator', 'Sekretaris'];
const JABATAN_CUSTOM = '__custom__';

/**
 * Cache daftar jabatan antar instance (halaman Edit Struktur Organisasi merender
 * satu JabatanSelect per baris — tanpa cache, tiap baris memicu request sendiri).
 * Disimpan sekali per sesi halaman; refresh halaman memuat ulang daftar.
 */
let jabatanCache: string[] | null = null;

/** Reset cache setelah preset ditambah/diubah/dihapus di halaman Jabatan. */
export function invalidateJabatanCache() {
  jabatanCache = null;
}

async function loadJabatanNames(): Promise<string[]> {
  if (jabatanCache) return jabatanCache;
  const { data: res } = await apiClient.get('/jabatan');
  const list = (res?.data ?? res ?? []) as { nama?: string }[];
  // Dedupe: preset distrik boleh bernama sama dengan preset global —
  // cukup satu opsi di dropdown karena keduanya berlaku untuk pemanggil.
  const names = Array.from(
    new Set(list.map((j) => j.nama).filter((n): n is string => Boolean(n))),
  );
  jabatanCache = names.length > 0
    ? names
    : FALLBACK_PRESETS;
  return jabatanCache;
}

/**
 * Dropdown jabatan dari tabel jabatan (Settings → Jabatan, per distrik + global)
 * + preset fallback bawaan. Distrik bisa memperluas pilihan dengan menambah
 * jabatan baru di halaman Jabatan. Opsi "Lainnya…" membuka input manual agar
 * jabatan custom yang sudah tersimpan tetap bisa dipertahankan/diedit.
 */
export default function JabatanSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [presets, setPresets] = useState<string[]>(jabatanCache ?? FALLBACK_PRESETS);

  useEffect(() => {
    let cancelled = false;
    loadJabatanNames()
      .then((names) => {
        if (cancelled) return;
        // Tabel jabatan dulu (urutan sesuai `urutan`), lalu preset fallback yang belum ada.
        setPresets([...names, ...FALLBACK_PRESETS.filter((p) => !names.includes(p))]);
      })
      .catch(() => {
        /* silent — pakai fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPreset = presets.includes(value);
  const selectValue = isPreset ? value : value ? JABATAN_CUSTOM : '';

  return (
    <div className="space-y-2">
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          // Pilih "Lainnya…" → pertahankan teks custom yang sudah ada di input
          onChange(v === JABATAN_CUSTOM ? value : v);
        }}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
      >
        <option value="">— Pilih jabatan —</option>
        {presets.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
        <option value={JABATAN_CUSTOM}>Lainnya (tulis manual)…</option>
      </select>
      {selectValue === JABATAN_CUSTOM && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tulis jabatan lain…"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      )}
    </div>
  );
}
