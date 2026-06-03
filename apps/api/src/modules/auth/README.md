# Modul Auth — Autentikasi & Otorisasi

Meng-handle login, register, refresh token, forgot password, dan role-based access control (RBAC).

## Endpoint

| Method | Path                     | Deskripsi                              |
| ------ | ------------------------ | -------------------------------------- |
| POST   | /api/auth/login          | Login (email + password)               |
| POST   | /api/auth/register       | Register user baru                     |
| POST   | /api/auth/refresh        | Refresh JWT token (refresh token rotation) |
| POST   | /api/auth/forgot         | Lupa password (kirim email reset)      |
| POST   | /api/auth/reset          | Reset password dengan token            |
| GET    | /api/auth/me             | Profile user yang sedang login         |
| PATCH  | /api/auth/me             | Update profile sendiri                 |
| PATCH  | /api/auth/change-password| Ganti password                         |

## Roles
- superadmin
- admin_distrik
- admin_wilayah
- admin_ranting
- admin_kegiatan
- penguji
- anggota

## Token
- Access Token: 15 menit
- Refresh Token: 7 hari, rotasi setiap digunakan