# API Documentation - THS-THM System Manajemen

## 1. Anggota & Calon Anggota
| Method | Endpoint | Deskripsi |
|--------|---------|-----------|
| GET | /api/anggota | Ambil daftar anggota |
| POST | /api/anggota | Tambah anggota baru |
| PUT | /api/anggota/{id} | Update data anggota |
| DELETE | /api/anggota/{id} | Hapus anggota |
| POST | /api/import-csv/anggota | Import data anggota dari CSV |
| POST | /api/import-csv/calon-anggota | Import data calon anggota dari CSV |

## 2. Klaim & Pendaftaran Baru
| Method | Endpoint | Deskripsi |
|--------|---------|-----------|
| POST | /api/claim | Klaim anggota lama yang kehilangan data |
| POST | /api/pendaftaran | Pendaftaran anggota baru |
| GET | /api/pendaftaran | Lihat daftar pendaftaran |

## 3. Kegiatan & Latihan
| Method | Endpoint | Deskripsi |
|--------|---------|-----------|
| GET | /api/kegiatan | Ambil daftar kegiatan |
| POST | /api/kegiatan | Tambah kegiatan baru |
| PUT | /api/kegiatan/{id} | Update kegiatan |
| DELETE | /api/kegiatan/{id} | Hapus kegiatan |
| GET | /api/latihan | Ambil daftar latihan |
| POST | /api/latihan | Tambah latihan |
| PUT | /api/latihan/{id} | Update latihan |
| DELETE | /api/latihan/{id} | Hapus latihan |

## 4. Pendadaran & Ujian Praktek
| Method | Endpoint | Deskripsi |
|--------|---------|-----------|
| POST | /api/pendadaran/nilai | Input nilai ujian praktek |
| GET | /api/pendadaran/laporan | Laporan hasil ujian |
| PUT | /api/pendadaran/validate/{id} | Validasi nilai oleh admin |

## 5. Dokumen Resmi & Template
| Method | Endpoint | Deskripsi |
|--------|---------|-----------|
| GET | /api/document-templates | Ambil daftar template dokumen |
| POST | /api/document-templates | Tambah template dokumen baru |
| PUT | /api/document-templates/{id} | Update template dokumen |
| DELETE | /api/document-templates/{id} | Hapus template dokumen |
| GET | /api/dokumen | Ambil dokumen anggota |
| POST | /api/dokumen | Generate dokumen baru |

## 6. Surat Masuk & Keluar
| Method | Endpoint | Deskripsi |
|--------|---------|-----------|
| GET | /api/surat_masuk | Ambil daftar surat masuk |
| POST | /api/surat_masuk | Tambah surat masuk |
| PUT | /api/surat_masuk/{id} | Update surat masuk |
| DELETE | /api/surat_masuk/{id} | Hapus surat masuk |
| GET | /api/surat_keluar | Ambil daftar surat keluar |
| POST | /api/surat_keluar | Tambah surat keluar |
| PUT | /api/surat_keluar/{id} | Update surat keluar |
| DELETE | /api/surat_keluar/{id} | Hapus surat keluar |

## 7. Iuran
| Method | Endpoint | Deskripsi |
|--------|---------|-----------|
| GET | /api/iuran | Ambil daftar iuran |
| POST | /api/iuran | Tambah pembayaran iuran |
| PUT | /api/iuran/{id} | Update pembayaran iuran |
| DELETE | /api/iuran/{id} | Hapus pembayaran iuran |

## 8. Role & Validasi
- Semua endpoint dilindungi role-based middleware
- Contoh: menu pengujian hanya untuk admin & penguji
- Validasi data anggota hanya bisa dilakukan admin

## 9. Notifikasi FCM
- POST /api/notifications/send → Kirim notifikasi FCM ke anggota/admin
- Payload: { recipient_id, title, message, type }