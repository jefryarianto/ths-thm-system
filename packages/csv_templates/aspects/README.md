# CSV Template — Aspek Penilaian

Format kolom untuk import aspek/kategori penilaian:

```
name,description,weight,is_active
```

| Kolom       | Tipe      | Required | Deskripsi              |
| ----------- | --------- | -------- | ---------------------- |
| name        | string    | ✅       | Nama aspek             |
| description | string    |          | Deskripsi              |
| weight      | float     |          | Bobot (0.00 - 1.00)    |
| is_active   | boolean   |          | true / false           |