# Plan: Perkuat Mobile App — THS-THM

## Konteks

Mobile app memiliki **18 screen directories**, tapi **1 empty** (assessments) dan **1 stub** (MemberImport). Beberapa screen juga tidak punya detail view (graduations, documents, dues). Role-based access control belum diimplementasikan.

Goal: Bikin mobile app mencapai parity dengan fitur web untuk role `anggota` dan `admin`/`penguji`.

---

## Struktur & Pola Eksisting

- **Navigation**: Expo Router (file-based), root `_layout.tsx` stack, 8 tab bottom nav di `(tabs)/_layout.tsx`
- **UI Components**: `shared.tsx` — `LoadingView`, `ErrorView`, `StatusBadge`, `FilterChips`, `SearchBar`
- **Data Fetching**: `useApi<T>` dan `usePaginatedList<T>` hooks di `use-api.ts`
- **API Client**: Axios di `lib/api-client.ts` — auto token refresh, `unwrap()` helper
- **Auth Store**: Zustand di `store/auth-store.ts` — user object dengan `role` field
- **Styling**: `StyleSheet.create` (NativeWind tersedia tapi tidak digunakan di screen yang ada)
- **Screen Pattern**: List screen (header + filter + search + FlatList) dan detail screen (tabs: Info, Peserta, etc.)

---

## Task

### Task 1: Hook `use-assessments.ts`

**File**: `apps/mobile/src/hooks/use-assessments.ts`

Buat hook baru mengikuti pola `use-activities.ts`:

- `useAspects(search?, filter?)` — fetch `GET /assessments/aspects`
- `useAspectDetail(id)` — fetch `GET /assessments/aspects/:id`
- `useItems(aspectId?)` — fetch `GET /assessments/items`
- `useScores(aspectId?)` — fetch `GET /assessments/scores`
- Export `STATUS_STYLES`, `FILTER_OPTIONS` constant objects

### Task 2: Screen `assessments/index.tsx` (List)

**File**: `apps/mobile/src/screens/assessments/index.tsx`

List screen menampilkan daftar aspek penilaian:

- Header biru dengan judul "Aspek Penilaian" + count
- SearchBar untuk cari aspek
- FlatList dengan refresh control (pull-to-refresh)
- Tiap card: nama aspek, deskripsi, item count, status badge
- Navigate ke detail via `router.push(/assessments/${item.id})`
- Empty state: "Belum ada aspek penilaian"

### Task 3: Screen `assessments/detail.tsx` (Detail)

**File**: `apps/mobile/src/screens/assessments/detail.tsx`

Detail screen dengan 2 tab:

- **Tab 1 — Items**: FlatList aspek items (nama, bobot, tipe) + scores ringkasan
- **Tab 2 — Scores**: FlatList nilai (nama peserta, item, score, tanggal)
- Header: nama aspek, deskripsi, status badge

### Task 4: Route files untuk assessments

**File**: `apps/mobile/app/assessments.tsx` — route wrapper (auth guard + screen import)
**File**: `apps/mobile/app/assessments/[id].tsx` — route wrapper untuk detail

### Task 5: Menu entry di home

**File**: `apps/mobile/src/screens/members/home.tsx`

Tambahkan menu item "Aspek" di grid menu (13 item → 14 item), dengan icon `school` atau `clipboard`, navigate ke `/assessments`.

### Task 6: Graduation detail screen

**File**: `apps/mobile/src/screens/graduations/detail.tsx`

Mengikuti pola `trainings/detail.tsx`:

- 3 tab: Info, Peserta, Evaluasi
- **Info**: nama, lokasi, tanggal, status, penguji
- **Peserta**: FlatList peserta (nama, status kelulusan)
- **Evaluasi**: FlatList nilai (peserta, aspek, skor)
- API: `GET /graduations/:id`, `GET /graduations/:id/participants`, `GET /graduations/:id/evaluations`

**File**: `apps/mobile/app/graduations/[id].tsx` — route wrapper

**Edit**: `apps/mobile/src/screens/graduations/index.tsx` — tambahkan `onPress` ke card untuk navigate ke detail

### Task 7: Dues detail screen

**File**: `apps/mobile/src/screens/dues/detail.tsx`

Detail screen untuk satu iuran:

- Info pembayaran: periode, jumlah, status, tanggal jatuh tempo
- History pembayaran (list)
- Tombol "Bayar" (jika status belum lunas) — untuk sekarang, pakai manual payment confirmation (upload bukti transfer + catatan)
- API: `GET /dues/:id`, `GET /dues/:id/payments`, `POST /dues/:id/payments`

**File**: `apps/mobile/app/dues/[id].tsx` — route wrapper

**Edit**: `apps/mobile/src/screens/dues/index.tsx` — tambahkan `onPress` ke card untuk navigate ke detail

### Task 8: Document detail screen

**File**: `apps/mobile/src/screens/documents/detail.tsx`

Detail screen:

- Info dokumen: nama, tipe, tanggal generate, status
- Preview/download button
- QR code display (jika dokumen memiliki QR)
- API: `GET /documents/:id`

**File**: `apps/mobile/app/documents/[id].tsx` — route wrapper

**Edit**: `apps/mobile/src/screens/documents/index.tsx` — tambahkan `onPress` ke card untuk navigate ke detail

### Task 9: Fix MemberImportScreen + integrate navigation

**File**: `apps/mobile/src/screens/MemberImportScreen.tsx`

Refactor:

- Gunakan shared components (`LoadingView`, `ErrorView`, `SearchBar`)
- Ganti inline `Button` dengan `TouchableOpacity` + `Ionicons`
- Gunakan `StyleSheet.create` (bukan inline styles)
- Gunakan `memberService.ts` yang sudah ada (atau `apiClient` langsung)

**File**: `apps/mobile/app/member-import.tsx` — route wrapper baru

**Edit**: `apps/mobile/src/screens/members/home.tsx` — tambahkan menu "Import Anggota" di grid menu

### Task 10: Role-based access control

**File baru**: `apps/mobile/src/hooks/use-role.ts`

Hook yang membaca `useAuthStore().user.role` dan menyediakan:

- `isAdmin: boolean` — true jika role = superadmin, admin_distrik, admin_wilayah, admin_ranting
- `isPenguji: boolean` — true jika role = penguji
- `isAnggota: boolean` — true jika role = anggota

**Edit**: `apps/mobile/src/screens/members/home.tsx`

Sembunyikan menu items berdasarkan role:

- Anggota: hanya lihat Beranda, Kartu, Dokumen, Iuran, Notifikasi, QR Scan, Poin, Profil
- Admin/Penguji: lihat semua menu (termasuk Kegiatan, Calon, Pendadaran, Surat, Laporan, Aspek, Import)

### Task 11: Photo upload di profile

**Edit**: `apps/mobile/src/screens/profile/edit.tsx`

Ganti alert placeholder "Fitur upload foto belum tersedia" dengan:

- `expo-image-picker` (perlu install package)
- Tombol "Pilih Foto" → `ImagePicker.launchImageLibraryAsync()`
- Upload via `POST /auth/me/photo` (multipart/form-data)
- Preview foto setelah upload

### Task 12: Type definitions

**File baru**: `apps/mobile/src/types/index.ts`

Define shared TypeScript interfaces:

- `AssessmentsAspect`, `AssessmentsItem`, `AssessmentsScore`
- `Graduation`, `GraduationParticipant`, `GraduationEvaluation`
- `Dues`, `DuesPayment`
- `Document`

---

## Urutan Pengerjaan

| #   | Task                                 | File Baru | File Edit | Prioritas |
| --- | ------------------------------------ | --------- | --------- | --------- |
| 1   | Hook `use-assessments.ts`            | 1         | 0         | High      |
| 2   | Screen `assessments/index.tsx`       | 1         | 0         | High      |
| 3   | Screen `assessments/detail.tsx`      | 1         | 0         | High      |
| 4   | Route `assessments.tsx` + `[id].tsx` | 2         | 0         | High      |
| 5   | Menu entry di home                   | 0         | 1         | High      |
| 6   | Graduation detail screen             | 1         | 1         | Medium    |
| 7   | Dues detail screen                   | 1         | 1         | Medium    |
| 8   | Document detail screen               | 1         | 1         | Medium    |
| 9   | Fix MemberImport + nav               | 1         | 2         | Low       |
| 10  | Role-based access                    | 1         | 1         | Low       |
| 11  | Photo upload                         | 0         | 1         | Low       |
| 12  | Type definitions                     | 1         | 0         | Low       |

**Total**: 11 file baru, 7 file edit

---

## Catatan

- Semua screen mengikuti pola existing: `StyleSheet.create`, `useApi`/`usePaginatedList`, `LoadingView`, `FilterChips`, `SearchBar`
- Route file konsisten 10-line wrapper: `import Screen from '...'; export default Screen;`
- API endpoints sudah tersedia di backend, tidak perlu backend changes
- Payment flow: karena belum ada payment gateway, pakai manual confirmation (upload bukti + catatan) — endpoint `POST /dues/:id/payments` sudah ada di backend
