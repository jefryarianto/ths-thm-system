-- Add KTA workflow notification types to the TipeNotifikasi enum.
--
-- The KTA services already emit these tipe values (kta_submitted, kta_approved,
-- ...), but they were missing from the enum, so notifikasi.create() threw a
-- PrismaClientValidationError. On submit, notifyLevel() runs inside the
-- application-creation transaction, so the failure rolled back the whole
-- submission whenever an approver existed. Adding the values fixes the flow.

ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_submitted';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_rejected';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_approved';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_fee_notification';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_payment_verified';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_generated';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_approval_request';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_payment_setup';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_escalation';
ALTER TYPE "TipeNotifikasi" ADD VALUE IF NOT EXISTS 'kta_escalation_upper';
