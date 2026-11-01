-- CreateTable: role_permissions (diharuskan oleh model RolePermission di schema.prisma).
-- Tabel ini sebelumnya hanya ada di schema.prisma tanpa migration SQL,
-- sehingga `prisma db push` (lokal) dan DB hasil `migrate deploy` (CI/production)
-- tidak sinkron. Idempotent: aman jika tabel/index sudah pernah dibuat manual.
CREATE TABLE IF NOT EXISTS "role_permissions" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "role_permissions_role_key_key" ON "role_permissions"("role", "key");
