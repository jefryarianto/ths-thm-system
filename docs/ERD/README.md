# ERD — Entity Relationship Diagram

## Entities (19 Modul)

| Entity          | Deskripsi                     | Relations                                      |
| --------------- | ----------------------------- | ---------------------------------------------- |
| User            | Admin / Operator              | belongsTo → Role                               |
| Role            | Role & permission             | hasMany → User                                 |
| Member          | Anggota THS-THM               | hasMany → Document, Dues, Claim, AssessmentScore |
| Candidate       | Calon anggota                 | -                                              |
| Registration    | Pendaftaran baru              | -                                              |
| Claim           | Klaim anggota                 | belongsTo → Member                             |
| Training        | Latihan/pelatihan             | hasMany → Attendance, Evaluation               |
| Attendance      | Absensi latihan               | belongsTo → Training, Member                   |
| Evaluation      | Evaluasi latihan              | belongsTo → Training, Member                   |
| Graduation      | Pendadaran                    | hasMany → Participant, Examiner                |
| Participant     | Peserta pendadaran            | belongsTo → Graduation, Member                 |
| Examiner        | Penguji                       | belongsTo → User; hasMany → Assignment         |
| Assignment      | Penugasan penguji             | belongsTo → Examiner, Graduation               |
| Activity        | Kegiatan/event                | hasMany → ActivityParticipant                  |
| ActivityParticipant | Peserta kegiatan          | belongsTo → Activity, Member                   |
| Aspect          | Aspek penilaian               | hasMany → AssessmentItem                       |
| AssessmentItem  | Item penilaian                | belongsTo → Aspect                             |
| AssessmentScore | Nilai anggota                 | belongsTo → Member, AssessmentItem             |
| Document        | Dokumen (kartu/sertifikat)    | belongsTo → Member; hasOne → QRValidation      |
| QRValidation    | QR code verifikasi            | belongsTo → Document                           |
| OrgDocument     | Dokumen organisasi            | belongsTo → DocumentCategory                   |
| DocumentCategory| Kategori dokumen              | hasMany → OrgDocument                          |
| IncomingLetter  | Surat masuk                   | -                                              |
| OutgoingLetter  | Surat keluar                  | -                                              |
| Dues            | Iuran anggota                 | belongsTo → Member                             |
| Notification    | Notifikasi FCM                | belongsTo → User                               |
| DeviceToken     | FCM device token              | belongsTo → User                               |
| Period          | Periode THS-THM               | -                                              |
| Setting         | Konfigurasi sistem            | -                                              |
| Signature       | Tanda tangan pejabat          | -                                              |
| Stamp           | Cap/stempel organisasi        | -                                              |

> Diagram visual → `erd.png` / `erd.drawio`