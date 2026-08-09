#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Konversi 'Data Anggota.csv' (format Excel: No, Nama, NIA, TTL, Tempat dan Tahun Dadar, ...)
ke format yang dipahami /members/import (members.service.importCsv).

Kolom output (snake_case, sesuai service):
  nomor_anggota, nama_lengkap, jenis_kelamin, tempat_lahir, tanggal_lahir,
  tempat_dadar, tahun_dadar, alamat, no_hp, email, foto, tingkat, ranting_id

Catatan mapping:
- NIA '0103-001-1994' -> nomor_anggota '001-1994' (kode distrik di-strip;
  service otomatis menambahkan kode distrik ranting di depannya saat import)
- TTL 'Oebafok, 06 Juli 1983' -> tempat_lahir='Oebafok', tanggal_lahir=1983-07-06
- 'Tempat dan Tahun Dadar' 'Lekunik - 1994' -> tempat_dadar='Lekunik', tahun_dadar='1994'
- jenis_kelamin TIDAK ada di data Excel -> diisi manual dari nama (dapat diubah)
- ranting_id diisi contoh ranting production (ganti sesuai struktur org aktual)
"""
import csv
import re
import sys
from collections import OrderedDict

SRC = "Data Anggota.csv"
DST = "contoh-import-anggota-historis.csv"

BULAN = {
    "januari": "01", "februari": "02", "maret": "03", "april": "04",
    "mei": "05", "juni": "06", "juli": "07", "agustus": "08",
    "september": "09", "oktober": "10", "november": "11", "desember": "12",
}

# jenis kelamin (tidak ada di file Excel) -> diisi manual per nama (indeks 1-based)
JK = {
    1: "L", 2: "P", 3: "L", 4: "L", 5: "P", 6: "L", 7: "L", 8: "L",
    9: "P", 10: "L", 11: "L", 12: "L", 13: "L", 14: "P", 15: "P", 16: "P",
    17: "P", 18: "P", 19: "P", 20: "P", 21: "L", 22: "L", 23: "P", 24: "P",
    25: "P", 26: "L", 27: "P", 28: "P", 29: "P", 30: "L", 31: "P", 32: "P",
    33: "P", 34: "P", 35: "L", 36: "L", 37: "L", 38: "P", 39: "L", 40: "L",
    41: "L", 42: "L", 43: "L", 44: "P", 45: "L", 46: "L", 47: "L",
}

RANTING_ID = "2e142768-ed29-4299-8200-6a4fddf70491"  # Ranting San Juan Lebao (Larantuka)


def parse_tanggal(text: str) -> str:
    """'06 Juli 1983' / '05-02-1980' / '10 JANUARI 2007' -> YYYY-MM-DD (atau '')"""
    t = (text or "").strip()
    if not t:
        return ""
    m = re.match(r"^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$", t)
    if m:
        day, mon, year = m.group(1), m.group(2).lower(), m.group(3)
        return f"{year}-{BULAN.get(mon, '01')}-{int(day):02d}"
    m = re.match(r"^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$", t)
    if m:
        # format dd-mm-yyyy (data: '05-02-1980' = 5 Feb 1980)
        return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
    return ""


def split_ttl(ttl: str):
    """'Oebafok, 06 Juli 1983' -> (tempat, tanggal)"""
    ttl = (ttl or "").strip()
    if "," in ttl:
        tempat, tgl = ttl.split(",", 1)
        return tempat.strip(), parse_tanggal(tgl.strip())
    # tanpa koma: coba pisah kata pertama vs sisanya
    parts = ttl.split()
    if len(parts) >= 2 and re.search(r"\d", parts[-1]):
        return parts[0], parse_tanggal(" ".join(parts[1:]))
    return ttl, ""


def split_dadar(text: str):
    """'Lekunik - 1994' / 'Waibalun 1993' / '1993' / '' -> (tempat_dadar, tahun_dadar)"""
    text = (text or "").strip()
    m = re.search(r"(\d{4})\s*$", text)
    tahun = m.group(1) if m else ""
    tempat = text[: m.start()].strip(" -") if m else text
    return tempat, tahun


def nia_to_nomor(nia: str) -> str:
    """'0103-001-1994' -> '001-1994' (strip kode distrik; service menambahkannya lagi).
    NIA tidak lengkap (tahun kosong, mis. '0103-009-') -> '' agar NRA digenerate otomatis."""
    nia = (nia or "").strip()
    parts = nia.split("-")
    if len(parts) >= 3:
        if not parts[2]:  # tahun dadar kosong -> generate otomatis
            return ""
        return "-".join(parts[1:])
    if len(parts) == 2:
        return "-".join(parts[1:])
    return nia


def main():
    with open(SRC, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    out = []
    errors = []
    for i, r in enumerate(rows, start=1):
        nama = (r.get("Nama") or "").strip()
        if not nama:
            errors.append(f"baris {i}: nama kosong, dilewati")
            continue
        tempat, tgl = split_ttl(r.get("TTL"))
        tempat_dadar, tahun_dadar = split_dadar(r.get("Tempat dan Tahun Dadar"))
        out.append(OrderedDict([
            ("nomor_anggota", nia_to_nomor(r.get("NIA"))),
            ("nama_lengkap", nama),
            ("jenis_kelamin", JK.get(i, "")),
            ("tempat_lahir", tempat),
            ("tanggal_lahir", tgl),
            ("tempat_dadar", tempat_dadar),
            ("tahun_dadar", tahun_dadar),
            ("alamat", ""),
            ("no_hp", ""),
            ("email", ""),
            ("foto", (r.get("Foto") or "").strip()),
            ("tingkat", (r.get("Tingkatan") or "").strip()),
            ("ranting_id", RANTING_ID),
        ]))

    with open(DST, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(out[0].keys()))
        writer.writeheader()
        writer.writerows(out)

    print(f"OK: {len(out)} baris dikonversi -> {DST}")
    if errors:
        print("PERINGATAN:")
        for e in errors:
            print(" -", e)


if __name__ == "__main__":
    main()
