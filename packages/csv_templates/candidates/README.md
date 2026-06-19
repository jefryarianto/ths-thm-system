# CSV Template — Calon Anggota

Kolom diselaraskan dengan template anggota penuh, karena calon anggota yang lulus akan menjadi anggota.

```
nama_lengkap,jenis_kelamin,tempat_lahir,tanggal_lahir,alamat,no_hp,email,tingkat,ranting_id
```

| Kolom          | Tipe   | Required | Deskripsi                              |
| -------------- | ------ | -------- | -------------------------------------- |
| nama_lengkap   | string | ✅       | Nama lengkap                           |
| jenis_kelamin  | enum   | ✅       | L (Laki-laki) / P (Perempuan)          |
| tempat_lahir   | string |          | Tempat lahir                           |
| tanggal_lahir  | date   |          | Tanggal lahir (YYYY-MM-DD)             |
| alamat         | string |          | Alamat lengkap                         |
| no_hp          | string |          | Nomor HP (mulai 0 atau +62)            |
| email          | string |          | Email                                  |
| tingkat        | string |          | Tingkat (contoh: Melati 1, Melati 2)   |
| ranting_id     | string | ✅       | ID Ranting (diisi oleh sistem)          |
