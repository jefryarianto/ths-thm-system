# Signature — Komponen Tanda Tangan Digital

Komponen JSX untuk merender tanda tangan digital di dokumen PDF.

## Props

| Prop      | Tipe   | Deskripsi                  |
| --------- | ------ | -------------------------- |
| imageUrl  | string | URL gambar tanda tangan    |
| name      | string | Nama penandatangan         |
| role      | string | Jabatan                    |
| date      | string | Tanggal (DD/MM/YYYY)       |
| width     | number | Lebar gambar (default 150) |

## Contoh

```tsx
<SignatureBlock
  imageUrl="https://cdn.ths-thm.org/signatures/ketua.png"
  name="Dr. H. Ahmad Fauzi"
  role="Ketua THS-THM"
  date="15 Maret 2025"
/>
```