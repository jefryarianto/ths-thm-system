# THS-THM Mobile Flutter

Aplikasi Flutter mandiri untuk migrasi bertahap aplikasi Expo di `C:\coding\ths-thm-system\apps\mobile`. Aplikasi lama tidak diubah oleh proyek ini.

## Cakupan tahap fondasi

- Login, penyimpanan token aman, pemulihan sesi, dan refresh token otomatis.
- Tema visual yang mengikuti token desain aplikasi mobile saat ini.
- Beranda, kartu digital dasar, dokumen, iuran, notifikasi, dan profil/logout.
- Terhubung ke REST API yang sama: `https://ths-thm.cloud/api`.

## Prasyarat

Pasang Flutter SDK (stable) dan pastikan perintah berikut tersedia:

```bash
flutter --version
```

## Menjalankan

```bash
cd C:\coding\ths-thm-system\apps\mobile-flutter
flutter create --platforms=android,ios .
flutter pub get
flutter analyze
flutter test
flutter run
```

Untuk API lokal pada Android emulator:

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:3001
```

Untuk perangkat fisik, gunakan alamat IP LAN komputer, misalnya `http://192.168.1.10:3001`.

## Instalasi berdampingan

Saat membuat konfigurasi native, gunakan ID yang berbeda dari Expo agar keduanya bisa terpasang bersamaan:

- Android: `org.thsthm.mobileflutter`
- iOS: `org.thsthm.mobileflutter`

Sesudah `flutter create`, ubah `applicationId` Android dan bundle identifier iOS ke nilai di atas. Jangan memakai `org.thsthm.mobile`, karena itu dipakai aplikasi Expo yang ada.

## Tahap berikutnya

Migrasi desain kartu digital lengkap (foto, QR, font, dan PDF), QR scanner, upload file/foto, FCM, serta halaman detail/edit dilaksanakan secara bertahap di proyek Flutter ini.
