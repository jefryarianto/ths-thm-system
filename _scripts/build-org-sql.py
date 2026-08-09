#!/usr/bin/env python3
"""Generate SQL to reconcile the org structure with the real XLSX data.

Strategy (non-destructive):
1. Rename temp structure to real names (distrik Larantuka -> Keuskupan Larantuka,
   wilayah 'Larantuka dan Adonara' -> 'Wilayah Larantuka & Solor'). Codes 0103/01 kept.
2. Insert missing wilayah (Adonara 02, Lembata 03) and 51 ranting (all except
   existing 'San Juan Lebao', which is skipped — its id stays 2e142768...).

Deterministic UUIDs (uuid5) so re-runs are idempotent-ish.
"""
import csv
import uuid

DISTRIK_ID = "bc3eb684-a6de-4da9-87d1-4b862ec9daa0"  # existing 'Larantuka' (kode 0103)
WILAYAH_SOLOR_ID = "f9a7e81f-a3e8-4e91-beaf-3b9671248224"  # existing 'Larantuka dan Adonara'
RANTING_SANJUAN = "San Juan Lebao"

N = uuid.NAMESPACE_URL

lines = []
lines.append("BEGIN;")
lines.append("")
lines.append("-- 1) rename temp structure to real names (codes preserved)")
lines.append(f"UPDATE distrik SET nama='Keuskupan Larantuka', updated_at=now() WHERE id='{DISTRIK_ID}';")
lines.append(f"UPDATE wilayah SET nama='Wilayah Larantuka & Solor', updated_at=now() WHERE id='{WILAYAH_SOLOR_ID}';")
lines.append("")

# 2) insert missing wilayah
wilayah_rows = [
    ("02", "Wilayah Adonara"),
    ("03", "Wilayah Lembata"),
]
wilayah_id_by_name = {"Wilayah Larantuka & Solor": WILAYAH_SOLOR_ID}
for kode, nama in wilayah_rows:
    wid = str(uuid.uuid5(N, f"wilayah:{nama}"))
    wilayah_id_by_name[nama] = wid
    lines.append(
        f"INSERT INTO wilayah (id, distrik_id, kode_wilayah, nama, created_at, updated_at) "
        f"VALUES ('{wid}', '{DISTRIK_ID}', '{kode}', '{nama.replace(chr(39), chr(39)+chr(39))}', now(), now());"
    )
lines.append("")

# 3) insert ranting (skip existing San Juan Lebao)
with open("import-organisasi-larantuka.csv", encoding="utf-8", newline="") as f:
    rows = list(csv.DictReader(f))

kode = 2  # 01 already used by San Juan Lebao
inserted = 0
for r in rows:
    nama = r["ranting"].strip()
    wilayah = r["wilayah"].strip()
    if nama == RANTING_SANJUAN:
        continue  # already exists (2e142768-ed29-4299-8200-6a4fddf70491)
    wid = wilayah_id_by_name[wilayah]
    rid = str(uuid.uuid5(N, f"ranting:{nama}"))
    kode_str = str(kode).zfill(2)
    lines.append(
        f"INSERT INTO ranting (id, wilayah_id, kode_ranting, nama, lokasi_latihan, created_at, updated_at) "
        f"VALUES ('{rid}', '{wid}', '{kode_str}', '{nama.replace(chr(39), chr(39)+chr(39))}', NULL, now(), now());"
    )
    kode += 1
    inserted += 1

lines.append("")
lines.append("COMMIT;")
lines.append("")

sql = "\n".join(lines)
out = "_scripts/import-larantuka.sql"
with open(out, "w", encoding="utf-8", newline="\n") as f:
    f.write(sql)

print(f"SQL written: {out} ({len(lines)} lines, {inserted} ranting inserts)")
