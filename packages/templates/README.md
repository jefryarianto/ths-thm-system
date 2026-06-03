# JSX Templates — Dokumen THS-THM

Kumpulan JSX template untuk generate dokumen THS-THM.
Ditulis dalam JSX/TSX dan dirender ke PDF menggunakan `@react-pdf/renderer` di backend.

## Struktur

```
templates/
├─ cards/                     # Template kartu anggota
│   ├─ front.tsx              #   Sisi depan (foto, nama, ID)
│   ├─ back.tsx               #   Sisi belakang (QR, info)
│   └─ README.md
├─ certificates/              # Template sertifikat
│   ├─ graduation.tsx         #   Sertifikat kelulusan/pendadaran
│   ├─ training.tsx           #   Sertifikat pelatihan
│   └─ README.md
├─ awards/                    # Template piagam
│   ├─ achievement.tsx        #   Piagam prestasi
│   └─ README.md
└─ components/
    ├─ signature/             # Komponen tanda tangan digital
    │   ├─ SignatureBlock.tsx #   Render tanda tangan + nama + jabatan
    │   └─ README.md
    ├─ stamp/                # Komponen cap/stempel
    │   ├─ StampOverlay.tsx   #   Render stempel transparan overlay
    │   └─ README.md
    └─ qr-code/              # Komponen QR code validasi
        ├─ QRValidation.tsx  #   Render QR code + URL verifikasi
        └─ README.md
```

## Konfigurasi Tanda Tangan & Stempel

Setiap template menerima props:
```tsx
interface SignatureConfig {
  imageUrl: string;        // URL gambar tanda tangan
  name: string;            // Nama penandatangan
  role: string;            // Jabatan
  date: string;            // Tanggal penandatanganan
}

interface StampConfig {
  imageUrl: string;        // URL gambar stempel
  opacity?: number;        // Transparansi (default 0.4)
  position?: 'top-right' | 'bottom-left';
}

interface QRConfig {
  verificationUrl: string; // URL endpoint verifikasi
  size?: number;           // Ukuran QR (default 100)
}
```

## Cara Generate

```bash
# Di apps/api
POST /api/documents/generate
{
  "type": "member_card",
  "memberId": "...",
  "signature": { ... },
  "stamp": { ... },
  "qr": { verificationUrl: "https://ths-thm.org/verify/..." }
}
```