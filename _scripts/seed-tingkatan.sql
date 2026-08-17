INSERT INTO tingkatan (id, nama, strip_count, strip_warna, urutan, created_at, updated_at)
SELECT gen_random_uuid(), t.nama, t.strip_count, t.strip_warna, t.urutan, now(), now()
FROM (VALUES
  ('Anggota', 0, '#94a3b8', 1),
  ('Pratama', 1, '#1d4ed8', 2),
  ('Tamtama', 2, '#1d4ed8', 3),
  ('Muda', 1, '#ca8a04', 4),
  ('Madya', 2, '#ca8a04', 5),
  ('Utama', 3, '#ca8a04', 6)
) AS t(nama, strip_count, strip_warna, urutan)
WHERE NOT EXISTS (SELECT 1 FROM tingkatan);
