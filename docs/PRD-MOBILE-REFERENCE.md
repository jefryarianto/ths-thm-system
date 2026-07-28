# PRD: Approval Reference Detail — Mobile App

> **Feature:** Admin melihat detail item yang direferensi (data anggota, klaim, surat, sertifikat) langsung dari screen approval — tanpa perlu buka web.
> **Target release:** Sprint 3 Enhancement
> **Effort estimate:** 2–3 hari

---

## 1. Latar Belakang

BRD alur #2 *(registrasi anggota → approval berjenjang)* dan #7 *(klaim → approval → pembayaran)*: Admin perlu memverifikasi data yang diajukan sebelum menyetujui atau menolak.

**Masalah saat ini:** Admin di halaman approval detail hanya melihat ID item (`itemId: "uuid-xxx"`) tanpa konteks data apa yang direferensi. Untuk verifikasi, admin harus:
1. Buka web
2. Cari menu terkait (Anggota / Klaim / Surat)
3. Cari ID yang sama
4. Verifikasi data
5. Kembali ke halaman approval

**Solusi:** Dari approval detail, admin bisa langsung tap tombol "Lihat Detail [tipe]" → screen menampilkan data yang direferensi.

### Referensi API per Request Type

| requestType | itemId merujuk ke | API Endpoint | Screen Mobile Ada? |
|:------------|:------------------|:-------------|:------------------:|
| `member_create` | `Anggota.id` | `GET /members/:id` | ✅ `members/[id]` |
| `member_update` | `Anggota.id` | `GET /members/:id` | ✅ `members/[id]` |
| `claim` | `Klaim.id` | `GET /claims/:id` | ❌ Belum ada |
| `letter` | `SuratKeluar.id` | `GET /letters/outgoing/:id` | ✅ `letters/[id]` |
| `certificate` | `Dokumen.id` | `GET /documents/:id` | ✅ `documents/[id]` |

---

## 2. User Stories

| ID | Sebagai… | Saya ingin… | Sehingga… |
|:---|:----------|:------------|:----------|
| US-01 | Admin | Tap item ID atau tombol "Lihat Detail Anggota" dari approval member_create/member_update | Saya bisa verifikasi data anggota tanpa buka web |
| US-02 | Admin | Melihat data lengkap anggota (nama, nomor, tingkat, status, alamat, kontak, ranting) | Saya yakin data sudah benar sebelum approve |
| US-03 | Admin | Tap tombol "Lihat Detail Klaim" dari approval claim | Saya bisa lihat detail klaim sebelum approve/reject |
| US-04 | Admin | Melihat detail klaim (nilai, keterangan, bukti) | Saya bisa verifikasi validitas klaim |
| US-05 | Admin | Tap tombol "Lihat Detail Surat" dari approval letter | Saya bisa lihat perihal/tujuan surat |
| US-06 | Admin | Tap tombol "Lihat Sertifikat" dari approval certificate | Saya bisa lihat dokumen yang akan digenerate |
| US-07 | Admin | Setelah melihat referensi, mudah kembali ke approval detail | Saya bisa langsung approve/reject setelah verifikasi |

---

## 3. API Endpoints

Semua endpoint sudah siap di backend — **tidak perlu perubahan backend**.

| Method | Endpoint | Fungsi | Dipakai Untuk |
|:-------|:---------|:-------|:--------------|
| `GET` | `/members/:id` | Detail anggota | `member_create`, `member_update` |
| `GET` | `/claims/:id` | Detail klaim | `claim` |
| `GET` | `/letters/outgoing/:id` | Detail surat keluar | `letter` |
| `GET` | `/documents/:id` | Detail dokumen | `certificate` |

### Response `GET /members/:id`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "namaLengkap": "Andi Pratama",
    "nomorAnggota": "0114-0101-015-2026",
    "tingkat": "Putih",
    "statusKeanggotaan": "aktif",
    "alamat": "Jl. Merdeka No. 10",
    "noHp": "081234567890",
    "email": "andi@email.com",
    "tanggalLahir": "1998-05-15",
    "tempatLahir": "Bandung",
    "jenisKelamin": "L",
    "pekerjaan": "Swasta",
    "ranting": { "id": "uuid", "nama": "Ranting Cimahi" }
  }
}
```

### Response `GET /claims/:id`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "anggotaId": "uuid-anggota",
    "anggota": { "namaLengkap": "Andi Pratama" },
    "jenisKlaim": "medis",
    "nilaiKlaim": 500000,
    "deskripsi": "Biaya pengobatan cedera latihan",
    "tanggalKejadian": "2026-07-20",
    "status": "pending",
    "createdAt": "2026-07-22T10:00:00Z",
    "buktiPendukung": ["url-bukti-1.jpg"],
    "catatanTambahan": null
  }
}
```

---

## 4. UI Mockup (Text Description)

### Strategi Navigasi: Reuse Existing Screens

Alih-alih membuat screen baru untuk setiap tipe referensi, PRD ini merekomendasikan **reuse screen yang sudah ada** dengan menambahkan tombol navigasi dari approval detail:

```
┌ Approval Detail Screen ──────────────────┐
│                                            │
│  ┌─ Informasi Pengajuan ────────────┐     │
│  │ 📄 Tipe: Pembuatan Anggota       │     │
│  │ 🔤 ID: uuid-abc123               │     │
│  │ 👤 Diajukan: Andi Admin          │     │
│  │                                    │     │
│  │ ┌──────────────────────────────┐ │     │
│  │ │ 👁 Lihat Detail Anggota    ▶ │ │     │   ← NEW: Tombol navigasi
│  │ └──────────────────────────────┘ │     │
│  └──────────────────────────────────────┘  │
└────────────────────────────────────────────┘
         │ Tap
         ▼
┌─── Screen: Detail Anggota (existing: members/[id]) ───┐
│  ✅ Screen reuse — tidak perlu build baru              │
│  Back button → kembali ke approval detail              │
└────────────────────────────────────────────────────────┘
```

### Screen: Approval Detail — dengan tombol referensi

```
┌──────────────────────────────────────┐
│ ← Detail Persetujuan            🔄  │
├──────────────────────────────────────┤
│  [status header...]                  │
│                                      │
│  [action buttons...]                 │
│                                      │
│  ┌─ Informasi Pengajuan ──────────┐  │
│  │ 📄 Tipe: Pembuatan Anggota     │  │
│  │ 🔤 ID: uuid-abc123        [▶] │  │  ← Tap ID → navigasi
│  │                                    │
│  │ ┌──────────────────────────────┐ │  │
│  │ │ 👁 Lihat Detail Anggota   ▶ │ │  │  ← Tombol utama
│  │ └──────────────────────────────┘ │  │
│  │                                    │
│  │ 👤 Diajukan: Andi Admin          │  │
│  │ 📅 Tanggal: 28 Jul 2026 10:00   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [level timeline...]                    │
└──────────────────────────────────────┘
```

### Screen: Hanya untuk Klaim (perlu build baru)

Untuk klaim, belum ada screen detail di mobile, sehingga perlu screen baru:

```
┌──────────────────────────────────────┐
│ ← Detail Klaim                      │
├──────────────────────────────────────┤
│  Status: ⏳ Menunggu                  │
│                                      │
│  ┌─ Informasi Klaim ──────────────┐  │
│  │ 👤 Pengaju: Andi Pratama       │  │
│  │ 📋 Jenis: Medis                │  │
│  │ 💰 Nilai: Rp 500.000           │  │
│  │ 📅 Kejadian: 20 Juli 2026      │  │
│  │ 📝 Deskripsi: Biaya pengobatan │  │
│  │    cedera latihan              │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [✅ Setujui] [❌ Tolak]               │
└──────────────────────────────────────┘
```

---

## 5. Detail Tipe Referensi

### Type A: member_create / member_update → reuse `members/[id]` ✅

| Field | Sumber | Cara Akses |
|:------|:-------|:-----------|
| Nama Lengkap | `anggota.namaLengkap` | `GET /members/:itemId` |
| No. Anggota | `anggota.nomorAnggota` | via unwrap |
| Tingkat | `anggota.tingkat` | via unwrap |
| Status | `anggota.statusKeanggotaan` | via unwrap |
| Ranting | `anggota.ranting.nama` | via unwrap |
| Kontak | `anggota.noHp`, `anggota.email` | via unwrap |

**Navigasi:** `router.push({ pathname: '/members/[id]', params: { id: itemId } })`

### Type B: claim → perlu build screen baru ❌

| Field | Sumber | Tampilan |
|:------|:-------|:---------|
| Nama Pengaju | `claim.anggota.namaLengkap` | Header |
| Jenis Klaim | `claim.jenisKlaim` | Info row |
| Nilai Klaim | `claim.nilaiKlaim` | Info row (format Rp) |
| Tanggal Kejadian | `claim.tanggalKejadian` | Info row (format date) |
| Deskripsi | `claim.deskripsi` | Content card |
| Status | `claim.status` | Badge |
| Bukti | `claim.buktiPendukung[]` | List downloadable files |
| Catatan | `claim.catatanTambahan` | Optional text |

**Navigasi:** Buat screen baru → `screens/approvals/reference-claim.tsx`

### Type C: letter → reuse `letters/[id]` ✅

**Navigasi:** `router.push({ pathname: '/letters/[id]', params: { id: itemId, type: 'outgoing' } })`

### Type D: certificate → reuse `documents/[id]` ✅

**Navigasi:** `router.push({ pathname: '/documents/[id]', params: { id: itemId } })`

---

## 6. Files to Create/Modify

| File | Action | Deskripsi |
|:-----|:-------|:----------|
| `screens/approvals/[id].tsx` | **MODIFIKASI** | Tambah tombol navigasi referensi di Info section + handler per requestType |
| `hooks/use-approvals.ts` | **MODIFIKASI** | Tambah helper function `getReferenceRoute(requestType, itemId)` |
| `screens/approvals/reference-claim.tsx` | **BARU** | Screen detail klaim (karena tidak ada screen klaim existing di mobile) |
| `app/approvals/reference-claim.tsx` | **BARU** | Expo Router route untuk detail klaim |
| `app/_layout.tsx` | **MODIFIKASI** | Register route `approvals/reference-claim` |

**Tidak perlu membuat screen baru untuk member, letter, atau certificate** — cukup reuse screen yang sudah ada via `router.push()`.

---

## 7. Dependencies

| Dep | Untuk | Status |
|:----|:------|:------|
| Backend: Members API | `GET /members/:id` | ✅ Existing |
| Backend: Claims API | `GET /claims/:id` | ✅ Existing |
| Backend: Letters API | `GET /letters/outgoing/:id` | ✅ Existing |
| Backend: Documents API | `GET /documents/:id` | ✅ Existing |
| Screen: `members/[id]` | View detail anggota | ✅ Existing |
| Screen: `letters/[id]` | View detail surat | ✅ Existing |
| Screen: `documents/[id]` | View detail dokumen | ✅ Existing |

**Hanya perlu 2 file baru** (screen klaim + route).

---

## 8. Acceptance Criteria

- [ ] US-01: Setiap approval member_create/member_update menampilkan tombol "👁 Lihat Detail Anggota"
- [ ] US-02: Tap tombol → navigasi ke `members/[id]` dengan data anggota yang sesuai
- [ ] US-03: Back dari detail anggota → kembali ke approval detail
- [ ] US-04: Setiap approval claim menampilkan tombol "👁 Lihat Detail Klaim"
- [ ] US-05: Tap → screen detail klaim dengan data: pengaju, jenis, nilai, deskripsi, status, bukti
- [ ] US-06: Setiap approval letter menampilkan tombol "👁 Lihat Detail Surat"
- [ ] US-07: Tap → navigasi ke `letters/[id]`
- [ ] US-08: Setiap approval sertifikat menampilkan tombol "👁 Lihat Sertifikat"
- [ ] US-09: Tap → navigasi ke `documents/[id]`
- [ ] US-10: Screen klaim mendukung approve/reject langsung dari detail (jika masih pending)

---

## 9. Alur Lengkap

```
Admin di approval detail
  ↓
Lihat tipe pengajuan (requestType)
  ↓
┌─ member_create / member_update ─────────────────┐
│  Tombol "Lihat Detail Anggota"                  │
│  → router.push(`/members/${itemId}`)            │
│    → Screen: Detail Anggota (existing)          │
│      → Back → approval detail                   │
└──────────────────────────────────────────────────┘

┌─ claim ─────────────────────────────────────────┐
│  Tombol "Lihat Detail Klaim"                    │
│  → router.push(`/approvals/reference-claim?id=`)│
│    → Screen: Detail Klaim (new)                 │
│      → Lihat data, bukti, approve/reject         │
│      → Back → approval detail                   │
└──────────────────────────────────────────────────┘

┌─ letter ────────────────────────────────────────┐
│  Tombol "Lihat Detail Surat"                    │
│  → router.push(`/letters/${itemId}?type=outgoing│
│    → Screen: Detail Surat (existing)            │
│      → Back → approval detail                   │
└──────────────────────────────────────────────────┘

┌─ certificate ───────────────────────────────────┐
│  Tombol "Lihat Sertifikat"                      │
│  → router.push(`/documents/${itemId}`)          │
│    → Screen: Detail Dokumen (existing)          │
│      → Back → approval detail                   │
└──────────────────────────────────────────────────┘
```

---

## 10. Implementasi Detail — Logic Navigator

### Helper Function (di `use-approvals.ts`)

```typescript
interface ReferenceRoute {
  pathname: string;
  params: Record<string, string>;
  label: string;
  icon: string;
}

function getReferenceRoute(approval: ApprovalRequest): ReferenceRoute | null {
  switch (approval.requestType) {
    case 'member_create':
    case 'member_update':
      return {
        pathname: '/members/[id]',
        params: { id: approval.itemId },
        label: 'Lihat Detail Anggota',
        icon: 'person',
      };
    case 'claim':
      return {
        pathname: '/approvals/reference-claim',
        params: { id: approval.itemId },
        label: 'Lihat Detail Klaim',
        icon: 'document-text',
      };
    case 'letter':
      return {
        pathname: '/letters/[id]',
        params: { id: approval.itemId, type: 'outgoing' },
        label: 'Lihat Detail Surat',
        icon: 'mail',
      };
    case 'certificate':
      return {
        pathname: '/documents/[id]',
        params: { id: approval.itemId },
        label: 'Lihat Sertifikat',
        icon: 'ribbon',
      };
    default:
      return null;
  }
}
```

### UI Component (di approval detail screen)

```tsx
// Di bagian Informasi Pengajuan, tambah:
{referenceRoute && (
  <TouchableOpacity
    style={styles.referenceBtn}
    onPress={() => router.push(referenceRoute)}
  >
    <Ionicons name={referenceRoute.icon as any} size={18} color="#2563eb" />
    <Text style={styles.referenceBtnText}>{referenceRoute.label}</Text>
    <Ionicons name="chevron-forward" size={18} color="#93c5fd" />
  </TouchableOpacity>
)}
```

---

## 11. Current Status

| Komponen | Status | File |
|:---------|:-------|:-----|
| Core approvals screens | ✅ Selesai | `approvals/index.tsx` + `[id].tsx` |
| Filter chips enhancement | ✅ Selesai | Diimplementasikan |
| Reference navigation logic | ❌ **Belum** | Perlu tambah helper + UI di `[id].tsx` |
| Reference-claim screen | ❌ **Belum** | Perlu screen baru |
| Reuse members/letters/documents | ✅ Screen sudah ada | Tinggal navigasi |

---

*Dokumen ini dapat dijadikan acuan untuk implementasi enhancement Approval Reference Detail. Strategi utama: reuse 3 screen existing + build 1 screen baru (claim). API endpoints sudah siap semua.*
