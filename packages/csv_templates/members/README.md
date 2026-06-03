# CSV Template — Anggota

Format kolom untuk import data anggota:

```
name,email,phone,address,birth_date,join_date,status,notes
```

| Kolom       | Tipe      | Required | Deskripsi              |
| ----------- | --------- | -------- | ---------------------- |
| name        | string    | ✅       | Nama lengkap           |
| email       | string    |          | Email                  |
| phone       | string    |          | Nomor telepon          |
| address     | string    |          | Alamat                 |
| birth_date  | date      |          | Tanggal lahir (YYYY-MM-DD) |
| join_date   | date      | ✅       | Tanggal bergabung      |
| status      | enum      | ✅       | active / inactive      |
| notes       | string    |          | Catatan tambahan       |