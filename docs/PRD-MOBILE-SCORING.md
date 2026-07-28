# PRD: Input Nilai Pendadaran — Mobile App

> **Feature:** Penguji menilai calon anggota pada ujian praktek pendadaran langsung dari mobile app.
> **Target release:** Sprint 2
> **Effort estimate:** 3–5 hari

---

## 1. Latar Belakang

BRD alur #4: *"Pendadaran → penguji input nilai → validasi → sertifikat"*.

Saat ini mobile app sudah bisa:
- ✅ Melihat daftar & detail pendadaran
- ✅ Melihat daftar peserta tab
- ✅ Melihat nilai yang sudah diinput (tab Evaluasi — view-only)
- ❌ **Belum bisa input nilai** — penguji harus ke web untuk menilai

Dampak: Penguji di lokasi ujian tidak bisa langsung menilai dari HP.

---

## 2. User Stories

| ID | Sebagai… | Saya ingin… | Sehingga… |
|:---|:----------|:------------|:----------|
| US-01 | Penguji | Memilih peserta dari daftar yang akan dinilai | Saya bisa menilai satu per satu |
| US-02 | Penguji | Melihat aspek & item penilaian yang berlaku | Saya tahu kriteria penilaian |
| US-03 | Penguji | Mengisi nilai per item dalam rentang skor yang ditentukan | Nilai konsisten dengan ketentuan |
| US-04 | Penguji | Menambahkan catatan pada setiap item | Saya bisa memberi feedback spesifik |
| US-05 | Penguji | Melihat total skor sementara | Saya bisa evaluasi sebelum submit |
| US-06 | Penguji | Submit semua nilai untuk peserta yang dinilai | Data tersimpan dan siap divalidasi admin |
| US-07 | Admin | Melihat hasil penilaian di tab Evaluasi setelah diinput | Saya bisa validasi nilai |

---

## 3. API Endpoints

Semua endpoint sudah siap di backend — **tidak perlu perubahan backend**.

| Method | Endpoint | Fungsi | Body / Params |
|:-------|:---------|:-------|:--------------|
| `GET` | `/graduations/:id/participants` | Daftar peserta pendadaran | — |
| `GET` | `/graduations/:kegiatanId/ujian-praktek` | Daftar ujian praktek dalam pendadaran | — |
| `GET` | `/graduations/:kegiatanId/ujian-praktek/available-items` | Item penilaian tersedia | — |
| `GET` | `/assessments/aspects` | Semua aspek penilaian | — |
| `GET` | `/assessments/items?aspekId=xxx` | Item penilaian per aspek | Query: `aspekId` |
| `POST` | `/graduations/:kegiatanId/ujian-praktek/:id/score` | Submit nilai (bulk per penguji) | `{ scores: [{ itemPenilaianId, calonAnggotaId, nilai, catatan }] }` |
| `GET` | `/graduations/:id/evaluations` | Cek nilai yang sudah diinput | — |

### Request Body `POST /score`

```json
{
  "scores": [
    {
      "itemPenilaianId": "uuid-item-1",
      "calonAnggotaId": "uuid-calon",
      "nilai": 85,
      "catatan": "Teknik dasar baik, perlu perbaikan kuda-kuda"
    },
    {
      "itemPenilaianId": "uuid-item-2",
      "calonAnggotaId": "uuid-calon",
      "nilai": 70,
      "catatan": null
    }
  ]
}
```

### Response `POST /score`

```json
{
  "success": true,
  "data": {
    "scored": 8,
    "errors": 0,
    "totalScore": 625,
    "maxScore": 800
  }
}
```

---

## 4. UI Mockup (Text Description)

### Screen: Input Nilai — Daftar Peserta

```
┌──────────────────────────────────────┐
│ ← Input Nilai Pendadaran            │
│                                      │
│  "Pendadaran: Ujian Sabuk Hitam"    │
│  ┌──────────────────────────────┐   │
│  │ 🔍 Cari peserta...          │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │ A Andi Pratama          ▶   │   │
│  │   No: 0114-0101-015-2026      │   │
│  ├──────────────────────────────┤   │
│  │ B Siti Rahma             ▶   │   │
│  │   No: 0114-0101-016-2026      │   │
│  ├──────────────────────────────┤   │
│  │ C Budi Santoso           ▶   │   │
│  │   No: 0114-0101-017-2026      │   │
│  └──────────────────────────────┘   │
│                                      │
│  [SUBMIT SEMUA NILAI] (disabled)     │
│  0 dari 3 peserta sudah dinilai      │
└──────────────────────────────────────┘
```

### Screen: Input Nilai — Per Peserta (Form)

```
┌──────────────────────────────────────┐
│ ← Andi Pratama                      │
│                                      │
│  "Teknik Dasar" — Aspek 1/3         │
│                                      │
│  1. Kuda-kuda               (0-100)  │
│     ┌──────────────────────────┐    │
│     │ 85         [+][-]       │    │
│     └──────────────────────────┘    │
│     Catatan (opsional):             │
│     ┌──────────────────────────┐    │
│     │ Posisi sudah stabil...   │    │
│     └──────────────────────────┘    │
│                                      │
│  2. Pukulan                (0-100)  │
│     ┌──────────────────────────┐    │
│     │ 70         [+][-]       │    │
│     └──────────────────────────┘    │
│                                      │
│  3. Tangkisan              (0-100)  │
│     ┌──────────────────────────┐    │
│     │ [Isikan nilai]          │    │
│     └──────────────────────────┘    │
│                                      │
│  ──────────────────────────────      │
│  Total: 155 / 300  (51.7%)          │
│  ──────────────────────────────      │
│                                      │
│  [SIMPAN NILAI PESERTA INI]          │
└──────────────────────────────────────┘
```

### Screen: Nilai Tersimpan (Konfirmasi)

```
┌──────────────────────────────────────┐
│                                      │
│    ✅ Nilai berhasil disimpan!       │
│                                      │
│    Peserta: Andi Pratama             │
│    Total: 625 / 800 (78.1%)          │
│    Item dinilai: 8/8                 │
│                                      │
│    ┌──────────────────────────┐      │
│    │ Nilai Tertinggi: 95      │      │
│    │ (Teknik Tangkisan)       │      │
│    │ Nilai Terendah: 55       │      │
│    │ (Kata)                   │      │
│    └──────────────────────────┘      │
│                                      │
│    [NILAI PESERTA LAIN]              │
│    [KEMBALI KE DAFTAR]               │
└──────────────────────────────────────┘
```

---

## 5. Validasi & Error States

| Skenario | Validasi | Error Message |
|:---------|:---------|:--------------|
| Nilai kosong | Required | "Harap isi semua item penilaian" |
| Nilai di luar rentang | Min/Max (0–100) | "Nilai harus antara 0–100" |
| Koneksi terputus saat submit | Network retry (3×) | "Koneksi terputus. Coba lagi." |
| Submit duplikat | Prevent double-click | "Menyimpan…" (button disabled + spinner) |
| Token expired saat submit | Auto-refresh → retry | — (silent refresh) |
| Server error (500) | Catch → user message | "Gagal menyimpan nilai. Silakan coba lagi." |
| Tidak ada item penilaian | Check length | "Belum ada item penilaian untuk ujian ini. Hubungi admin." |
| Bukan penguji yang ditugaskan | Role check API | "Anda tidak ditugaskan sebagai penguji untuk ujian ini." |

---

## 6. File Yang Akan Dibuat / Dimodifikasi

| File | Action | Deskripsi |
|:-----|:-------|:----------|
| `screens/graduations/input-score.tsx` | **BARU** | Form input nilai — pilih peserta, isi nilai per item, submit |
| `screens/graduations/input-score-select.tsx` | **BARU** | (optional) Daftar peserta untuk dipilih sebelum input |
| `screens/graduations/detail.tsx` | **MODIFIKASI** | Tambah tombol "Input Nilai" di tab Evaluasi (visible untuk penguji) |
| `app/_layout.tsx` | **MODIFIKASI** | Register route `graduations/input-score` |
| `hooks/use-scoring.ts` | **BARU** | Hook untuk fetch items + submit nilai |

---

## 7. Dependencies

| Dep | Untuk | Status |
|:----|:------|:------|
| Backend: Graduations API | Data peserta & evaluasi | ✅ Existing |
| Backend: Assessments API | Aspek & item penilaian | ✅ Existing |
| Backend: Ujian Praktek API | Submit nilai bulk | ✅ Existing |
| `react-native-qrcode-svg` | (opsional) scan peserta QR untuk auto-fill | ✅ Used in digital-card |

**Tidak ada dependencies baru yang perlu diinstall.**

---

## 8. Acceptance Criteria

- [ ] US-01: Penguji bisa memilih peserta dari daftar pendadaran
- [ ] US-02: Form menampilkan aspek + item penilaian dengan skor maksimal
- [ ] US-03: Input nilai numerik dengan batas min/max, bisa pakai slider atau input angka
- [ ] US-04: Catatan opsional per item
- [ ] US-05: Total skor sementara ditampilkan dan diupdate real-time
- [ ] US-06: Submit berhasil → data muncul di tab Evaluasi setelah refresh
- [ ] US-07: Validasi: nilai required, range, duplicate submit, error handling
- [ ] US-08: Loading state selama fetch & submit
- [ ] US-09: Error state dengan retry button
- [ ] US-10: Empty state jika tidak ada item / peserta

---

## 9. Alur Lengkap

```
Penguji buka detail pendadaran
  → Tab Evaluasi → tombol "Input Nilai" (visible untuk penguji)
    → Screen daftar peserta (filter/search by nama)
      → Tap peserta → Screen form nilai
        → Load aspek & item penilaian dari API
        → Pengisi nilai per item
        → Lihat total skor sementara
        → Submit
          → API POST /graduations/:id/ujian-praktek/:id/score
          → Sukses → konfirmasi + option nilai peserta lain
          → Gagal → error message + retry
```

---

*Dokumen ini dapat dijadikan acuan untuk implementasi Sprint 2. API endpoints sudah siap, tidak perlu perubahan backend.*
