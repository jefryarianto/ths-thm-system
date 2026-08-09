# CSV Template — Anggota

Template untuk import data anggota (termasuk import historis). Baris pertama harus header kolom; delimiter koma (`,`); encoding UTF-8.

> ⚠️ **PRAKONDISI**: Sebelum import anggota, struktur organisasi **distrik → wilayah → ranting** harus sudah dibuat/di-import terlebih dahulu (kolom `ranting_id` harus merujuk ranting yang valid di sistem). Baris tanpa `ranting_id` valid akan **ditolak** — NRA tidak bisa di-generate tanpa kode distrik/wilayah/ranting.

## Kolom

| Kolom            | Tipe   | Required | Deskripsi                                     |
| ---------------- | ------ | -------- | --------------------------------------------- |
| nomor_anggota    | string | opsional | Nomor lama dari sistem/arsip (mis. `001-1994`) |
| nama_lengkap     | string | ✅       | Nama lengkap                                   |
| jenis_kelamin    | enum   | ✅       | `L` / `P`                                      |
| tempat_lahir     | string |          | Tempat lahir                                   |
| tanggal_lahir    | date   |          | Tanggal lahir (YYYY-MM-DD)                     |
| tempat_dadar     | string |          | Tempat pendadaran                              |
| tahun_dadar      | number |          | Tahun pendadaran (4 digit)                     |
| alamat           | string |          | Alamat                                         |
| no_hp            | string |          | Nomor HP                                       |
| email            | string |          | Email                                          |
| foto             | string |          | Nama file foto                                 |
| tingkat          | string |          | Tingkatan                                      |
| ranting_id       | string | ✅       | ID ranting di sistem                           |

## Format Nomor Anggota (NRA)

NRA di-generate otomatis oleh sistem dengan format:

```
[kode_distrik]-[kode_wilayah][kode_ranting]-[urut]-[tahun]
```

Contoh: `LRT-0103-001-1994` → distrik `LRT` (Keuskupan Larantuka), wilayah `01` (Larantuka & Solor), ranting `03` (San Juan Lebao), urut `001`, tahun dadar `1994`.

- Kode distrik teks (mis. `LRT`), kode wilayah & kode ranting selalu 2 digit dan unik **dalam satu wilayah** (kode ranting `01` boleh muncul di tiap wilayah).
- Jika kolom `nomor_anggota` diisi dengan nomor lama (mis. `001-1994` atau `0103-001-1994`), sistem otomatis mengonversi ke format resmi di atas menggunakan kode distrik/wilayah/ranting dari `ranting_id` — urut & tahun dipertahankan.
- Jika kolom kosong, urut di-generate berurutan dari anggota terakhir di ranting tersebut.
