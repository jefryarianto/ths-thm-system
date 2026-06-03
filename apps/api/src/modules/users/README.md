# Modul Users — Manajemen Pengguna

CRUD user/admin sistem. Hanya dapat diakses oleh role admin.

## Endpoint

| Method | Path              | Deskripsi          |
| ------ | ----------------- | ------------------ |
| GET    | /api/users        | List semua user    |
| GET    | /api/users/:id    | Detail user        |
| POST   | /api/users        | Tambah user        |
| PATCH  | /api/users/:id    | Update user        |
| DELETE | /api/users/:id    | Hapus user         |