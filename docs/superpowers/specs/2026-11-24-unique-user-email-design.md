# Unique User Email Design

## Context

Saat ini pengguna THS-THM bisa login dengan email atau Nomor HP. Tidak ada field `username` di model `User`, dan permintaan untuk menambah username dibatalkan. Masalah yang tersisa: email user hanya dijamin unik secara exact oleh index `users_email_key`, sehingga `User@x.com` dan `user@x.com` masih bisa menjadi dua akun berbeda.

Data produksi sudah diperiksa: tidak ada grup duplikat case-insensitive, tidak ada email yang perlu dinormalisasi, dan tidak ada email null/empty.

## Goals

- Menjamin satu email hanya dipakai satu user setelah `trim` dan `lowercase`.
- Menolak duplicated email dengan response `409 Conflict` yang jelas pada jalur create/update user.
- Menjaga perilaku login email/HP yang sudah ada.

## Non-Goals

- Menambahkan username atau login berdasarkan username.
- Mengubah UI web atau mobile.
- Mengubah skema selain index unik baru pada `users.email`.

## Decisions

1. Normalisasi email adalah `trim` lalu `lowercase`.
2. Constraint utama adalah unique index PostgreSQL `lower(email)` bernama `users_email_lower_key`.
3. Semua penulisan Prisma ke `user` dinormalisasi di satu boundary lewat Prisma query extension.
4. Jalur user-facing juga memakai helper `assertEmailAvailable` agar konflik menghasilkan `ConflictException('Email sudah terdaftar')`.
5. Jalur auto-provision bergantung pada Prisma extension dan unique index; tidak perlu memanggil helper satu per satu.
6. Index exact lama `users_email_key` tetap dipertahankan.

## Design

Tambah util `apps/api/src/common/utils/email.util.ts` dengan:

- `normalizeEmail(raw?: string | null): string`
- `normalizeUserEmailData<T>(data: T): T`
- `assertEmailAvailable(prisma, email, excludeUserId?): Promise<void>`

`assertEmailAvailable` memakai `user.findFirst` dengan `email: { equals: normalized, mode: 'insensitive' }` dan menambahkan `id: { not: excludeUserId }` saat update.

`PrismaService` menambah query extension untuk `user.create`, `user.createMany`, `user.update`, `user.updateMany`, dan `user.upsert`, memanggil `normalizeUserEmailData` sebelum query dijalankan.

Migration melakukan:

```sql
UPDATE "users"
SET "email" = lower(trim("email"))
WHERE "email" IS NOT NULL AND "email" <> lower(trim("email"));

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_lower_key"
ON "users" (lower("email"));
```

Call site yang diubah:

- `AuthService.register`
- `AuthService.updateProfile`
- `UsersService.beforeCreate`
- `UsersService.beforeUpdate`

## Acceptance Criteria

- `  User@Example.COM ` tersimpan sebagai `user@example.com`.
- Pendaftaran dengan `USER@EXAMPLE.COM` setelah `user@example.com` ditolak `409`.
- Update email ke email milik user lain, beda huruf, ditolak `409`.
- Update email ke email sendiri tidak ditolak.
- Semua test API existing tetap lulus.

## Consequences

- Perlu migration Prisma dan deploy API bersamaan.
- Beberapa auto-provision yang sebelumnya menghasilkan duplikat kini akan gagal dengan P2002; ini disengaja karena duplikat memang tidak valid.
- Tidak ada perubahan kontrak login atau UI.
