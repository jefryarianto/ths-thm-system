# Mobile App — React Native (Expo)

Aplikasi mobile THS-THM untuk anggota dan penguji.

## Stack
- **Framework**: React Native (Expo SDK 50+)
- **Navigation**: Expo Router
- **State**: Zustand + React Query
- **UI**: NativeWind (Tailwind for RN)
- **QR**: expo-barcode-scanner / react-native-vision-camera
- **Push**: Firebase Cloud Messaging (FCM)
- **PDF**: react-native-pdf

## Struktur

```
src/
├─ screens/
│   ├─ auth/              # Login & register screen
│   ├─ members/           # Daftar anggota, profil detail
│   ├─ digital-card/      # Kartu anggota digital + QR
│   ├─ qr-scan/           # Scan QR code validasi dokumen
│   ├─ candidates/        # Daftar calon & seleksi (untuk admin mobile)
│   ├─ assessments/       # Input & lihat penilaian (penguji)
│   ├─ trainings/         # Jadwal latihan, absensi
│   ├─ documents/         # Lihat & download dokumen
│   ├─ dues/              # Status iuran & riwayat pembayaran
│   └─ notifications/     # Inbox notifikasi FCM
├─ components/
│   ├─ ui/                # Reusable UI (Card, Button, Badge, Input)
│   ├─ forms/             # Form components
│   └─ qr/                # QR display & scanner components
├─ navigation/            # Expo Router config
├─ hooks/                 # useAuth, useFCM, useQR, useNotifications
├─ services/              # API client (Axios), FCM service
└─ utils/                 # Helpers, formatters, validators
assets/
├─ images/                # Icons, logos, placeholder
└─ fonts/                 # Custom fonts
```

## Fitur Utama
- Kartu anggota digital dengan QR code
- Scan QR untuk validasi keaslian dokumen fisik
- Sertifikat & piagam digital
- Notifikasi push via FCM (reminder latihan, iuran, pendadaran)
- Input penilaian offline-capable (penguji)

## Quick Start

```bash
pnpm install
npx expo start
```