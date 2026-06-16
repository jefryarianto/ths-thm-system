-- Gamification tables: profiles, badges, and events
-- Migration: 20260606000000_add_gamification

-- GamificationProfile
CREATE TABLE IF NOT EXISTS "gamification_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "anggota_id" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "latihan_streak" INTEGER NOT NULL DEFAULT 0,
    "iuran_streak" INTEGER NOT NULL DEFAULT 0,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_profiles_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on anggota_id
CREATE UNIQUE INDEX IF NOT EXISTS "gamification_profiles_anggota_id_key" ON "gamification_profiles"("anggota_id");
-- Indexes
CREATE INDEX IF NOT EXISTS "gamification_profiles_points_idx" ON "gamification_profiles"("points" DESC);
CREATE INDEX IF NOT EXISTS "gamification_profiles_anggota_id_idx" ON "gamification_profiles"("anggota_id");

-- Foreign key to anggota
ALTER TABLE "gamification_profiles" ADD CONSTRAINT "gamification_profiles_anggota_id_fkey"
    FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GamificationBadge
CREATE TABLE IF NOT EXISTS "gamification_badges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "badge_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_badges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gamification_badges_profile_id_idx" ON "gamification_badges"("profile_id");
CREATE INDEX IF NOT EXISTS "gamification_badges_badge_id_idx" ON "gamification_badges"("badge_id");

ALTER TABLE "gamification_badges" ADD CONSTRAINT "gamification_badges_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "gamification_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- GamificationEvent
CREATE TABLE IF NOT EXISTS "gamification_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profile_id" UUID NOT NULL,
    "anggota_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gamification_events_profile_id_idx" ON "gamification_events"("profile_id");
CREATE INDEX IF NOT EXISTS "gamification_events_anggota_id_idx" ON "gamification_events"("anggota_id");
CREATE INDEX IF NOT EXISTS "gamification_events_timestamp_idx" ON "gamification_events"("timestamp" DESC);

ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "gamification_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_anggota_id_fkey"
    FOREIGN KEY ("anggota_id") REFERENCES "anggota"("id") ON DELETE CASCADE ON UPDATE CASCADE;
