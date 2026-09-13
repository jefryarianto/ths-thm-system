# CSV Template — Struktur Organisasi

Template untuk import struktur organisasi **distrik → wilayah → ranting**.
Baris pertama harus header kolom; delimiter koma (`,`); encoding UTF-8.

> ℹ️ **Urutan penting**: import organisasi harus dilakukan **sebelum** import
> anggota — kolom `ranting_id` pada CSV anggota merujuk ranting yang dibuat di sini.

## Kolom

| Kolom   | Tipe   | Required | Deskripsi                                            |
| ------- | ------ | -------- | ---------------------------------------------------- |
| distrik | string | ✅       | Nama distrik (mis. `Keuskupan Larantuka`)            |
| wilayah | string |          | Nama wilayah di bawah distrik                        |
| ranting | string |          | Nama ranting di bawah wilayah                        |
| lokasiLatihan | string |     | Lokasi latihan ranting (opsional)                    |

`distrik` wajib diisi; `wilayah`/`ranting` opsional per baris — baris dengan
hanya distrik cukup untuk membuat distrik baru. Import berjalan sebagai
**upsert by nama**: kombinasi yang sudah ada tidak diduplikasi.

## Contoh Penggunaan

Lihat file: `import-organisasi-larantuka.csv` — contoh nyata struktur
Keuskupan Larantuka beserta wilayah dan ranting di bawahnya.
