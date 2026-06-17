# Plan: Payment Gateway — Midtrans Snap

## Konteks

Stripe integration sudah ada tapi tidak operasional (no env vars, no Stripe account). Sistem perlu payment gateway untuk iuran online. Midtrans adalah pilihan terbaik untuk Indonesia (Snap hosted payment page, dukungan bank transfer, e-wallet, dll).

## Task

### Task 1: Install midtrans-client + Setup Config

- `pnpm add midtrans-client` di apps/api
- Tambah env vars: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_MERCHANT_ID`
- Update `.env.example`

### Task 2: Add Payment Transaction Model

Prisma schema: tambah model `PaymentTransaction` untuk tracking individual payment attempts:

- `id`, `iuranId`, `orderId`, `amount`, `status`, `paymentType`, `transactionId`, `rawResponse`
- Relasi ke `Iuran`

### Task 3: Create Midtrans Service

Refactor `PaymentsService` → ganti Stripe dengan Midtrans:

- `createSnapToken(iuranId, amount)` — generate Snap token via Midtrans Core API
- `handleNotification(payload)` — handle Midtrans HTTP notification (webhook)
- Status mapping: `settlement` → `lunas`, `pending` → `menunggu_verifikasi`, `expire`/`deny`/`cancel` → `belum_dibayar`

### Task 4: Payment Endpoints

- `POST /api/payments/snap-token` — generate Snap token
- `POST /api/payments/notification` — Midtrans webhook (public)
- `POST /api/dues/:id/payments` — fix broken endpoint for manual confirmation (mobile app)

### Task 5: Fix Mobile App Payment Flow

- Update `dues/detail.tsx` — integrate Midtrans Snap SDK (redirect to Snap page)
- Fix `POST /dues/:id/payments` call

### Task 6: Update Web App

- Add "Bayar Online" button di dues page
- Redirect ke Midtrans Snap page

## Urutan Pengerjaan

| #   | Task                 | Prioritas |
| --- | -------------------- | --------- |
| 1   | Install + config     | High      |
| 2   | Prisma Payment model | High      |
| 3   | Midtrans service     | High      |
| 4   | Payment endpoints    | High      |
| 5   | Fix mobile payment   | Medium    |
| 6   | Update web payment   | Medium    |
