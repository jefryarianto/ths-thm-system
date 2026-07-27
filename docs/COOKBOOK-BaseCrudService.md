# Cookbook: Refactor Service ke BaseCrudService

> **Versi:** 2.0 — Terakhir diperbarui: 28 Juli 2026  
> **Service sudah direfactor:** 16 (trainings, candidates, members, examiners, dues, activities, claims, registrations, users, graduations, org-documents, monitoring, rewards, letters, aspects, forum-categories)  
> **Total boilerplate dieliminasi:** ~1.740 lines  
> **`as any`/`as never` dieliminasi:** ~25  
> **Manual `{ success: true }` wrappers dihapus:** ~140  
> **Controllers dengan `@CrudAuth()`:** 15

---

## Daftar Isi

1. [Apa Itu BaseCrudService?](#1-apa-itu-basecrudservice)
2. [Kapan Service Cocok Direfactor?](#2-kapan-service-cocok-direfactor)
3. [Quick Start: Template Minimal](#3-quick-start-template-minimal)
4. [Step-by-Step Refactor](#4-step-by-step-refactor)
5. [Config Options Reference](#5-config-options-reference)
6. [Hook API Reference](#6-hook-api-reference)
7. [Scope Strategies](#7-scope-strategies)
8. [Response Wrapping & Interceptor](#8-response-wrapping--interceptor)
9. [P2025 Auto-Conversion](#9-p2025-auto-conversion)
10. [Menggunakan `@CrudAuth()` di Controller](#10-menggunakan-crudauth-di-controller)
11. [Contoh Real dari 16 Service](#11-contoh-real-dari-16-service)
12. [Troubleshooting](#12-troubleshooting)
13. [Checklist Refactor](#13-checklist-refactor)
14. [Appendix: Full Service Audit](#14-appendix-full-service-audit)

---

## 1. Apa Itu BaseCrudService?

`BaseCrudService<TCreateDto, TUpdateDto>` adalah abstract class generik yang menyediakan 5 operasi CRUD standar dan mengelola otomatis:

| Method | Fungsi | Otomatis Dikelola |
|:-------|:-------|:------------------|
| `baseFindAll` | Paginated list + cache | Scope filter, pagination, TTL-based caching, response formatting |
| `baseFindOne` | Single entity by ID | `NotFoundException`, scope verification, include/select support |
| `baseCreate` | Create entity | Hook `beforeCreate` (transform DTO) + `afterCreate` (side effects), cache invalidation |
| `baseUpdate` | Update entity | Scope verification, hook `beforeUpdate` + `afterUpdate`, P2025 → NotFoundException, cache invalidation |
| `baseRemove` | Hard/soft delete | Scope verification, P2025 → NotFoundException, cache invalidation, `afterRemove` hook |

### Otomatis Dikelola Oleh Base

```
FindOne:      findUnique → NotFoundException? → verifyScope → return entity
FindAll:      cache.getOrSet() → buildWhere → paginate → return { data, meta }
Create:       beforeCreate() → prisma.create() → afterCreate() → invalidateCache → return { data, message }
Update:       verifyScope() → beforeUpdate() → prisma.update() → [P2025 → 404] → afterUpdate() → invalidateCache
Remove:       verifyScope() → beforeRemove() → prisma.delete()/update() → [P2025 → 404] → afterRemove() → invalidateCache
```

### Yang Dieliminasi Per Service (~40-110 lines)

| Boilerplate | Sebelum | Sesudah |
|:------------|:--------|:--------|
| `private readonly logger` | 3 lines | Inherited |
| `new Logger(...)` | 1 line | `this.logger` from base |
| `if (!entity) throw NotFoundException(...)` | 2-3× | Base throws otomatis |
| `{ success: true, data }` | 8-10× | TransformInterceptor |
| `as never` / `as any` casts | 1-4× | `Record<string, unknown>` via hooks |
| Manual `paginate()` | 5 lines | `baseFindAll` |
| Manual scope verification | 6-10 lines | `verifyScope` |
| Cache invalidation | 3 lines | `this.invalidateCache()` |
| `catch (P2025)` manual | 4 lines | Base handles otomatis |

---

## 2. Kapan Service Cocok Direfactor?

### ✅ Category A — Siap Refactor

Service dengan **satu Prisma model** dan **5 CRUD method standar** (findAll, findOne, create, update, remove).

| Ciri | Contoh Service |
|:-----|:---------------|
| Tanpa scope (public/global) | `ExaminersService`, `RegistrationsService`, `ForumCategoryService` |
| Scope `ranting` langsung | `TrainingsService`, `MembersService`, `CandidatesService`, `UsersService` |
| Scope `kegiatan` (scopeType/scopeId) | `ActivitiesService`, `GraduationsService` |
| Scope `anggota_indirect` | `DuesService`, `ClaimsService` |

**Siap:** 14 dari 16 service yang sudah direfactor masuk kategori ini.

### ⚠️ Category B — Sebagian Bisa Refactor

Service dengan CRUD standar **plus beberapa domain method**:

- CRUD methods → refactor ke BaseCrudService
- Domain methods → tetap manual, panggil `baseXxx` secara internal

| Service | CRUD Direfactor | Domain Methods Tetap |
|:--------|:----------------|:---------------------|
| `MembersService` | ✅ standar + soft delete | importCsv, exportCsv, getByRanting |
| `CandidatesService` | ✅ standar | approve, reject, validate |
| `ActivitiesService` | ✅ kegiatan scope | addParticipant, importParticipants, recordPresence |
| `UsersService` | ✅ standar | (login-related helpers) |

### ❌ Category C — Tidak Cocok

Service yang **tidak memiliki 5 CRUD method standar** atau **mengelola >1 model**:

| Service | Alasan |
|:--------|:-------|
| `ChatService` | No CRUD — hanya findOrCreateRoom, saveMessage, getMessages |
| `CronTasksService` | No CRUD — hanya `@Cron()` scheduled jobs |
| `NotificationsService` | Multi-channel (in-app, email, FCM) + preferences |
| `DocumentsService` | File generation, QR codes, batch processing |
| `ApprovalsService` | Multi-step workflow engine (submit → level1 → level2 → finalize) |
| `PaymentsService` | BankInfo CRUD + iuran domain (model berbeda) |
| `MembersWorkflowService` | No CRUD — hanya workflow (validate, approve, suspend) |
| `ForumService` | Multi-model (categories, threads, posts) — tapi categories diekstrak |

---

## 3. Quick Start: Template Minimal

Template paling sederhana untuk service baru (tanpa scope, tanpa hooks khusus):

```ts
// xxx.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { CreateXxxDto, UpdateXxxDto, XxxFilterDto } from './dto/xxx.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';

@Injectable()
export class XxxService extends BaseCrudService<CreateXxxDto, UpdateXxxDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
    // inject extra dependencies dengan private readonly:
    // private readonly mailService: MailService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'xxx',        // Prisma model name (lowercase!)
      prefix: 'xxx:',      // Cache prefix
      notFound: 'Xxx tidak ditemukan',
      // scopeStrategy: 'ranting',  // default
      // softDelete: true,
    });
  }

  // ── CRUD ─────────────────────────────────────────────

  async findAll(query: XxxFilterDto, scope?: UserScope) {
    return this.baseFindAll(
      `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}`,
      async () => {
        const where: Record<string, unknown> = {};
        Object.assign(where, this.buildScopeFilter(scope));
        return where;
      },
      { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' } },
    );
  }

  async findOne(id: string, scope?: UserScope) {
    return this.baseFindOne(id, scope);
  }

  async create(dto: CreateXxxDto, scope?: UserScope) {
    return this.baseCreate(dto, scope, undefined, 'Berhasil ditambahkan');
  }

  async update(id: string, dto: UpdateXxxDto, scope?: UserScope) {
    return this.baseUpdate(id, dto, scope, 'Berhasil diperbarui');
  }

  async remove(id: string, scope?: UserScope) {
    return this.baseRemove(id, scope, 'Berhasil dihapus');
  }
}
```

### Module Setup

Pastikan module meng-import `ScopeModule`:

```ts
// xxx.module.ts
@Module({
  imports: [ScopeModule],  // ← menyediakan ScopeHelper + CacheService
  controllers: [XxxController],
  providers: [XxxService],
  exports: [XxxService],
})
export class XxxModule {}
```

### Controller Setup

Manfaatkan `@CrudAuth()` untuk mengganti 3 baris decorator menjadi 1 baris:

```ts
// xxx.controller.ts
@ApiTags('Xxx')
@Controller('xxx')
@ApiBearerAuth()
export class XxxController {
  constructor(private readonly service: XxxService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Ambil semua data xxx' })
  findAll(@Query() q: XxxFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(q, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Detail xxx' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @CrudAuth('superadmin', { summary: 'Tambah xxx' })
  create(@Body() dto: CreateXxxDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope);
  }

  @Patch(':id')
  @CrudAuth('superadmin', { summary: 'Update xxx' })
  update(@Param('id') id: string, @Body() dto: UpdateXxxDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @CrudAuth('superadmin', { summary: 'Hapus xxx' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
```

---

## 4. Step-by-Step Refactor

### Step 0: Prereq — ScopeModule

`ScopeModule` adalah `@Global()`, jadi provider-nya (ScopeHelper, CacheService, AuditService) tersedia di mana saja. Tapi untuk kejelasan, import eksplisit di module:

```ts
imports: [ScopeModule],
```

### Step 1: Ubah Class Declaration

```diff
- export class UsersService {
+ export class UsersService extends BaseCrudService<CreateUserDto, UpdateUserDto> {
```

### Step 2: Update Constructor

Parameter `prisma`, `scopeHelper`, `cache` — pindah ke `super()`.  
**Jangan gunakan `private readonly`** untuk mereka — base class needs access.

```diff
  constructor(
-   private readonly prisma: PrismaService,
-   private readonly scopeHelper: ScopeHelper,
+   prisma: PrismaService,
+   scopeHelper: ScopeHelper,
+   cache: CacheService,
    private readonly mailService: MailService,  // ← tetap private
  ) {
+   super(prisma, scopeHelper, cache, {
+     model: 'user',
+     prefix: 'users:',
+     notFound: 'User tidak ditemukan',
+     scopeStrategy: 'ranting',
+   });
-   this.logger = new Logger(UsersService.name); // ← otomatis dari base
  }
```

### Step 3: Pindahkan Logika ke Hooks

#### Sebelum: Di Method `create`

```ts
async create(dto: CreateUserDto) {
  const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);
  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      namaLengkap: dto.namaLengkap,
      role: dto.role as never,   // ← as never!
      passwordHash,
      rantingId: dto.rantingId || scope?.rantingId,
    },
  });
  await this.sendWelcomeEmail(user.email, user.namaLengkap);
  return { success: true, data: user };
}
```

#### Sesudah: Pindah ke Hooks

```ts
protected async beforeCreate(
  dto: CreateUserDto,
  scope?: UserScope,
): Promise<Record<string, unknown>> {
  const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);
  return {
    ...dto,
    rantingId: dto.rantingId || scope?.rantingId,
    passwordHash,
    // role tidak perlu as never — TypeScript narrow dari generics
  };
}

protected async afterCreate(result: any, _dto: CreateUserDto): Promise<void> {
  if (result?.email) {
    this.sendWelcomeEmail(result.email, result.namaLengkap);
  }
}
```

### Step 4: Refactor findAll

```diff
  async findAll(query: UserFilterDto, scope?: UserScope) {
-   const where: Record<string, unknown> = {};
-   if (query.role) where.role = query.role;
-   // ...build where manually...
-   return paginate(this.prisma.user, where, { ... });
+   return this.baseFindAll(
+     `users:list:${scope?.rantingId || 'all'}:${query.page || 1}`,
+     async () => {
+       const where: Record<string, unknown> = {};
+       if (query.role) where.role = query.role;
+       if (query.search) where.namaLengkap = { contains: query.search, mode: 'insensitive' };
+       Object.assign(where, this.buildScopeFilter(scope));
+       return where;
+     },
+     {
+       page: query.page,
+       limit: query.limit || 20,
+       orderBy: { createdAt: 'desc' },
+       select: { id: true, email: true, namaLengkap: true, role: true },
+     },
+     30, // TTL in seconds
+   );
  }
```

**Penting:** Cache key HARUS unik per kombinasi filter. Sertakan scope, page, search term, dll.

### Step 5: Refactor findOne

```diff
  async findOne(id: string, scope?: UserScope) {
-   const user = await this.prisma.user.findUnique({ where: { id } });
-   if (!user) throw new NotFoundException('User tidak ditemukan');
-   // manual scope verification...
-   await this.scopeHelper.verifyResourceAccess(...);
-   return { success: true, data: user };
+   return this.baseFindOne(id, scope, undefined /* include */, {
+     id: true,
+     email: true,
+     namaLengkap: true,
+     role: true,
+     rantingId: true,
+     // passwordHash tidak di-select → otomatis di-exclude
+   });
  }
```

### Step 6: Refactor create / update / remove

```diff
  async create(dto: CreateUserDto, scope?: UserScope) {
-   const passwordHash = await bcrypt.hash(...);
-   const user = await this.prisma.user.create({ data: { ... } });
-   await this.sendWelcomeEmail(...);
-   return { success: true, data: user, message: 'User berhasil dibuat' };
+   return this.baseCreate(dto, scope, undefined, 'User berhasil dibuat');
  }

  async update(id: string, dto: UpdateUserDto, scope?: UserScope) {
-   const user = await this.prisma.user.update({ where: { id }, data: dto });
-   return { success: true, data: user, message: '...' };
+   return this.baseUpdate(id, dto, scope, 'User berhasil diperbarui');
  }

  async remove(id: string, scope?: UserScope) {
-   await this.prisma.user.update({ where: { id }, data: { isActive: false } });
-   return { success: true, message: 'User dinonaktifkan' };
+   return this.baseRemove(id, scope, 'User dinonaktifkan');
  }
```

### Step 7: Hapus Response Wrappers

Setelah refactor, service TIDAK boleh mengembalikan `{ success: true, data, message }` — cukup `data` atau `{ data, message }`. TransformInterceptor global menambahkan `success: true`.

**Perbaiki domain methods juga:**

```diff
- return { success: true, data: result, message: 'Berhasil' };
+ return { data: result, message: 'Berhasil' };
```

### Step 8: Handle Soft Delete Kustom

Jika service menggunakan `isActive = false` atau `status = 'cancelled'` (bukan `deletedAt`), override `remove`:

```ts
// AspekService — isActive = false (bukan deletedAt)
async remove(id: string) {
  await this.verifyScope(id, undefined);
  await this.prismaDelegate.update({
    where: { id },
    data: { isActive: false },
  });
  this.invalidateCache();
  return { message: 'Aspek penilaian dinonaktifkan' };
}
```

---

## 5. Config Options Reference

```ts
interface CrudConfig {
  model: string;                    // Prisma model name (lowercase): 'anggota', 'user', 'kegiatan'
  prefix: string;                   // Cache prefix untuk invalidate: 'members:', 'trainings:'
  notFound?: string;                // Custom not-found message  (default: 'Data tidak ditemukan')
  softDelete?: boolean;             // true → remove() sets deletedAt (default: false)
  scopeStrategy?: CrudScopeStrategy; // 'ranting' | 'kegiatan' | 'anggota_indirect' (default: 'ranting')
}

type CrudScopeStrategy = 'ranting' | 'kegiatan' | 'anggota_indirect';
```

### Contoh Config Per Service

| Service | `model` | `scopeStrategy` | `softDelete` | Notes |
|:--------|:--------|:----------------|:-------------|:------|
| `MembersService` | `anggota` | `ranting` | ✅ true | Soft delete via deletedAt |
| `TrainingsService` | `latihan` | `ranting` | false | Hard delete |
| `CandidatesService` | `calonAnggota` | `ranting` | false | Hard delete |
| `ExaminersService` | `user` | default | false | No scope |
| `DuesService` | `iuran` | `anggota_indirect` | false | Via anggota.rantingId |
| `ActivitiesService` | `kegiatan` | `kegiatan` | false | scopeType/scopeId |
| `ClaimsService` | `klaim` | `anggota_indirect` | false | Via anggota.rantingId |
| `RegistrationsService` | `pendaftaran` | default | false | Public, no scope |
| `UsersService` | `user` | `ranting` | false | Custom: isActive |
| `GraduationsService` | `kegiatan` | `kegiatan` | false | Filter tipe='pendadaran' |
| `OrgDocumentsService` | `dokumenOrganisasi` | default | false | No scope |
| `RewardsService` | `reward` | default | false | No scope |
| `MonitoringService` | `monitoringAlert` | default | false | No scope |
| `LettersService` | `suratKeluar` | default | false | No scope |
| `AspectService` | `aspekPenilaian` | default | false | Custom: isActive via override |
| `ForumCategoryService` | `forumCategory` | default | false | No scope |

---

## 6. Hook API Reference

### beforeCreate — Transform DTO Sebelum Insert

```ts
protected async beforeCreate(
  dto: TCreateDto,
  scope?: UserScope,
  userId?: string,
): Promise<Record<string, unknown>>
```

**Use cases:**
- Hash password (bcrypt) → `UsersService`, `ExaminersService`
- Auto-assign rantingId dari scope → `MembersService`, `CandidatesService`
- Generate nomor anggota (NRA) → `MembersService`, `CandidatesService`
- Parse date strings → `TrainingsService`
- Set default values (status, tipe) → `ActivitiesService`, `RegistrationsService`
- Sparse create — hanya include field yang ada → `ActivitiesService`, `LettersService`

**Example — MembersService (NRA generation + defaults):**

```ts
protected async beforeCreate(
  dto: CreateMemberDto,
  scope?: UserScope,
): Promise<Record<string, unknown>> {
  const rantingId = dto.rantingId || scope?.rantingId;
  return {
    ...dto,
    rantingId,
    nomorAnggota: await this.nraService.generateMemberNumber(rantingId || ''),
    statusData: 'complete',
    statusValidasi: 'pending',
    statusKeanggotaan: 'aktif',
  };
}
```

### afterCreate — Side Effects Setelah Insert

```ts
protected async afterCreate(
  result: any,       // entity dari prisma.create()
  dto: TCreateDto,   // DTO asli (sebelum beforeCreate)
): Promise<void>
```

**Use cases:**
- Send welcome/confirmation email → `MembersService`, `CandidatesService`, `RegistrationsService`
- Award gamification points → `DuesService`
- Send in-app notification
- Invalidate cache prefix lain (reports, dashboard) → `DuesService`

**Example — MembersService (send email):**

```ts
protected async afterCreate(result: any, _dto: CreateMemberDto): Promise<void> {
  if (result?.email) {
    try {
      await this.memberMailService.sendToMember(result, {
        event: 'welcome',
        template: 'welcomeMemberEmail',
      });
    } catch (error) {
      this.logger.warn(`Welcome email failed for ${result.id}: ${(error as Error).message}`);
    }
  }
}
```

### beforeUpdate — Sparse Update

```ts
protected async beforeUpdate(
  id: string,
  dto: TUpdateDto,
): Promise<Record<string, unknown>>
```

**Use cases:**
- Sparse update — hanya include field yang didefinisikan
- Hash password baru jika ada
- Parse dates

**Example — sparse update pattern:**

```ts
protected async beforeUpdate(_id: string, dto: UpdateUserDto): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = {};
  if (dto.email !== undefined) data.email = dto.email;
  if (dto.namaLengkap !== undefined) data.namaLengkap = dto.namaLengkap;
  if (dto.password) {
    data.passwordHash = await bcrypt.hash(dto.password, 12);
  }
  return data;
}
```

### afterUpdate — Side Effects Setelah Update

```ts
protected async afterUpdate(
  result: any,
  dto: TUpdateDto,
): Promise<void>
```

### beforeRemove / afterRemove

```ts
protected async beforeRemove(id: string): Promise<void>
protected async afterRemove(id: string): Promise<void>
```

**beforeRemove** — validasi tambahan sebelum delete (misal: cek apakah masih punya relasi).  
**afterRemove** — cleanup setelah delete (misal: hapus file, invalidate cache additional prefix).

---

## 7. Scope Strategies

### `ranting` — Direct rantingId Field

Entity memiliki field `rantingId` langsung.

```ts
scopeStrategy: 'ranting',  // default
```

**Cara kerja:**
- **findAll:** `buildScopeFilter(scope)` → `{ ranting: { id: scope.rantingId } }`
- **findOne/update/remove:** `verifyScope(id, scope)` → fetch entity, verify `entity.rantingId`

**Contoh:** Members, Trainings, Candidates, Users

### `kegiatan` — scopeType / scopeId Fields

Entity memiliki `scopeType` + `scopeId` untuk menentukan scope organisasi.

```ts
scopeStrategy: 'kegiatan',
```

**Cara kerja:**
- **findAll:** `buildKegiatanScopeFilter(scope)` → OR conditions per level
- **findOne/update/remove:** fetch entity, verify via `verifyKegiatanScope`

**Scope inheritance** (semakin tinggi level, semakin luas akses):
```
Ranting → hanya kegiatan di rantingnya
Wilayah → kegiatan di wilayahnya + semua ranting di bawahnya
Distrik → kegiatan di distriknya + semua wilayah + ranting
Nasional → semua kegiatan (no filter)
```

**Contoh:** Activities (Kegiatan), Graduations (Kegiatan dengan filter tipe='pendadaran')

### `anggota_indirect` — Via Anggota Relation

Entity memiliki `anggotaId`, dan scope ditentukan oleh `anggota.rantingId`.

```ts
scopeStrategy: 'anggota_indirect',
```

**Cara kerja:**
- **findAll:** `buildIndirectScopeFilter(scope, 'anggota')`
- **findOne/update/remove:** fetch entity with `anggota.rantingId`

**Contoh:** Dues (Iuran → Anggota → Ranting), Claims (Klaim → Anggota → Ranting)

### No Scope — Public / No Restrictions

Jika entity bersifat global atau tidak perlu filter wilayah:

```ts
// Jangan set scopeStrategy — atau biarkan default 'ranting' tapi
// controller jangan passing scope
```

**Contoh:** Examiners, Registrations, Rewards, ForumCategory, Aspect

---

## 8. Response Wrapping & Interceptor

### TransformInterceptor

Global interceptor yang secara otomatis membungkus response:

```ts
// Service return:
{ data: user, message: 'Berhasil' }

// Response ke client:
{ success: true, data: user, message: 'Berhasil' }
```

### Exception Filter

Global exception filter membungkus error:

```ts
// Service throws:
throw new NotFoundException('User tidak ditemukan');

// Response ke client:
{ success: false, message: 'User tidak ditemukan' }
```

### Format Response yang Diterima Interceptor

| Return dari Service | Response ke Client |
|:--------------------|:-------------------|
| `{ data }` | `{ success: true, data }` |
| `{ data, message }` | `{ success: true, data, message }` |
| `{ data, meta }` | `{ success: true, data, meta }` |
| `{ data, meta, message }` | `{ success: true, data, meta, message }` |
| `{ message }` | `{ success: true, message }` |
| `string` | `{ success: true, data: string }` |
| `number` | `{ success: true, data: number }` |
| `T[]` | `{ success: true, data: T[] }` |

### Yang TIDAK Perlu Dilakukan Service

❌ `return { success: true, data: user, message: 'OK' };`  
✅ `return { data: user, message: 'OK' };`  
✅ `return user;`  
✅ `return { data: user };`

---

## 9. P2025 Auto-Conversion

Sejak commit `9605594`, `BaseCrudService.baseUpdate` dan `baseRemove` secara otomatis menangkap `PrismaClientKnownRequestError` dengan kode `P2025` dan mengonversinya menjadi `NotFoundException`.

### Sebelum (manual):

```ts
async update(id: string, dto: UpdateDto) {
  const existing = await this.prismaDelegate.findUnique({ where: { id } });
  if (!existing) throw new NotFoundException('Tidak ditemukan');
  // ... lalu update
}
```

### Sesudah (otomatis):

```ts
// baseUpdate internal:
try {
  updated = await this.prismaDelegate.update({ where: { id }, data });
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
    throw new NotFoundException(this.config.notFound || 'Data tidak ditemukan');
  }
  throw error;
}
```

### Catatan Penting

- **Untuk scope strategies** (`ranting`, `kegiatan`, `anggota_indirect`): `verifyScope()` sudah melakukan `findUnique` sebelum update/delete, sehingga P2025 catch hanya menjadi safety net (dead code ~80% kasus)
- **Untuk no-scope services** (ExaminersService, AspectService, dll): P2025 catch sangat berguna karena tidak ada scope verification yang mengecek eksistensi

---

## 10. Menggunakan `@CrudAuth()` di Controller

### Sebelum (3 baris per endpoint):

```ts
@Get()
@Roles('superadmin', 'admin_distrik')
@RequireScope('branch')
@ApiOperation({ summary: 'Ambil data' })
findAll() { ... }
```

### Sesudah (1 baris):

```ts
@Get()
@CrudAuth('superadmin', 'admin_distrik', { scope: 'branch', summary: 'Ambil data' })
findAll() { ... }
```

### Semua Endpoint Jadi @CrudAuth

```ts
@Get()
@CrudAuth('superadmin', 'admin_distrik', { summary: 'Ambil semua anggota' })
findAll(@Query() q: XxxFilterDto, @Req() req: ScopedRequest) {
  return this.service.findAll(q, req.scope);
}

@Get(':id')
@CrudAuth('superadmin', 'admin_distrik', 'admin_ranting', { summary: 'Detail anggota' })
findOne(@Param('id') id: string) {
  return this.service.findOne(id);
}

@Post()
@CrudAuth('superadmin', 'admin_distrik', { summary: 'Tambah anggota' })
create(@Body() dto: CreateXxxDto, @Req() req: ScopedRequest) {
  return this.service.create(dto, req.scope);
}

@Patch(':id')
@CrudAuth('superadmin', 'admin_distrik', { summary: 'Update anggota' })
update(@Param('id') id: string, @Body() dto: UpdateXxxDto) {
  return this.service.update(id, dto);
}

@Delete(':id')
@CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus anggota' })
remove(@Param('id') id: string) {
  return this.service.remove(id);
}
```

### Controllers dengan @CrudAuth() (15 total)

Members, Candidates, Trainings, Activities, Dues, Examiners, Claims, Registrations, Forum, Assessments, Letters, Settings, Payments, Org-structure, Approvals, Rewards, Graduations

---

## 11. Contoh Real dari 16 Service

### Paling Sederhana: ExaminersService

**Scope:** None  **Hooks:** `beforeCreate` → hash password, `afterCreate` → send email

```ts
@Injectable()
export class ExaminersService extends BaseCrudService<CreateExaminerDto, UpdateExaminerDto> {
  constructor(
    prisma: PrismaService, scopeHelper: ScopeHelper, cache: CacheService,
    @Optional() private readonly mailService?: MailService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'user', prefix: 'examiners:', notFound: 'Penguji tidak ditemukan',
    });
  }

  protected async beforeCreate(dto: CreateExaminerDto): Promise<Record<string, unknown>> {
    return {
      ...dto,
      role: 'penguji',
      passwordHash: await bcrypt.hash(dto.password || 'ths123', 12),
      isActive: true,
    };
  }

  protected async afterCreate(result: any, _dto: CreateExaminerDto): Promise<void> {
    if (result?.email && this.mailService) {
      this.sendWelcomeEmail(result).catch(() => {});
    }
  }
}
```

**Savings:** ~90 lines, 0 `as never`, ~10 wrapper removed.

### Indirect Scope: DuesService

**Scope:** `anggota_indirect`  **Hooks:** Gamification + email + reports cache invalidation

```ts
@Injectable()
export class DuesService extends BaseCrudService<CreateDuesDto, UpdateDuesDto> {
  // ...constructor with anggota_indirect config...

  findAll(query: DuesFilterDto, scope?: UserScope) {
    return this.baseFindAll(`dues:list:...`, async () => {
      const where: Record<string, unknown> = {};
      if (query.periode) where.periode = query.periode;
      if (query.status) where.status = query.status;
      Object.assign(where, this.buildIndirectScopeFilter(scope, 'anggota'));
      return where;
    }, { page: query.page, ... });
  }

  protected async afterCreate(result: any, _dto: CreateDuesDto): Promise<void> {
    this.cache.invalidatePrefix('reports:'); // invalidate report cache juga
  }
}
```

### Kegiatan Scope: ActivitiesService

**Scope:** `kegiatan`  **Filter tambahan:** exclude pendadaran (hanya kegiatan non-pendadaran)

```ts
@Injectable()
export class ActivitiesService extends BaseCrudService<CreateActivityDto, UpdateActivityDto> {
  // ...constructor with kegiatan config...

  findAll(query: ActivityFilterDto, scope?: UserScope) {
    return this.baseFindAll(`activities:list:...`, async () => {
      const where: Record<string, unknown> = {};
      if (query.tipe) where.tipe = query.tipe;
      where.NOT = { tipe: 'pendadaran' };  // ← filter tambahan
      Object.assign(where, this.buildKegiatanScopeFilter(scope));
      return where;
    }, { ... });
  }
}
```

### Paling Kompleks: MembersService

**Scope:** `ranting`  **Soft delete:** ✅  **Hooks:** NRA generation + email

```ts
@Injectable()
export class MembersService extends BaseCrudService<CreateMemberDto, UpdateMemberDto> {
  constructor(
    prisma: PrismaService, scopeHelper: ScopeHelper, cache: CacheService,
    private readonly csvImportService: CsvImportService,
    private readonly memberMailService: MemberMailService,
    private readonly nraService: NraService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'anggota', prefix: 'members:', notFound: 'Anggota tidak ditemukan',
      softDelete: true, scopeStrategy: 'ranting',
    });
  }

  protected async beforeCreate(dto: CreateMemberDto, scope?: UserScope) {
    const rantingId = dto.rantingId || scope?.rantingId;
    return {
      ...dto, rantingId,
      nomorAnggota: await this.nraService.generateMemberNumber(rantingId || ''),
      statusData: 'complete', statusValidasi: 'pending', statusKeanggotaan: 'aktif',
    };
  }

  protected async afterCreate(result: any, _dto: CreateMemberDto) {
    if (result?.email) {
      this.memberMailService.sendToMember(result, { event: 'welcome', ... }).catch(() => {});
    }
  }

  // Domain methods tetap manual
  async exportCsv(scope?: UserScope) { ... }
  async importCsv(file: Express.Multer.File, scope?: UserScope) { ... }
}
```

### New-Style: AspectService (BaseCrudService + Custom Remove)

**Scope:** None  **Custom:** Override remove to set `isActive: false` instead of hard delete

```ts
@Injectable()
export class AspectService extends BaseCrudService<CreateAspectDto, UpdateAspectDto> {
  constructor(prisma: PrismaService, scopeHelper: ScopeHelper, cache: CacheService) {
    super(prisma, scopeHelper, cache, {
      model: 'aspekPenilaian', prefix: 'aspects:',
      notFound: 'Aspek tidak ditemukan',
      scopeStrategy: 'ranting', // tidak dipakai (no scope), tapi harmless
    });
  }

  async findAll(_query: Record<string, unknown> = {}) {
    return this.baseFindAll('aspects:all', () => ({}), {
      include: { itemPenilaian: true },
    });
  }

  async findOne(id: string) {
    return this.baseFindOne<any>(id, undefined, { itemPenilaian: true });
  }

  // Custom remove — set isActive:false (bukan deletedAt, bukan hard delete)
  async remove(id: string) {
    await this.verifyScope(id, undefined);
    await this.prismaDelegate.update({ where: { id }, data: { isActive: false } });
    this.invalidateCache();
    return { message: 'Aspek penilaian dinonaktifkan' };
  }
}
```

### New-Style: ForumCategoryService (BaseCrudService + Custom findAll)

```ts
@Injectable()
export class ForumCategoryService extends BaseCrudService<CreateCategoryDto, UpdateCategoryDto> {
  constructor(prisma: PrismaService, scopeHelper: ScopeHelper, cache: CacheService) {
    super(prisma, scopeHelper, cache, {
      model: 'forumCategory', prefix: 'forum:categories:',
      notFound: 'Kategori tidak ditemukan',
    });
  }

  async findAll() {
    return this.baseFindAll('forum:categories', () => ({}), {
      include: { _count: { select: { threads: true } } },
      orderBy: { order: 'asc' as const },
    });
  }

  async findOne(id: string) {
    return this.baseFindOne<any>(id, undefined, { _count: { select: { threads: true } } });
  }
}
```

---

## 12. Troubleshooting

### Q: Service butuh `select` di findOne (exclude password)

Gunakan parameter `select` ke-4:

```ts
return this.baseFindOne(id, scope, undefined, {
  id: true, email: true, namaLengkap: true, role: true,
  // passwordHash tidak di-select → otomatis di-exclude dari response
});
```

### Q: Service butuh `include` di findOne

Gunakan parameter `include` ke-3:

```ts
return this.baseFindOne(id, scope, {
  ranting: true,
  pelatih: { select: { id: true, namaLengkap: true } },
});
```

### Q: findAll dengan filter tambahan

Tambahkan di callback `buildWhere`:

```ts
return this.baseFindAll(cacheKey, async () => {
  const where: Record<string, unknown> = { tipe: 'pendadaran' }; // filter tetap
  if (query.search) where.judul = { contains: query.search, mode: 'insensitive' };
  Object.assign(where, this.buildKegiatanScopeFilter(scope));     // scope filter
  return where;
}, { page: query.page, ... });
```

### Q: Soft delete pakai `isActive` bukan `deletedAt`

Override `remove` — jangan gunakan `softDelete: true`:

```ts
async remove(id: string, scope?: UserScope) {
  await this.verifyScope(id, scope);
  await this.prismaDelegate.update({ where: { id }, data: { isActive: false } });
  this.invalidateCache();
  return { message: 'Data dinonaktifkan' };
}
```

### Q: Domain method perlu return `{ data, message }`

`{ data, message }` sudah benar — interceptor tambah `success: true`:

```ts
async getMyData() {
  return { data: result, message: 'Berhasil' };
  // → { success: true, data: result, message: 'Berhasil' }
}
```

### Q: Module error: "Can't resolve ScopeHelper / CacheService"

`ScopeModule` adalah `@Global()` — tapi jika error, import eksplisit:

```ts
@Module({
  imports: [ScopeModule], // ← tambahkan ini
  providers: [MyService],
})
export class MyModule {}
```

### Q: Service punya dua model (misal Forum: categories + threads)

Ekstrak model yang clean CRUD ke service terpisah yang extends BaseCrudService:

```ts
// ✅ ForumCategoryService extends BaseCrudService — category CRUD
// ✅ ForumService — threads + posts (terlalu custom untuk BaseCrudService)
// Controller injects both:
constructor(
  private readonly categoryService: ForumCategoryService,
  private readonly service: ForumService,
) {}
```

---

## 13. Checklist Refactor

### Sebelum Refactor

- [ ] Service memiliki 5 CRUD method (findAll, findOne, create, update, remove)
- [ ] Model Prisma sudah benar (cek `schema.prisma`)
- [ ] DTO sudah benar (`CreateXDto`, `UpdateXDto`)
- [ ] Scope strategy jelas (`ranting` / `kegiatan` / `anggota_indirect` / none)
- [ ] Tidak ada multi-model dalam satu service (jika ada, ekstrak)

### Saat Refactor

- [ ] Class declaration → `extends BaseCrudService<CreateDto, UpdateDto>`
- [ ] Constructor → pass prisma, scopeHelper, cache ke `super()`
- [ ] Config → model, prefix, notFound, scopeStrategy, softDelete
- [ ] `beforeCreate` → transform DTO, hash password, parse dates, set defaults
- [ ] `afterCreate` → send email, award points, invalidate additional cache
- [ ] `beforeUpdate` → sparse update (hanya field yang didefinisikan)
- [ ] `afterUpdate` → side effects
- [ ] `findAll` → `baseFindAll` dengan cache key unique + scope filter
- [ ] `findOne` → `baseFindOne` dengan optional include/select
- [ ] `create` → `baseCreate`
- [ ] `update` → `baseUpdate`
- [ ] `remove` → `baseRemove` (atau override untuk soft delete custom)
- [ ] Hapus `new Logger()` — inherited
- [ ] Hapus `{ success, data, message }` — interceptor handles
- [ ] Hapus `as never` / `as any` — gunakan modele `Record<string, unknown>` via hooks
- [ ] Hapus manual `NotFoundException` — base method throws + P2025 auto-convert
- [ ] Hapus manual `paginate()` — baseFindAll handles

### Setelah Refactor

- [ ] `pnpm build` atau `tsc --noEmit` — 0 errors
- [ ] Controller tetap kompatibel (public method signatures tidak berubah!)
- [ ] Test findAll → cache bekerja, scope filter benar
- [ ] Test create → hooks berjalan (email terkirim, NRA tergenerate)
- [ ] Test update → sparse update, cache invalidated
- [ ] Test remove → soft delete / hard delete benar
- [ ] Test domain methods → response wrapper kompatibel dengan interceptor
- [ ] Test create with duplicate → Prisma P2002 → bukan P2025 (tidak tertangkap)
- [ ] 40 test suites, 600+ tests — all passing

---

## 14. Appendix: Full Service Audit

### Status Refactor (16 Selesai, 8 Tidak Cocok)

| Service | Status | Scope | Savings | `as never` Removed |
|:--------|:------:|:------|:-------:|:------------------:|
| `TrainingsService` | ✅ | `ranting` | ~90 | 1 |
| `CandidatesService` | ✅ | `ranting` | ~110 | 3 |
| `MembersService` | ✅ | `ranting` | ~115 | 3 |
| `ExaminersService` | ✅ | none | ~90 | 0 |
| `UsersService` | ✅ | `ranting` | ~110 | 1 |
| `DuesService` | ✅ | `anggota_indirect` | ~140 | 1 |
| `ActivitiesService` | ✅ | `kegiatan` | ~110 | 3 |
| `ClaimsService` | ✅ | `anggota_indirect` | ~70 | 2 |
| `RegistrationsService` | ✅ | none | ~70 | 3 |
| `GraduationsService` | ✅ | `kegiatan` | ~75 | 1 |
| `OrgDocumentsService` | ✅ | none | ~50 | 0 |
| `MonitoringService` | ✅ | none | ~65 | 4 |
| `RewardsService` | ✅ | none | ~85 | 0 |
| `LettersService` | ✅ | none | ~10 | 0 |
| `AspectService` | ✅ | none (new) | ~60 | 1 |
| `ForumCategoryService` | ✅ | none (new) | ~50 | 1 |
| **Total** | **16** | | **~1.740** | **25** |

| Service | Status | Alasan |
|:--------|:------:|:-------|
| `ChatService` | ❌ | No CRUD — hanya messaging methods |
| `CronTasksService` | ❌ | No CRUD — hanya `@Cron()` scheduled jobs |
| `NotificationsService` | ❌ | Multi-channel: in-app, email, FCM, preferences |
| `DocumentsService` | ❌ | File generation, QR codes, batch processing |
| `ApprovalsService` | ❌ | Multi-step workflow engine |
| `PaymentsService` | ❌ | BankInfo (model berbeda) + iuran domain |
| `UjianPraktekService` | ❌ | Complex domain: exam management, scoring |
| `MembersWorkflowService` | ❌ | No CRUD — hanya workflow actions |
| `ForumService` | ❌ | Multi-model (category extracted ✅) |

---

*Generated with assistance from Codebuff. For questions about BaseCrudService internals, see `apps/api/src/common/utils/base-crud.service.ts`.*
