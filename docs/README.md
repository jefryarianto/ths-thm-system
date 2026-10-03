# Dokumentasi Proyek THS-THM

Kumpulan dokumen perencanaan, spesifikasi, dan referensi pengembangan.

## Folder Perencanaan & Spesifikasi

| Folder       | Deskripsi                                                   |
| ------------ | ----------------------------------------------------------- |
| `SPEC/`      | Spesifikasi teknis sistem (arsitektur, stack, module spec)  |
| `PRD/`       | Product Requirement Document (fitur, user stories)          |
| `BRD/`       | Business Requirement Document (tujuan bisnis, stakeholder)  |
| `QA/`        | Test plan, test cases, dan quality assurance                |
| `Roadmap/`   | Timeline & milestone pengembangan                           |
| `API/`       | Dokumentasi REST API endpoint                               |
| `ERD/`       | Entity Relationship Diagram                                 |
| `DFD/`       | Data Flow Diagram                                           |
| `Roles/`     | Role definitions & permission matrix                        |
| `Prompt_AI/` | Prompt untuk AI-assisted development (Claude, GPT, Copilot) |

## Panduan Operasional (file di root `docs/`)

| Dokumen                       | Isi                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `QUICK_START.md`              | Setup development lokal tercepat (tanpa build Docker)                                                    |
| `DOCKER_DEV_SETUP.md`         | Setup development berbasis Docker                                                                        |
| `DEPLOY-ths-thm.md`           | Prosedur deploy produksi                                                                                 |
| `DEPLOYMENT_SAFETY.md`        | Aturan & checklist keamanan deployment                                                                   |
| `EMAIL_SETUP.md`              | Konfigurasi email (Resend/SMTP)                                                                          |
| `EMAIL_TEMPLATES.md`          | Template email sistem                                                                                    |
| `FCM_SETUP.md`                | Konfigurasi Firebase Cloud Messaging (push notification)                                                 |
| `TESTING.md`                  | Strategi & cara menjalankan test                                                                         |
| `e2e-bullmq.md`               | Test E2E manual queue BullMQ (butuh Redis asli)                                                          |
| `TENANT-ISOLATION.md`         | Isolasi data multi-tenant (distrik/wilayah/ranting)                                                      |
| `COOKBOOK-BaseCrudService.md` | Pola service CRUD berbasis BaseCrudService                                                               |
| `REFACTOR_MIGRATION.md`       | Catatan migrasi refactor                                                                                 |
| `MOBILE-ARCHITECTURE.md`      | ⚠️ Arsip — arsitektur app mobile RN/Expo lama (kini Flutter)                                             |
| `MOBILE-PRD-STATUS.md`        | ⚠️ Snapshot historis — status PRD mobile (app RN/Expo lama)                                              |
| `PRD-MOBILE-*.md`             | PRD fitur mobile (approvals, push, scoring, reference) — kini diimplementasikan di `apps/mobile_flutter` |
| `THM_SYSTEM_ANALYSIS.md`      | Analisis sistem THM                                                                                      |
| `COMPLIANCE.md`               | Catatan kepatuhan (bagian mobile = arsip RN/Expo lama)                                                   |
| `SECURITY.md`                 | Keamanan repo: secret scanning gitleaks (hook + CI)                                                      |
| `CI_WORKFLOW_AUDIT.md`        | ⚠️ Snapshot audit workflow CI per 2026-09-15                                                             |

## Arsip

| Folder     | Deskripsi                                                     |
| ---------- | ------------------------------------------------------------- |
| `archive/` | Dokumen usang / snapshot sesi lama — referensi, tidak dirawat |

> Konvensi penambahan dokumen: lihat [CONTRIBUTING.md](../CONTRIBUTING.md) —
> panduan baru masuk root `docs/` dan wajib didaftarkan di sini.
