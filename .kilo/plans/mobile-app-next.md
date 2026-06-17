# Plan: Mobile App — Fix Critical + Enhancements

## Audit Summary

Semua 18 screen sudah terimplementasi (tidak ada stub/placeholder). Tapi ditemukan 1 bug kritis dan beberapa gap.

---

## Task 1: Fix `/profile` Route (CRITICAL)

**File**: `apps/mobile/src/screens/members/home.tsx` (line 12)

Bug: `{ icon: 'person', label: 'Profil Saya', route: '/profile' }` — route `/profile` tidak ada.

**Fix**: Ubah route ke `/(tabs)/settings` (tab "Profil" yang sudah ada: ProfileSection, PasswordSection, Edit Profil, Logout).

```
-  { icon: 'person', label: 'Profil Saya', route: '/profile' },
+  { icon: 'person', label: 'Profil Saya', route: '/(tabs)/settings' },
```

---

## Task 2: Register Missing Stack Screens

**File**: `apps/mobile/app/_layout.tsx`

10 route tidak terdaftar di Stack. Expo Router masih bisa navigate, tapi tanpa screen config.

Tambahkan ke `<Stack>`:

- `trainings`, `trainings/[id]`
- `activities`, `activities/[id]`
- `candidates`, `candidates/[id]`
- `letters`, `letters/[id]`
- `reports`
- `graduations` (list page)
- `admin-rewards`
- `notification-preferences`
- `profile/edit`
- `public-leaderboard`

---

## Task 3: Members List Screen

**File baru**: `apps/mobile/src/screens/members/index.tsx`  
**Route baru**: `apps/mobile/app/members.tsx`

Fitur di web (`/members`) tapi belum ada di mobile. Admin bisa browse/search anggota.

- SearchBar + FlatList anggota (nama, noAnggota, tingkat, status)
- Filter by tingkat/ranting/status
- Pull-to-refresh
- Navigate ke detail member (kalau Task 4 dikerjakan)

Pattern: ikuti `src/screens/activities/index.tsx` (search + filter + FlatList).

---

## Task 4: Members Detail Screen

**File baru**: `apps/mobile/src/screens/members/detail.tsx`  
**Route baru**: `apps/mobile/app/members/[id].tsx`

Detail anggota dengan 4 tab:

- **Info**: nama, noAnggota, tingkat, status, alamat, noHP, email
- **Iuran**: FlatList iuran (status + tag)
- **Latihan**: FlatList kehadiran
- **Dokumen**: FlatList dokumen

API: `GET /members/:id`, `GET /members/:id/dues`, `GET /members/:id/trainings`, `GET /members/:id/documents`

Navigation: dari Task 3 list → tap card → detail.

---

## Task 5: Forgot / Reset Password

**File edit**: `apps/mobile/src/screens/auth/login.tsx`  
**File baru**: `apps/mobile/src/screens/auth/forgot-password.tsx`  
**Route baru**: `apps/mobile/app/forgot-password.tsx`

- Tambah link "Lupa password?" di bawah tombol login
- Screen forgot-password: input email → `POST /auth/forgot-password` → toast "Cek email"
- Register route di `_layout.tsx`

---

## Task 6: Org Documents Screen

**File baru**: `apps/mobile/src/screens/org-documents/index.tsx`  
**Route baru**: `apps/mobile/app/org-documents.tsx`

Fitur di web (`/org-documents`) — dokumen level organisasi (SK, piagam, dll).

- FlatList dokumen organisasi
- Filter by tipe
- Download/preview

API: `GET /org-documents`

---

## Urutan Pengerjaan

| #   | Task                   | File Baru | File Edit | Prioritas |
| --- | ---------------------- | --------- | --------- | --------- |
| 1   | Fix `/profile` route   | 0         | 1         | Critical  |
| 2   | Register Stack screens | 0         | 1         | High      |
| 3   | Members list screen    | 2         | 0         | High      |
| 4   | Members detail screen  | 2         | 0         | High      |
| 5   | Forgot/reset password  | 2         | 1         | High      |
| 6   | Org documents screen   | 2         | 0         | Medium    |

**Total**: 8 file baru, 3 file edit

---

## Catatan

- Semua screen mengikuti pola existing: `StyleSheet.create`, `useApi`/`usePaginatedList`, `LoadingView`, `ErrorView`, `SearchBar`, `FilterChips`
- Route file: 10-line wrapper `import Screen from '...'; export default Screen;`
- API endpoints diasumsikan sudah ada di backend — kalau ada yang belum, perlu cek/dibuat
- Hook `use-member-profile.ts` sudah ada, bisa dipakai untuk members list
