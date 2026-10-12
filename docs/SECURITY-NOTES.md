# Security Notes — Alert Dependabot yang Masih Terbuka

Update 2026-10-12. Upgrade NestJS v10 → v11 di `apps/api` menutup alert
`@nestjs/core` SSE injection (GHSA-36xv-…), dan `overrides`
`handlebars: 4.7.10` menutup 3 alert handlebars (2 critical + 1 medium).
Lihat `git log` commit `chore(deps): upgrade nestjs v10 to v11`.
Batch fix sebelumnya (2026-10-07) menutup **26 dari 30** alert lewat bump
`compression`/`vitest` + `overrides` di [pnpm-workspace.yaml](../pnpm-workspace.yaml).

## Status: 3 alert tersisa, semua tanpa fix upstream

| Alert        | Package            | Severity | Rentang rentan | Fix ada? | Akses                      |
| ------------ | ------------------ | -------- | -------------- | -------- | -------------------------- |
| GHSA-86w9-…  | node-forge         | high     | `<= 1.4.0`     | TIDAK    | transitive via firebase-admin |
| (braces)     | braces             | high     | `<= 3.0.3`     | belum publish | transitive via babel/micromatch |
| GHSA-…-…     | sprintf-js         | medium   | `<= 1.1.3`     | TIDAK    | transitive (express logger)  |

## Alasan diterima (risk acceptance)

**1. node-forge (`<= 1.4.0`, patched = NONE).**
Versi 1.4.0 adalah rilis terbaru di npm — rentang `<= 1.4.0` mencakup *semua*
versi yang pernah ada, jadi downgrade tidak menyelesaikan apa pun. Fix upstream
(issue digitalbazaar/forge#1149/#1152) belum dirilis. Tidak ada mitigasi versi
yang mungkin. Alert ditahan sampai upstream merilis 1.4.1.

**2. braces (`<= 3.0.3`).**
Advisory menyebut patched `>= 3.0.4` tetapi 3.0.4 belum dipublikasikan di npm
(latest = 3.0.3). Otomatis ter-fix begitu upstream publish.

**3. sprintf-js (`<= 1.1.3`).**
Sama: 1.1.3 adalah latest, patched 1.1.4 belum ada. Eksploitasi butuh input
format-string yang penyerang kendalikan; di repo ini hanya dipakai oleh
dependency logging internal, bukan dari request pengguna.

## Rekomendasi

- **Saat upstream publish fix** (node-forge 1.4.1 / braces 3.0.4 / sprintf-js
  1.1.4): tambahkan baris `overrides` di `pnpm-workspace.yaml`, jalankan
  `pnpm install`, lalu `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.

> Catatan saat menambah `overrides`: beberapa package transitive punya
> kontrak API yang berubah antar major. Override global `glob: 10.5.0`
> sekedar memaksa `test-exclude@6.0.0` (istanbul) ke glob 10, yang export
> object alih-alih function — `promisify(require('glob'))` melempar
> `TypeError` dan 76 suite CI (job `test-api`, yang memakai
> `jest --coverage`) gagal. Karena itu override glob di-scope
> `glob@>=10.2.0 <10.5.0` agar hanya dep jest yang terkena, dan istanbul
> kembali ke glob 7 (di luar range vulnerable). **Selalu verifikasi dengan
> `pnpm --filter @ths-thm/api test:cov` (mode coverage), bukan hanya
> `pnpm test`**, karena `pnpm test` tidak memakai coverage dan tidak
> memuat jalur istanbul.

## Pencegahan ke depan

`.github/dependabot.yml` sudah memakai grouping untuk typescript/nextjs.
Pertimbangkan menambah group khusus security update (`groups: security-updates:
dependency-type: production`) agar fix keamanan datang dalam satu PR, dan
`pnpm audit` di CI (`security-scan.yml` job `audit`) tetap `continue-on-error`
sebagai pelapor, bukan blocker.
