# Security Notes — Alert Dependabot yang Masih Terbuka

Update 2026-10-07. Batch fix menutup **26 dari 30** alert Dependabot lewat bump
`compression`/`vitest` + `overrides` di [pnpm-workspace.yaml](../pnpm-workspace.yaml).
Lihat log lengkap di `git log` commit `chore(deps): batch-fix`.

## Status: 4 alert tersisa, semua tanpa fix upstream

| Alert        | Package            | Severity | Rentang rentan | Fix ada? | Akses                      |
| ------------ | ------------------ | -------- | -------------- | -------- | -------------------------- |
| GHSA-86w9-…  | node-forge         | high     | `<= 1.4.0`     | TIDAK    | transitive via firebase-admin |
| (braces)     | braces             | high     | `<= 3.0.3`     | belum publish | transitive via babel/micromatch |
| GHSA-…-…     | sprintf-js         | medium   | `<= 1.1.3`     | TIDAK    | transitive (express logger)  |
| GHSA-36xv-…  | @nestjs/core       | medium   | `<= 11.1.17`   | ya, 11.1.18+ | direct dep                |

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

**4. @nestjs/core (`<= 11.1.17`).**
Fix ada di 11.1.18+, tetapi app masih di Nest 10 — mengambil fix berarti major
upgrade seluruh package Nest (`common`, `core`, `platform-express`, `cli`,
`testing`) dengan risiko breaking yang tidak sepadan untuk satu alert **medium**.
Advisory ini (SSE injection) **tidak reachable**: SSE di app ini ditulis manual
di `apps/api/src/common/controllers/audit-sse.controller.ts` — tidak memakai
`@Sse()` decorator maupun `SseStream` internal Nest, dan event `type`/`id`
adalah konstanta, bukan input pengguna. Jadi precondition eksploitasi tidak
terpenuhi.

## Rekomendasi

- **Saat upstream publish fix** (node-forge 1.4.1 / braces 3.0.4 / sprintf-js
  1.1.4): tambahkan baris `overrides` di `pnpm-workspace.yaml`, jalankan
  `pnpm install`, lalu `pnpm typecheck && pnpm lint && pnpm build && pnpm test`.
- **@nestjs/core**: jadwalkan upgrade Nest 10 → 11 sebagai task terpisah
  (breaking-change review), bukan bagian dari batch security fix ini.

## Pencegahan ke depan

`.github/dependabot.yml` sudah memakai grouping untuk typescript/nextjs.
Pertimbangkan menambah group khusus security update (`groups: security-updates:
dependency-type: production`) agar fix keamanan datang dalam satu PR, dan
`pnpm audit` di CI (`security-scan.yml` job `audit`) tetap `continue-on-error`
sebagai pelapor, bukan blocker.
