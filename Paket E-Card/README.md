# Integrasi KTA ke proyek React / Next.js

Paket integrasi lengkap ini berisi komponen dari desain terakhir: garis gold di bawah kedua header, peta bertitik, guilloche dan mikroteks depan **PRO PATRIA ET ECCLESIA**. Mikroteks merupakan lapisan komponen; gambar latar tetap tanpa tulisan, data, logo, foto, QR, tanda tingkatan, atau tanda tangan.

## Isi ZIP

- `components/kta/`: komponen kartu, tipe data, pengaturan teks, ekspor PNG dan CSS font.
- `public/kta/background/`: dua latar PNG tanpa teks (depan dan belakang).
- `public/kta/logo.png` dan `public/kta/fonts/`: aset terpisah untuk komponen, termasuk lisensi font.
- `examples/PasangDiWebsite.tsx`: contoh komponen untuk menerima objek data anggota.
- `preview/`: gambar preview kartu dua sisi dan preview latar kosong. Preview kartu memakai data dan foto simulasi; jangan ikut publikasikan sebagai data anggota sebenarnya.
- `template/Background_Kosong_CR80_2mm_Bleed.pdf`: latar kosong dua sisi dengan trim CR80 dan bleed 2 mm.

ZIP ini **tidak** berisi atau menimpa `app/`, `package.json`, konfigurasi Next.js, database atau API proyek Anda.

## Cara memasang

1. Ekstrak ZIP. Salin folder `components/kta/` ke `components/kta/` proyek dan gabungkan folder `public/kta/` ke `public/kta/` proyek. Jika proyek menggunakan folder `src/`, komponen dapat diletakkan di `src/components/kta/`. Periksa dan cadangkan folder `kta` jika nama tersebut sudah digunakan.
2. Instal dependensi di proyek Anda:

   ```bash
   npm install qrcode
   npm install -D @types/qrcode
   ```

3. Impor `kta-fonts.css` sekali pada root aplikasi. Contoh Next.js dengan komponen di folder `components/`:

   ```tsx
   // app/layout.tsx
   import '../components/kta/kta-fonts.css';
   ```

   Sesuaikan path jika menggunakan `src/`. Font dan gambar default dibaca dari `/kta/`.
4. Salin/adaptasi `examples/PasangDiWebsite.tsx`; sesuaikan jalur impor dengan proyek Anda. Contoh pemakaian:

   ```tsx
   import { PasangDiWebsite } from '@/examples/PasangDiWebsite';
   import type { Anggota } from '@/components/kta/types';

   const data: Anggota = {
     nama: 'NAMA ANGGOTA', jenisKelamin: 'L', nomor: 'NOMOR-001',
     tempatDadar: 'TEMPAT', tahunDadar: '2024', ranting: 'NAMA RANTING',
     tingkatan: 'tamtama', berlakuSampai: '2031-10',
     fotoUrl: '/foto-anggota.png',
     verifyUrl: 'https://domain-anda.example/verify/token-anggota',
     tempatTanggalLahir: 'TEMPAT, TANGGAL LAHIR',
     pekerjaan: 'PEKERJAAN', status: 'AKTIF', alamat: 'ALAMAT ANGGOTA',
     tahunPelantikan: '2024', tanggalTerbit: 'TANGGAL TERBIT'
   };

   export default function Page() { return <PasangDiWebsite anggota={data} />; }
   ```

   Ganti nilai contoh dan URL dengan data dari sistem Anda. URL di atas bukan endpoint aktif. Komponen bersifat client-side; contoh sudah menggunakan `'use client'`. Anda dapat mengimpor `KtaCard` dan `downloadCardPng` secara langsung jika tidak memakai contoh.

## Aturan penting

- `berlakuSampai`: string `YYYY-MM`, ditampilkan sebagai `MM/YY`; kosong menghasilkan placeholder. `tanggalPelantikan` diprioritaskan, lalu `tahunPelantikan`; tahun Dadar tidak digunakan sebagai pengganti pelantikan.
- Tingkatan: `pratama` 1 biru, `tamtama` 2 biru, `muda` 1 kuning, `madya` 2 kuning, `utama` 3 kuning.
- Ranting dan alamat dapat hingga tiga baris. Callback `onWarnings` memberi tahu jika data tidak muat; contoh menonaktifkan ekspor ketika ada peringatan.
- `qrImageUrl` opsional untuk gambar QR per anggota yang sudah memiliki gaya referensi dan quiet zone. Jika hanya `verifyUrl` diberikan, komponen membuat QR standar bermodul kotak, ECC H, gradien dan logo; hasilnya bukan gaya pointed-smooth yang persis sama dengan gambar referensi. Gambar QR yang diberikan harus sesuai dengan anggota yang bersangkutan.
- Foto, QR gambar dan tanda tangan harus berupa data URI, blob URL, URL satu origin, atau URL yang mengizinkan CORS agar ekspor PNG dapat dilakukan. `tandaTanganUrl` bersifat opsional.
- Ekspor menghasilkan PNG 2022 × 1275 piksel dengan sudut transparan, setara CR80 pada sekitar 600 dpi; metadata DPI browser belum tentu tersimpan. Uji QR pada ukuran tampilan dan perangkat nyata. Mikroteks 2,6 pt dekat tepi bawah perlu uji keterbacaan dan toleransi potong bila dicetak.
- Paket tidak menyediakan database, login, penerbitan token, endpoint verifikasi atau otorisasi. QR dari URL tidak membuktikan status keanggotaan. Integrasikan serta amankan fungsi tersebut dalam proyek Anda.

Komponen dan ekspor diuji pada contoh Next.js 16 / React 19: build TypeScript, lima tingkatan, Ranting tiga baris, nama panjang, QR otomatis, QR gambar, layar kecil dan ekspor PNG. Hasil cetak dan setiap QR nyata tetap perlu diuji.
