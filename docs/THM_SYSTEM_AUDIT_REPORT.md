# THS-THM System Manajemen - Technical Audit Report

## Ringkasan Eksekutif
Proyek ini secara keseluruhan memiliki fondasi teknis yang kuat dengan arsitektur monorepo, teknologi modern (NestJS, Next.js, Flutter), dan pipeline CI/CD yang komprehensif. Namun, ditemukan celah kritis pada manajemen *shared packages* yang menyebabkan kerusakan kontrak antar-aplikasi, serta beberapa kerentanan keamanan operasional.

---

## 🔴 Kritis (High Priority)

### 1. `packages/api-client` (Dead/Stale Package)
- **Masalah**: `packages/api-client` tidak digunakan oleh aplikasi mana pun dan isinya sudah tidak sinkron dengan `swagger.json` terbaru di `apps/api`.
- **Rekomendasi**: Hapus paket ini atau jadikan `apps/web/src/types/api.d.ts` sebagai satu-satunya sumber kebenaran untuk kontrak API, lalu generate dari sana.

### 2. `packages/templates` (Broken Import Target)
- **Masalah**: Service `document-generation.service.ts` memanggil `require` ke path yang tidak ada (`@ths-thm/templates/cards/memberCard`). File-file template yang didokumentasikan di `README.md` tidak ada di sistem.
- **Rekomendasi**: Pindahkan fungsi PDF card yang sebenarnya dari `apps/api/src/modules/documents/pdf-templates/` ke `packages/templates` dan perbaiki ekspor agar bisa di-import dengan benar.

### 3. Password Default di Script Produksi/Staging
- **Masalah**: `go-live-produksi.sh` dan `docker-compose.staging.yml` memiliki password *fallback* yang terkenal.
- **Rekomendasi**: Hapus nilai *fallback*, wajibkan env var untuk password produksi/staging, dan gunakan manajemen rahasia yang aman.

### 4. Paparan File Statis
- **Masalah**: Endpoint `/api/uploads` dan `/api/app` melayani file statis tanpa autentikasi, mengekspos data pribadi anggota dan dokumen organisasi.
- **Rekomendasi**: Tambahkan middleware otorisasi pada *static routes*.

---

## 🟠 Tinggi (Keamanan & Operasional)

### 5. Cleartext Traffic di Mobile
- **Masalah**: `AndroidManifest.xml` mengizinkan HTTP (cleartext).
- **Rekomendasi**: Nonaktifkan `usesCleartextTraffic`, paksa HTTPS, dan gunakan *network security config*.

### 6. SQL Injection Risk
- **Masalah**: Penggunaan `$queryRawUnsafe` dengan concatenasi string dinamis di `reports.service.ts`.
- **Rekomendasi**: Migrasi ke `$queryRaw` dengan *tagged templates* atau bangun *query builder* yang aman.

### 7. Keamanan Monitoring
- **Masalah**: `QueueDashboardModule` bypass guard auth standar.
- **Rekomendasi**: Integrasikan modul ini ke dalam pipeline guard NestJS (`JwtAuthGuard`, `RolesGuard`).

---

## 🟡 Sedang (Code Quality & Consistency)

### 8. Konsistensi CSV & Parser
- **Masalah**: Header CSV template (members) tidak cocok dengan struktur yang diharapkan oleh `members.service.ts` (`ttl`, `tempat_tanggalahir` hilang).
- **Rekomendasi**: Sinkronisasi ulang template CSV dengan logika parser di `members.service.ts`.

### 9. Drift Layout KTA
- **Masalah**: Koordinat KTA pada `card-design` dan Flutter app tidak konsisten.
- **Rekomendasi**: Satukan perhitungan layout (mm/px) agar rendering di backend dan mobile identik.

### 10. Mobile State Drift
- **Masalah**: Pencampuran `BLoC` dan `setState()`/`Dio` langsung di file-file besar (>900 baris).
- **Rekomendasi**: Refaktor layar-layar besar ke pola BLoC murni.

---

## 🟢 Baik (Dipertahankan)
- Konfigurasi keamanan infrastruktur (Nginx rate limiting, isolasi Docker bridge, CI Gitleaks, Trivy, GitHub Secrets).
- Validasi environment (Zod).
- Penanganan error Prisma yang seragam.
- Audit interceptor.
