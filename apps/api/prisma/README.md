# Prisma — Database Schema & Migrations

Gunakan Prisma ORM untuk schema definition, migration, dan seeding.

## Perintah

```bash
npx prisma generate          # Generate Prisma Client
npx prisma migrate dev       # Development migration (interactive)
npx prisma migrate deploy    # Production migration (non-interactive)
npx prisma db seed           # Seed data (roles, admin user, sample data)
npx prisma studio            # GUI database browser

# Migration safety
npx prisma migrate diff      # Preview migration changes
npx prisma migrate resolve   # Resolve failed migration in production
```

## Backup & Rollback (Production)

```bash
# Before migration
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
npx prisma migrate deploy

# Verify
npx prisma migrate status

# Rollback (manual)
psql $DATABASE_URL < backup_file.sql
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

## Schema Guidelines
- Semua tabel harus memiliki `id`, `createdAt`, `updatedAt`
- Soft delete: gunakan kolom `deletedAt` (nullable)
- Enum untuk status (pending, active, rejected, dll)
- Index untuk kolom yang sering di-query
- Relasi cascade untuk child records