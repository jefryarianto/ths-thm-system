# THS-THM Mobile App (Flutter Version)

Aplikasi Flutter paralel dari aplikasi mobile React Native (Expo) untuk THS-THM,
memakai backend API yang sama (NestJS di `apps/api`) tanpa perubahan backend.

## Prasyarat

- Flutter SDK (>=3.4.0). Verifikasi: `flutter --version` (Flutter 3.44 / Dart 3.12 teruji).
- Emulator Android / iOS atau perangkat fisik.
- Backend API berjalan: `pnpm dev:api` (port 3001).

## Menjalankan

```bash
# dari root monorepo
pnpm dev:mobile_flutter

# atau langsung:
cd apps/mobile_flutter
flutter pub get
flutter run
```

### Base URL API

Default = `http://10.0.2.2:3001/api` (local host dari emulator Android).

- **Emulator Android**: sudah benar secara default.
- **iOS Simulator / Desktop / Web**: `flutter run --dart-define=API_URL=http://localhost:3001/api`
- **Perangkat fisik**: isi dengan IP LAN komputer Anda:
  `flutter run --dart-define=API_URL=http://192.168.x.x:3001/api`

Anda juga bisa mengatur lewat variabel env `API_URL` saat build.

## Struktur Proyek

```
lib/
├── core/
│   ├── api/api_client.dart         # Dio singleton + interceptors (auth header & 401 refresh single-flight)
│   ├── constants/app_constants.dart
│   ├── theme/app_theme.dart
│   └── utils/formatters.dart       # rupiah, tanggal, ekstraksi token QR
├── data/models/                    # User, Member, Due, Document, NotificationItem
├── logic/                          # Blocs: Auth, Member, Dues, Document, Notification
└── presentation/
    ├── main_shell.dart             # Bottom navigation 5 tab
    └── screens/                    # login, home, kta, dues, qr-scan, documents,
                                    # document_detail, notifications, profile, settings,
                                    # forgot-password, force-change-password
```

## Fitur

- [x] Login (email/nomor anggota & password) + lupa password
- [x] Paksa ganti password saat `mustChangePassword`
- [x] Refresh token otomatis (single-flight) & logout
- [x] Home dengan menu grid + greeting
- [x] KTA Digital (profil anggota + QR code)
- [x] Iuran (daftar, status, rincian)
- [x] Scan QR: verifikasi dokumen, check-in kegiatan, cari anggota + riwayat scan
- [x] Dokumen (daftar, detail, download/buka file, QR code)
- [x] Notifikasi (filter, baca semua, hapus)
- [x] Profil + Pengaturan (ubah password, keluar)

## Pengujian

```bash
cd apps/mobile_flutter
flutter analyze
flutter test
```

## Catatan Platform

- `android/` & `ios/` di-generate dengan `flutter create --platforms=android,ios .`
- Package ID paralel: `org.thsthm.mobile.flutter` (tidak bentrok dengan Expo `org.thsthm.mobile`).
- Android `minSdk 23` (kebutuhan `flutter_secure_storage` v9 & `mobile_scanner`).
- Notifikasi push memakai `firebase_messaging`; tambahkan `google-services.json` dari
  project Firebase Anda bila push aktif. Tanpa file tersebut, fitur lainnya tetap berjalan.