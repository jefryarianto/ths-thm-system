-- Tabel webhook yang sudah diproses.
-- Deduplikasi idempoten berbasis unique constraint pada event_id (svix-id),
-- aman dari webhook ganda yang datang konkurren (atomic claim via insert).

CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_type" TEXT,
    "payload" JSONB,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");

CREATE INDEX "webhook_events_provider_idx" ON "webhook_events"("provider");

CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events"("processed_at" DESC);