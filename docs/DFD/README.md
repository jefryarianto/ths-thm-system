# DFD — Data Flow Diagram

## Level 0 (Context Diagram)
Sistem THS-THM menerima input dari 6 external entity:
- **Superadmin** — Akses penuh semua modul
- **Admin (Distrik/Wilayah/Ranting)** — Kelola data sesuai scope
- **Admin Kegiatan** — Kelola latihan, pendadaran, kegiatan
- **Penguji** — Input penilaian pendadaran
- **Anggota/Calon** — Akses profil & dokumen via mobile
- **System** — Trigger otomatis (notifikasi, reminder)

## Level 1 (Proses Utama)
1. **Auth Process** — Login, register, RBAC (7 roles)
2. **Member & Candidate Management** — CRUD + validasi + approval + import CSV
3. **Claim & Registration Management** — Klaim anggota, pendaftaran baru
4. **Training & Activity Management** — Latihan, absensi QR, kegiatan
5. **Graduation & Assessment** — Pendadaran, input nilai, ranking, hasil
6. **Document Generation** — Generate PDF (sertifikat, piagam, kartu) + QR + signature + stamp
7. **Letter Management** — Surat masuk/keluar, disposisi
8. **Dues Management** — Iuran, pembayaran, tunggakan
9. **Notification (FCM)** — Push notification + scheduling + auto trigger
10. **Report Process** — Laporan & statistik

## Level 2 (Detail Proses)

| File                                              | Proses                             |
| ------------------------------------------------- | ---------------------------------- |
| `DFD_Level2_Anggota_Calon_THSTM.puml`             | Manajemen Anggota & Calon Anggota  |
| `DFD_Level2_Latihan_Kegiatan_THSTM.puml`          | Latihan & Kegiatan                 |
| `DFD_Level2_Pendadaran_THSTM.puml`                | Pendadaran & Ujian Praktek         |
| `DFD_Level2_Generate_Dokumen_THSTM.puml`          | Generate Dokumen (Sertifikat, Piagam, Kartu) |
| `DFD_Level2_Iuran_THSTM.puml`                     | Iuran Anggota                      |
| `DFD_Level2_Surat_THSTM.puml`                     | Surat Masuk & Keluar               |
| `DFD_Level2_Notifikasi_FCM_THSTM.puml`            | Notifikasi FCM                     |

> Semua diagram ditulis dalam PlantUML (.puml) — render di plantuml.com atau VS Code extension