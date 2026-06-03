# QR Code — Komponen QR Validasi

Komponen JSX untuk merender QR code di dokumen PDF yang bisa di-scan untuk verifikasi keaslian.

## Props

| Prop             | Tipe    | Deskripsi                              |
| ---------------- | ------- | -------------------------------------- |
| verificationUrl  | string  | URL endpoint verifikasi                |
| size             | number  | Ukuran QR dalam px (default 100)       |
| label            | string  | Teks di bawah QR (default "Scan QR")   |

## Alur Validasi

1. QR code dirender di dokumen PDF → berisi URL verifikasi unik
2. User scan QR menggunakan mobile app → buka URL
3. Backend endpoint `GET /api/documents/:id/verify-qr` → return status dokumen
4. Mobile app menampilkan status: VALID / EXPIRED / REVOKED

## Contoh

```tsx
<QRValidation
  verificationUrl="https://api.ths-thm.org/api/documents/DOC-2025-001/verify-qr"
  size={120}
  label="Scan untuk verifikasi keaslian"
/>
```