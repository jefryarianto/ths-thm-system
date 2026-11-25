# Aktifkan Ajukan KTA di Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menampilkan tombol “Ajukan KTA” di beranda Flutter hanya ketika anggota belum punya pengajuan aktif dan kartu belum terbit, dengan navigasi `go_router` yang benar.

**Architecture:** Logika tampilan dipisahkan ke resolver murni `resolveKtaApplyVisibility`. `KtaStatusBanner` memakai resolver itu untuk memilih sembunyi / Ajukan KTA / Lihat Status. Beranda memasang banner dan menghapus prompt “Generate” ganda; halaman `/kta` tetap mempertahankan tombol Generate lama.

**Tech Stack:** Flutter 3.47.9, Dart 3.13.7, `flutter_bloc`, `go_router` 14.8.1, `bloc_test` 9.1.5, `mocktail` 1.0.4.

**Spec:** `docs/superpowers/specs/2026-11-25-enable-kta-apply-mobile-design.md`.

## Global Constraints

- TDD: tulis test gagal dulu, verifikasi gagal, implementasi minimal, verifikasi lulus, lalu commit.
- Jangan tambah komentar kode.
- Jangan tambah dependency.
- Jangan ubah API, `kta_mobile`, fitur klaim anggota, login, atau profile edit.
- Pakai `context.push`, jangan `Navigator.pushNamed`.
- Route yang dipakai tetap `/kta/apply` dan `/kta/status`.
- `flutter test` seluruh app harus lulus; `flutter analyze` tidak boleh menambah issue baru.
- Kerjakan di worktree terpisah dari `master`.

## Review Focus

- Pengajuan aktif/status review → harus menampilkan “Lihat Status”, bukan “Ajukan KTA”.
- Kartu sudah `generated == true` → banner harus hilang walau tidak ada pengajuan.
- Pengajuan `rejected`/`cancelled` dan kartu belum terbit → harus menampilkan “Ajukan KTA”.
- `cardGenerated == null`, loading, atau error → harus sembunyi agar tidak menjanjikan CTA berdasarkan data tidak lengkap.
- Tap “Ajukan KTA” → harus menuju `/kta/apply` lewat `go_router`, bukan `pushNamed`.

---

### Task 1: Resolver visibilitas KTA

**Files:**
- Create: `apps/mobile_flutter/lib/logic/kta_application/kta_apply_eligibility.dart`
- Create: `apps/mobile_flutter/test/helpers/kta_apply_fixtures.dart`
- Test: `apps/mobile_flutter/test/kta_apply_eligibility_test.dart`

**Interfaces:**
- Consumes: `KtaApplicationState`, `KtaAppStatus`, `KtaApplication`.
- Produces:
  - `enum KtaApplyVisibility { hidden, apply, status }`
  - `KtaApplyVisibility resolveKtaApplyVisibility(KtaApplicationState state, bool? cardGenerated)`
  - fixture: `KtaApplication ktaApplication({KtaAppStatus status = KtaAppStatus.submitted})`
  - fixture: `MemberLoaded memberLoaded({bool? generated})`

- [ ] **Step 1: Tulis test gagal untuk resolver**

`test/kta_apply_eligibility_test.dart` harus menguji:

```dart
expect(resolveKtaApplyVisibility(const KtaApplicationInitial(), false),
    KtaApplyVisibility.apply);
expect(resolveKtaApplyVisibility(const KtaApplicationLoading(), false),
    KtaApplyVisibility.hidden);
expect(resolveKtaApplyVisibility(const KtaApplicationError('x'), false),
    KtaApplyVisibility.hidden);
expect(resolveKtaApplyVisibility(
      KtaApplicationLoaded(application: ktaApplication(status: KtaAppStatus.submitted)),
      false,
    ), KtaApplyVisibility.status);
expect(resolveKtaApplyVisibility(
      KtaApplicationLoaded(application: ktaApplication(status: KtaAppStatus.rejected)),
      false,
    ), KtaApplyVisibility.apply);
expect(resolveKtaApplyVisibility(
      KtaApplicationLoaded(application: ktaApplication(status: KtaAppStatus.approved)),
      false,
    ), KtaApplyVisibility.hidden);
expect(resolveKtaApplyVisibility(const KtaApplicationInitial(), true),
    KtaApplyVisibility.hidden);
expect(resolveKtaApplyVisibility(const KtaApplicationInitial(), null),
    KtaApplyVisibility.hidden);
```

Aturan tambahan: `cancelled` → `apply`; `rantingReview`, `wilayahReview`, `distrikReview`, `nasionalReview`, `paymentSetup`, `paymentPending`, `paymentVerified`, `cardGenerating`, dan `KtaApplicationSubmitted` → `status`.

- [ ] **Step 2: Jalankan test resolver dan pastikan gagal**

Run: `flutter test test/kta_apply_eligibility_test.dart` dari `apps/mobile_flutter`  
Expected: FAIL karena `resolveKtaApplyVisibility` belum ada.

- [ ] **Step 3: Implementasi resolver minimal**

Buat file `lib/logic/kta_application/kta_apply_eligibility.dart` dengan enum dan fungsi di atas.

Urutan keputusan:
1. `cardGenerated != false` → `hidden`.
2. `state is KtaApplicationLoading || state is KtaApplicationError` → `hidden`.
3. `state is KtaApplicationInitial` → `apply`.
4. `state is KtaApplicationLoaded || state is KtaApplicationSubmitted` → `hidden` untuk `approved`/`cardGenerated`, `apply` untuk `rejected`/`cancelled`, else `status`.
5. State lain → `hidden`.

Isi fixture di `test/helpers/kta_apply_fixtures.dart` memakai constructor `KtaApplication` dan `MemberLoaded` yang sudah ada.

- [ ] **Step 4: Jalankan test resolver sampai lulus**

Run: `flutter test test/kta_apply_eligibility_test.dart`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/lib/logic/kta_application/kta_apply_eligibility.dart apps/mobile_flutter/test/helpers/kta_apply_fixtures.dart apps/mobile_flutter/test/kta_apply_eligibility_test.dart
git commit -m "feat(mobile): tentukan visibilitas ajukan KTA"
```

---

### Task 2: Banner KTA dan navigasi go_router

**Files:**
- Modify: `apps/mobile_flutter/lib/presentation/widgets/kta_status_banner.dart:97-162`
- Test: `apps/mobile_flutter/test/kta_status_banner_test.dart`

**Interfaces:**
- Consumes: `resolveKtaApplyVisibility`, fixture `ktaApplication`, fixture `memberLoaded`.
- Produces: `KtaStatusBanner` yang merender `hidden`, “Ajukan KTA”, atau “Lihat Status”.

- [ ] **Step 1: Tulis test widget yang gagal**

Buat `test/kta_status_banner_test.dart` dengan `GoRouter` dua route: `/` berisi banner di dalam `BlocProvider` `KtaApplicationBloc` dan `MemberBloc`, serta `/kta/apply` dan `/kta/status` berisi widget penanda.

Kasus wajib:
- `KtaApplicationInitial()` + `generated: false` → `find.text('Ajukan KTA')`; tap → location `/kta/apply`.
- `KtaApplicationLoaded(status: submitted)` + `generated: false` → tidak ada “Ajukan KTA”; ada “Lihat Status”; tap → `/kta/status`.
- `KtaApplicationLoaded(status: rejected)` + `generated: false` → ada “Ajukan KTA”.
- `KtaApplicationLoaded(status: approved)` + `generated: false` → banner tidak ada.
- `KtaApplicationInitial()` + `generated: true` → banner tidak ada.
- `KtaApplicationInitial()` + `generated: null` → banner tidak ada.

Gunakan `whenListen` dari `bloc_test` untuk state awal bloc.

- [ ] **Step 2: Jalankan test banner dan pastikan gagal**

Run: `flutter test test/kta_status_banner_test.dart`  
Expected: FAIL karena banner belum memakai resolver dan masih `pushNamed`.

- [ ] **Step 3: Implementasi banner**

Di `build`, baca `MemberBloc` dan `KtaApplicationBloc`, hitung `cardGenerated` hanya jika state `MemberLoaded`, lalu panggil `resolveKtaApplyVisibility`.

- `hidden` → `SizedBox.shrink()`.
- `apply` → teks aksi “Ajukan KTA”, route `/kta/apply`.
- `status` → teks aksi “Lihat Status”, route `/kta/status`.
- Ganti `Navigator.pushNamed(context, route)` dengan `context.push(route)`.
- Pertahankan pesan status yang sudah ada untuk tiap `KtaAppStatus`.

- [ ] **Step 4: Jalankan test banner sampai lulus**

Run: `flutter test test/kta_status_banner_test.dart`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/lib/presentation/widgets/kta_status_banner.dart apps/mobile_flutter/test/kta_status_banner_test.dart
git commit -m "fix(mobile): arahkan banner KTA lewat go_router"
```

---

### Task 3: Pasang banner di beranda dan hapus prompt ganda

**Files:**
- Modify: `apps/mobile_flutter/lib/presentation/screens/home_screen.dart:208-343`
- Test: `apps/mobile_flutter/test/home_kta_apply_test.dart`

**Interfaces:**
- Consumes: `KtaStatusBanner`, fixture `ktaApplication`, fixture `memberLoaded`.
- Produces: beranda yang menampilkan banner dan tidak menampilkan prompt “Generate” lama.

- [ ] **Step 1: Tulis test home yang gagal**

Buat `test/home_kta_apply_test.dart` dengan `HomeScreen` di dalam `BlocProvider` untuk `AuthBloc`, `MemberBloc`, `DuesBloc`, `HomeFeedBloc`, `NotificationBloc`, `GamificationBloc`, dan `KtaApplicationBloc`.

Kasus wajib:
- `KtaApplicationInitial()` + `memberLoaded(generated: false)` → ada “Ajukan KTA” dan tidak ada teks “Generate”.
- `KtaApplicationInitial()` + `memberLoaded(generated: true)` → tidak ada “Ajukan KTA”.

- [ ] **Step 2: Jalankan test home dan pastikan gagal**

Run: `flutter test test/home_kta_apply_test.dart`  
Expected: FAIL karena banner belum dipasang.

- [ ] **Step 3: Implementasi beranda**

- Import `../widgets/kta_status_banner.dart`.
- Pasang `KtaStatusBanner()` di `_KtaSection` setelah baris judul “Kartu Anggota (KTA)” dan sebelum `BlocBuilder<MemberBloc>`.
- Hapus pemakaian `_HomeGenerateKtaCard` di `_KtaSectionCard`.
- Jika `generated == false`, kembalikan `SizedBox.shrink()` untuk area kartu; pesan/CTA ditangani banner.
- Hapus kelas `_HomeGenerateKtaCard` yang sudah tidak dipakai.
- Jangan ubah tombol Generate di `kta_screen.dart`.

- [ ] **Step 4: Jalankan test home sampai lulus**

Run: `flutter test test/home_kta_apply_test.dart`  
Expected: PASS.

- [ ] **Step 5: Verifikasi penuh**

Run dari `apps/mobile_flutter`:

```bash
flutter test
flutter analyze
dart format --output=none --set-exit-if-changed lib test
git diff --check
```

Expected: semua test lulus, analyzer tidak ada error/issue baru, format bersih, diff bersih.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile_flutter/lib/presentation/screens/home_screen.dart apps/mobile_flutter/test/home_kta_apply_test.dart
git commit -m "fix(mobile): tampilkan ajukan KTA di beranda"
```
