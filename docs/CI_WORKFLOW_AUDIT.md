# Audit CI Workflow — 2026-09-15

Audit redundansi & efisiensi seluruh workflow di `.github/workflows/`
(7 file), dipicu optimasi E2E (konsolidasi → cache → build-once).
Durasi diukur dari run push `cc6f60bb` (2026-09-15).

## Snapshot 5 workflow aktif per push `master`

| Workflow                             | Durasi | Trigger              | Isi inti                                                    |
| ------------------------------------ | ------ | -------------------- | ----------------------------------------------------------- |
| CI/CD Pipeline (`ci.yml`)            | 1m52s  | push + PR            | lint, typecheck, test-api, test-web, repo-hygiene           |
| E2E Tests (`e2e.yml`)                | 6m25s  | push + PR            | plan → build-web → 4 shard → smoke → merge                  |
| Security Scan (`security-scan.yml`)  | 1m29s  | push + PR + mingguan | audit, snyk (skip), trivy (build 2 image Docker!), gitleaks |
| Production Deploy (`production.yml`) | 8m04s  | push master          | build 2 image Docker + push GHCR + deploy VPS               |
| EAS Build (`eas-build.yml`)          | 15m00s | push master          | build APK Android lokal + OTA                               |

(Safety Check hanya PR/develop; Visual Baselines hanya manual.)

Total ±32 menit-runner **per push master**, tanpa path filtering.

## Temuan

### R1 — Build web 3× per push (bukan 5×, tapi masih ada yang bisa dihilangkan)

| Lokasi                    | Bentuk                                                          |
| ------------------------- | --------------------------------------------------------------- |
| `e2e.yml` build-web       | 1× — sudah optimal (build-once + dibagikan artifact)            |
| `security-scan.yml` trivy | **Build API + Web image Docker lengkap** hanya untuk scan SARIF |
| `production.yml`          | Build API + Web image Docker (memang perlu — ini deploy)        |

Fix: Trivy image scan di `security-scan.yml` bisa memindai image yang
sudah dibangun `production.yml` (retrieval dari GHCR `:sha-<short>`,
publik ke CI yang sama) — menghapus 2 build Docker penuh per push.
Snyk container scan **sudah mati** (tanpa `SNYK_TOKEN`, semua step skip)
sehingga build Docker duplikatnya di job snyk bisa dihapus sama sekali.

### R2 — Snyk job membayar install penuh untuk hasil nihil

Job `snyk` selalu jalan (`pnpm install` + 2× build API/Docker + 4 step
scan), tapi tanpa `SNYK_TOKEN` **semua scan skip** — job sukses kosong
setiap push. Fix: pindahkan `pnpm install` ke belakang pengecekan token,
atau nonaktifkan job sampai token diset (`if: false` dengan komentar),
atau set `SNYK_TOKEN`. Hari ini biayanya murni runner terbuang.

### R3 — Tidak ada path filtering sama sekali

- `eas-build.yml` (15 menit!) jalan untuk **setiap** push master, padahal
  hanya relevan saat `apps/mobile/**` atau trigger tag berubah. Push
  perbaikan CI seperti kemarin membangun APK full 15 menit sia-sia.
- `production.yml` (8 menit + deploy ke produksi!) juga tanpa path
  filter — deploy produksi terjadi walau yang berubah cuma `docs/`.
- `security-scan.yml` & `ci.yml` masuk akal jalan di semua push.

Fix minimum: `paths` filter untuk EAS (`apps/mobile/**`, `packages/**`,
lockfile) dan opsional `paths-ignore: docs/**` untuk production.
Catatan: workflow `paths` filter hanya mengevaluasi file yang berubah
dalam **satu push**; tetap ada jalur manual `workflow_dispatch`.

### R4 — Build Docker production tanpa cache

`production.yml` build 2 image tanpa `cache-from/cache-to` (type=gha),
sementara job trivy di `security-scan.yml` **sudah** memakai
`type=gha,mode=max` — cache layer Docker yang dibangun scanner tidak
pernah dipakai deployer. Fix: tambah `cache-from: type=gha` /
`cache-to: type=gha,mode=max` di kedua build production (API & Web).

### R5 — Tidak ada `concurrency` di workflow non-E2E

Hanya `e2e.yml` dan `security-scan.yml` yang punya `concurrency`
group. Push cepat beruntun membuat 5 workflow paralel per commit tanpa
pembatalan run yang ter-supersede (kecuali E2E/Security). Minimal untuk
`ci.yml`: `concurrency: group: ci-${{ github.ref }}`
`cancel-in-progress: true`. Untuk `production.yml` justru perlu
`cancel-in-progress: false` (deploy jangan dibanting) tapi tetap
perlu group agar antrian rapi.

### R6 — Overlap safety-check vs ci.yml

`safety-check.yml` mengulang `pnpm install`, prisma generate,
`tsc:check`, `pnpm run typecheck`, dan `pnpm run build` yang semua sudah
ada di `ci.yml`. Uniknya hanya: `format:check`, deteksi `.only/.skip`,
dan gate checklist. Masalah:

1. **`format:check` di sana akan selalu gagal** — repo-wide 712 file
   tidak pernah lolos prettier terpasang saat ini (utang terdokumentasi
   di riwayat sesi 2026-09-15; file `apps/mobile/jest.setup.js` bahkan
   tidak bisa di-parse). Workflow itu sendiri belum pernah dijalankan di
   master (tidak ada run) — PR pertama akan merah tanpa kesalahan kode.
2. Perjalanan ganda typecheck+build = ±3 menit runner per PR.

Fix: pangkas job pre-merge ke 2 langkah unik saja (format:check saat
utang beres; .only/.skip sekarang), sisanya andalkan ci.yml.

### R7 — e2e-visual-baselines.yml punya bug yang sama dengan E2E lama

Workflow baseline visual mem-probe `http://localhost:3002/` dengan
harapan 200/302 — persis anti-pattern yang sudah dibetulkan di e2e.yml
(`/` memang 307 via middleware; probe `/login`). Saat dijalankan
(workflow_dispatch), dia akan gagal wait-health **atau** — karena server
tetap hidup dan Playwright config lokal (non-CI) memakai
`reuseExistingServer: true` — jalan tapi dengan dev-server semantics.
Fix satu baris: probe `/login`. Juga tanpa cache browser/`.next`.

### R8 — Squandered artifacts / retention

Blob report tiap shard (4 file kecil) di-upload per push dengan retensi
30 hari plus merged 7 hari plus HTML 60 hari — volume kecil, tapi
retensi 30 hari untuk laporan shard yang sudah digabung bisa dipangkas
7 hari tanpa kehilangan utilitas. Prioritas rendah.

## Rekomendasi berurutan (dampak / effort)

| #   | Aksi                                                                                                                          | Dampak                                    | Effort   |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------- |
| 1   | ✅ **DITERAPKAN** (`99ddf0a3`) — Path filter EAS (`apps/mobile/**`, packages, lockfile)                                       | −15 menit-runner per push non-mobile      | 5 menit  |
| 2   | ✅ **DITERAPKAN** (`99ddf0a3`) — Hapus build Docker duplikat di job snyk; install setelah cek token (31s, dari ±10 menit)     | −2 build Docker + install                 | 10 menit |
| 3   | Trivy scan image dari GHCR (`:sha-*` produksi) alih-alih build sendiri                                                        | −2 build Docker penuh                     | 30 menit |
| 4   | `cache-from/to type=gha` di production.yml                                                                                    | build Docker deploy −30-60%               | 10 menit |
| 5   | ✅ **DITERAPKAN** (`99ddf0a3`) — `concurrency` di ci.yml                                                                      | hemat runner saat push beruntun           | 5 menit  |
| 6   | ✅ **safety-check dipangkas** (guard `.only`/`.skip` murni grep, PR-only) — sisa: perbaiki probe `/login` di visual-baselines | PR lebih cepat, workflow manual berfungsi | 20 menit |
| 7   | (Opsional) Kurangi retensi blob-report shard                                                                                  | storage                                   | 2 menit  |

Estimasi total hemat bila 1-6 diterapkan: **±18-20 menit-runner per push
master** (dari ±32), plus jalur PR yang jujur.

## Yang sudah baik (tidak perlu diubah)

- `e2e.yml` pasca-optimasi: build-once + artifact 13.5 MB + cache
  browser & `.next/cache`, concurrency anti-banting.
- gitleaks: hook lokal + CI full-history dengan SARIF + enforce.
- Trivy: SARIF → Security tab dengan category terpisah per target.
- Notifikasi Slack konsisten di semua workflow (dengan skip aman).
- Deploy produksi: pull di-gate sebelum migrasi, health check fatal,
  backup best-effort non-blocking — desain teardown yang hati-hati.
