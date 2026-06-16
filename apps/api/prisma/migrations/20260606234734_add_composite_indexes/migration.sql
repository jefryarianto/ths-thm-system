-- AlterTable
ALTER TABLE "gamification_badges" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gamification_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gamification_profiles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "gamification_redemptions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "gamification_rewards" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "anggota_status_data_idx" ON "anggota"("status_data");

-- CreateIndex
CREATE INDEX "aspek_penilaian_kode_aspek_idx" ON "aspek_penilaian"("kode_aspek");

-- CreateIndex
CREATE INDEX "gamification_badges_profile_id_badge_id_idx" ON "gamification_badges"("profile_id", "badge_id");

-- CreateIndex
CREATE INDEX "gamification_events_profile_id_timestamp_idx" ON "gamification_events"("profile_id", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "gamification_profiles_points_anggota_id_idx" ON "gamification_profiles"("points" DESC, "anggota_id");

-- CreateIndex
CREATE INDEX "item_penilaian_kode_item_idx" ON "item_penilaian"("kode_item");

-- CreateIndex
CREATE INDEX "iuran_status_idx" ON "iuran"("status");
