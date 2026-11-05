# Desain: Ritme Animasi Login (Progres Bertahap)

**Tanggal:** 2026-11-04
**Status:** menunggu persetujuan
**Ukuran:** perubahan kecil

## Intent

Alur login saat ini selesai dalam ~1 detik: API merespons cepat, state loading nyaris tak terlihat, langkah progres melompat dari langkah 1 langsung ke sukses, dan centang sukses hanya 600ms sebelum redirect. Pengguna menilai keseluruhan alur "terlalu cepat". Tujuan: memberi ritme yang terbaca tanpa membuat login terasa lambat.

## Goals

- Ketiga langkah progres terlihat berjalan satu per satu selama loading.
- Ada durasi minimum loading dan dwell sukses yang cukup untuk dibaca.
- Tetap responsif: API lambat tidak dipotong; error tetap tampil segera.

## Non-goals

- Tidak mengubah API/backend.
- Tidak menambah dependency animasi.
- Tidak menyentuh halaman selain `/login`.
- Tidak mengubah animasi CSS (shimmer/check-draw) yang sudah ada.

## Anti-goals

- Menahan pesan error demi animasi.
- Menambah delay permanen yang membuat login harian terasa lambat (target total ~2,3 detik).

## Timeline Perilaku

Konstanta:

| Konstanta | Nilai | Arti |
|---|---|---|
| `STEP_2_AT_MS` | 600 | langkah 2 mulai aktif |
| `STEP_3_AT_MS` | 1100 | langkah 3 mulai aktif |
| `MIN_LOADING_MS` | 1400 | loading tidak boleh lebih singkat dari ini (sejak klik) |
| `SUCCESS_DWELL_MS` | 900 | lama state sukses sebelum navigasi |

Alur:

1. Klik Masuk → `loading=true`, `step=0` (langkah 1 aktif), timer langkah dimulai.
2. t=600ms → `step=1` (langkah 1 selesai, langkah 2 aktif).
3. t=1.100ms → `step=2` (langkah 1–2 selesai, langkah 3 aktif).
4. Respons API sukses datang kapan pun → tunggu hingga `MIN_LOADING_MS` terlewati, lalu `loading=false`, `success=true` (langkah 1–2 selesai, langkah 3 aktif; tombol hijau + centang).
5. `SUCCESS_DWELL_MS` setelah sukses → `router.replace(target)`.
6. Cabang `mustChangePassword` mengikuti dwell yang sama sebelum `router.push('/force-change-password')` (memperbaiki minor yang tertunda).
7. API error → error langsung ditampilkan, timer/animasi dibatalkan (tidak menunggu `MIN_LOADING_MS`).
8. API lebih lambat dari 1.400ms → langkah 3 tetap aktif sampai respons tiba; tanpa delay tambahan.

## Perubahan Teknis

- `apps/web/app/login/page.tsx`: tambah state `step` (0–2), konstanta durasi, timer langkah yang dibersihkan saat unmount/submit ulang, dan penjadwalan sukses berbasis `Math.max(0, MIN_LOADING_MS - elapsed)`.
- `LoginSteps` tetap memakai API `doneCount`/`activeIndex`: saat loading `doneCount=step, activeIndex=step`; saat sukses `doneCount=2, activeIndex=2`.
- Tombol tidak berubah selain durasi state.
- `apps/web/e2e/login-animation.spec.ts`: sesuaikan dengan timeline baru memakai `page.clock` (assert langkah 2 & 3 aktif di waktunya, sukses setelah ≥1.400ms, navigasi setelah dwell 900ms).
- Tidak ada perubahan CSS.

## Risiko

- Timer ganda jika submit ditekan ulang → tombol `disabled` selama loading/sukses; timer lama dibersihkan.
- E2E bergantung timing → memakai `page.clock` (deterministik), bukan `waitForTimeout`.
