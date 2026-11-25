# Aktifkan Ajukan KTA di Mobile Design

## Context

Endpoint pengajuan KTA dan halaman `/kta/apply` sudah tersedia, tetapi mobile belum menampilkan jalur masuk yang jelas dari beranda. `KtaStatusBanner` sudah dibuat tetapi tidak dipasang dan masih memakai `Navigator.pushNamed`, padahal aplikasi memakai `go_router`.

## Goals

- Tampilkan tombol “Ajukan KTA” di beranda hanya untuk anggota yang belum memiliki kartu terbit dan tidak memiliki pengajuan aktif.
- Tampilkan “Lihat Status” jika ada pengajuan aktif.
- Sembunyikan banner jika kartu sudah terbit atau data belum cukup untuk mengambil keputusan.

## Decisions

- Sumber keputusan: `KtaApplicationBloc` dan `MemberBloc.cardData.generated`.
- Kartu aktif didefinisikan sebagai `generated == true`; status keanggotaan umum tidak dipakai.
- Pengajuan aktif adalah semua status kecuali tidak ada pengajuan, `rejected`, dan `cancelled`.
- `approved` dan `cardGenerated` dianggap tidak eligible untuk “Ajukan KTA”.
- Banner dipasang di `_KtaSection` pada `home_screen.dart`.
- Prompt “Generate” lama di beranda dihapus agar tidak ada dua CTA KTA; tombol Generate tetap tersedia di halaman `/kta`.
- Navigasi memakai `context.push('/kta/apply')` dan `context.push('/kta/status')`.
- Tidak ada perubahan API, tidak ada perubahan fitur klaim anggota, tidak ada dependency baru.

## Behavior

| Card `generated` | KTA state | Tampilan beranda |
| --- | --- | --- |
| `false` | tidak ada pengajuan / `rejected` / `cancelled` | “Ajukan KTA” → `/kta/apply` |
| `false` | pengajuan aktif | “Lihat Status” → `/kta/status` |
| `false` | `approved` / `cardGenerated` | banner tersembunyi |
| `true` | apa pun | banner tersembunyi |
| `null` | apa pun | banner tersembunyi |
| apa pun | loading / error | banner tersembunyi |

## Test Strategy

- Unit test resolver visibilitas untuk semua kombinasi status.
- Widget test banner untuk teks CTA, status, dan route go_router.
- Widget test beranda untuk memastikan banner tampil dan prompt Generate lama tidak tampil.
- Verifikasi penuh: `flutter test`, `flutter analyze`, format, dan `git diff --check`.
