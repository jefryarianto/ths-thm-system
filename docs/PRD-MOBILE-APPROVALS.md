# PRD: Approval Workflow — Mobile App

> **Feature:** Admin menyetujui atau menolak pengajuan (registrasi anggota, klaim, surat, sertifikat) langsung dari mobile app.
> **Target release:** Sprint 3
> **Effort estimate:** 2–3 hari

---

## 1. Latar Belakang

BRD alur #2: *"Pendaftaran anggota baru → approval berjenjang → aktivasi anggota"* dan alur #7: *"Klaim → approval → pembayaran"*.

Saat ini mobile app sudah bisa:
- ✅ Melihat daftar pending approvals (list page)
- ✅ Melihat detail approval dengan level timeline (detail page)
- ✅ Approve/reject dengan catatan (inline di list + di detail)
- ❌ **Belum ada notifikasi push** ketika ada approval baru yang perlu ditindaklanjuti
- ❌ **Belum ada filter/search by request type** di halaman list
- ❌ **Belum bisa melihat item yang direferensi** (detail anggota, detail klaim, dll) dari approval — admin harus buka web

Dampak: Admin harus bolak-balik cek halaman approvals secara manual untuk lihat apakah ada pengajuan baru.

---

## 2. User Stories

| ID | Sebagai… | Saya ingin… | Sehingga… |
|:---|:----------|:------------|:----------|
| US-01 | Admin | Melihat daftar semua pengajuan yang menunggu persetujuan | Saya tahu apa yang perlu ditindaklanjuti |
| US-02 | Admin | Melihat tipe pengajuan (registrasi anggota, klaim, surat, sertifikat) | Saya bisa prioritaskan tindakan |
| US-03 | Admin | Melihat level persetujuan yang sudah/belum diproses | Saya tahu posisi saya dalam alur approval |
| US-04 | Admin | Menyetujui pengajuan dengan catatan opsional | Saya bisa memberi feedback |
| US-05 | Admin | Menolak pengajuan dengan alasan wajib jika ditolak | Pemohon tahu kenapa ditolak |
| US-06 | Admin | Melihat detail item yang diajukan (data anggota, detail klaim) dari screen approval | Saya tidak perlu buka web untuk verifikasi |
| US-07 | Admin | Menerima notifikasi push ketika ada approval baru | Saya tidak perlu polling manual |
| US-08 | Admin | Filter approvals by tipe (member, claim, letter, certificate) | Saya bisa fokus pada satu jenis |

---

## 3. API Endpoints

Semua endpoint sudah siap di backend — **tidak perlu perubahan backend**.

| Method | Endpoint | Fungsi | Body / Params |
|:-------|:---------|:-------|:--------------|
| `GET` | `/approvals/pending` | Daftar pengajuan menunggu | — |
| `GET` | `/approvals/:id` | Detail pengajuan + levels | — |
| `POST` | `/approvals/:id/approve` | Setujui level saat ini | `{ note?: string }` |
| `POST` | `/approvals/:id/reject` | Tolak seluruh pengajuan | `{ note?: string }` |
| `POST` | `/approvals/submit` | Ajukan persetujuan baru | `{ requestType, itemId, note? }` |

### Request Body `POST /approvals/:id/approve`

```json
{
  "note": "Data sudah lengkap, silakan lanjutkan"
}
```

### Response `POST /approvals/:id/approve`

```json
{
  "success": true,
  "data": null
}
```

### Response `GET /approvals/:id`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "requestType": "member_create",
    "itemId": "uuid-anggota",
    "status": "pending",
    "submittedBy": "uuid-user",
    "createdAt": "2026-07-28T10:00:00Z",
    "completedAt": null,
    "levels": [
      {
        "id": "uuid-level-1",
        "status": "approved",
        "decidedBy": "uuid-admin",
        "decidedAt": "2026-07-28T11:00:00Z",
        "note": null,
        "approvalLevel": {
          "name": "Admin Ranting",
          "order": 1,
          "roleName": "admin_ranting"
        }
      },
      {
        "id": "uuid-level-2",
        "status": "pending",
        "decidedBy": null,
        "decidedAt": null,
        "note": null,
        "approvalLevel": {
          "name": "Admin Wilayah",
          "order": 2,
          "roleName": "admin_wilayah"
        }
      }
    ]
  }
}
```

---

## 4. UI Mockup (Text Description)

### Screen A: Daftar Persetujuan (List)

```
┌──────────────────────────────────────┐
│  Persetujuan                     🔒 │
│  3 menunggu                         │
├──────────────────────────────────────┤
│                                      │
│  ┌─ Filter: [Semua] [Anggota] ─────┐│
│  │  [Klaim] [Surat] [Sertifikat]   ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────┐   │
│  │ 👤 Pembuatan Anggota    ⏳   │   │
│  │   ID: uuid-abc123            │   │
│  │   Diajukan: 28 Jul 2026      │   │
│  │   ◉ ◯ — Level 1/2           │   │
│  │   [Setujui] [Tolak]          │   │
│  ├──────────────────────────────┤   │
│  │ 📋 Klaim                 ⏳   │   │
│  │   ID: uuid-def456            │   │
│  │   Diajukan: 27 Jul 2026      │   │
│  │   ◉ ◯ — Level 1/2           │   │
│  │   [Setujui] [Tolak]          │   │
│  ├──────────────────────────────┤   │
│  │ 📧 Surat                 ⏳   │   │
│  │   ID: uuid-ghi789            │   │
│  │   Diajukan: 26 Jul 2026      │   │
│  │   ◯ ◯ — Level 1/2           │   │
│  │   [Setujui] [Tolak]          │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

### Screen B: Detail Persetujuan

```
┌──────────────────────────────────────┐
│ ← Detail Persetujuan            🔄  │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │ 🟡                              │   │
│  │  Pembuatan Anggota Baru        │   │
│  │  ⏳ Menunggu                    │   │
│  │  ID: uuid-abc123               │   │
│  │  Diajukan: 28 Jul 2026, 10:00 │   │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ Tindakan ──────────────────────┐  │
│  │ Catatan (opsional):              │  │
│  │ ┌──────────────────────────┐    │  │
│  │ │ Data sudah lengkap...   │    │  │
│  │ └──────────────────────────┘    │  │
│  │                                  │  │
│  │ [✅ Setujui]   [❌ Tolak]        │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ Informasi Pengajuan ──────────┐   │
│  │ 📄 Tipe: Pembuatan Anggota     │   │
│  │ 🔤 Item ID: uuid-abc123        │   │
│  │ 👤 Diajukan: Andi Admin        │   │
│  │ 📅 Tanggal: 28 Jul 2026 10:00 │   │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌─ Level Persetujuan ────────────┐   │
│  │  ✓ Admin Ranting               │   │
│  │    Role: admin_ranting          │   │
│  │    Disetujui: 28 Jul 11:00     │   │
│  │    │                            │   │
│  │  2 ⏳ Admin Wilayah             │   │
│  │    Role: admin_wilayah          │   │
│  │    Menunggu persetujuan Anda    │   │
│  └──────────────────────────────────┘  │
└──────────────────────────────────────┘
```

### Screen C: Detail Item Referensi (Contoh: Detail Anggota Baru)

Akses dari tap "Item ID" atau tombol "Lihat Detail".

```
┌──────────────────────────────────────┐
│ ← Detail Calon Anggota              │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐   │
│  │  Nama: Andi Pratama          │   │
│  │  No. KTP: 3273...            │   │
│  │  Tgl Lahir: 15 Mei 1998      │   │
│  │  Alamat: Jl. Merdeka No. 10  │   │
│  │  No. HP: 0812...             │   │
│  │  Email: andi@email.com       │   │
│  │  Tingkat: Putih              │   │
│  │  Ranting: Ranting Cimahi     │   │
│  └──────────────────────────────────┘  │
│                                        │
│  [✅ Setujui]   [❌ Tolak]             │
└──────────────────────────────────────┘
```

---

## 5. Validasi & Error States

| Skenario | Validasi | Error Message |
|:---------|:---------|:--------------|
| Approve pengajuan yang sudah diproses | Check status | "Pengajuan sudah diproses" |
| Reject tanpa alasan | Optional (tapi disarankan) | — (warning toast saja) |
| Koneksi terputus saat action | Network retry (3×) | "Koneksi terputus. Coba lagi." |
| Double tap approve/reject | Prevent double-click | "Memproses…" (button disabled + spinner) |
| Token expired | Auto-refresh → retry | — (silent refresh) |
| Server error (500) | Catch → user message | "Gagal memproses. Silakan coba lagi." |
| Tidak ada level persetujuan | Check length | "Tidak ada level persetujuan. Hubungi admin." |
| Bukan role approver | Role check API | "Anda tidak memiliki wewenang untuk level ini." |

---

## 6. Files to Create/Modify

| File | Action | Deskripsi |
|:-----|:-------|:----------|
| `hooks/use-approvals.ts` | **SUDAH ADA** ✅ | Hook, types, API functions sudah siap dari implementasi sebelumnya |
| `screens/approvals/index.tsx` | **SUDAH ADA** ✅ | List page dengan inline approve/reject, level dots |
| `screens/approvals/[id].tsx` | **SUDAH ADA** ✅ | Detail page dengan timeline + action section |
| `app/_layout.tsx` | **SUDAH ADA** ✅ | Route `approvals` dan `approvals/[id]` sudah register |
| `screens/approvals/filter.tsx` | **BARU** (opsional) | Komponen filter chips by requestType |
| `screens/approvals/reference-detail.tsx` | **BARU** (opsional) | Screen untuk melihat detail item yang direferensi |
| `hooks/use-approval-notifications.ts` | **BARU** (opsional) | Hook untuk real-time badge count on approvals tab |

**Core screens sudah jadi di Sprint 3.** Opsi tambahan di atas bersifat *enhancement*.

---

## 7. Dependencies

| Dep | Untuk | Status |
|:----|:------|:------|
| Backend: Approvals API | List, detail, approve, reject | ✅ Existing |
| Backend: Players API | (opsional) Detail anggota dari itemId | ✅ Existing |
| Backend: Klaim API | (opsional) Detail klaim dari itemId | ✅ Existing |
| Backend: Surat API | (opsional) Detail surat dari itemId | ✅ Existing |

**Tidak ada dependencies baru yang perlu diinstall.**

---

## 8. Acceptance Criteria

- [ ] US-01: Admin bisa lihat daftar semua pengajuan pending dengan pull-to-refresh
- [ ] US-02: Setiap item menampilkan tipe (dengan icon + label Indonesia), tanggal, status
- [ ] US-03: Level approval ditampilkan sebagai dots (✓ approved, ✗ rejected, # pending)
- [ ] US-04: Approve dengan catatan opsional via Alert + TextInput
- [ ] US-05: Reject dengan Alert confirmation + optional note
- [ ] US-06: Loading spinner pada tombol selama proses
- [ ] US-07: List auto-refresh setelah approve/reject (item hilang dari list)
- [ ] US-08: Empty state ketika tidak ada pending ("Semua pengajuan telah diproses")
- [ ] US-09: Error state dengan retry button
- [ ] US-10: Detail screen dengan timeline vertikal + level cards + action buttons

---

## 9. Alur Lengkap

```
Admin buka halaman Persetujuan (dari tab atau quick action)
  → Screen: daftar pending approvals
    → Tap item → Screen: detail approval
      → Lihat status header (colored based on status)
      → Lihat info pengajuan (tipe, item ID, tanggal)
      → Lihat timeline level approval
      → Jika pending → isi catatan (opsional)
        → Tap Setujui → Alert konfirmasi → POST /approvals/:id/approve
          → Sukses → detail refresh (status berubah) + notif next-level approver
          → Gagal → error message
        → Tap Tolak → Alert konfirmasi → POST /approvals/:id/reject
          → Sukses → detail refresh (status jadi rejected)
          → Gagal → error message
    → Atau approve/reject langsung dari list (inline buttons)
      → Alert konfirmasi → POST → item hilang dari list
```

---

## 10. Current Implementation Status

Semua core screens **sudah diimplementasikan** di Sprint 3:

| Screen | Status | File |
|:-------|:-------|:-----|
| **List Page** | ✅ Selesai | `src/screens/approvals/index.tsx` |
| **Detail Page** | ✅ Selesai | `src/screens/approvals/[id].tsx` |
| **API Hook** | ✅ Selesai | `src/hooks/use-approvals.ts` |
| **Route** | ✅ Selesai | `app/approvals.tsx` + `app/approvals/[id].tsx` |
| **Quick Action** | ✅ Selesai | `src/screens/members/home.tsx` (Persetujuan card) |

### Enhancement untuk Sprint Berikutnya

| Enhancement | Effort | Prioritas |
|:------------|:-------|:----------|
| Filter chips by requestType | 1 hari | Tinggi |
| Notifikasi push approval baru | 2 hari | Tinggi |
| Reference detail screen (lihat data anggota/klaim dari approval) | 2–3 hari | Sedang |
| Badge count on quick action card | 0.5 hari | Rendah |

---

*Dokumen ini mendokumentasikan fitur approval workflow mobile yang sudah diimplementasikan. API endpoints sudah siap sejak awal, tidak ada perubahan backend yang diperlukan.*

*Referensi implementasi: `apps/mobile/src/hooks/use-approvals.ts`, `apps/mobile/src/screens/approvals/index.tsx`, `apps/mobile/src/screens/approvals/[id].tsx`*
