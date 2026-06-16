# Changelog

## [Unreleased] — API Backend Refactoring & Mobile Cleanup

### ✨ Major Refactoring

#### 1. Pagination Utility (`common/utils/pagination.ts`)

- **NEW** `paginate(delegate, where, options)` — a generic pagination helper that accepts a Prisma delegate directly (e.g. `this.prisma.anggota`) instead of separate `findMany`/`count` callbacks
- Eliminated pagination boilerplate from **15+ service classes**
- All services now call `paginate(this.prisma.X, where, { page, limit, orderBy, include, select })`

#### 2. MemberMailService (`common/services/member-mail.service.ts`)

- **NEW** centralized email service for sending templated emails to members by their `anggotaId`
- Two methods:
  - `sendToMember(anggotaId, templateFn, logInfo, module)` — for templates needing only member name
  - `sendToMemberWithArgs(anggotaId, templateFn, extraArgs, logInfo, module)` — for templates needing additional parameters
- Both handle member lookup, email existence check, and error logging internally
- Consolidated email sending from **7 services** into one place

#### 3. ScopeHelper (`common/utils/scope-helpers.ts`)

- **NEW** `verifyResourceAccess(prisma, scope, resourceId, findUnique, resourceName)` — combines resource existence check + scope verification in a single call
- Eliminated the mutation-guard pattern from **5 services**

### 🔧 Service Refactoring

All `findAll`-style methods across 15+ services now use the unified `paginate()`:

- ActivitiesService, AssessmentsService, CandidatesService, ClaimsService, DocumentsService
- DuesService, ExaminersService, GraduationsService, LettersService, MembersService
- NotificationsService, OrgDocumentsService, RegistrationsService, TrainingsService, UsersService

Email methods consolidated to `MemberMailService`:

- MembersService (welcome email on create)
- CandidatesService (approval email on approve)
- DocumentsService (document ready notification)
- DuesService (payment confirmation)
- ActivitiesService (activity invitation)
- TrainingsService (training notification)

### 🧪 Testing

- **NEW** `pagination.spec.ts` — 5 unit tests covering defaults, custom page/limit, totalPages, Prisma options, and empty results
- **NEW** `member-mail.service.spec.ts` — 5 unit tests covering success path, no-email skip, not-found skip, error resilience, and extra-arg forwarding
- Updated **8 test spec files** with `MemberMailService` mocks and `verifyResourceAccess` mocks

### 📱 Mobile App Cleanup

- **NEW** `SearchBar` component in `shared.tsx` — reusable search bar with search icon, clear button, and placeholder support
- Refactored 3 screens to use shared `SearchBar`:
  - `screens/candidates/index.tsx`
  - `screens/trainings/index.tsx`
  - `screens/graduations/index.tsx`

### 🧹 Housekeeping

- Removed unused `MailService` injection from 4 services (MembersService, CandidatesService, DocumentsService, DuesService) + their test files
- Cleaned up unused `MailService` mock declarations from 4 test spec files

### 📊 Metrics

| Metric         | Value                       |
| -------------- | --------------------------- |
| Files changed  | ~50 files                   |
| Lines removed  | ~250+ duplicated code       |
| API TypeScript | ✅ Zero errors              |
| Web TypeScript | ✅ Zero errors              |
| API Tests      | ✅ 482/482 pass (37 suites) |
