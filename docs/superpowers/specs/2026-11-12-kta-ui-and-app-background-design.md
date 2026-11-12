# Design: Perbaikan KTA (web & mobile) + latar halaman aplikasi mobile

Tanggal: 2026-11-12
Status: menunggu persetujuan

## Intent dan alasan

Empat perbaikan yang diminta setelah pengecekan tampilan KTA produksi:

1. Mikroteks sisi belakang KTA harus tampil seukuran sisi depan dan berhuruf kapital.
2. Nama distrik pada header KTA harus mengikuti distrik asal anggota, bukan
   hardcode "LARANTUKA".
3. Aplikasi mobile perlu fitur untuk memasang latar (background) halaman.
4. Avatar anggota di aplikasi mobile harus berbentuk rounded rectangle yang
   konsisten dengan foto pada KTA/data anggota.

## Goals

- Mikroteks belakang identik ukurannya dengan depan (2.6pt) dan uppercase, di
  web dan Flutter.
- Header KTA depan menampilkan `DISTRIK KEUSKUPAN <NAMA>` sesuai
  `ranting.wilayah.distrik.nama` anggota (web) dan `namaDistrik` (mobile),
  dengan normalisasi dan fallback yang sama seperti renderer API/PDF.
- User dapat memilih gambar latar dari galeri, menyimpannya lokal **per akun**,
  melihatnya di semua halaman biasa setelah login, dan menghapusnya kembali.
- Avatar milik user (Beranda, Profil, Edit Profil, Pengaturan) berbentuk
  rounded rectangle dengan radius seragam.

## Non-goals

- Tidak menyinkronkan latar ke server/perangkat lain.
- Tidak mengubah latar halaman sebelum login (splash, login, biometric lock).
- Kamera/scan QR, viewer KTA, dan viewer/detail dokumen tetap opak (tidak
  memakai latar halaman).
- Tidak mengubah avatar pengguna lain (postingan forum, daftar iuran, dsb.).
- Tidak menambah background kustom untuk kartu KTA.

## Anti-goals (dianggap gagal bila terjadi)

- Latar membuat teks/card sulit dibaca (harus ada scrim).
- Background menutupi/mengganggu SnackBar, dialog, bottom sheet, atau kamera.
- Latar bocor ke halaman login setelah logout.
- Latar anggota A terlihat oleh anggota B di perangkat yang sama.
- Foto profil lama/`bg.png` tetap dipakai untuk KTA (di luar scope, sudah
  diputuskan sebelumnya).

## Constraints

- `image_picker`, `path_provider`, `shared_preferences`, `cached_network_image`
  sudah tersedia di `apps/mobile_flutter/pubspec.yaml`; tidak menambah
  dependency baru.
- Pola state/preferensi mengikuti `ThemeController` (ChangeNotifier +
  SharedPreferences + `ListenableBuilder` di `main.dart`).
- Golden test Flutter berjalan di `windows-latest`. Golden KTA **akan berubah**
  karena header distrik dan mikroteks uppercase, sehingga wajib diregenerasi
  dan diperiksa visualnya; yang tidak boleh berubah adalah tampilan default
  saat tanpa background (tidak ada golden baru untuk latar).
- Web memakai data API apa adanya; tidak ada endpoint baru.

## Approaches

### Latar halaman (dipilih: B)

- **A. Preset bawaan** — murah, tanpa izin galeri, personalisasi terbatas.
- **B. Pilih dari galeri (dipilih)** — sesuai "menambah background", file
  disalin ke folder aplikasi, path disimpan lokal, global lewat
  `MaterialApp.builder`. Perlu scrim + penanganan file.
- **C. Sinkron server** — paling fleksibel lintas perangkat, tetapi butuh
  endpoint upload/penyimpanan baru; ditolak untuk sekarang.

### Avatar

- **A. Bulat (status quo)** — tidak konsisten dengan KTA.
- **B. Rounded rectangle (dipilih)** — radius 16 pada widget avatar bersama.

### Mikroteks

- Ukuran sudah sama (2.6pt) di web dan Flutter; masalah persepsi berasal dari
  kapitalisasi. Perbaikan: ubah teks belakang menjadi uppercase (tanpa
  mengubah konstanta ukuran).

### Distrik

- Ambil dari relasi anggota dan normalisasi dengan aturan yang sama seperti
  `card-svg.ts`/`member-card.ts`:
  `(nama || 'THS-THM').replace(/^keuskupan\s*/i, '').toUpperCase()`.
  Fallback `THS-THM` agar header tidak kosong.

## Detail implementasi

### 1. Mikroteks

- Web `apps/web/src/components/kta/KtaCard.tsx`: teks dan `aria-label` sisi
  belakang menjadi `FORTITER IN RE, SUAVITER IN MODO` (tetap `pt(2.6)`,
  18 pengulangan).
- Flutter `apps/mobile_flutter/lib/presentation/widgets/kta_card_widget.dart`:
  `_BackMicrotext` memakai string uppercase untuk `isFront == false`; ukuran
  tetap `KtaText.ptMicrotext`.

### 2. Distrik dinamis

- Web:
  - `apps/web/src/lib/kta/district.ts` (baru): `normalizeDistrict(name)` +
    `DISTRICT_FALLBACK = 'THS-THM'`, dengan unit test.
  - `apps/web/src/components/kta/types.ts`: tambah `distrik?: string`.
  - `apps/web/src/lib/kta/api.ts`: `ApiMember.ranting` diberi
    `wilayah.distrik.nama`; mapper mengisi `distrik`.
  - `apps/web/app/(dashboard)/members/[id]/page.tsx`: kirim
    `distrik: member.ranting?.wilayah?.distrik?.nama` ke kedua `KtaCard`.
  - `KtaCard.tsx`: header memakai `normalizeDistrict(a.distrik)` →
    `DISTRIK KEUSKUPAN <hasil>`.
  - Test mapper (`api.test.ts`) memverifikasi distrik; test
    `district.test.ts` memverifikasi normalisasi/fallback.
- Flutter:
  - `MemberKta` (model) menambah field `distrik`; `MemberKta.from` mengisi
    dari `member.namaDistrik` dengan normalisasi + fallback yang sama.
  - `_KtaFront` header memakai `kta.distrik`.
  - Test unit baru `member_kta_test.dart` untuk normalisasi/fallback.

### 3. Latar halaman aplikasi (mobile, per akun)

- **Controller** `apps/mobile_flutter/lib/core/theme/app_background_controller.dart`:
  - `AppBackgroundController extends ChangeNotifier` dengan state
    `String? _userId` dan `String? imagePath` (null = tanpa latar).
  - `Future<void> loadForUser(String userId)` membaca
    `SharedPreferences` key `app_background_path:<userId>`; path yang filenya
    sudah tidak ada dianggap null.
  - `Future<void> setImage(String sourcePath)` menyalin file ke
    `<appSupport>/backgrounds/background-<userId>.<ext>`, menghapus file
    lama milik user itu, menyimpan path, dan `notifyListeners()`.
  - `Future<void> clear()` menghapus file + key preferensi user aktif.
  - `void reset()` (dipanggil saat logout) mengosongkan state tanpa menghapus
    file/preferensi, sehingga latar kembali saat user login lagi.
  - Nama file unik per pemilihan (timestamp) dan/atau `evict` cache gambar,
    agar memilih gambar baru dengan ekstensi sama tidak menampilkan bitmap
    lama.
  - Direktori dan `SharedPreferences` dapat di-inject untuk test.
- **Startup/auth** `main.dart`:
  - Buat controller bersama `ThemeController`, bungkus `MaterialApp.router`
    dengan `ChangeNotifierProvider.value`.
  - Di `BlocListener<AuthBloc>` yang sudah ada: `AuthAuthenticated` →
    `loadForUser(state.user.id)`; `AuthUnauthenticated` → `reset()`.
- **Pemasangan global** di `MaterialApp.builder`:
  - Hanya aktif bila `AuthBloc` berstatus `AuthAuthenticated` dan
    `imagePath != null`; selain itu render `child` seperti biasa.
  - Saat aktif: `Stack` berisi `Positioned.fill(Image.file(..., fit: cover,
    key: ValueKey(path)))`, scrim `Colors.black` alpha 0.25 (light) / 0.5
    (dark), lalu `Theme(data: theme.copyWith(
    scaffoldBackgroundColor: Colors.transparent), child: child)`.
  - Scrim membungkus seluruh konten agar teks tetap terbaca; card/dialog tetap
    memakai surface opak tema.
- **Transparansi layar biasa**: ganti latar penuh pada `forum_screen.dart` dan
  `forum_threads_screen.dart` dari `AppTheme.lightBackground/darkBackground`
  menjadi `Colors.transparent` (nilai visual sama saat tanpa background karena
  tema memakai warna tersebut).
- **Layar yang dikecualikan (tetap opak)**:
  - `qr_scan_screen.dart` — tetap memakai latar opak sendiri (kamera).
  - `kta_viewer_screen.dart` — sudah memakai `colorScheme.surface`.
  - `document_detail_screen.dart` — beri `backgroundColor` opak eksplisit
    (light/dark background) agar latar tidak tembus.
- **UI Pengaturan** `settings_screen.dart` bagian "Tampilan": `ListTile`
  "Latar Halaman" dengan subtitle status (nama file/"Tanpa latar") dan
  pratinjau kecil; membuka bottom sheet berisi:
  - tombol "Pilih dari Galeri" (`ImagePicker().pickImage(source: gallery,
    maxWidth: 2000, maxHeight: 2000, imageQuality: 85)`),
  - tombol "Hapus Latar" (jika ada),
  - pesan error via `showCenteredSnackBar` bila pemilihan/gagal simpan.
- **Test**: `app_background_controller_test.dart` dengan
  `SharedPreferences.setMockInitialValues` dan direktori temp untuk
  set/clear/persistensi; tanpa mengubah golden.

### 4. Avatar rounded rectangle

- Widget bersama baru `lib/presentation/widgets/member_avatar.dart`:
  `MemberAvatar` dengan `size`, `image` (`ImageProvider?`), `initials`,
  radius tetap 16; memakai `ClipRRect` + `BoxFit.cover`, fallback inisial.
- Dipakai di:
  - `widgets/home_app_bar.dart` (`_Avatar`, ukuran 48),
  - `screens/profile_screen.dart` (ukuran 96),
  - `screens/profile_edit_screen.dart` (ukuran 112, dukung file lokal +
    overlay loading),
  - `screens/settings_screen.dart` (avatar kecil di tile akun).
- `CircleAvatar`/`ClipOval` pada keempat lokasi dihapus; bentuk lain (forum,
  iuran, dsb.) tidak diubah.

## Verifikasi

- Web: `pnpm --filter @ths-thm/web typecheck`, vitest untuk
  `district.test.ts`, `api.test.ts`, dan test KTA terkait; eslint file berubah.
- Flutter: `flutter analyze`, `flutter test` (golden tetap), termasuk test
  controller latar dan `member_kta_test.dart`.
- Manual: set latar di Pengaturan → buka Beranda/Iuran/Forum/Profil/detail →
  latar terlihat, teks terbaca; kamera/scan QR, viewer KTA, dan detail dokumen
  tetap opak; hapus latar → kembali normal; logout → login tidak berlatar.
- Manual multi-akun: latar anggota A tidak muncul untuk anggota B di perangkat
  yang sama; latar A kembali saat A login lagi.
- KTA: header memakai distrik anggota; cek anggota dari distrik berbeda
  (web & mobile). Mikroteks belakang uppercase dan seukuran depan.

## Yang diserahkan ke builder

- Nama/ikon/teks persis pada bottom sheet latar.
- Komposisi pratinjau kecil pada ListTile.
- Nilai alpha scrim final bila hasil manual kurang nyaman.
- Struktur file test tambahan selama mengikuti pola repo.
- Skema nama file unik latar (timestamp/UUID) selama tetap per akun.
