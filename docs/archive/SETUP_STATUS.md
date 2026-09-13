# ✅ THS-THM Development - Setup Status

## Sudah Selesai:

### 1. Database & Redis (Docker) ✅
Sudah running dengan command:
```bash
docker-compose up -d
```

**Cek status:**
```bash
docker-compose ps
```

Output:
- PostgreSQL: `ths-thm-system-db` (port 54321)
- Redis: `ths-thm-system-redis` (port 6379)

---

## Sedang Berjalan:

### 2. Install Dependencies (pnpm) ⏳
Sedang download & install semua packages (~1500+ paket).

Proses ini berjalan di Docker container untuk menghindari masalah pnpm lokal.

Estimasi waktu: 5-15 menit (tergantung internet)

---

## Next Steps (setelah install selesai):

### 3. Setup Database Schema

```bash
cd apps/api
npx prisma migrate dev
```

Atau jika sudah ada schema:
```bash
npx prisma migrate deploy
```

### 4. Start Development Servers

**Terminal 1 - API (NestJS):**
```bash
cd apps/api
pnpm run dev
```

Tunggu muncul:
```
[Nest] 12345 - 07/26/2026, 4:30 PM   LOG [NestFactory] Starting Nest application...
```

Port: http://localhost:3001

**Terminal 2 - Web (Next.js):**
```bash
cd apps/web
pnpm run dev
```

Tunggu muncul:
```
Ready in 2.1s
```

Port: http://localhost:3002

---

## Access Points (setelah semuanya running):

| Service | URL | Credentials |
|---------|-----|-------------|
| **API** | http://localhost:3001 | - |
| **Swagger Docs** | http://localhost:3001/api/docs | - |
| **Web Dashboard** | http://localhost:3002 | - |
| **Database** | localhost:54321 | ths_thm / ths_thm_password |
| **Redis** | localhost:6379 | - |
| **Prisma Studio** | http://localhost:5555 | (run `pnpm db:studio` in api folder) |

---

## Troubleshooting:

### Jika pnpm install masih berjalan:
Biarkan sebentar, tidak perlu di-stop. Anda bisa tunggu sampai selesai.

Cek ukuran folder `node_modules` untuk lihat progress:
```bash
du -sh node_modules/
```

### Database tidak terhubung:
```bash
# Cek docker containers
docker ps -a

# Restart if needed:
docker-compose restart
```

### Prisma migration error:
```bash
cd apps/api
# Reset database
npx prisma migrate reset

# Atau buat baru:
npx prisma migrate dev --name init
```

### Port sudah terpakai:
Ubah di `docker-compose.yml`:
```yaml
postgres:
  ports:
    - '54322:5432'  # Ganti 54321 ke nomor lain
```

---

## Checklist:

- [x] Database & Redis running
- [ ] pnpm install selesai
- [ ] Prisma migrate selesai  
- [ ] API running (port 3001)
- [ ] Web running (port 3002)

---

**Laporkan kapan pnpm install selesai, lalu kita lanjut ke tahap berikutnya!**
