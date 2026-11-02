# Role-Based Access Control Matrix — THS-THM System

> **Sumber**: Matriks ini diturunkan dari implementasi decorator `@Roles()` di `apps/api/src/modules/**` dan kontrak `admin_nasional` di `apps/api/src/common/constants/role-contract.spec.ts`. Lihat juga `docs/Roles/README.md` untuk konteks lengkap.

## Hierarki Role (tinggi → rendah)

```
superadmin              national
└── admin_nasional      national
    └── admin_distrik   district
        ├── admin_wilayah    region
        │   └── admin_ranting   branch
        │       └── admin_kegiatan   branch (setara ranting, khusus kegiatan)
penguji                 self  (di atas anggota, di bawah admin_ranting)
anggota                 self
```

Urutan hierarki (rendah → tinggi) di `ROLE_HIERARCHY`:
`anggota` → `penguji` → `admin_ranting` → `admin_kegiatan` → `admin_wilayah` → `admin_distrik` → `admin_nasional` → `superadmin`

*Catatan*: `admin_ranting` dan `admin_kegiatan` berada di tingkat yang sama (branch); keduanya hanya berbeda pada modul yang boleh dikelola.

---

## Tabel Akses Role per Modul

| Modul / Fitur | SA | NAS | DIS | WIL | RAN | KEG | PUJ | ANG |
|---|---|---|---|---|---|---|---|---|
| **Anggota** | CRUDA | CRUDA | CRUDA* | CRUDA* | CRUDA* | R | R | R (self) |
| **Mutasi** | CRA | CRA | CRA* | CRA* | CRA* | - | - | - |
| **Calon** | CRUDA | CRUDA | CRUDA* | CRUDA* | CRUDA* | CR | - | - |
| **Pendaftaran** | CRUDA | CRUDA | CRUDA* | CRUDA* | CRUDA* | - | - | - |
| **Klaim** | RUDA | RUDA | RUDA* | RUDA* | RUA* | - | - | - |
| **Pengguna** | CRUD | CRUD | CRUD* | CRUD* | CRU* | - | - | - |
| **Kegiatan** | CRUD | CRUD | CRUD* | CRUD* | CRUD* | CU*¹ | R | R |
| **Latihan** | CRUD | CRUD | CRUD* | CRUD* | CRUD* | CRU* | CRU | R |
| **Penguji** | CRUD | CRUD | CRUD* | CRUD* | CRU* | RU | - | - |
| **Penilaian** | CRUD | CRUD | CRUD* | CRUD* | CRUD* | CRUD* | CR | - |
| **Ujian Praktek** | CRUD | CRUD | CRUD* | CRUD* | R* | CRUD | RU | - |
| **Tingkatan** | CRUD | CRUD | CRUD | CRUD | R | R | R | R |
| **Dokumen** | CRUD | CRUD | CRUD | CR* | CR* | R | R | R (self) |
| **Dokumen Organisasi** | CRUD | CRUD | CRUD | CRUD* | CRUD* | R | R | R |
| **Surat** | CRUD | CRUD | CRUD | CRUD*³ | CRUD*³ | - | - | - |
| **Penandatangan** | CRUD | CRU | CRU* | CRU* | R* | - | - | - |
| **Jabatan** | CRUD | CRUD | CRUD | R | R | R | R | R |
| **Kepengurusan** | CRUDA | CRUDA | CRUDA* | CRUDA* | CRUDA* | - | - | - |
| **Struktur Organisasi** | CRUD | CRUD | R* | R* | R* | R | R | - |
| **Berita** | CRUD | CRUD | CRUD | CRUD | C⁴ | C⁴ | C⁴ | C⁴ |
| **Galeri (moderasi)** | RA | RA | RA | RA | RA | RA | - | - |
| **Forum** | CRUDM | CRUDM | CRUDM | CRUDM | CRUDM | CRUD | CRUD | CRUD |
| **Kalender** | R | R | R | R | R | R | R | R |
| **Chat** | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | - | CRUD |
| **Notifikasi** | CRUD | R | R+kirim | R | R | R | R | R |
| **Iuran** | CRUD | CRUD | CRUD* | CRUD* | CRUD* | R | R | R (self)⁵ |
| **Pembayaran** | CRUDA | CRUDA | CRUDA* | CRUDA* | CRUDA* | - | - | CR (bukti) |
| **Gamifikasi** | R+kelola | R+kelola | R+kelola | R+kelola | R+kelola | R | R | R |
| **Hadiah (rewards)** | CRUD | R | CRUD | R⁶ | R⁶ | R | R | R |
| **Laporan** | R+ekspor | R+ekspor | R+ekspor* | R+ekspor* | R+ekspor* | R | - | - |
| **Pengaturan** | CRUD | CRUD⁸ | CRD⁸ | CRD⁸ | R | - | - | - |
| **Periode** | CRUD | R | R | R | R | - | - | - |
| **Hak Akses Menu** | CRUD (matriks) | R | R | R | R | R | R | R |
| **Target** | R | R | R* | R* | R* | - | - | - |
| **Impor massal** | CRUD | CRUD | CRUD* | CRUD* | CRUD* | - | - | - |
| **Unggah foto anggota** | C | C | C* | C* | C* | - | - | - |
| **Pencarian** | R | R | R | R | R | R | R | R |
| **Audit log** | R | - | - | - | - | - | - | - |
| **Operasional sistem**⁷ | CRUD | - | R | - | - | - | - | - |

### Keterangan Simbol

| Simbol | Makna |
|---|---|
| `C` | Create |
| `R` | Read |
| `U` | Update |
| `D` | Delete |
| `A` | Approve/verifikasi |
| `M` | Moderasi (kategori, pin, lock) |
| `-` | Tidak punya akses (endpoint mengembalikan `403`) |
| `*` | Dibatasi **scope** — distrik hanya data di distriknya, wilayah di wilayahnya, ranting di rantingnya (lihat `ScopeGuard`) |
| `(self)` | Hanya baris milik sendiri; pembatasan di service layer |
| `⁴` | Hanya bisa create via submit/impor, publikasi langsung hanya superadmin s.d. admin_wilayah |
| `⁶` | Wilayah/ranting hanya melihat riwayat penukaran poin, tidak mengubah hadiah |

### Catatan Khas

1. `admin_kegiatan` hanya bisa mengubah kegiatan yang ditugaskan kepadanya (`@Scope('branch')` + pengecekan assignment di service).
2. `POST /graduations` hanya superadmin, admin_nasional, dan admin_distrik. Wilayah ke bawah tetap bisa mengelola peserta/penguji/nilai pendadaran.
3. Disposisi surat (`POST /letters/incoming/:id/disposition`) hanya superadmin s.d. admin_wilayah; `POST /notifications/send` hanya superadmin & admin_distrik.
4. `admin_nasional` mengelola konten & periode (organisasi, sejarah, branding, periode, template dokumen); `admin_distrik`/`admin_wilayah` hanya upload & hapus tanda tangan/stempel. Semuanya boleh membaca pengaturan, sedangkan `admin_ranting` hanya baca.
5. Anggota bisa melihat iurannya sendiri dan mengirim konfirmasi pembayaran. Wilayah/ranting hanya melihat riwayat penukaran poin, tidak mengubah hadiah.
6. Monitoring, cache, DB backup, API key, feature flag, revisi data, audit log (+ audit SSE), sesi login, dan manajemen antrean: **superadmin** saja. `admin_distrik` hanya bisa membaca snapshot metrik (`GET /admin/metrics`) dan statistik antrean (`GET /admin/queue-stats`); `GET /metrics` (format Prometheus) bersifat publik untuk scraper.

---

## Pemetaan Menu Sidebar per Role (minRole dari registry)

| Menu | minRole |
|---|---|
| Kirim Foto Galeri | anggota |
| Moderasi Galeri | admin_ranting |
| Dashboard | penguji |
| Kegiatan | anggota |
| Kalender | anggota |
| Forum | anggota |
| Notifikasi | anggota |
| Peta Organisasi | anggota |
| Dokumen | anggota |
| Iuran | anggota |
| Berita | admin_wilayah |
| Laporan Umum | admin_ranting |
| Anggota | admin_ranting |
| Mutasi | admin_ranting |
| Calon | admin_kegiatan |
| Pendaftaran | admin_ranting |
| Klaim | admin_ranting |
| Surat | admin_ranting |
| Latihan | admin_ranting |
| Pendadaran | admin_kegiatan |
| Penguji | admin_kegiatan |
| Penilaian | penguji |
| Persetujuan | admin_ranting |
| Dokumen Organisasi | anggota |
| Jabatan | admin_distrik |
| Periode | superadmin |
| Kepengurusan | admin_wilayah |
| Editor Org Chart | admin_wilayah |
| Pembayaran | admin_ranting |
| Pengguna | admin_ranting |
| Monitoring | superadmin |
| Alert Thresholds | superadmin |
| Incidents | superadmin |
| WebSocket | superadmin |
| Antrean | superadmin |
| Pengaturan | admin_ranting |
| Hak Akses Menu | superadmin |
| Email Admin | admin_distrik |
| Riwayat Email | admin_distrik |
| Penandatangan | admin_distrik |
| Template Kartu | admin_nasional |
| Template Dokumen | admin_nasional |
| Pengujian FCM | superadmin |
| Manajemen Sesi | superadmin |
| Database Backup | superadmin |
| Dasbor Gamifikasi | admin_ranting |
| Admin Gamifikasi | admin_ranting |
| Scoreboard Gamifikasi | admin_ranting |
| Laporan Gamifikasi | admin_ranting |
| Statistik Scan | admin_ranting |
| Sejarah | admin_nasional |
| Konten Web Organisasi | admin_nasional |

---

## Endpoint-level `@Roles('admin_nasional')` per Controller

| Controller | Method-meta yang memiliki `admin_nasional` |
|---|---|
| **ActivitiesController** | addParticipant, create, findAll, findOne, getDocuments, getPresence, importParticipants, recordPresence, remove, removeParticipant, update, uploadDocument |
| **CalendarController** | getEvents, getHolidays, getUpcoming |
| **CardTemplatesController** | activate, create, findAll, findOne, getActive, remove, update |
| **ChatController** | deleteMessage, getMessages, getRooms, markAsRead, sendMessage |
| **ContentController** | createBerita, deleteBerita, getAllBerita, getBeritaById, getMyBeritaSubmissions, submitBerita, updateBerita, uploadBeritaImage |
| **DocumentsController** | batchGenerate, cancelBatch, cancelBatchPatch, downloadDocumentFile, estimateBatch, exportBatchCsv, findAll, findOne, generate, generateAward, generateCertificate, getBatchList, getBatchListAlias, getBatchProgress, getCertificateImage, getCertificatePdf, getTypes, remove, retryBatch, verifyQR |
| **DuesController** | batchPayment, create, exportReport, findAll, findOne, getArrears, getDashboardStats, getMemberDues, getMyDues, getReport, importDues, remove, submitPaymentConfirmation, update |
| **ForumController** | createCategory, createPost, createThread, deleteCategory, deletePost, deleteThread, getCategories, getCategory, getThreads, markAsSolution, replyToPost, toggleLock, togglePin, updateCategory, updatePost, updateThread |
| **GaleriController** | adminImage, adminList, review |
| **JabatanController** | create, findAll, findOne, remove, update |
| **KepengurusanController** | approve, bulkApprove, bulkReject, create, exportCsv, findAll, findOne, findPending, importCsv, reject, remove, reparent, update |
| **MembersController** | activateCard, approve, create, exportCsv, findAll, findOne, getCardIssuances, getCardSecurity, getDigitalCard, getDigitalCardImage, getDigitalCardPdf, getDocuments, getDues, getIncompleteMembers, getIncompleteStats, getMe, getPrintedBatchPdf, getPrintedCardPdf, importCsv, issuePrintedCard, printBatch, reactivate, remove, resendCredentials, revokeCard, searchMembers, suspend, update, validate |
| **OrgStructureController** | createDistrik, createRanting, createWilayah, deleteDistrik, deleteRanting, deleteWilayah, getAllDistrik, getAllNasional, getAllRanting, getAllWilayah, getDistrik, getOrgTree, getRanting, getWilayah, importOrg, updateDistrik, updateRanting, updateWilayah |
| **PaymentsController** | createBankInfo, deleteBankInfo, findOne, getAllBankInfo, getBankInfo, rejectPayment, updateBankInfo, uploadProof, verifyPayment |
| **SearchController** | search |
| **SettingsController** | createPeriod, deletePeriod, deleteSignature, deleteStamp, getAllSettings, getBrandingColors, getOrganisasi, getPeriods, getSejarah, getSetting, getSignatures, getStamp, getStamps, removeDocTemplateImage, syncFromKepengurusan, updateBrandingColors, updateOrganisasi, updatePeriod, updateSejarah, updateSettings, uploadDocTemplateImage, uploadSignature, uploadStamp |
| **TargetsController** | getTargets |
| **TingkatanController** | create, findAll, getVisuals, remove, update |
| **UjianPraktekController** | assignExaminer, assignItem, autoSync, create, extendSesi, findAll, findOne, finishSesi, getAvailableExaminers, getAvailableItems, getMyScoreCard, getScores, getSesi, remove, removeExaminer, removeItem, scoreCandidate, startSesi, update |

---

## Verifikasi Kontrak

Tes otomatis di `apps/api/src/common/constants/role-contract.spec.ts` memastikan:

- **`should always grant superadmin wherever admin_nasional is allowed`**: Semua endpoint dengan `admin_nasional` harus juga memiliki `superadmin`.
- **`should match the per-endpoint admin_nasional contract`**: Matrix yang dihasilkan dari dekorasi harus sama persis dengan `ADMIN_NASIONAL_CONTRACT`.
- **`should grant admin_nasional read access wherever CRUD write is allowed`**: Jika endpoint boleh `create`/`update`/`remove`, maka `findAll`/`findOne` juga harus boleh (dan sebaliknya).

*Gagal tes berarti ada ketidacocokan antara decorator di code dengan kontrak terdefinisi di file ini — yang menandai kebijakan yang harus disengaja diubah, bukan lupa memperbarui.*