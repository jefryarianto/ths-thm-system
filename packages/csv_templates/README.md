# CSV Templates — Template Import Data

Template CSV untuk bulk import data ke sistem THS-THM.
Gunakan file template ini sebagai acuan format kolom saat melakukan import data.

## Daftar Template

| Folder        | Deskripsi                         |
| ------------- | --------------------------------- |
| `members/`    | Template import anggota           |
| `candidates/` | Template import calon anggota     |
| `aspects/`    | Template import aspek penilaian   |
| `assessments/`| Template import item penilaian    |

## Penanganan Data Tidak Lengkap

Saat import CSV, sistem akan:
1. Validasi setiap baris terhadap kolom required
2. Baris dengan data tidak lengkap → disimpan dengan status `incomplete`
3. Kirim notifikasi FCM ke anggota yang datanya tidak lengkap
4. Admin bisa lihat daftar data tidak lengkap di dashboard → lengkapi manual

## Format Umum

- Encoding: UTF-8
- Delimiter: koma (,)
- Quote: double quote (")
- Baris pertama: header (nama kolom)
- Tanggal: YYYY-MM-DD
- Boolean: true / false