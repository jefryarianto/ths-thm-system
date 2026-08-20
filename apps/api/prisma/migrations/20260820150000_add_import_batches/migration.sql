-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "file_name" TEXT,
    "total_rows" INTEGER NOT NULL,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "success" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "scope" JSONB,
    "details" JSONB,
    "imported_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch_items" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "row_index" INTEGER NOT NULL,
    "row" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_batches_module_idx" ON "import_batches"("module");

-- CreateIndex
CREATE INDEX "import_batches_imported_by_id_idx" ON "import_batches"("imported_by_id");

-- CreateIndex
CREATE INDEX "import_batches_created_at_idx" ON "import_batches"("created_at" DESC);

-- CreateIndex
CREATE INDEX "import_batch_items_batch_id_idx" ON "import_batch_items"("batch_id");

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_imported_by_id_fkey" FOREIGN KEY ("imported_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch_items" ADD CONSTRAINT "import_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;