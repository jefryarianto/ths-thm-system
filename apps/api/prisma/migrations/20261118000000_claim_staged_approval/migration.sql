ALTER TABLE "klaim"
  ADD COLUMN IF NOT EXISTS "current_stage" TEXT NOT NULL DEFAULT 'ranting',
  ADD COLUMN IF NOT EXISTS "kta_application_id" TEXT,
  ADD COLUMN IF NOT EXISTS "ranting_approved_by" TEXT,
  ADD COLUMN IF NOT EXISTS "wilayah_approved_by" TEXT,
  ADD COLUMN IF NOT EXISTS "distrik_approved_by" TEXT;

CREATE TABLE IF NOT EXISTS "klaim_approval_history" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "klaim_id" TEXT NOT NULL,
  "stage" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor_id" TEXT,
  "actor_role" TEXT,
  "catatan" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "klaim_approval_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "klaim_current_stage_status_idx" ON "klaim"("current_stage", "status");
CREATE INDEX IF NOT EXISTS "klaim_kta_application_id_idx" ON "klaim"("kta_application_id");
CREATE INDEX IF NOT EXISTS "klaim_approval_history_klaim_id_created_at_idx" ON "klaim_approval_history"("klaim_id", "created_at");

DO $$ BEGIN
  ALTER TABLE "klaim" ADD CONSTRAINT "klaim_kta_application_id_fkey"
    FOREIGN KEY ("kta_application_id") REFERENCES "kta_applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "klaim_approval_history" ADD CONSTRAINT "klaim_approval_history_klaim_id_fkey"
    FOREIGN KEY ("klaim_id") REFERENCES "klaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
