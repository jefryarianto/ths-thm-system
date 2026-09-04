# 🚀 Panduan Deployment ke ths-thm.cloud (IP: 202.10.34.209)

> **Domain:** ths-thm.cloud  
> **VPS IP:** 202.10.34.209  
> **Deploy User:** ths-thm  
> **Deploy Directory:** /opt/ths-thm

---

## 📋 Prasyarat

### 1. DNS Configuration
Pastikan DNS A record untuk `ths-thm.cloud` dan `www.ths-thm.cloud` sudah mengarah ke `202.10.34.209`:

```
A    ths-thm.cloud        → 202.10.34.209
A    www.ths-thm.cloud    → 202.10.34.209
```

### 2. SSH Key
Generate SSH key untuk deployment (di komputer lokal):

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\ths-thm-deploy" -C "ths-thm-deploy"

# Copy public key ke VPS
type "$env:USERPROFILE\.ssh\ths-thm-deploy.pub" | ssh root@202.10.34.209 "mkdir -p /home/ths-thm/.ssh && cat >> /home/ths-thm/.ssh/authorized_keys && chown -R ths-thm:ths-thm /home/ths-thm/.ssh"
```

### 3. GitHub Token (untuk GHCR)
1. Buka https://github.com/settings/tokens
2. Generate new token (classic) → scope: `read:packages`, `write:packages`
3. Simpan token untuk login Docker

---

## 🔧 Langkah 1: Setup VPS (Eksekusi di VPS)

SSH ke VPS sebagai root:

```bash
ssh root@202.10.34.209
```

Jalankan setup script:

```bash
# Download dan jalankan setup script
curl -sf https://raw.githubusercontent.com/jefryarianto/ths-thm-system/master/scripts/setup-vps.sh -o setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

Script ini akan:
- ✅ Update sistem
- ✅ Install Docker & Docker Compose
- ✅ Buat user `ths-thm`
- ✅ Konfigurasi firewall (UFW)
- ✅ Install fail2ban (security)
- ✅ Setup database backup cron
- ✅ Install Certbot (Let's Encrypt)
- ✅ Scaffold .env files

---

## 🔐 Langkah 2: Konfigurasi .env di VPS

Edit file `.env` production di VPS:

```bash
ssh ths-thm@202.10.34.209
nano /opt/ths-thm/.env
```

Isi dengan nilai yang sebenarnya:

```env
# Production Environment — ths-thm.cloud
DB_PASSWORD=ganti_dengan_password_kuat
JWT_SECRET=ganti_dengan_random_64_char_string
JWT_REFRESH_SECRET=ganti_dengan_random_64_char_string_lain
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASS=app_password_gmail
FCM_PROJECT_ID=firebase-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----"
FCM_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
GHCR_REGISTRY=ghcr.io
GHCR_REPO=jefryarianto/ths-thm-system
IMAGE_TAG=latest
```

**Generate JWT secrets:**
```bash
openssl rand -hex 32  # untuk JWT_SECRET
openssl rand -hex 32  # untuk JWT_REFRESH_SECRET
```

---

## 🌐 Langkah 3: Setup SSL Certificate (Let's Encrypt)

Di VPS, jalankan:

```bash
# Stop nginx jika sedang running
docker compose -f /opt/ths-thm/docker-compose.production.yml stop nginx 2>/dev/null || true

# Obtain SSL certificate
sudo certbot certonly --standalone -d ths-thm.cloud -d www.ths-thm.cloud

# Cert akan tersimpan di:
# /etc/letsencrypt/live/ths-thm.cloud-0001/fullchain.pem
# /etc/letsencrypt/live/ths-thm.cloud-0001/privkey.pem
```

---

## 🐳 Langkah 4: Login ke GHCR di VPS

```bash
ssh ths-thm@202.10.34.209
echo "GITHUB_TOKEN_ANDA" | docker login ghcr.io -u jefryarianto --password-stdin
```

---

## 🚀 Langkah 5: Deploy dari Komputer Lokal

### Opsi A: Deploy via PowerShell Script (Recommended)

```powershell
# Deploy ke production
.\deploy-to-vps.ps1 production

# Skip build (jika image sudah ada di GHCR)
.\deploy-to-vps.ps1 production -NoBuild

# Build tanpa cache
.\deploy-to-vps.ps1 production -NoCache
```

### Opsi B: Deploy via CI/CD (Otomatis)

Push ke branch `master` akan otomatis trigger deployment:

```bash
git push origin master
```

**Pastikan GitHub Secrets sudah diisi:**
- `VPS_SSH_HOST` = 202.10.34.209
- `VPS_SSH_USERNAME` = ths-thm
- `VPS_SSH_PRIVATE_KEY` = (isi private key SSH)
- `VPS_SSH_PORT` = 22

### Opsi C: Deploy Manual di VPS

```bash
ssh ths-thm@202.10.34.209
cd /opt/ths-thm

# Pull latest images
docker compose -f docker-compose.production.yml pull

# Run migrations
docker compose -f docker-compose.production.yml run --rm api sh -c "cd apps/api && npx prisma migrate deploy"

# Start services
docker compose -f docker-compose.production.yml up -d --remove-orphans

# Check health
docker compose -f docker-compose.production.yml ps
curl http://localhost:3001/api/health
```

---

## ✅ Verifikasi Deployment

### 1. Cek Health API
```bash
curl https://ths-thm.cloud/api/health
```

### 2. Cek Container Status
```bash
ssh ths-thm@202.10.34.209
docker compose -f /opt/ths-thm/docker-compose.production.yml ps
```

### 3. Cek Logs
```bash
# API logs
docker compose -f /opt/ths-thm/docker-compose.production.yml logs api --tail=50

# Web logs
docker compose -f /opt/ths-thm/docker-compose.production.yml logs web --tail=50

# Nginx logs
docker compose -f /opt/ths-thm/docker-compose.production.yml logs nginx --tail=50
```

### 4. Akses Aplikasi
- **Frontend:** https://ths-thm.cloud
- **API:** https://ths-thm.cloud/api
- **Swagger Docs:** https://ths-thm.cloud/api/docs

---

## 🔄 Maintenance Commands

### Restart Services
```bash
ssh ths-thm@202.10.34.209
cd /opt/ths-thm
docker compose -f docker-compose.production.yml restart
```

### Update Deployment
```bash
# Pull latest dan restart
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --remove-orphans
```

### Database Backup
```bash
/opt/ths-thm/scripts/backup-database.sh
```

### View Database
```bash
docker compose -f /opt/ths-thm/docker-compose.production.yml exec postgres psql -U ths_thm -d ths_thm_db
```

### SSL Renewal (otomatis, tapi bisa manual)
```bash
sudo certbot renew
docker compose -f /opt/ths-thm/docker-compose.production.yml exec nginx nginx -s reload
```

---

## 🚨 Troubleshooting

### Container tidak mau start
```bash
# Cek logs
docker compose -f /opt/ths-thm/docker-compose.production.yml logs api

# Cek environment variables
docker compose -f /opt/ths-thm/docker-compose.production.yml config
```

### SSL certificate error
```bash
# Cek certificate
sudo certbot certificates

# Renew
sudo certbot renew --force-renewal -d ths-thm.cloud -d www.ths-thm.cloud
```

### Database connection error
```bash
# Cek postgres container
docker compose -f /opt/ths-thm/docker-compose.production.yml logs postgres

# Test connection
docker compose -f /opt/ths-thm/docker-compose.production.yml exec postgres pg_isready -U ths_thm -d ths_thm_db
```

### Disk space full
```bash
# Cek disk usage
df -h

# Cleanup Docker
docker system prune -af
docker volume prune -f
```

### SSH connection timed out / VPS unreachable from GitHub Actions
```bash
# Run these FROM YOUR MACHINE — the GitHub runner shares NO network path with the VPS:
ping 202.10.34.209
nc -zv 202.10.34.209 22          # 22 = default; change if VPS_SSH_PORT is custom
ssh -i ~/.ssh/ths-thm-deploy -p 22 ths-thm@202.10.34.209 echo OK
```
If any of these time out, the VPS is unreachable at the network layer. The workflow error
`ssh: connect to host ... port ...: Connection timed out` confirms this. Verify in order:

1. **VPS powered off / crashed / rebooted by provider** — start or hard-reboot it in your
   cloud provider dashboard. This is the most common cause.
2. **VPS IP changed** — the documented IP is `202.10.34.209`. If your provider reassigned
   it, update the GitHub secret `VPS_SSH_HOST`.
3. **Firewall / security group** — only ports 22/80/443 are allowed (UFW). A removed or
   reordered rule, or fail2ban banning the GitHub runner range, drops the SYN silently.
   Re-allow SSH: `sudo ufw allow 22` (and the cloud security group inbound rule).
4. **sshd not running** — via the provider console/VNC (SSH is down): `sudo systemctl
   status ssh`, then `sudo systemctl restart ssh`.
5. **Stale GitHub secrets** — verify `VPS_SSH_HOST`, `VPS_SSH_PORT`, `VPS_SSH_USERNAME`,
   and `VPS_SSH_PRIVATE_KEY` under repo Settings → Secrets and variables → Actions.

> Tip: the workflow now starts with a **Check VPS SSH connectivity** gate that fails fast
> with this checklist if the host is unreachable, so a down VPS surfaces immediately
> instead of as a raw `Connection timed out` deep in the deploy steps.

---

## 📊 Arsitektur Deployment

```
Internet → Nginx (80/443) → API (3001) → PostgreSQL (5432)
                        ↓              ↓
                     Web (3000)    Redis (6379)
```

| Service  | Port | Container Name         |
|:---------|:-----|:-----------------------|
| Nginx    | 80, 443 | ths-thm-nginx       |
| API      | 3001 | ths-thm-api            |
| Web      | 3000 | ths-thm-web            |
| PostgreSQL | 5432 | ths-thm-db          |
| Redis    | 6379 | ths-thm-redis          |

---

## 🔒 Security Checklist

- [x] Firewall (UFW) — hanya port 22, 80, 443
- [x] fail2ban — proteksi brute force
- [x] SSL/TLS — Let's Encrypt
- [x] Security headers — HSTS, CSP, X-Frame-Options
- [x] Rate limiting — API & login endpoint
- [x] Docker log rotation — prevent disk full
- [x] Database backup — daily at 2 AM

---

## 📝 Quick Deploy (Cepat)

Jika VPS sudah disetup sebelumnya dan hanya ingin update deployment:

```powershell
# 1. Pastikan Docker Desktop running
# 2. Login ke GHCR
echo "GITHUB_TOKEN" | docker login ghcr.io -u jefryarianto --password-stdin

# 3. Deploy!
.\deploy-to-vps.ps1 production
```

Atau cukup:
```bash
git push origin master
```

---

*Generated untuk deployment ke ths-thm.cloud (IP: 202.10.34.209)*