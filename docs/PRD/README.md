# PRD — Product Requirement Document

## Fitur Utama (MVP)

1. **Autentikasi & RBAC** — Login, register, 7 role (superadmin, distrik, wilayah, ranting, kegiatan, penguji, anggota)
2. **Manajemen Anggota** — CRUD, validasi data, approval admin, import/export CSV
3. **Manajemen Calon** — CRUD, validasi, approve/reject
4. **Pendaftaran Baru** — Self-registration, verifikasi, approval
5. **Klaim Anggota** — Klaim sertifikat, dokumen; approval/reject
6. **Latihan** — Jadwal, absensi, evaluasi, import CSV
7. **Pendadaran** — Registrasi, peserta, penugasan penguji, kelulusan
8. **Penilaian** — Aspek & item penilaian, input skor (penguji)
9. **Generate Dokumen** — Kartu anggota, sertifikat, piagam (PDF + QR + signature + stamp)
10. **Surat Masuk/Keluar** — Pencatatan, disposisi, generate PDF
11. **Dokumen Organisasi** — AD/ART, SK, proposal, notulen (upload/download)
12. **Iuran Anggota** — Pembayaran, tunggakan, laporan keuangan
13. **Kegiatan** — Event, peserta, kehadiran
14. **Notifikasi FCM** — Push notification, scheduling, trigger otomatis
15. **Laporan & Statistik** — Dashboard, export PDF/XLS
16. **Mobile App** — Kartu digital, QR scan validasi, notifikasi
17. **CSV Import** — Anggota, calon, aspek, penilaian; data tidak lengkap → notifikasi

## Non-Functional Requirements
- Role-based menu di frontend (conditional rendering)
- Multi-level data scoping (distrik → wilayah → ranting)
- QR validation untuk dokumen fisik
- Tanda tangan & stempel digital di dokumen
- Offline-capable input penilaian (mobile)
- Refresh token rotation (security)