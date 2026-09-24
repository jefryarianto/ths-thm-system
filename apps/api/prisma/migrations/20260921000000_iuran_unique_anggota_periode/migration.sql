-- Unique constraint: satu record iuran per anggota per periode.
-- Mencegah input ganda iuran untuk periode yang sama di level database.

-- 1) Hapus duplikat yang sudah ada sebelum constraint diterapkan.
--    Kebijakan: pertahankan record dengan status paling "maju" per (anggota_id, periode)
--    (lunas > menunggu_verifikasi > menunggak > belum_dibayar), tie-break updated_at terbaru.
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT anggota_id, periode
    FROM "iuran"
    GROUP BY anggota_id, periode
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE NOTICE 'iuran: % pasangan (anggota_id, periode) duplikat akan dideduplikasi', dup_count;
  END IF;
END $$;

DELETE FROM "iuran" a
USING "iuran" b
WHERE a.anggota_id = b.anggota_id
  AND a.periode = b.periode
  AND a.id <> b.id
  AND (
    -- b "lebih baik": status lebih maju, lalu updated_at lebih baru,
    -- lalu id (tie-breaker agar selalu ada tepat satu penyintas per grup).
    (CASE a.status
       WHEN 'lunas' THEN 3
       WHEN 'menunggu_verifikasi' THEN 2
       WHEN 'menunggak' THEN 1
       ELSE 0
     END,
     a.updated_at,
     a.id)
    < (CASE b.status
         WHEN 'lunas' THEN 3
         WHEN 'menunggu_verifikasi' THEN 2
         WHEN 'menunggak' THEN 1
         ELSE 0
       END,
       b.updated_at,
       b.id)
  );

-- 2) Terapkan constraint unik.
-- CreateIndex
CREATE UNIQUE INDEX "iuran_anggota_id_periode_key" ON "iuran"("anggota_id", "periode");
