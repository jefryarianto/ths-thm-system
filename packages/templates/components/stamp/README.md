# Stamp — Komponen Cap/Stempel

Komponen JSX untuk merender cap/stempel organisasi di dokumen PDF.
Stempel dirender sebagai overlay semi-transparan.

## Props

| Prop      | Tipe    | Deskripsi                                    |
| --------- | ------- | -------------------------------------------- |
| imageUrl  | string  | URL gambar stempel (PNG transparan)          |
| opacity   | number  | Transparansi (0.0 - 1.0, default 0.35)       |
| size      | number  | Ukuran stempel dalam px (default 150)        |
| position  | enum    | 'top-right' | 'bottom-left' | 'center'     |

## Contoh

```tsx
<StampOverlay
  imageUrl="https://cdn.ths-thm.org/stamps/organization.png"
  opacity={0.35}
  size={160}
  position="top-right"
/>
```