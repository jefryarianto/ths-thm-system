# Paket template KTA THS–THM — React / Next.js

Paket ini berisi gambar latar kosong dari rancangan terakhir serta aplikasi contoh dan komponen React untuk menambahkan data sebagai lapisan terpisah. File latar **tidak berisi teks, label, data, lambang, foto, QR, tanda tingkatan, tanda tangan, maupun mikroteks**. Yang tersisa adalah latar/header, motif silat, garis kuning depan, peta Indonesia bertitik dan guilloche.

## Isi utama

- `hasil-template/Background_Depan_Tanpa_Teks_600dpi.png` dan `Background_Belakang_Tanpa_Teks_600dpi.png`: gambar persegi panjang area potong, 2022 × 1275 px, metadata 600 dpi.
- `hasil-template/Background_*_Sudut_Bulat.png`: latar yang sama dengan sudut transparan, untuk tampilan digital.
- `hasil-template/KTA_Background_Kosong_CR80_2mm_Bleed.pdf`: dua halaman persegi panjang, media 89,6 × 57,98 mm, bleed 2 mm, trim 85,6 × 53,98 mm. Tidak ada tulisan; bagian lengkung adalah bentuk potong, bukan area yang dihapus dari PDF.
- `public/kta/background/`: salinan PNG yang dipakai komponen. `public/kta/logo.png` dan `public/kta/fonts/` adalah **aset lapisan terpisah**, bukan bagian gambar latar. Logo memang mengandung tulisan asli pada lambang.
- `components/KtaCard.tsx`: komponen SVG dua sisi; `components/types.ts` tipe data; `components/exportPng.ts` ekspor PNG; `components/kta-fonts.css` font yang diperlukan.
- `app/`: aplikasi contoh Next.js lengkap dengan formulir dan tombol unduh. `examples/PasangDiWebsite.tsx`: contoh komponen yang menerima data dari aplikasi Anda.

## Menjalankan contoh

Persyaratan: Node.js **20.9 atau lebih baru** dan npm. Next.js pada paket ini diuji dengan Node 20.20.2.

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Untuk build produksi: `npm run build`, lalu `npm start`. Data yang dimasukkan pada contoh hanya berada di state browser; tidak dikirim atau disimpan oleh aplikasi ini. URL `example.org` hanyalah contoh, bukan layanan verifikasi aktif.

## Integrasi ke website Next.js Anda

1. Salin folder `components/` dan `public/kta/` ke proyek Anda. Jika perlu, ubah path impor pada contoh.
2. Instal `qrcode` dan, jika menggunakan TypeScript, `@types/qrcode`:

   ```bash
   npm install qrcode
   npm install -D @types/qrcode
   ```

3. Impor `components/kta-fonts.css` sekali pada root `app/layout.tsx` (atau root React Anda). Default URL font adalah `/kta/fonts/...`.
4. Salin atau adaptasi `examples/PasangDiWebsite.tsx`, lalu berikan objek `Anggota` dari API/database Anda. Contoh:

   ```tsx
   import { PasangDiWebsite } from '@/examples/PasangDiWebsite';
   import type { Anggota } from '@/components/types';

   const anggota: Anggota = {
     nama: 'NAMA ANGGOTA', jenisKelamin: 'L', nomor: 'NOMOR-001',
     tempatDadar: 'LEKUNIK', tahunDadar: '1994', ranting: 'NAMA RANTING',
     tingkatan: 'tamtama', berlakuSampai: '2031-10',
     fotoUrl: '/foto-anggota.png',
     verifyUrl: 'https://domain-anda.example/verify/token-anggota',
     tempatTanggalLahir: 'TEMPAT, 6 JULI 1983', pekerjaan: 'PEKERJAAN',
     status: 'AKTIF', alamat: 'ALAMAT ANGGOTA', tahunPelantikan: '2024',
     tanggalTerbit: '6 JULI 2024'
   };
   export default function Page() { return <PasangDiWebsite anggota={anggota}/>; }
   ```

   Contoh URL di atas bukan endpoint nyata. Aplikasi Anda harus menyediakan URL/token verifikasi yang benar untuk setiap anggota. Berikan string tanggal yang sudah diformat untuk tanggal lahir, pelantikan dan tanggal terbit. `berlakuSampai` berformat `YYYY-MM` dan ditampilkan sebagai `MM/YY`; jika kosong, ditampilkan `MM/YY`.
5. Integrasi pada React non-Next juga dimungkinkan; gunakan bundler yang mendukung TSX dan sajikan `public/kta/` pada `/kta/`. Komponen adalah client-side. `assetBase` dapat diganti, tetapi URL font dalam `kta-fonts.css` harus diubah agar sesuai.

## QR dan data

- `qrImageUrl` (opsional) diprioritaskan; gunakan untuk QR bergaya referensi/QRCode Monkey milik anggota masing-masing. Gambar harus memiliki ruang putih (quiet zone) sendiri dan tidak boleh tertukar antaranggota.
- Jika hanya `verifyUrl` yang diberikan, komponen membuat QR **standar bermodul kotak**, gradien biru, ECC H, quiet zone empat modul dan logo tengah. Ini bukan reproduksi persis gaya `pointed-smooth`/`frame2`/`ball2` pada QR contoh. QR dibuat lokal di browser; komponen ini tidak menghubungi situs verifikasi dan tidak membuktikan status keanggotaan.
- Ukuran karya QR sekitar **18,5 × 18,5 mm termasuk quiet zone**. Keterbacaan bergantung pada panjang URL, resolusi layar, kamera, ukuran tampilan dan kualitas gambar. Uji URL dan seluruh variasi pada perangkat sebenarnya. Jika pemindaian dari kartu kecil sulit, tampilkan QR terpisah yang diperbesar; jangan anggap hasil uji digital sebagai jaminan cetak.
- Tidak ada database, login, kontrol akses, penerbitan token, API verifikasi, atau sinkronisasi server dalam paket ini. Implementasikan dan amankan pada website Anda. Jangan menaruh rahasia dalam URL QR.

## Aturan tata letak

- `pratama`: 1 biru; `tamtama`: 2 biru; `muda`: 1 kuning; `madya`: 2 kuning; `utama`: 3 kuning. Sabuk putih selebar foto dan tinggi masing-masing garis 1,5 mm.
- Foto 24 × 30 mm. Data Ranting dapat dibungkus sampai tiga baris, alamat belakang sampai tiga baris; nama dan data yang terlalu panjang diperkecil sampai batas minimum. Bila masih tidak muat, callback `onWarnings` memberi peringatan dan **contoh aplikasi menonaktifkan ekspor**; jangan mengabaikan peringatan dalam integrasi Anda.
- Kode L/P di depan mengikuti nama. Di belakang ada ruang minimal 9 mm setelah nama pada area yang diukur; nama yang terlalu panjang harus disesuaikan. Nilai gender tidak wajib dan tidak diberi label JK di depan.
- `tanggalPelantikan` diprioritaskan; jika kosong, `tahunPelantikan` digunakan; jika keduanya kosong, tampil placeholder. Tahun Dadar **tidak** digunakan sebagai pengganti tahun pelantikan.
- Tanda tangan opsional menerima `tandaTanganUrl`; tidak ada gambar tanda tangan palsu. Baris tanda tangan menyesuaikan lebar nama koordinator. Alamat dan data contoh pada formulir bukan data sebenarnya.

## Ekspor, foto, CORS dan cetak

- Tombol ekspor membuat PNG 2022 × 1275 px dengan sudut transparan, setara ukuran CR80 pada sekitar 600 dpi. Canvas browser tidak selalu menyimpan metadata DPI; tetapkan ukuran fisik saat impor ke perangkat lunak cetak.
- Ekspor menyematkan font dan gambar sebelum merasterisasi SVG. Gunakan URL satu origin, data URI, blob URL, atau URL yang mengizinkan CORS. URL gambar remote tanpa CORS akan membuat ekspor gagal dengan pesan kesalahan. Untuk foto/tanda tangan, demo menerima unggahan lokal hingga 10 MB; foto dipotong proporsional (`cover`).
- Tombol cetak adalah **kemudahan browser**, bukan PDF cetak dengan bleed. Hasil ukuran halaman browser/printer dapat dibulatkan (uji Chromium menghasilkan sekitar 85,68 × 54,02 mm). Untuk cetak gunakan ukuran sebenarnya/100%, aktifkan latar, matikan fit-to-page, dan lakukan uji fisik serta duplex. PDF latar kosong terpisah memiliki trim dan bleed tetapi belum berisi data dinamis.
- Uji pada browser dan resolusi website Anda. Latar peta berupa siluet dekoratif Natural Earth, bukan batas administratif resmi. Font DejaVu disertai lisensi pada `public/kta/fonts/LICENSE-DejaVu.txt`; penggunaan motif dan logo mengikuti hak yang Anda miliki.

## Pengujian paket

Build Next.js dan pemeriksaan TypeScript berhasil. Pengujian browser dilakukan untuk lima tingkatan, nama panjang, Ranting tiga baris, kode P, fallback tahun pelantikan, layar 375 px, ekspor depan/belakang, QR otomatis dan QR gambar yang diberikan. QR otomatis berhasil didekode dari PNG contoh; QR khusus contoh juga cocok dengan data asal. Ini tidak menjamin keterbacaan QR lain atau hasil cetak fisik.
