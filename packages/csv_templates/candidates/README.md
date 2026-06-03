# CSV Template — Calon Anggota

Format kolom untuk import data calon anggota:

```
name,email,phone,address,birth_date,registration_date,source,notes
```

| Kolom              | Tipe      | Required | Deskripsi                    |
| ------------------ | --------- | -------- | ---------------------------- |
| name               | string    | ✅       | Nama lengkap                 |
| email              | string    |          | Email                        |
| phone              | string    |          | Nomor telepon                |
| address            | string    |          | Alamat                       |
| birth_date         | date      |          | Tanggal lahir (YYYY-MM-DD)   |
| registration_date  | date      | ✅       | Tanggal pendaftaran          |
| source             | string    |          | Sumber pendaftaran           |
| notes              | string    |          | Catatan tambahan             |