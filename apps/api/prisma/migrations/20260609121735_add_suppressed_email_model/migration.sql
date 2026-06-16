-- CreateTable
CREATE TABLE "suppressed_emails" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppressed_emails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppressed_emails_email_key" ON "suppressed_emails"("email");

-- CreateIndex
CREATE INDEX "suppressed_emails_email_idx" ON "suppressed_emails"("email");

-- AddForeignKey
ALTER TABLE "suppressed_emails" ADD CONSTRAINT "suppressed_emails_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "email_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
