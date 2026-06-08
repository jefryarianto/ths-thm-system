# Email Setup Guide (Resend)

## Overview
Email dikirim dari API menggunakan **Resend** sebagai primary provider dan **SMTP** sebagai fallback. MailService sudah terintegrasi dan siap pakai.

## Architecture

```
sendMail()
  ├── NODE_ENV=development? → [DEV] log saja, tidak kirim
  ├── RESEND_API_KEY terisi? → Kirim via Resend API (native fetch) ✅
  └── SMTP_USER/PASS terisi? → Kirim via SMTP (nodemailer) ⬇️ fallback
```

## Configuration

### Opsi 1: Resend (Rekomendasi — Primary)

**1. Daftar Resend**
1. Buka [resend.com](https://resend.com) → Sign up (free tier: **100 email/hari**)
2. Free tier cukup untuk development dan testing awal

**2. Buat API Key**
1. Buka [resend.com/api-keys](https://resend.com/api-keys)
2. Klik **"Create API Key"**
3. Beri nama (contoh: `THS-THM Production`)
4. Copy API key (format: `re_xxx...`)

**3. Verifikasi Domain**
1. Buka [resend.com/domains](https://resend.com/domains)
2. Klik **"Add Domain"**
3. Masukkan domain/subdomain (contoh: `mail.ths-thm.cloud`)
   > Resend merekomendasikan subdomain untuk isolasi reputasi pengiriman
4. Resend akan generate **3 DNS records** (TXT untuk SPF, DKIM, DMARC)
5. Tambahkan records tersebut ke DNS provider (Cloudflare, dll)
6. Tunggu verifikasi (biasanya 1-5 menit)

**4. Set Environment Variables**
```env
# Resend (primary)
RESEND_API_KEY=re_xxx
RESEND_DOMAIN=mail.ths-thm.cloud
```

### Opsi 2: SMTP (Fallback)

Wajib install nodemailer:
```bash
cd apps/api && pnpm add nodemailer
```

```env
# SMTP (fallback, optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=your-app-password
```

> **Gmail**: Gunakan [App Password](https://myaccount.google.com/apppasswords) (aktifkan 2FA dulu)

---

## Di Mana Set Env Vars?

| Cara | Lokasi |
|------|--------|
| **Local development** | File `.env` di root project |
| **Docker** | `docker-compose.yml` → `environment:` section |
| **Render deployment** | Dashboard Render → Environment Variables |

---

## Endpoint Test

### `POST /api/mail/test`
Mengirim test email untuk memverifikasi konfigurasi.

**Request:**
```json
{
  "email": "admin@ths-thm.org"
}
```

**Response (sukses):**
```json
{
  "success": true,
  "message": "Test email sent successfully"
}
```

**Response (gagal):**
```json
{
  "success": false,
  "message": "Test email failed. Check API logs for details."
}
```

> **Note:** Endpoint hanya bisa diakses oleh role `superadmin`.

---

## Flow Pengiriman Email

### Forgot Password
```
User → POST /api/auth/forgot { email }
  ├── Cari user by email
  ├── Generate JWT reset token (exp: 1 jam)
  ├── Kirim email via MailService:
  │     To: user.email
  │     Subject: Reset Password THS-THM
  │     Body: Klik link untuk reset password
  └── Return { success: true }
```

### Reset Password
```
User → POST /api/auth/reset { token, newPassword }
  ├── Verify JWT token
  ├── Hash password baru
  ├── Update password di database
  └── Return { success: true }
```

---

## Testing

| Skenario | Cara Test |
|----------|-----------|
| **Dev mode** | `NODE_ENV=development` → email di-log, tidak dikirim |
| **Resend** | `NODE_ENV=production` + `RESEND_API_KEY` + `RESEND_DOMAIN` |
| **SMTP** | `NODE_ENV=production` + `SMTP_USER` + `SMTP_PASS` (dan `pnpm add nodemailer`) |
| **Test endpoint** | `POST /api/mail/test` dengan token superadmin |

---

## Error Handling

| Masalah | Yang Terjadi |
|---------|-------------|
| `RESEND_API_KEY` tidak set | Log warning, fallback ke SMTP |
| `RESEND_DOMAIN` tidak set | Log warning, fallback ke SMTP |
| Resend API error (4xx/5xx) | Log error, fallback ke SMTP |
| SMTP tidak dikonfigurasi | Log warning, email tidak terkirim |
| Nodemailer tidak terinstall | Log warning, SMTP skip |
| Network error | Log error, email tidak terkirim |

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RESEND_API_KEY` | Untuk Resend | - | API key dari resend.com/api-keys |
| `RESEND_DOMAIN` | Untuk Resend | - | Domain terverifikasi di Resend |
| `SMTP_HOST` | Untuk SMTP | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | Untuk SMTP | `587` | SMTP server port |
| `SMTP_USER` | Untuk SMTP | `''` | SMTP username/email |
| `SMTP_PASS` | Untuk SMTP | `''` | SMTP password/app password |
| `NODE_ENV` | Ya | `development` | `development` = log only, `production` = kirim beneran |
