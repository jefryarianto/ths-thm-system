-- CreateTable
CREATE TABLE "data_revisions" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'UPDATE',
    "before" JSONB,
    "after" JSONB,
    "diff" JSONB,
    "changed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "data_revisions_entity_entity_id_created_at_idx" ON "data_revisions"("entity", "entity_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "data_revisions" ADD CONSTRAINT "data_revisions_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;