# CSV Template — Anggota

Template untuk import data anggota (termasuk import historis). Baris pertama harus header kolom; delimiter koma (`,`); encoding UTF-8.

> ⚠️ **PRAKONDISI**: Sebelum import anggota, struktur organisasi **distrik → wilayah → ranting** harus sudah dibuat/di-import terlebih dahulu (kolom `ranting_id` harus merujuk ranting yang valid di sistem). Baris tanpa `ranting_id` valid akan **ditolak** — NRA tidak bisa di-generate tanpa kode distrik/wilayah/ranting.

## Kolom

| Kolom            | Tipe   | Required | Deskripsi                                     |
| ---------------- | ------ | -------- | --------------------------------------------- |
| nia / nomor_anggota | string | opsional | Nomor lama (mis. `0103-001-1994` atau `001-1994`) |
| nama_lengkap     | string | ✅       | Nama lengkap                                   |
| jenis_kelamin    | enum   | ✅       | `L` / `P`                                      |
| ttl              | string |          | Format: `"Tempat, Tanggal"` (mis. `"Oebafok, 06 Juli 1983"`) |
| tempat_lahir     | string |          | Tempat lahir (jika kolom `ttl` kosong)         |
| tanggal_lahir    | date   |          | Tanggal lahir (YYYY-MM-DD)                     |
| tempat_dan_tahun_dadar | string |    | Format: `"Tempat - Tahun"` (mis. `"Lekunik - 1994"`) |
| tempat_dadar     | string |          | Tempat pendadaran (jika kolom di atas kosong)  |
| tahun_dadar      | number |          | Tahun pendadaran (4 digit)                     |
| alamat           | string |          | Alamat                                         |
| no_hp            | string |          | Nomor HP                                       |
| email            | string |          | Email                                          |
| foto             | string |          | Nama file foto                                 |
| tingkat          | string |          | Tingkatan                                      |
| ranting_id       | string | ✅       | ID ranting di sistem                           |

## Fitur Import Cerdas (Logika Parser)

Sistem memiliki parser cerdas untuk menangani data historis secara otomatis:

1.  **Parser TTL (Tempat & Tanggal Lahir)**:
    Jika Anda memiliki kolom `ttl` dengan format `"Kota, Tanggal Bulan Tahun"` (mis. `"Oebafok, 06 Juli 1983"`), sistem akan otomatis memisahkan tempat lahir dan mengubah tanggal ke format database.
2.  **Parser Pendadaran**:
    Jika Anda memiliki kolom `tempat_dan_tahun_dadar` (mis. `"Lekunik - 1994"`), sistem akan otomatis memecahnya menjadi tempat dan tahun pendadaran secara terpisah.
3.  **Parser Nomor Anggota (NIA/NRA)**:
    NRA di-generate otomatis oleh sistem dengan format: `[kode_distrik]-[kode_wilayah][kode_ranting]-[urut]-[tahun]`.
    - Jika kolom `nia` atau `nomor_anggota` diisi (mis. `0103-001-1994`), sistem otomatis menyesuaikan kode distrik/wilayah/ranting berdasarkan `ranting_id` tempat Anda meng-import, namun mempertahankan nomor urut dan tahunnya.

## Contoh Template Historis

Lihat file: `template_csv_anggota_historis.csv` untuk contoh penggunaan kolom gabungan.
