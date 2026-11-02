# Paket implementasi KTA THS–THM untuk React + Next.js

Paket ini adalah **starter integrasi**, bukan aplikasi lengkap atau sambungan otomatis ke database/website verifikasi. Berisi komponen React/TypeScript, aset desain dua sisi, data contoh, tombol cetak/PDF dan panduan integrasi. Contoh ditujukan untuk Next.js **App Router**; pengguna Pages Router dapat mengimpor komponen yang sama dari halaman React.

## Isi

```text
components/kta/
  KtaPreview.tsx           komponen + tipe MemberKta
  KtaPreview.module.css    layout preview dan cetak
public/kta/
  depan.svg, belakang.svg  artwork dasar dengan bleed (teks data tidak dibenamkan)
  DejaVuSans*.ttf          font untuk data anggota
  foto-contoh.png          foto placeholder dari contoh desain
  qr-contoh.png            QR contoh dengan tujuan asli dari kartu sumber
  LICENSE-DejaVu.txt       lisensi font
examples/
  page.tsx                 contoh halaman Next.js App Router
  export-pdf.mjs           contoh export lokal dengan Playwright (opsional)
  normalize-pdf.mjs        normalisasi ukuran & box PDF dengan pdf-lib (opsional)
referensi/
  Desain_Acuan_KTA.pdf     referensi desain dua sisi dan 2 mm bleed
```

**Privasi:** Contoh memuat nama dan foto contoh yang disediakan, serta QR asli. Jangan deploy atau bagikan data contoh ini di situs publik tanpa izin. Foto contoh tidak boleh dianggap sebagai foto asli anggota. Alamat pada contoh adalah simulasi; tanggal, pekerjaan, status dan pelantikan belum diisi.

## Pemasangan

1. Salin `components/kta` ke `components/kta` di root proyek Next.js Anda.
2. Salin `public/kta` ke `public/kta`. File font pada CSS menggunakan URL `/kta/...`; jika proyek menggunakan `basePath` atau CDN, sesuaikan URL font di CSS. Prop `assetsBasePath` mengubah lokasi **SVG**; ia tidak mengubah URL font.
3. Untuk mencoba, salin `examples/page.tsx` ke `app/kta-contoh/page.tsx`, jalankan proyek Anda lalu buka `/kta-contoh`. Komponen hanya memerlukan React/Next.js dan browser modern; tidak perlu pustaka UI tambahan.
4. Ganti objek contoh dengan data dari database Anda. Halaman harus terlindungi oleh autentikasi dan pemeriksaan hak akses di server. Pastikan URL foto dan QR bisa dimuat oleh browser, termasuk ketika memakai URL terlindungi atau sementara.

Contoh pemakaian:

```tsx
import { KtaPreview, type MemberKta } from '../../components/kta/KtaPreview';

// Ambil data melalui akses server Anda dan petakan ke MemberKta.
const member: MemberKta = {
  nomorAnggota: '...', namaLengkap: '...', jenisKelamin: 'L', ranting: '...',
  fotoUrl: '/api/foto-anggota/...', qrImageUrl: '/api/qr-anggota/...', tingkat: 'MUDA',
  tempatLahir: '...', tanggalLahir: '6 JULI 1983', alamat: '...',
  namaKoordinator: 'E. HENDRIKUS MASAN BEDA',
};
// Di JSX: <KtaPreview member={member} />
```

URL dalam contoh pemakaian di atas hanya ilustrasi—endpoint tersebut **harus dibuat/dihubungkan sendiri**. Gunakan `import` yang sesuai dengan struktur proyek atau alias `@/` milik Anda.

## Data dan perilaku desain

- Semua tanggal adalah **string tampilan**, bukan objek `Date`: formatkan dari database terlebih dahulu (misalnya `6 JULI 1983`) dengan aturan zona waktu aplikasi Anda. Bagian yang sesuai ditampilkan dalam huruf kapital.
- `pelantikanTanggal` digunakan bila tersedia; bila kosong, `pelantikanTahun` digunakan. Keduanya kosong menampilkan placeholder. Jangan menyamakan tanggal/tahun Dadar dengan pelantikan.
- `jenisKelamin` hanya `L` atau `P`. Di belakang, kode ditempatkan **9 mm setelah akhir nama**, bukan di kolom tetap. Di depan label JK tetap ada seperti desain terakhir.
- `tingkat`: PRATAMA 1 biru, TAMTAMA 2 biru, MUDA 1 kuning, MADYA 2 kuning, UTAMA 3 kuning.
- Ranting dan alamat dibungkus hingga 3 baris. Nama dan data lain dapat mengecil sampai batas minimum. Jika masih terlalu panjang, peringatan tampil dan tombol cetak dinonaktifkan; data **tidak dipotong diam-diam**. Pencetakan browser langsung lewat Ctrl+P tidak bisa sepenuhnya dicegah—validasi lagi pada alur produksi.
- `tandaTanganUrl` opsional: hanya isi dengan gambar tanda tangan yang memang berwenang digunakan. Placeholder stempel tidak dibuat.
- Pratinjau memakai sudut membulat. Kedua sisi cetak menggunakan persegi penuh dengan bleed; guilloche ada di tepi bawah. Aset dasar SVG memuat gambar dan elemen tetap, sedangkan foto, QR, data, garis tingkat dan nama koordinator ditempatkan oleh komponen.
- SVG dan foto mungkin perlu disesuaikan dengan kebijakan Content Security Policy proyek Anda. Perlakukan `assetsBasePath`, foto dan URL QR sebagai data tepercaya/tervalidasi.

## QR anggota — wajib diintegrasikan

`qrImageUrl` harus menunjuk ke **gambar QR anggota tersebut**, berisi URL verifikasi yang benar pada website Anda. `qr-contoh.png` hanya untuk kartu contoh dan mempertahankan tujuan QR kartu sumber; jangan gunakan QR contoh untuk semua anggota.

Paket ini **tidak** membuat QR dinamis, tidak memanggil database, dan tidak mengubah sistem verifikasi. Hubungkan generator QR Anda sendiri; untuk menyamai referensi, pertahankan desain mata/modul, warna, logo tengah dan zona putih. Pastikan URL hasil decode sama dengan URL anggota yang dimaksud. Uji cetak dan pindai dengan beberapa ponsel; gambar beresolusi tinggi tidak menjamin hasil fisik berhasil. Jangan menaruh data pribadi sensitif langsung ke payload QR. Jangan kirim URL/token ke layanan pihak ketiga tanpa meninjau kebijakan privasi.

## Cetak/PDF

- Cetak pada halaman khusus yang hanya memuat komponen ini, tanpa header/nav/padding aplikasi. Tombol menyembunyikan kontrol ketika dicetak.
- Pengaturan target: **85,6 × 53,98 mm** setelah potong; **2 mm bleed** tiap sisi; halaman dengan bleed **89,6 × 57,98 mm**. Cetak ukuran aktual (100%), margin printer tidak ditambahkan dan background graphics aktif.
- `@page` mengatur ukuran, tetapi browser/printer dapat membulatkan dimensi atau mengabaikan pengaturan. PDF browser umumnya belum memiliki TrimBox/BleedBox seperti yang dibutuhkan percetakan. Periksa ukuran, bleed, orientasi, jumlah halaman dan box PDF dengan alat PDF/percetakan.
- Bila menggunakan Chromium: instal Playwright dan browsernya, jalankan `examples/export-pdf.mjs` dari lingkungan yang dapat mengakses halaman. Jalankan hanya terhadap URL yang Anda percayai; jika membuat endpoint server, cegah SSRF dan tegakkan otorisasi, dan jangan lewatkan rahasia ke proses yang tidak tepercaya. Jika halaman privat, integrasikan sesi server dengan cara yang sesuai aplikasi.
- `examples/normalize-pdf.mjs` menggunakan `pdf-lib` untuk memperbaiki pembulatan dimensi Chromium dengan penskalaan sangat kecil serta menetapkan MediaBox, CropBox, BleedBox dan TrimBox. Install `pdf-lib` dahulu. **Verifikasi ulang hasil dan minta persetujuan percetakan.** Skrip hanya cocok untuk PDF dua halaman dari template ini, bukan PDF sembarang.

Contoh lokal (jalankan dari root proyek, sesuaikan lokasi file):

```bash
npm install -D playwright
npx playwright install chromium
npm install pdf-lib
node examples/export-pdf.mjs http://localhost:3000/kta-contoh hasil-browser.pdf
node examples/normalize-pdf.mjs hasil-browser.pdf kartu-cetak.pdf
```

Uji sampel fisik untuk keterbacaan 4–5 pt dan mikroteks 2,6 pt, warna, ukuran, pemotongan dan QR. Guilloche/mikroteks di sini adalah elemen visual; paket ini tidak menjanjikan perlindungan keamanan cetak atau integrasi anti-pemalsuan.
