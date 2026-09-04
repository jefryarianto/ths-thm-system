-- DropIndex
DROP INDEX "audit_logs_ranting_id_idx";

-- DropIndex
DROP INDEX "users_locked_until_idx";

-- AlterTable
ALTER TABLE "kepengurusan" ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "approved_by" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "queue_uptime_events" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'approved';

-- CreateTable
CREATE TABLE "role_menu_permissions" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "menu_key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_menu_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_menu_permissions_role_menu_key_key" ON "role_menu_permissions"("role", "menu_key");

-- RenameIndex
ALTER INDEX "dokumen_penandatangans_type_scope_idx" RENAME TO "dokumen_penandatangans_dokumen_type_distrik_id_idx";

-- RenameIndex
ALTER INDEX "penandatangans_distrik_is_active_idx" RENAME TO "penandatangans_distrik_id_is_active_idx";

-- RenameIndex
ALTER INDEX "stempel_distrik_is_active_idx" RENAME TO "stempel_distrik_id_is_active_idx";

-- RenameIndex
ALTER INDEX "tanda_tangan_distrik_is_active_idx" RENAME TO "tanda_tangan_distrik_id_is_active_idx";
