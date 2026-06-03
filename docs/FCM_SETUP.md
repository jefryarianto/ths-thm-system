# Firebase Cloud Messaging (FCM) Setup Guide

## Overview
FCM digunakan untuk push notifications dari API ke mobile app (Android/iOS).

## Configuration

### 1. Buat Firebase Project
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Buat project baru atau gunakan project yang sudah ada
3. Enable Cloud Messaging di Project Settings

### 2. Generate Service Account Key
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save file JSON sebagai `firebase-service-account.json`
4. **Jangan commit ke git** (sudah ada di .gitignore)

### 3. Setup Environment Variables
Tambahkan ke file `.env` di root project:

```env
# Firebase FCM Configuration
FCM_PROJECT_ID=your-firebase-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

> **Note:** `FCM_PRIVATE_KEY` harus di-escape dengan `\n` untuk newline.

### 4. Setup Mobile App
1. Download `google-services.json` dari Firebase Console
2. Taruh di `apps/mobile/google-services.json` (sudah ada di .gitignore)
3. Install expo-notifications: sudah ada di `package.json`

## Flow
1. Mobile app login → `registerForPushNotifications()` dipanggil
2. Token didaftarkan ke `POST /api/notifications/fcm-token`
3. Admin kirim notifikasi via `POST /api/notifications/send` atau `/broadcast`
4. API push FCM ke semua device yang terdaftar
5. Mobile app terima notifikasi push

## Testing
- **Local:** FCM menggunakan mock logger (akan print ke console)
- **Production:** FCM mengirim push ke device fisik
- **Test command:** `POST /api/notifications/send` dengan userId yang punya device token

## Error Handling
- Token tidak valid → otomatis di-deactivate (cleanup)
- Firebase-admin tidak tersedia → fallback ke mock logger
- Batch size limit: 500 tokens per request (FCM limit)
