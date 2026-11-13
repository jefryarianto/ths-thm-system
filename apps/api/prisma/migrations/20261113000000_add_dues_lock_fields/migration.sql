-- Add lock fields to iuran table for dues lock system
-- 1) isLocked: boolean flag indicating if the dues period is locked
-- 2) lockedAt: timestamp when the lock was applied
-- 3) lockedBy: user ID who applied the lock
-- 4) lockReason: reason for the lock (e.g., "Masa tenggang standar (7 hari)")
-- 5) lockExpiresAt: timestamp when the lock expires (grace period end)

-- Add lock fields to iuran table
ALTER TABLE "iuran" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "iuran" ADD COLUMN "lockedAt" TIMESTAMP(3);
ALTER TABLE "iuran" ADD COLUMN "lockedBy" TEXT;
ALTER TABLE "iuran" ADD COLUMN "lockReason" TEXT;
ALTER TABLE "iuran" ADD COLUMN "lockExpiresAt" TIMESTAMP(3);

-- Create indexes for lock fields
CREATE INDEX "iuran_isLocked_idx" ON "iuran"("isLocked");
CREATE INDEX "iuran_lockedAt_idx" ON "iuran"("lockedAt");

-- Create DuesLockHistory table for audit trail
CREATE TABLE "dues_lock_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "iuran_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "performed_by" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dues_lock_history_pkey" PRIMARY KEY ("id")
);

-- Create index on iuran_id for efficient lookups
CREATE INDEX "dues_lock_history_iuran_id_idx" ON "dues_lock_history"("iuran_id");

-- Add foreign key constraint
ALTER TABLE "dues_lock_history" ADD CONSTRAINT "dues_lock_history_iuran_id_fkey" FOREIGN KEY ("iuran_id") REFERENCES "iuran"("id") ON DELETE CASCADE ON UPDATE CASCADE;
