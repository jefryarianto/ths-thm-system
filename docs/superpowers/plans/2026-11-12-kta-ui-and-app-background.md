# KTA UI Fixes + App Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perbaiki mikroteks & distrik KTA di web/mobile, samakan avatar mobile menjadi rounded rectangle, dan tambahkan latar halaman mobile per akun.

**Architecture:** Perubahan web terpusat di `KtaCard` + mapper API; perubahan Flutter terpusat di model `MemberKta`, widget KTA, widget avatar bersama, dan `AppBackgroundController` yang dipasang global lewat `MaterialApp.builder` untuk user terautentikasi.

**Tech Stack:** Next.js/React/TypeScript + Vitest; Flutter/Dart + flutter_test; `shared_preferences`, `path_provider`, `image_picker`, `provider`.

**Spec:** `docs/superpowers/specs/2026-11-12-kta-ui-and-app-background-design.md`

## Global Constraints

- Latar halaman bersifat **per akun**: preferensi `app_background_path:<userId>`, file `background-<userId>-<unique>.<ext>`; logout hanya `reset()` (tidak menghapus file).
- Latar hanya tampil saat `AuthAuthenticated`; kamera/scan QR, viewer KTA, dan detail dokumen tetap opak.
- Mikroteks belakang uppercase dan tetap `pt(2.6)`; jangan mengubah konstanta ukuran.
- Normalisasi distrik: strip prefix `keuskupan` (case-insensitive), trim, uppercase, fallback `THS-THM`.
- Tidak menambah dependency baru di Flutter maupun web.
- Golden KTA **wajib diregenerasi** di Windows dan diperiksa visualnya; jangan commit golden tanpa regenerasi.

## Review Focus

- Distrik null/kosong/berprefix "Keuskupan" → header tetap benar (`DISTRIK KEUSKUPAN THS-THM`), bukan kosong/duplikat.
- File latar dihapus OS/cleanup → aplikasi tetap jalan tanpa latar, tanpa exception.
- User memilih latar baru dengan ekstensi sama → gambar baru langsung tampil (nama file unik, bukan cache lama).
- Ganti akun di perangkat sama tanpa logout penuh → latar akun sebelumnya tidak bocor.
- Picker dibatalkan atau izin galeri ditolak → tidak ada perubahan state/crash, ada umpan balik bila gagal.

---

### Task 1: Util distrik web + test

**Files:**
- Create: `apps/web/src/lib/kta/district.ts`
- Test: `apps/web/src/lib/kta/__tests__/district.test.ts`

**Interfaces:**
- Produces: `DISTRICT_FALLBACK: string` (`'THS-THM'`) dan `normalizeDistrict(name?: string | null): string`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { DISTRICT_FALLBACK, normalizeDistrict } from '@/lib/kta/district';

describe('normalizeDistrict', () => {
  it('strips the Keuskupan prefix and uppercases', () => {
    expect(normalizeDistrict('Keuskupan Larantuka')).toBe('LARANTUKA');
    expect(normalizeDistrict('keuskupan larantuka')).toBe('LARANTUKA');
  });
  it('trims plain names', () => {
    expect(normalizeDistrict('  Flores Timur ')).toBe('FLORES TIMUR');
  });
  it('falls back when empty', () => {
    expect(normalizeDistrict(undefined)).toBe(DISTRICT_FALLBACK);
    expect(normalizeDistrict(null)).toBe(DISTRICT_FALLBACK);
    expect(normalizeDistrict('   ')).toBe(DISTRICT_FALLBACK);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ths-thm/web exec vitest run src/lib/kta/__tests__/district.test.ts`
Expected: FAIL — module `@/lib/kta/district` not found.

- [ ] **Step 3: Implement `normalizeDistrict`**

Approach: trim input, use `'THS-THM'` when empty, then replace `/^keuskupan\s*/i` and uppercase.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @ths-thm/web exec vitest run src/lib/kta/__tests__/district.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/kta/district.ts apps/web/src/lib/kta/__tests__/district.test.ts
git commit -m "feat(web): add KTA district name normalizer"
```

---

### Task 2: Web KTA header distrik + mikroteks uppercase

**Files:**
- Modify: `apps/web/src/components/kta/types.ts`
- Modify: `apps/web/src/components/kta/KtaCard.tsx:95,135-137`
- Modify: `apps/web/src/lib/kta/api.ts:35-48,82-95`
- Modify: `apps/web/app/(dashboard)/members/[id]/page.tsx:1537-1592`
- Test: `apps/web/src/lib/kta/__tests__/api.test.ts`

**Interfaces:**
- Consumes: `normalizeDistrict` (Task 1).
- Produces: `Anggota.distrik?: string` (nama mentah dari API).

- [ ] **Step 1: Extend the API mapper test**

In `api.test.ts`, add `wilayah` under `memberRow.ranting`:

```ts
ranting: {
  nama: 'Ranting Sukun',
  wilayah: { distrik: { nama: 'Keuskupan Larantuka' } },
},
```

and assert in the first `fetchAnggota` test:

```ts
expect(member.distrik).toBe('Keuskupan Larantuka');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @ths-thm/web exec vitest run src/lib/kta/__tests__/api.test.ts`
Expected: FAIL — `member.distrik` is undefined.

- [ ] **Step 3: Implement types + mapper + header + microtext**

- `types.ts`: add `distrik?: string;` to `Anggota`.
- `api.ts`: extend `ApiMember.ranting` with `wilayah?: { distrik?: { nama?: string | null } | null } | null` and map `distrik: member.ranting?.wilayah?.distrik?.nama ?? undefined`.
- `members/[id]/page.tsx`: in both `anggota={{...}}` objects add `distrik: member.ranting?.wilayah?.distrik?.nama ?? undefined`.
- `KtaCard.tsx`: import `normalizeDistrict`; replace the hardcoded header with `text={`DISTRIK KEUSKUPAN ${normalizeDistrict(a.distrik)}`}`.
- `KtaCard.tsx`: back microtext string and `aria-label` become `'FORTITER IN RE, SUAVITER IN MODO'`; keep `fontSize={pt(2.6)}` and 18 repeats.

- [ ] **Step 4: Run tests + typecheck**

Run:
```bash
pnpm --filter @ths-thm/web exec vitest run src/lib/kta/__tests__/api.test.ts src/lib/kta/__tests__/district.test.ts
pnpm --filter @ths-thm/web typecheck
```
Expected: all tests PASS; `tsc --noEmit` exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/kta/types.ts apps/web/src/components/kta/KtaCard.tsx apps/web/src/lib/kta/api.ts "apps/web/app/(dashboard)/members/[id]/page.tsx" apps/web/src/lib/kta/__tests__/api.test.ts
git commit -m "fix(web): use member district on KTA header and uppercase microtext"
```

---

### Task 3: Flutter KTA distrik dinamis + mikroteks uppercase + golden

**Files:**
- Modify: `apps/mobile_flutter/lib/data/models/member_kta.dart:1-100`
- Modify: `apps/mobile_flutter/lib/presentation/widgets/kta_card_widget.dart:268,545`
- Test: `apps/mobile_flutter/test/member_kta_test.dart` (create)
- Test data: `apps/mobile_flutter/test/goldens/kta_front.png`, `kta_back.png` (regenerate)

**Interfaces:**
- Produces: `MemberKta.distrik` (`String`, default `'THS-THM'`), `normalizeDistrictName(String? name): String`.

- [ ] **Step 1: Write the failing model test**

Create `test/member_kta_test.dart` with a `Member` helper (all fields from the golden sample) and:

```dart
test('distrik dinormalisasi dari namaDistrik', () {
  final kta = MemberKta.from(_member(namaDistrik: 'Keuskupan Larantuka'), null);
  expect(kta.distrik, 'LARANTUKA');
});

test('distrik kosong memakai fallback THS-THM', () {
  final kta = MemberKta.from(_member(namaDistrik: '  '), null);
  expect(kta.distrik, 'THS-THM');
});
```

`_member({required String namaDistrik}) => Member(...)` using the same values as `test/kta_card_golden_test.dart`.

- [ ] **Step 2: Run test to verify it fails**

Run (workdir `apps/mobile_flutter`): `flutter test test/member_kta_test.dart`
Expected: FAIL — `distrik` getter not defined.

- [ ] **Step 3: Implement model + widget**

- `member_kta.dart`: add `final String distrik;`; constructor `this.distrik = 'THS-THM'`; factory sets `distrik: normalizeDistrictName(member.namaDistrik)`. Add top-level `normalizeDistrictName` (trim → fallback `'THS-THM'` → `replaceFirst(RegExp(r'^keuskupan\s*', caseSensitive: false), '')` → `toUpperCase()`).
- `kta_card_widget.dart:268`: `_HeaderShadow(text: 'DISTRIK KEUSKUPAN ${kta.distrik}', ...)`.
- `kta_card_widget.dart:545`: back text `'FORTITER IN RE, SUAVITER IN MODO'` (size unchanged).

- [ ] **Step 4: Run tests + regenerate goldens**

Run:
```bash
flutter test test/member_kta_test.dart test/kta_layout_test.dart
flutter test --update-goldens test/kta_card_golden_test.dart
flutter test test/kta_card_golden_test.dart
```
Expected: model tests PASS; goldens regenerated; golden test PASS. Inspect `test/goldens/kta_front.png` (header `FLORES TIMUR`) and `kta_back.png` (uppercase microtext) before committing.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/lib/data/models/member_kta.dart apps/mobile_flutter/lib/presentation/widgets/kta_card_widget.dart apps/mobile_flutter/test/member_kta_test.dart apps/mobile_flutter/test/goldens/kta_front.png apps/mobile_flutter/test/goldens/kta_back.png
git commit -m "fix(mobile): dynamic district header and uppercase KTA microtext"
```

---

### Task 4: Flutter background controller + persistence

**Files:**
- Create: `apps/mobile_flutter/lib/core/theme/app_background_controller.dart`
- Test: `apps/mobile_flutter/test/app_background_controller_test.dart`

**Interfaces:**
- Produces:
  - `class AppBackgroundController extends ChangeNotifier`
  - `AppBackgroundController({Future<Directory> Function()? supportDir})`
  - `String? get imagePath`
  - `Future<void> loadForUser(String userId)`
  - `Future<void> setImage(String sourcePath)`
  - `Future<void> clear()`
  - `void reset()`
  - Pref key: `app_background_path:<userId>`.

- [ ] **Step 1: Write the failing test**

```dart
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_flutter/core/theme/app_background_controller.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory temp;
  late File source;

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    temp = await Directory.systemTemp.createTemp('app_bg_test');
    source = File('${temp.path}/source.jpg')..writeAsBytesSync([1, 2, 3]);
  });
  tearDown(() => temp.delete(recursive: true));

  AppBackgroundController build() =>
      AppBackgroundController(supportDir: () async => temp);

  test('setImage menyalin file dan menyimpan path per user', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    expect(c.imagePath, isNotNull);
    expect(File(c.imagePath!).existsSync(), isTrue);
    final c2 = build();
    await c2.loadForUser('user-a');
    expect(c2.imagePath, c.imagePath);
  });

  test('loadForUser mengabaikan path yang filenya hilang', () async {
    SharedPreferences.setMockInitialValues({
      'app_background_path:user-a': '${temp.path}/hilang.jpg',
    });
    final c = build();
    await c.loadForUser('user-a');
    expect(c.imagePath, isNull);
  });

  test('pemilihan baru memakai nama unik dan menghapus file lama', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    final first = c.imagePath!;
    await c.setImage(source.path);
    expect(c.imagePath, isNot(first));
    expect(File(first).existsSync(), isFalse);
  });

  test('latar terpisah antar akun dan reset tidak menghapus file', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    final path = c.imagePath!;
    await c.loadForUser('user-b');
    expect(c.imagePath, isNull);
    c.reset();
    expect(c.imagePath, isNull);
    await c.loadForUser('user-a');
    expect(c.imagePath, path);
  });

  test('clear menghapus file dan preferensi user aktif', () async {
    final c = build();
    await c.loadForUser('user-a');
    await c.setImage(source.path);
    final path = c.imagePath!;
    await c.clear();
    expect(c.imagePath, isNull);
    expect(File(path).existsSync(), isFalse);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (workdir `apps/mobile_flutter`): `flutter test test/app_background_controller_test.dart`
Expected: FAIL — controller file not found.

- [ ] **Step 3: Implement `AppBackgroundController`**

Approach: `loadForUser` stores `_userId`, reads pref, keeps path only if `File.existsSync`; `setImage` copies bytes to `<support>/backgrounds/background-$_userId-${DateTime.now().microsecondsSinceEpoch}$ext` (create dir), deletes previous stored file (same user), writes pref, notifies; `clear` deletes file + `remove(key)`; `reset` only clears in-memory state. No-op when `_userId == null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/app_background_controller_test.dart`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile_flutter/lib/core/theme/app_background_controller.dart apps/mobile_flutter/test/app_background_controller_test.dart
git commit -m "feat(mobile): add per-account app background controller"
```

---

### Task 5: Pasang latar global + integrasi auth + layar transparan/opak

**Files:**
- Modify: `apps/mobile_flutter/lib/main.dart:1-30,100-170`
- Modify: `apps/mobile_flutter/lib/presentation/screens/forum_screen.dart:50`
- Modify: `apps/mobile_flutter/lib/presentation/screens/forum_threads_screen.dart:75`
- Modify: `apps/mobile_flutter/lib/presentation/screens/document_detail_screen.dart:131-136`
- Modify: `apps/mobile_flutter/lib/presentation/screens/qr_scan_screen.dart:304-305`

**Interfaces:**
- Consumes: `AppBackgroundController` (Task 4).

- [ ] **Step 1: Integrate controller in `main.dart`**

- Add `ChangeNotifierProvider(create: (_) => AppBackgroundController(), child: ...)` inside the existing provider tree (below `themeController`).
- In the existing `BlocListener<AuthBloc, AuthState>` listener: on `AuthAuthenticated` call `context.read<AppBackgroundController>().loadForUser(state.user.id)`; on `AuthUnauthenticated` call `.reset()`.
- In `MaterialApp.router.builder`, wrap `BiometricLockScreen(child: child!)` with a `BlocBuilder<AuthBloc, AuthState>` + `context.watch<AppBackgroundController>()`:
  - if not `AuthAuthenticated` or `imagePath == null` → return existing child;
  - else return `Stack(fit: StackFit.expand)` of `Image.file(File(path), fit: BoxFit.cover, key: ValueKey(path))`, `ColoredBox(color: Colors.black.withValues(alpha: isDark ? 0.5 : 0.25))`, then `Theme(data: Theme.of(context).copyWith(scaffoldBackgroundColor: Colors.transparent), child: child!)`.
- Import `dart:io`, `provider`, and the controller.

- [ ] **Step 2: Make normal pages transparent / exempt pages opaque**

- `forum_screen.dart` & `forum_threads_screen.dart`: `backgroundColor: Colors.transparent`.
- `document_detail_screen.dart`: `backgroundColor: Theme.of(context).brightness == Brightness.dark ? AppTheme.darkBackground : AppTheme.lightBackground` (keeps it opaque; `AppTheme` already imported).
- `qr_scan_screen.dart`: add `backgroundColor: Theme.of(context).brightness == Brightness.dark ? AppTheme.darkBackground : AppTheme.lightBackground` (screen stays opaque).
- `kta_viewer_screen.dart`: no change (already `colorScheme.surface`).

- [ ] **Step 3: Verify compile + existing tests**

Run (workdir `apps/mobile_flutter`):
```bash
flutter analyze lib
flutter test
```
Expected: no new analyzer errors; all tests PASS (background default is none, so goldens unchanged).

- [ ] **Step 4: Commit**

```bash
git add apps/mobile_flutter/lib/main.dart apps/mobile_flutter/lib/presentation/screens/forum_screen.dart apps/mobile_flutter/lib/presentation/screens/forum_threads_screen.dart apps/mobile_flutter/lib/presentation/screens/document_detail_screen.dart apps/mobile_flutter/lib/presentation/screens/qr_scan_screen.dart
git commit -m "feat(mobile): apply per-account page background globally"
```

---

### Task 6: UI pengaturan latar halaman

**Files:**
- Modify: `apps/mobile_flutter/lib/presentation/screens/settings_screen.dart:1-120`

**Interfaces:**
- Consumes: `AppBackgroundController` (Task 4).

- [ ] **Step 1: Add the "Latar Halaman" entry**

In the "Tampilan" section (after `_ThemeSelector`), add a `ListTile` that watches `context.watch<AppBackgroundController>()`:
- leading `Icons.wallpaper_outlined`,
- title `'Latar Halaman'`,
- subtitle `imagePath == null ? 'Tanpa latar' : 'Latar kustom aktif'`,
- trailing `Icons.chevron_right`,
- `onTap` opens the bottom sheet below.

- [ ] **Step 2: Implement the bottom sheet**

Private method on `SettingsScreen` (`showModalBottomSheet` + `SafeArea`):
- preview `ClipRRect(borderRadius: 16, child: Image.file(File(path), height: 140, width: double.infinity, fit: BoxFit.cover))` when active,
- `ListTile` "Pilih dari Galeri": `ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 2000, maxHeight: 2000, imageQuality: 85)`; if non-null `await controller.setImage(picked.path)`,
- `ListTile` "Hapus Latar" when active → `controller.clear()`,
- `try/catch` around pick/save → `showCenteredSnackBar(context, 'Gagal memasang latar: ...')`,
- close sheet after an action.

- [ ] **Step 3: Verify compile + tests**

Run (workdir `apps/mobile_flutter`):
```bash
flutter analyze lib
flutter test
```
Expected: no new analyzer errors; tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile_flutter/lib/presentation/screens/settings_screen.dart
git commit -m "feat(mobile): add page background picker in settings"
```

---

### Task 7: Avatar rounded rectangle bersama

**Files:**
- Create: `apps/mobile_flutter/lib/presentation/widgets/member_avatar.dart`
- Modify: `apps/mobile_flutter/lib/presentation/widgets/home_app_bar.dart:150-200`
- Modify: `apps/mobile_flutter/lib/presentation/screens/profile_screen.dart:50-80`
- Modify: `apps/mobile_flutter/lib/presentation/screens/profile_edit_screen.dart:335-385`
- Modify: `apps/mobile_flutter/lib/presentation/screens/settings_screen.dart:30-45`

**Interfaces:**
- Produces: `MemberAvatar({required double size, ImageProvider? image, required String initials, Widget? overlay})` — `ClipRRect` radius 16, `BoxFit.cover`, fallback initials, optional overlay.

- [ ] **Step 1: Implement `MemberAvatar`**

File `lib/presentation/widgets/member_avatar.dart`: `ClipRRect(borderRadius: BorderRadius.circular(16))` wrapping a `SizedBox(width/height: size)`; when `image == null` show `Container(color: primary.withValues(alpha: 0.15), child: Center(Text(initials)))`; else `Image(image: image!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => fallback)`; `overlay` rendered with `Positioned.fill`.

- [ ] **Step 2: Replace circular avatars**

- `home_app_bar.dart`: member photo → `MemberAvatar(size: 48, image: member.fotoUrl.isNotEmpty ? CachedNetworkImageProvider(member.fotoUrl) : null, initials: nameInitials(member.namaLengkap))`; fallback branch → same widget with initials only. Remove `CircleAvatar`/`ClipOval`.
- `profile_screen.dart`: `MemberAvatar(size: 96, image: member.fotoUrl.isNotEmpty ? NetworkImage(member.fotoUrl) : null, initials: nameInitials(member.namaLengkap))`.
- `profile_edit_screen.dart`: `MemberAvatar(size: 112, image: backgroundImage, initials: nameInitials(member?.namaLengkap ?? ''), overlay: _photoUploading ? Container(color: Colors.black45, child: AppLoadingSpinner.small(color: Colors.white)) : null)`; keep the camera button Positioned outside.
- `settings_screen.dart`: `MemberAvatar(size: 40, initials: nameInitials(nama))` (auth user has no photo URL).

- [ ] **Step 3: Verify**

Run (workdir `apps/mobile_flutter`):
```bash
flutter analyze lib
flutter test
```
Expected: no new analyzer errors; tests PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile_flutter/lib/presentation/widgets/member_avatar.dart apps/mobile_flutter/lib/presentation/widgets/home_app_bar.dart apps/mobile_flutter/lib/presentation/screens/profile_screen.dart apps/mobile_flutter/lib/presentation/screens/profile_edit_screen.dart apps/mobile_flutter/lib/presentation/screens/settings_screen.dart
git commit -m "feat(mobile): use rounded rectangle avatars consistently"
```

---

### Task 8: Final verification (web + mobile)

**Files:** none (verification only).

- [ ] **Step 1: Web checks**

Run:
```bash
pnpm --filter @ths-thm/web typecheck
pnpm --filter @ths-thm/web exec vitest run src/lib/kta src/components/kta
pnpm --filter @ths-thm/web exec eslint src/lib/kta src/components/kta "app/(dashboard)/members/[id]/page.tsx"
```
Expected: typecheck exit 0; tests PASS; eslint 0 errors (pre-existing warnings allowed).

- [ ] **Step 2: Mobile checks**

Run (workdir `apps/mobile_flutter`):
```bash
flutter analyze
flutter test
```
Expected: no new analyzer errors; all tests including goldens PASS.

- [ ] **Step 3: Manual smoke (documented in PR/commit notes)**

1. Login user A → Pengaturan → Latar Halaman → pilih gambar galeri → Beranda/Iuran/Forum/Profil/detail menampilkan latar; kamera scan QR, viewer KTA, detail dokumen tetap opak.
2. Pilih gambar lain (ekstensi sama) → langsung berganti.
3. Logout → login user B → tidak melihat latar A; login A lagi → latar A kembali.
4. Buka KTA anggota dengan distrik berbeda → header sesuai distrik; mikroteks belakang uppercase seukuran depan; avatar Beranda/Profil/Edit/ Pengaturan rounded rectangle.
5. Hapus latar → semua halaman kembali normal.

- [ ] **Step 4: Commit any final fixes only if needed** (otherwise no commit).
