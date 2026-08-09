#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Konversi 'Data larantuka.xlsx' (sheet 'Data Distrik') ke format CSV
yang dipahami halaman Settings -> Struktur Organisasi -> Import Data:
    distrik,wilayah,ranting   (satu baris per ranting)

Catatan:
- Header blok: kolom B=Kode Distrik, C=Nama Distrik, E=Kode Wilayah, F=Nama Wilayah,
  H=Kode Ranting, I=Nama Ranting
- Ada baris di blok 'Wilayah Lembata' yang selnya bergeser (nama ranting di kolom H,
  kode di kolom I, duplikat nama di kolom J) + formula Excel (=+...) — parser ini
  mengambil nama ranting dari kolom H/I/J yang berisi teks dan bukan formula.
- Import di sistem berbasis NAMA (upsert case-insensitive), kode digenerate otomatis,
  jadi kolom kode dari Excel tidak diteruskan.
"""
import csv
import re
import openpyxl

SRC = "Data larantuka.xlsx"
DST = "import-organisasi-larantuka.csv"

HEADER_MARK = "Kode Distrik"


def clean(text):
    if text is None:
        return ""
    s = str(text).strip()
    # formula Excel (mis. "=+H50") -> kosong
    if s.startswith("="):
        return ""
    # normalisasi spasi ganda
    s = re.sub(r"\s+", " ", s)
    return s


def is_numeric(text):
    return bool(re.match(r"^\d+(\.\d+)?$", clean(text)))


def main():
    wb = openpyxl.load_workbook(SRC)
    ws = wb["Data Distrik"]

    rows = []
    cur_distrik = ""
    cur_wilayah = ""
    raw = list(ws.iter_rows(min_row=1, values_only=True))

    for line in raw:
        vals = list(line)
        b, c = clean(vals[1]) if len(vals) > 1 else "", clean(vals[2]) if len(vals) > 2 else ""
        # Header blok baru
        if b == HEADER_MARK or c == "Nama Distrik":
            cur_distrik = ""
            cur_wilayah = ""
            continue
        # Baris distrik (kolom B/C terisi)
        if b or c:
            cur_distrik = c or cur_distrik
            # Kolom E/F = kode/nama wilayah
            e = clean(vals[4]) if len(vals) > 4 else ""
            f = clean(vals[5]) if len(vals) > 5 else ""
            if f:
                cur_wilayah = f
            elif e and not is_numeric(e):
                cur_wilayah = e
        # Cek kolom wilayah terisi sendiri (kolom F) — abaikan jika ternyata angka
        # (baris Lembata yang selnya bergeser menaruh kode wilayah di kolom F)
        f_only = clean(vals[5]) if len(vals) > 5 else ""
        if f_only and not b and not c and not is_numeric(f_only) and f_only != "Nama Wilayah":
            cur_wilayah = f_only

        # Ambil nama ranting dari kolom H / I / J (teks non-angka, non-formula)
        ranting = ""
        for idx in (8, 9, 10):  # H, I, J (0-based)
            if len(vals) <= idx:
                continue
            v = clean(vals[idx])
            if v and v != "Nama Ranting" and v != "Kode Ranting" and not is_numeric(v):
                ranting = v
                break

        if ranting and cur_distrik and cur_wilayah:
            rows.append([cur_distrik, cur_wilayah, ranting])

    with open(DST, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["distrik", "wilayah", "ranting"])
        for r in rows:
            w.writerow(r)

    # Ringkasan
    distriks = sorted({r[0] for r in rows})
    wilayahs = sorted({r[1] for r in rows})
    print(f"OK: {len(rows)} baris ranting -> {DST}")
    print(f"Distrik: {len(distriks)} -> {', '.join(distriks)}")
    print(f"Wilayah: {len(wilayahs)}")
    for wl in wilayahs:
        n = sum(1 for r in rows if r[1] == wl)
        print(f"  - {wl}: {n} ranting")


if __name__ == "__main__":
    main()
