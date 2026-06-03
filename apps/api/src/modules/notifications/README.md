# Modul Notifications — Notifikasi FCM

Notifikasi push via Firebase Cloud Messaging (FCM) ke mobile app anggota.

## Endpoint

| Method | Path                               | Deskripsi                      |
| ------ | ---------------------------------- | ------------------------------ |
| POST   | /api/notifications/send            | Kirim notifikasi ke user       |
| POST   | /api/notifications/broadcast       | Kirim notifikasi massal        |
| POST   | /api/notifications/topic           | Kirim notifikasi ke topik      |
| GET    | /api/notifications                 | Riwayat notifikasi             |
| GET    | /api/notifications/:id             | Detail notifikasi              |
| DELETE | /api/notifications/:id             | Hapus notifikasi               |
| POST   | /api/notifications/fcm-token       | Register FCM device token      |
| DELETE | /api/notifications/fcm-token/:id   | Unregister device token        |
| POST   | /api/notifications/schedule        | Jadwalkan notifikasi           |

## Trigger Otomatis
- Anggota baru terdaftar → notifikasi welcome
- Data import tidak lengkap → notifikasi ke anggota
- Pendadaran terjadwal → reminder
- Iuran jatuh tempo → reminder
- Klaim disetujui/ditolak → status update