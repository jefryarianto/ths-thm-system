# Quick Start - THS-THM System Development (No Docker Build)

Ini adalah cara tercepat untuk menjalankan sistem dalam mode development tanpa perlu build Docker image yang memakan waktu.

## Setup Database & Redis (Docker)

Jalankan untuk pertama kali:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Ini akan start PostgreSQL dan Redis. Tunggu hingga keduanya healthy (~30 detik).

Cek status:
```bash
docker-compose -f docker-compose.dev.yml ps
```

## Setup Dependencies (Local Machine)

Pastikan sudah install:
- **Node.js 20+** (download dari nodejs.org)
- **pnpm 9.15+** (run `npm install -g pnpm@9.15.4`)

Di root project, jalankan:

```bash
pnpm install
```

Tunggu semua dependencies selesai terinstall (~5-10 menit tergantung internet).

## Generate Prisma & Database

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
```

Pilih nama migration (atau tekan Enter untuk default).

Ini akan membuat schema database di PostgreSQL.

## Running Development Servers

Buka 2 terminal terpisah:

### Terminal 1 - API (NestJS)
```bash
cd apps/api
pnpm run dev
```

Tunggu sampai terbuka pada port 3001. Cek: http://localhost:3001/api/health

### Terminal 2 - Web (Next.js)
```bash
cd apps/web
pnpm run dev
```

Tunggu sampai terbuka pada port 3002. Cek: http://localhost:3002

## Access Points

- **API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs (Swagger)
- **Web Dashboard**: http://localhost:3002
- **Database**: localhost:54321 (user: ths_thm, password: ths_thm_password)
- **Redis**: localhost:6379

## Database Management

### Prisma Studio (GUI Database)
```bash
cd apps/api
pnpm run db:studio
```

Buka: http://localhost:5555

### Prisma Migrate
```bash
cd apps/api
npx prisma migrate dev
```

### Seed Database
```bash
cd apps/api
pnpm run db:seed
```

## Environment Variables

Pastikan `.env` ada di root project (copy dari `.env.example` jika belum):

```bash
DATABASE_URL=postgresql://ths_thm:ths_thm_password@localhost:54321/ths_thm_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-dev-secret-key-here
JWT_REFRESH_SECRET=your-dev-refresh-secret-here
```

## Useful Commands

### Stop Services
```bash
docker-compose -f docker-compose.dev.yml down
```

### Reset Database
```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
cd apps/api
npx prisma migrate dev
```

### View Logs
```bash
# PostgreSQL logs
docker-compose -f docker-compose.dev.yml logs postgres

# Redis logs
docker-compose -f docker-compose.dev.yml logs redis
```

### Run Tests
```bash
cd apps/api
pnpm test
pnpm test:cov
pnpm test:e2e
```

### Format & Lint
```bash
pnpm format
pnpm lint
pnpm typecheck
```

## Troubleshooting

### Database connection refused
```bash
# Make sure containers are running
docker-compose -f docker-compose.dev.yml ps

# If not running:
docker-compose -f docker-compose.dev.yml up -d
```

### Port already in use
Ganti port di `.env`:
```
API port: change `3001` to `3005` when starting API
Web port: change `3002` to `3006` when starting Web
DB port: change `54321` to `54322` in `docker-compose.dev.yml`
```

### Node modules issues
```bash
# Clear and reinstall
rm -r node_modules apps/api/node_modules apps/web/node_modules
pnpm install
```

### Migration stuck/error
```bash
cd apps/api
npx prisma migrate reset
npx prisma migrate dev
```

## Development Workflow

1. Edit code in `apps/api/src` atau `apps/web`
2. Changes auto-reload dalam development servers
3. Check logs untuk debugging
4. Test dengan `pnpm test`
5. Commit & push

---

**Selesai!** Anda sekarang sudah bisa develop THS-THM System secara lokal. 

Untuk pertanyaan lebih lanjut, lihat README.md atau DOCKER_DEV_SETUP.md.
