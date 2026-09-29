# Insiden: Email Auto-Retry Loop — September 2026

> Status: **Fase 1 (triase) SELESAI dieksekusi** pada 29 Sep 2026 02:10–02:20 UTC — backup
> `/home/ths-thm/email_logs-backup-2026-09-29.sql` (96 MB), 131.728 baris duplikat terhapus,
> 1 baris sisa dinonaktifkan dari auto-retry. Fase 2–4 masih rencana.
> Diagnosis diverifikasi langsung ke DB produksi dan log container API pada 29 Sep 2026.

## 1. Ringkasan Eksekutif

Fitur auto-retry email (cron tiap 30 menit) memilih **semua** baris `email_logs` berstatus
`failed` tanpa batas usia, jumlah percobaan, maupun ukuran batch — dan **tidak pernah
mengubah status log asli** saat retry. Satu email "Kredensial Login THS-THM" ke
`seusenda@gmail.com` yang gagal terkirim pada 1 Sep 2026 kemudian:

1. **12–17 Sep** — di-retry sukses tiap 30 menit → penerima dapat **ratusan email duplikat**.
2. **18–19 Sep** — provider mulai menolak (rate limit) → badai retry gagal: **131.729 baris
   `failed`** baru dalam ±36 jam (ratusan percobaan/detik), 99% isi tabel `email_logs`.
3. **Sejak 19 Sep 10:30 UTC** — cron masih jalan tiap 30 menit ("Found 131729 failed emails,
   starting retry…") tetapi `retryFailedEmails()` memuat semua baris **termasuk kolom
   `content` (HTML)** dalam satu `findMany` tanpa limit → Node **OOM crash** ("Reached heap
   limit", memory limit container 1 GB) → **API restart terus** (RestartCount ≥ 19).

Dampak: API produksi tidak stabil (crash loop berkala), inbox penerima penuh duplikat,
notifikasi superadmin spam tiap siklus, tabel `email_logs` tidak berguna.

## 2. Fakta Pendukung (bukti)

| Fakta | Nilai |
|---|---|
| Total baris `email_logs` | 132.869 (131.729 `failed`, 1.140 `sent`) |
| Baris loop (to=`seusenda@gmail.com`, subject=`Kredensial Login THS-THM`) | 132.571 |
| Asal | module `members`, template `credentialEmail` |
| Error semua baris gagal | `All email providers failed (Resend + SMTP)` |
| Ritme normal loop | 48/hari = tepat cron 30 menit |
| Puncak | 19 Sep: 125.073 percobaan gagal dalam sehari |
| Log API | `[Auto-Retry] Found 131729 failed emails, starting retry...` **tanpa pernah "Complete"** |
| Crash | `FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory` |
| Container | `RestartCount=19`, mem limit 1 GB, OOMKilled=false (crash di level Node) |

Kode terkait:
- `apps/api/src/mail/mail.service.ts` → `retryFailedEmails()`: `findMany` tanpa `take`,
  tidak `update` status asli, tiap percobaan `create` baris log baru.
- `apps/api/src/mail/mail-cron.service.ts` → `handleAutoRetry()`: `count({ status: 'failed',
  content: { not: null } })` tanpa batas usia/percobaan, lalu retry semuanya.
- `apps/api/prisma/schema.prisma` → `EmailLog` tidak punya kolom jumlah percobaan/waktu
  retry terakhir.

## 3. Akar Masalah

1. **Log gagal tidak pernah "selesai"** — retry hanya membuat baris baru; status asli tetap
   `failed` selamanya.
2. **Cron tanpa guard** — tidak ada batas usia email, jumlah percobaan, ukuran batch, atau
   backoff antar percobaan.
3. **Query tanpa limit memuat `content`** — 131 ribu × ±5 KB HTML > heap 1 GB → OOM.
4. **Tidak ada circuit breaker** — kegagalan provider berturut-turut tidak menghentikan siklus.

## 4. Fase 1 — Triase Produksi (stop the bleeding, tanpa deploy)

Tujuan: hentikan crash loop **sekarang** juga, sebelum fix kode siap. Yang paling cepat dan
aman adalah membuat cron kehabisan bahan retry (count → 0) dengan membersihkan data duplikat
(lihat Fase 3 — dijalankan lebih awal sebagai triase).

Langkah (SSH ke VPS, dir `/opt/ths-thm`):

1. **Backup tabel** (wajib sebelum DELETE):
   ```bash
   ssh -i ~/.ssh/ths-thm-deploy ths-thm@202.10.34.209 \
     "cd /opt/ths-thm && docker compose -f docker-compose.production.yml exec -T postgres \
      pg_dump -U ths_thm -d ths_thm_db -t email_logs" > ~/email_logs-backup-$(date +%F).sql
   ```
2. **Hapus duplikat loop** dalam transaksi (lihat query Fase 3 §A). Hanya menyentuh baris
   `failed` duplikat dari SATU email; baris asli (tertua) dipertahankan untuk audit.
3. **Verifikasi**: cron log selanjutnya menampilkan `No failed emails to retry` atau retry
   kecil yang selesai (`Complete: ...`); `RestartCount` tidak naik lagi; `GET /api/health` 200.
4. Jika tidak memungkinkan membersihkan DB: opsi darurat adalah menaikkan memory limit
   container API sementara (menunda crash, tidak menyelesaikan loop) — **jangan** matikan
   container postgres.

⚠️ Jangan menunggu fix kode untuk triase: setiap siklus 30 menit tanpa cleanup berarti satu
siklus crash + satu siklus spam notifikasi superadmin.

## 5. Fase 2 — Perbaikan Kode

### 5.1 Refactor `MailService` (`apps/api/src/mail/mail.service.ts`)

- **Ekstrak helper `deliver()`**: logika kirim Resend→SMTP tanpa menulis log, mengembalikan
  `{ ok, provider, resendId?, reason? }`. `sendMail()` tetap perilaku lama (suppression → dev
  → deliver → `logToDb`) — pemanggil (member-mail, claims, letters, dst.) tidak berubah.
- **Tulis ulang `retryFailedEmails(ids?)`**:
  - Where: `status:'failed'`, `content:{not:null}`,
    `createdAt:{gte: now - EMAIL_RETRY_MAX_AGE_HOURS}`,
    `OR:[{lastRetryAt:null},{lastRetryAt:{lt: now - EMAIL_RETRY_BACKOFF_MINUTES}}]`,
    `retryCount:{lt: EMAIL_RETRY_MAX_ATTEMPTS}`, `take: EMAIL_RETRY_BATCH_SIZE`,
    `orderBy:{createdAt:'asc'}`.
  - Retry manual via `ids` (tombol UI): **melewati** filter usia & backoff (admin eksplisit),
    tetap di-`take` dan tetap update status.
  - Sukses → `update(id, { status:'sent', provider, error:null, retryCount:{increment:1},
    lastRetryAt: now, metadata:{...lama, resendId, retriedAt} })`.
  - Gagal → `update(id, { status:'failed', error: reason, retryCount:{increment:1},
    lastRetryAt: now })`; jika `retryCount >= MAX` → `status:'abandoned'` (keluar dari antrean
    retry permanen).
  - **Tidak ada `create` baris baru** untuk percobaan retry (riwayat percobaan hidup di kolom
    `retryCount`/`lastRetryAt`).
  - Update tiap item dibungkus try/catch agar satu kegagalan DB tidak membatalkan batch.

### 5.2 Cron `MailCronService` (`apps/api/src/mail/mail-cron.service.ts`)

- `handleAutoRetry()` memakai **filter yang sama** (usia + backoff + attempts) untuk `count`
  dan memanggil `retryFailedEmails()` dengan batch.
- Skip notifikasi superadmin bila `result.retried === 0` (sudah ada) dan tetap kirim bila ada
  percobaan; tambahkan log ringkas hasil (`Complete: retried/succeeded/failed/abandoned`).

### 5.3 Skema & konfigurasi

- Migration (kolom baru di `email_logs` — aman untuk tabel besar di PG 16):
  ```sql
  ALTER TABLE email_logs ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE email_logs ADD COLUMN last_retry_at TIMESTAMPTZ;
  ```
  Perbarui `schema.prisma` (`retryCount Int @default(0) @map("retry_count")`,
  `lastRetryAt DateTime? @map("last_retry_at")`). `status` bertipe String — nilai baru
  `'abandoned'` tidak butuh perubahan constraint.
- Env baru (daftarkan di `env.validation` + dokumentasi `docs/EMAIL_SETUP.md`):
  | Variabel | Default | Arti |
  |---|---|---|
  | `EMAIL_RETRY_MAX_AGE_HOURS` | `48` | Email lebih tua tidak di-retry otomatis |
  | `EMAIL_RETRY_BATCH_SIZE` | `25` | Maks email per siklus 30 menit |
  | `EMAIL_RETRY_MAX_ATTEMPTS` | `3` | Lalu `abandoned` (manual retry masih bisa) |
  | `EMAIL_RETRY_BACKOFF_MINUTES` | `60` | Jeda minimal antar percobaan per email |

### 5.4 UI kecil (`apps/web/app/(dashboard)/settings/email/`)

- Tambah status `abandoned` di filter & badge tab Riwayat Email agar operator paham email
  tersebut keluar dari antrean otomatis.

### 5.5 Test

- `mail.service.spec.ts` — blok `retryFailedEmails` ditulis ulang:
  1. sukses → `emailLog.update` status `sent` (bukan `create` baru);
  2. gagal → update `failed` + `retryCount` naik + `lastRetryAt`;
  3. `retryCount >= MAX` → update `abandoned`;
  4. where memuat filter usia + backoff + limit + orderBy;
  5. `ids` manual melewati filter usia/backoff;
  6. batch > ukuran → hanya `take` yang diproses.
- `mail-cron.service.spec.ts` — count memakai filter yang sama; notifikasi terlewati saat
  `retried === 0`.
- Verifikasi: `cd apps/api && ./node_modules/.bin/jest src/mail` dan
  `./node_modules/.bin/tsc --noEmit`; E2E `email-logs.spec.ts` di web.

## 6. Fase 3 — Pembersihan Data Produksi

### A. Hapus duplikat loop (dieksekusi di Fase 1)

```sql
BEGIN;
DELETE FROM email_logs
WHERE status = 'failed'
  AND "to" = 'seusenda@gmail.com'
  AND subject = 'Kredensial Login THS-THM'
  AND created_at > (
    SELECT MIN(created_at) FROM email_logs
    WHERE "to" = 'seusenda@gmail.com' AND subject = 'Kredensial Login THS-THM'
      AND status = 'failed'
  );
COMMIT;
```

Hasil: −131.728 baris (baris gagal tertua dipertahankan sebagai jejak audit). Sisa tabel
±1.141 baris bernilai. Baris `failed` lain (±649, non-loop) dibiarkan — fix kode yang akan
menangani via usia/`abandoned`.

### B. Setelah deploy fix

- Cek sisa `failed`: email dalam 48 jam terakhir di-retry normal dengan batch kecil;
  email lama tidak disentuh otomatis (operator bisa retry manual dari UI bila perlu).
- Opsional: `VACUUM ANALYZE email_logs;` untuk mengembalikan ruang.
- Opsional lanjutan: retensi `email_logs` (hapus > 90 hari) via pola cron cleanup yang sudah
  ada di `cron-tasks.service.ts`.

## 7. Fase 4 — Pencegahan agar Tidak Terulang

1. **Circuit breaker di siklus retry**: bila K kegagalan berturut-turut provider dalam satu
   siklus (mis. 10), batalkan sisa batch dan tandai sisa antrean ditunda ke siklus berikut —
   mencegah pengulangan badai 19 Sep (125 ribu percobaan/hari).
2. **Rate limit pengiriman global** sederhana di `MailService` (mis. maks X email/menit,
   token bucket in-memory) agar bug serupa tak lagi menghujat provider.
3. **Aturan repo**: setiap `findMany` pada tabel yang tumbuh wajib `take`; audit cron lain
   mencari pola yang sama (query tanpa limit, retry tanpa batas, loop tanpa guard).
4. **Monitoring**: pantau `RestartCount` container API + log `[Auto-Retry]`; tidak ada lagi
   "starting retry…" tanpa "Complete" dalam 1 siklus.
5. **Dokumentasi**: `docs/EMAIL_SETUP.md` diperbarui dengan env baru & perilaku retry.

## 8. Urutan Eksekusi (checklist)

- [x] 1. Backup `email_logs` (pg_dump) — Fase 1 §1 → `/home/ths-thm/email_logs-backup-2026-09-29.sql` (96 MB)
- [x] 2. Cleanup duplikat loop (131.728 terhapus + 1 baris → `skipped`) — Fase 1/3§A; API up stabil, query cron = 0
- [ ] 3. Implementasi fix: `deliver()`, `retryFailedEmails` baru, cron, migration, env, UI — Fase 2
- [ ] 4. Test: jest `src/mail`, `tsc --noEmit`, E2E email-logs — Fase 2§5.5
- [ ] 5. Push → CI hijau → deploy produksi (alur biasa, workflow Production Deploy)
- [ ] 6. Verifikasi produksi: log `Complete:` muncul, RestartCount stabil, tak ada spam
- [ ] 7. Post-mortem ringkas di deskripsi PR + update `docs/EMAIL_SETUP.md`

## 9. Rollback

- **Kode**: revert commit fix, deploy ulang image sebelumnya (workflow lama tetap valid).
- **Data**: restore tabel dari backup:
  ```bash
  ssh ... "cd /opt/ths-thm && docker compose -f docker-compose.production.yml exec -T postgres \
    psql -U ths_thm -d ths_thm_db" < ~/email_logs-backup-<tanggal>.sql
  ```
  Restore hanya menyentuh `email_logs`; tabel lain tidak terdampak. Perhatikan: restore akan
  mengembalikan baris `failed` — jalankan hanya SETELAH fix kode aktif, atau ulangi cleanup.

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| DELETE massal salah sasaran | Backup dulu, WHERE sempit (1 email), transaksi, hasil dihitung |
| Perilaku retry berubah mengecewakan admin | Retry manual via UI tetap ada dan tidak dibatasi usia |
| Migration di tabel besar | `ADD COLUMN ... DEFAULT` bersifat metadata-only di PG 16 (instan) |
| Status `abandoned` tak dikenal UI | Update UI disertakan di Fase 2§5.4 |
| Fix belum deploy saat cleanup | Cron hanya diam (count kecil) — tidak buruk; fix menyusul |
