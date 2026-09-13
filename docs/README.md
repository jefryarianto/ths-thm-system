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

| Dokumen                      | Isi                                                        |
| ---------------------------- | ---------------------------------------------------------- |
| `QUICK_START.md`             | Setup development lokal tercepat (tanpa build Docker)      |
| `DOCKER_DEV_SETUP.md`        | Setup development berbasis Docker                          |
| `DEPLOY-ths-thm.md`          | Prosedur deploy produksi                                   |
| `DEPLOYMENT_SAFETY.md`       | Aturan & checklist keamanan deployment                     |
| `EMAIL_SETUP.md`             | Konfigurasi email (Resend/SMTP)                            |
| `EMAIL_TEMPLATES.md`         | Template email sistem                                      |
| `FCM_SETUP.md`               | Konfigurasi Firebase Cloud Messaging (push notification)   |
| `TESTING.md`                 | Strategi & cara menjalankan test                           |
| `e2e-bullmq.md`              | Test E2E manual queue BullMQ (butuh Redis asli)            |
| `TENANT-ISOLATION.md`        | Isolasi data multi-tenant (distrik/wilayah/ranting)        |
| `COOKBOOK-BaseCrudService.md`| Pola service CRUD berbasis BaseCrudService                 |
| `REFACTOR_MIGRATION.md`      | Catatan migrasi refactor                                   |
| `MOBILE-ARCHITECTURE.md`     | Arsitektur aplikasi mobile                                 |
| `MOBILE-PRD-STATUS.md`       | Status PRD mobile                                          |
| `PRD-MOBILE-*.md`            | PRD fitur mobile (approvals, push, scoring, reference)     |
| `THM_SYSTEM_ANALYSIS.md`     | Analisis sistem THM                                        |
| `COMPLIANCE.md`              | Catatan kepatuhan                                          |

## Arsip

| Folder         | Deskripsi                                                     |
| -------------- | ------------------------------------------------------------- |
| `archive/`     | Dokumen usang / snapshot sesi lama — referensi, tidak dirawat |

> Konvensi penambahan dokumen: lihat [CONTRIBUTING.md](../CONTRIBUTING.md) —
> panduan baru masuk root `docs/` dan wajib didaftarkan di sini.
