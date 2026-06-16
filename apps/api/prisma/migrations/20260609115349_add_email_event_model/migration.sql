-- CreateTable
CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "email_log_id" TEXT,
    "event" TEXT NOT NULL,
    "recipient" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_events_email_log_id_idx" ON "email_events"("email_log_id");

-- CreateIndex
CREATE INDEX "email_events_event_idx" ON "email_events"("event");

-- CreateIndex
CREATE INDEX "email_events_timestamp_idx" ON "email_events"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_email_log_id_fkey" FOREIGN KEY ("email_log_id") REFERENCES "email_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
