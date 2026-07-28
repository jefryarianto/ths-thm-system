# 📱 Mobile App — PRD Status Dashboard

> **Last updated:** 28 Juli 2026
> **Total PRDs:** 4 (2 implemented ✅, 2 documented 📄)

---

## 🏆 Ringkasan

| PRD | Status | Files Changed | Backend | Mobile | Effort |
|:----|:------:|:-------------:|:-------:|:------:|:------|
| **QR Check-in + Multi-Kegiatan** | ✅ **Selesai** | 4 | 0 | 4 | Sprint 1 |
| **Input Nilai Pendadaran** | ✅ **Selesai** | 6 | 0 | 6 | Sprint 2 |
| **Approval Workflow** | ✅ **Selesai** | 7 | 0 | 7 | Sprint 3 |
| **Push Notification Approval** | ✅ **Selesai** | 5 | 3 | 2 | Sprint 4 |
| **Approval Reference Detail** | 📄 **PRD Only** | 4 | 0 | 4 | Enhancement |

**Total: 4 PRDs → 4 implemented ✅, 1 documented 📄**

---

## 1. QR Check-in + Multi-Kegiatan — Sprint 1 ✅

**PRD:** `docs/PRD-MOBILE-SCORING.md` (first section — QR check-in)

### File Mapping

| File | Action | Backend | Mobile |
|:-----|:------:|:-------:|:------:|
| `app/(tabs)/_layout.tsx` | Modified | — | ✅ |
| `src/screens/qr-scan/index.tsx` | Created | — | ✅ |
| `src/screens/activities/detail.tsx` | Modified | — | ✅ |
| `src/screens/trainings/detail.tsx` | Modified | — | ✅ |

### Key Features
- ✅ Badge kegiatan aktif di tab Scan QR
- ✅ Dropdown + chips selector multi-kegiatan (activities + trainings)
- ✅ Endpoint routing by type (`/trainings/:id/attendances` vs `/activities/:id/presence`)
- ✅ QR Code di halaman detail activities + trainings
- ✅ Scan history with AsyncStorage

### API Dependencies (all existing)
- `GET /activities?status=published`
- `GET /trainings`
- `POST /trainings/:id/attendances`
- `POST /activities/:id/presence`

---

## 2. Input Nilai Pendadaran — Sprint 2 ✅

**PRD:** `docs/PRD-MOBILE-SCORING.md`

### File Mapping

| File | Action | Backend | Mobile |
|:-----|:------:|:-------:|:------:|
| `src/hooks/use-scoring.ts` | **Created** | — | ✅ |
| `src/screens/graduations/input-score.tsx` | **Created** | — | ✅ |
| `app/graduations/input-score.tsx` | **Created** | — | ✅ |
| `app/_layout.tsx` | Modified | — | ✅ |
| `src/screens/graduations/detail.tsx` | Modified | — | ✅ |

### Key Features
- ✅ 5-state machine: loading → select participant → input scores → submitting → confirm
- ✅ Aspek cards with item-level scoring (+/- 5 buttons + TextInput)
- ✅ Real-time progress bar (hijau ≥70%, kuning 40-69%, merah <40%)
- ✅ Fixed bottom submit bar with total score
- ✅ Validation: all items required, range 0+
- ✅ Confirm screen with score summary + Nilai Peserta Lain / Kembali
- ✅ Input Nilai button in evaluations tab (visible for penguji/admin/admin_kegiatan)

### API Dependencies (all existing)
- `GET /graduations/:id/participants`
- `GET /graduations/:kegiatanId/ujian-praktek`
- `GET /assessments/aspects`
- `GET /assessments/items?aspekId=xxx`
- `POST /graduations/:kegiatanId/ujian-praktek/:id/score`

### Code Review Fixes
| Issue | Fix |
|:------|:----|
| `admin_kegiatan` excluded from button | Added role check |
| `FilterChips` unused import | Removed |
| Score validation hardcoded `<= 100` | Made permissive, let backend validate |
| Error banner + list shown simultaneously | Blocked list when error present |

---

## 3. Approval Workflow — Sprint 3 ✅

**PRD:** `docs/PRD-MOBILE-APPROVALS.md`

### File Mapping

| File | Action | Backend | Mobile |
|:-----|:------:|:-------:|:------:|
| `src/hooks/use-approvals.ts` | **Created** | — | ✅ |
| `src/screens/approvals/index.tsx` | **Created** | — | ✅ |
| `src/screens/approvals/[id].tsx` | **Created** | — | ✅ |
| `app/approvals.tsx` | **Created** | — | ✅ |
| `app/approvals/[id].tsx` | **Created** | — | ✅ |
| `app/_layout.tsx` | Modified | — | ✅ |
| `src/screens/members/home.tsx` | Modified | — | ✅ |

### Enhancement: Filter Chips by RequestType ✅

| File | Action | Backend | Mobile |
|:-----|:------:|:-------:|:------:|
| `src/hooks/use-approvals.ts` | Modified | — | ✅ |
| `src/screens/approvals/index.tsx` | Modified | — | ✅ |

### Key Features
- ✅ List page with inline approve/reject + level dots
- ✅ Detail page with timeline (vertical) + level cards
- ✅ Approve/reject with optional note (Alert confirmation)
- ✅ Loading/error/empty states
- ✅ Quick action card on home screen
- ✅ Filter chips by requestType (client-side)
- ✅ `member_update` grouped under "Anggota" filter

### API Dependencies (all existing)
- `GET /approvals/pending`
- `GET /approvals/:id`
- `POST /approvals/:id/approve`
- `POST /approvals/:id/reject`

---

## 4. Push Notification Approval — Sprint 4 ✅

**PRD:** `docs/PRD-MOBILE-PUSH-APPROVALS.md`

### File Mapping

| File | Action | Backend | Mobile |
|:-----|:------:|:-------:|:------:|
| `src/modules/approvals/approval.service.ts` | Modified | ✅ | — |
| `src/modules/approvals/approval.module.ts` | Modified | ✅ | — |
| `src/modules/notifications/notifications.service.ts` | Modified | ✅ | — |
| `app/_layout.tsx` | Modified | — | ✅ |
| `src/hooks/use-notifications.ts` | Modified | — | ✅ |

### Key Features
- ✅ `ApprovalService` now calls `NotificationsService.send()` — not just in-app notif
- ✅ One call handles: in-app notif + FCM push + socket.io + email + preference check + cache
- ✅ Deep link from FCM push → `/approvals/{screenId}`
- ✅ `approval_request` notification type (user can toggle preferences)
- ✅ ✅ icon for approval notifications
- ✅ Graceful degradation (`.catch()` + `@Optional()`)

### Code Review Fixes
| Issue | Fix |
|:------|:----|
| 🔴 Double in-app notification | Removed direct `prisma.notifikasi.create()`, let `send()` handle |
| 🟡 Dead import `Inject` | Removed from import |
| 🟡 Unused `namaLengkap: true` in select | Changed to `select: { id: true }` |

### Architecture

```
Approval submit
  → notifyApprovers()
    → NotificationsService.send()  ← ONE CALL
      → preference check → in-app → email → FCM → socket → cache
```

---

## 5. Approval Reference Detail — 📄 PRD Only

**PRD:** `docs/PRD-MOBILE-REFERENCE.md`

### File Mapping (planned)

| File | Action | Backend | Mobile | Status |
|:-----|:------:|:-------:|:------:|:------:|
| `src/hooks/use-approvals.ts` | Modified | — | ✅ `getReferenceRoute()` | 📄 Planned |
| `src/screens/approvals/[id].tsx` | Modified | — | ✅ Nav button | 📄 Planned |
| `src/screens/approvals/reference-claim.tsx` | **Created** | — | ✅ New screen | 📄 Planned |
| `app/approvals/reference-claim.tsx` | **Created** | — | ✅ Route | 📄 Planned |
| `app/_layout.tsx` | Modified | — | ✅ Route registration | 📄 Planned |

### Reference Navigation Strategy

| requestType | itemId → | Reuse Screen | Status |
|:------------|:---------|:------------:|:------|
| `member_create` / `member_update` | `Anggota.id` | ✅ `members/[id]` | Existing |
| `claim` | `Klaim.id` | ❌ **Need new screen** | 📄 Planned |
| `letter` | `SuratKeluar.id` | ✅ `letters/[id]` | Existing |
| `certificate` | `Dokumen.id` | ✅ `documents/[id]` | Existing |

**Effort estimate:** 2-3 hari (mostly building claim reference screen)

---

## 6. Total Impact

### Lines of Code

| PRD | Files | Lines Added | Type |
|:----|:-----:|:-----------:|:-----|
| QR Check-in | 4 | ~300 | Mobile |
| Input Nilai Pendadaran | 6 | ~650 | Mobile |
| Approval Workflow | 7 | ~550 | Mobile |
| Push Notification Approval | 5 | ~40 | Backend + Mobile |
| **Total Implemented** | **22** | **~1,540** | — |

### Backend vs Mobile Breakdown

| Layer | Files Changed | Type |
|:------|:------------:|:-----|
| Backend (`apps/api/`) | 3 | `approval.service.ts`, `approval.module.ts`, `notifications.service.ts` |
| Mobile (`apps/mobile/`) | 19 | hooks, screens, routes, layouts |

### API Dependencies

**Total API endpoints used (all existing, no new):** 16

| Endpoint | PRD |
|:---------|:----|
| `GET /activities` | QR Check-in |
| `GET /trainings` | QR Check-in |
| `POST /trainings/:id/attendances` | QR Check-in |
| `POST /activities/:id/presence` | QR Check-in |
| `GET /graduations/:id/participants` | Input Nilai |
| `GET /graduations/:kegiatanId/ujian-praktek` | Input Nilai |
| `GET /assessments/aspects` | Input Nilai |
| `GET /assessments/items` | Input Nilai |
| `POST /graduations/:kegiatanId/ujian-praktek/:id/score` | Input Nilai |
| `GET /approvals/pending` | Approvals |
| `GET /approvals/:id` | Approvals |
| `POST /approvals/:id/approve` | Approvals |
| `POST /approvals/:id/reject` | Approvals |
| `GET /members/:id` | Reference Detail (planned) |
| `GET /claims/:id` | Reference Detail (planned) |
| `GET /letters/:id` | Reference Detail (planned) |
| `GET /documents/:id` | Reference Detail (planned) |

---

## 7. Rekomendasi Prioritas

| Prioritas | Item | Reason |
|:---------:|:-----|:-------|
| 🥇 **Tinggi** | **Implement Reference Detail** | US-06 dari PRD Approvals — admin perlu verifikasi data tanpa buka web. 2-3 hari. |
| 🥇 **Tinggi** | **Approval badge count on home** | Admin perlu tahu jumlah pending approval dari halaman utama. 0.5 hari. |
| 🥈 **Sedang** | **Approval real-time via socket** | Badge count update real-time ketika approval baru masuk. 1 hari. |
| 🥈 **Sedang** | **QR Scan — parse QR payload for Kegiatan** | Auto-verify kesesuaian QR dengan kegiatan yang dipilih. 1 hari. |
| 🥉 **Rendah** | **Filter chips animation** | Animated transitions pada filter chips. 0.5 hari. |

---

## 8. File Index — All Modified Files

### `apps/mobile/` (19 files)

```
src/
├── hooks/
│   ├── use-approvals.ts          # Approvals (✅ + 📄 planned enhancement)
│   ├── use-scoring.ts            # Scoring (✅)
│   └── use-notifications.ts       # Push notif (✅)
├── screens/
│   ├── approvals/
│   │   ├── index.tsx              # Approvals list (✅)
│   │   └── [id].tsx               # Approvals detail (✅ + 📄 planned nav button)
│   ├── graduations/
│   │   ├── input-score.tsx        # Scoring form (✅)
│   │   └── detail.tsx             # Grad detail + Input Nilai button (✅)
│   ├── activities/
│   │   └── detail.tsx             # QR code for check-in (✅)
│   ├── trainings/
│   │   └── detail.tsx             # QR code for check-in (✅)
│   ├── members/
│   │   └── home.tsx               # Persetujuan quick action (✅)
│   └── qr-scan/
│       └── index.tsx              # Multi-kegiatan scanner (✅)
app/
├── _layout.tsx                    # Routes + FCM deep link (✅)
├── (tabs)/_layout.tsx             # Kegiatan badge on scan tab (✅)
├── approvals.tsx                  # Route (✅)
├── approvals/[id].tsx             # Route (✅)
└── graduations/
    └── input-score.tsx            # Route (✅)
```

### `apps/api/` (3 files)

```
src/modules/
├── approvals/
│   ├── approval.service.ts        # FCM push via NotificationsService (✅)
│   └── approval.module.ts         # Import NotificationsModule (✅)
└── notifications/
    └── notifications.service.ts   # approval_request NOTIFICATION_TYPE (✅)
```

---

*Dokumen ini dapat dijadikan referensi untuk tracking progress mobile implementation. 4 dari 5 PRD sudah fully implemented. Sisa: Reference Detail (2-3 hari effort).*
