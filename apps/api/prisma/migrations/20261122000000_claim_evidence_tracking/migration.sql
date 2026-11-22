ALTER TABLE "klaim"
  ADD COLUMN "tracking_token" TEXT,
  ADD COLUMN "mode_bukti" TEXT,
  ADD COLUMN "cerita_histori" TEXT;

UPDATE "klaim"
SET "tracking_token" = gen_random_uuid()::text
WHERE "tracking_token" IS NULL;

CREATE UNIQUE INDEX "klaim_tracking_token_key" ON "klaim"("tracking_token");
