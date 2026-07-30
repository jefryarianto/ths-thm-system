# Import Anggota Historis THS-THM

Endpoint ini digunakan untuk mengimpor data anggota historis dengan format khusus THS-THM.

## Endpoint
`POST /api/members/import-historis`

## Format Data CSV

File CSV harus memiliki kolom berikut:
- `no`: Nomor urut (opsional)
- `nama`: Nama lengkap anggota (wajib)
- `nia`: Nomor Induk Anggota (wajib)
- `ttl`: Tempat dan tanggal lahir, format: "Tempat, Tanggal Bulan Tahun" (wajib)
- `dadar`: Ranting dan tahun dadar, format: "Nama Ranting - Tahun" (wajib)
- `ranting`: Nama lengkap ranting (wajib)
- `foto`: Nama file foto (opsional)
- `tingkatan`: Nama tingkatan sesuai master data (wajib)

## Contoh Data CSV

```csv
no,nama,nia,ttl,dadar,ranting,foto,tingkatan
1,Andreas Pelede Boyang,0302-001-2019,"Waijarang, 20 Juli 2007",Waikomo - 2019,Santo Arnoldus Jansen - Waikomo,Andreas Pelede Boyang.png,Muda
2,Anjelina B. Namang,0302-002-2019,"Lewoleba, 17 November 2005",Waikomo - 2019,Santo Arnoldus Jansen - Waikomo,Anjelina B. Namang.png,Muda
3,Antonius Oki,0302-003-2001,"Kefamenanu, 22 Januari 1984",Kefamenanu - 2001,Santo Arnoldus Jansen - Waikomo,Antonius Oki.png,Pratama
```

## Tingkatan yang Tersedia

Pastikan nama tingkatan sesuai dengan data master:
- Anggota Yunior
- Pratama
- Tamtama
- Muda
- Madya
- Utama

## Request Body

```json
{
  "data": [
    {
      "no": 1,
      "nama": "Andreas Pelede Boyang",
      "nia": "0302-001-2019",
      "ttl": "Waijarang, 20 Juli 2007",
      "dadar": "Waikomo - 2019",
      "ranting": "Santo Arnoldus Jansen - Waikomo",
      "foto": "Andreas Pelede Boyang.png",
      "tingkatan": "Muda"
    }
  ]
}
```

## Response

```json
{
  "success": true,
  "summary": {
    "total": 8,
    "imported": 8,
    "skipped": 0,
    "failed": 0
  },
  "results": [
    {
      "success": true,
      "data": {
        "id": "...",
        "nomorAnggota": "0302-001-2019",
        "namaLengkap": "Andreas Pelede Boyang",
        ...
      }
    }
  ]
}
```

## Catatan Penting

1. **Ranting**: Sistem akan mencari ranting berdasarkan nama. Pastikan nama ranting sesuai dengan data di database.
2. **Tingkatan**: Nama tingkatan harus persis sama dengan data master tingkatan.
3. **NIA**: Jika NIA sudah ada di CSV, sistem akan menggunakannya. Jika tidak, NIA akan digenerate otomatis.
4. **Jenis Kelamin**: Default adalah 'L' (Laki-laki). Untuk mengubahnya, perlu dilakukan update manual setelah import.
5. **Status Validasi**: Semua anggota yang diimpor akan memiliki status validasi "pending".
