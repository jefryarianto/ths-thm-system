# Modul Gamification — Poin, Badge, Level & Reward

Sistem gamifikasi untuk anggota THS-THM. Melacak poin, badge, streak, level, dan reward yang bisa ditukar.

---

## 📊 Poin

Poin diperoleh melalui aktivitas berikut:

| Aktivitas | Poin | Trigger |
|-----------|------|---------|
| Latihan rutin | +10 | `POST /gamification/profile/:id/training` |
| Iuran tepat waktu | +20 | `POST /gamification/profile/:id/dues` dengan `onTime: true` |
| Iuran terlambat | +5 | `POST /gamification/profile/:id/dues` dengan `onTime: false` |

Poin digunakan untuk:
- **Level naik** — otomatis saat melewati threshold
- **Redeem reward** — ditukar dengan hadiah di toko reward

## 🏆 Level

Level ditentukan berdasarkan **total poin** yang dikumpulkan:

| Level | Minimal Poin | Icon | Warna |
|-------|-------------|------|-------|
| 🥉 Bronze | 0 | `🥉` | `#cd7f32` |
| 🥈 Silver | 100 | `🥈` | `#c0c0c0` |
| 🥇 Gold | 300 | `🥇` | `#ffd700` |
| 💎 Platinum | 500 | `💎` | `#e5e4e2` |
| 🔥 Diamond | 1000 | `🔥` | `#b9f2ff` |

Saat naik level, notifikasi dikirim ke **semua user di ranting yang sama** via FCM + WebSocket.

## 🎖️ Badge

Badge diraih otomatis saat mencapai threshold tertentu:

### Latihan
| Badge | Threshold | Icon |
|-------|-----------|------|
| Pemula Latihan | 5 latihan | 🥋 |
| Aktif Latihan | 20 latihan | 💪 |
| Master Latihan | 50 latihan | 🏆 |

### Iuran
| Badge | Threshold | Icon |
|-------|-----------|------|
| Tepat Waktu | 3 bulan berturut-turut | ⏰ |
| Disiplin | 6 bulan berturut-turut | ⭐ |
| Setia | 12 bulan berturut-turut | 👑 |

### Prestasi
| Badge | Threshold | Icon |
|-------|-----------|------|
| Berprestasi | 1 sertifikat | 🎓 |
| Juara | 3 sertifikat | 🥇 |

### Keaktifan
| Badge | Threshold | Icon |
|-------|-----------|------|
| Angel Points | 100 poin | 😈 |
| Legend | 500 poin | 🔥 |

## 🔔 Notifikasi

- **Badge baru** — dikirim ke semua user di ranting yang sama
- **Level up** — dikirim ke semua user di ranting yang sama
- **Redemption status** — dikirim ke admin di ranting + notifikasi personal ke member (via email matching)

## 🎁 Reward System

Member dapat menukarkan poin dengan reward:

- **Redeem**: `POST /gamification/rewards/:id/redeem` — potong poin, kurangi stok, catat event
- **CRUD Reward (admin)**: Kelola reward via endpoint `/gamification/rewards`
- **Approval (admin)**: Setujui/tolak/selesaikan redemption via `PATCH /gamification/rewards/redemptions/:id`

## 🔎 Leaderboard

Menampilkan peringkat anggota berdasarkan poin:

- **Filter scope**: `rantingId`, `wilayahId`, `distrikId`
- **Search**: `search` (cari berdasarkan nama anggota)
- **Public**: `GET /gamification/public/leaderboard` — tanpa auth
- **Limit**: `limit` parameter (default 10)

## 📱 Endpoints

| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/gamification/badges` | ✅ | Semua badge tersedia |
| GET | `/gamification/profile/:anggotaId` | ✅ | Profil + badge anggota |
| GET | `/gamification/profile/:anggotaId/events` | ✅ | Riwayat poin anggota |
| GET | `/gamification/profile/:anggotaId/points-history` | ✅ | Poin per bulan (chart) |
| GET | `/gamification/leaderboard` | ✅ | Peringkat (dengan filter & search) |
| GET | `/gamification/public/leaderboard` | ❌ | Peringkat publik |
| GET | `/gamification/events` | ✅ | Aktivitas global |
| GET | `/gamification/stats` | ✅ (admin) | Statistik gamifikasi |
| GET | `/gamification/org-structure` | ✅ | Struktur organisasi untuk filter |
| POST | `/gamification/profile/:id/training` | ✅ (admin) | Catat latihan + poin |
| POST | `/gamification/profile/:id/dues` | ✅ (admin) | Catat iuran + poin |
| GET | `/gamification/rewards` | ✅ | Semua reward |
| POST | `/gamification/rewards` | ✅ (admin) | Buat reward baru |
| PUT | `/gamification/rewards/:id` | ✅ (admin) | Update reward |
| DELETE | `/gamification/rewards/:id` | ✅ (admin) | Hapus reward |
| POST | `/gamification/rewards/:id/redeem` | ✅ | Tukar poin dengan reward |
| GET | `/gamification/rewards/redemptions` | ✅ (admin) | Semua redemption |
| PATCH | `/gamification/rewards/redemptions/:id` | ✅ (admin) | Update status redemption |

## 📁 Struktur Database

- `gamification_profiles` — Poin, streak, last activity per anggota
- `gamification_badges` — Badge yang diraih per anggota
- `gamification_events` — Riwayat penambahan/pengurangan poin
- `gamification_rewards` — Daftar reward yang tersedia
- `gamification_redemptions` — Riwayat penukaran poin
