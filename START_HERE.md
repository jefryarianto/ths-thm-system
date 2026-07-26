# ✅ START DEVELOPMENT SEKARANG - Panduan Cepat

Database dan Redis sudah running. Sekarang kita setup API dan Web secara lokal (tidak perlu migration dulu).

## Step 1: Install pnpm global properly

```bash
npm uninstall -g pnpm
npm install -g pnpm@latest
```

Verify:
```bash
pnpm --version
```

## Step 2: Install Dependencies Lokal

```bash
cd F:\Coding\ths-thm-new\ths-thm-system
pnpm install
```

(Atau biarkan npm yang sudah terinstall tadi dipakai)

## Step 3: Buat .env di root project

```bash
DATABASE_URL=postgresql://ths_thm:[REDACTED]@localhost:54321/ths_thm_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-key-12345
JWT_REFRESH_SECRET=dev-refresh-secret-67890
NODE_ENV=development
APP_PORT=3001
```

## Step 4: Generate Prisma & Migrate

Buka **Command Prompt / PowerShell**:

```bash
cd F:\Coding\ths-thm-new\ths-thm-system\apps\api
npx prisma generate
npx prisma migrate reset --force
```

(Pilih "y" untuk reset database jika diminta)

## Step 5: Start API (Terminal 1)

```bash
cd F:\Coding\ths-thm-new\ths-thm-system\apps\api
pnpm run dev
```

Tunggu sampai muncul:
```
[Nest] 12345 - 07/26/2026 4:30 PM   LOG [NestFactory] Starting Nest application...
```

Buka: **http://localhost:3001/api/health**

## Step 6: Start Web (Terminal 2)

```bash
cd F:\Coding\ths-thm-new\ths-thm-system\apps\web
pnpm run dev
```

Tunggu sampai muncul:
```
Ready in 2.1s
```

Buka: **http://localhost:3002**

---

## ✅ Selesai!

| Service | URL |
|---------|-----|
| API | http://localhost:3001 |
| Swagger Docs | http://localhost:3001/api/docs |
| Web Dashboard | http://localhost:3002 |
| Database | localhost:54321 |
| Redis | localhost:6379 |

---

## Troubleshooting

### pnpm masih error:
Gunakan npm langsung:
```bash
npm install
cd apps/api
npm run dev

# Di terminal lain:
cd apps/web
npm run dev
```

### Database error:
```bash
docker-compose ps
# Pastikan postgres dan redis healthy

docker-compose logs postgres
```

### Migration error:
```bash
cd apps/api
npx prisma db push  # Alternative to migrate
```

---

Laporkan kapan sudah selesai! 🚀
