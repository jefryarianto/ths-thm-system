-- CreateTable: gamification_rewards
CREATE TABLE "gamification_rewards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '🎁',
    "point_cost" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable: gamification_redemptions
CREATE TABLE "gamification_redemptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reward_id" UUID NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "points_spent" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gamification_redemptions_reward_id_idx" ON "gamification_redemptions"("reward_id");
CREATE INDEX "gamification_redemptions_anggota_id_idx" ON "gamification_redemptions"("anggota_id");

-- AddForeignKey
ALTER TABLE "gamification_redemptions" ADD CONSTRAINT "gamification_redemptions_reward_id_fkey"
    FOREIGN KEY ("reward_id") REFERENCES "gamification_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "gamification_redemptions" ADD CONSTRAINT "gamification_redemptions_anggota_id_fkey"
    FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
