# Cookbook: Refactor Service ke BaseCrudService

> **Versi:** 1.0  
> **Service sudah direfactor:** 10 (trainings, candidates, members, examiners, dues, activities, claims, registrations, users, graduations)  
> **Total lines of boilerplate eliminated:** ~351 (digantikan hooks + caching)  
> **`as never` eliminated:** 14  

---

## Daftar Isi

1. [Apa Itu BaseCrudService?](#1-apa-itu-basecrudservice)
2. [Kapan Service Cocok Direfactor?](#2-kapan-service-cocok-direfactor)
3. [Step-by-Step Refactor](#3-step-by-step-refactor)
4. [Config Options Reference](#4-config-options-reference)
5. [Hook API Reference](#5-hook-api-reference)
6. [Scope Strategies](#6-scope-strategies)
7. [Contoh Real dari 10 Service](#7-contoh-real-dari-10-service)
8. [Troubleshooting](#8-troubleshooting)
9. [Checklist](#9-checklist)

---

## 1. Apa Itu BaseCrudService?

`BaseCrudService<TCreateDto, TUpdateDto>` adalah abstract class yang menyediakan 5 operasi CRUD standar:

| Method | Deskripsi | Otomatis |
|:-------|:----------|:---------|
| `baseFindAll` | Paginated list + cache | Scope filter, pagination, caching |
| `baseFindOne` | Single entity by ID | NotFoundException, scope verification |
| `baseCreate` | Create entity | Hook `beforeCreate` + `afterCreate`, cache invalidation |
| `baseUpdate` | Update entity | Scope verification, hook `beforeUpdate` + `afterUpdate`, cache invalidation |
| `baseRemove` | Delete / soft-delete | Scope verification, hooks, cache invalidation |

**Boilerplate yang dieliminasi per service (~30-50 lines):**

```
- 8-10x  `{ success: true, data: ..., message: '...' }`      → oleh TransformInterceptor
- 1-4x   `as never` / `as never`                              → Record<string, unknown>
- 1x     `private readonly logger = new Logger(...)`           → inherited from base
- 2-3x   `if (!entity) throw new NotFoundException(...)`       → base method throws internally
- 1x     manual `paginate(...)` call                          → baseFindAll handles it
- 1-2x   manual scope verification                            → verifyScope in base
```

---

## 2. Kapan Service Cocok Direfactor?

### ✅ Cocok (Category A)

Service dengan pola standar:

- **Satu Prisma model** (bukan multi-model dalam satu service)
- **5 method CRUD**: findAll, findOne, create, update, remove
- **Scope standar**: rantingId langsung (`ranting`), scopeType/scopeId (`kegiatan`), atau melalui anggota (`anggota_indirect`)
- **Tidak ada workflow kompleks** dalam create/update

Contoh service yang cocok: **examiners, org-documents, monitoring/alerts, registrations**

### ✅ Sebagian (Category B)

Service yang punya CRUD standar plus beberapa domain method:

- CRUD methods bisa direfactor, domain methods tetap manual
- Scope mungkin berbeda dari 3 strategi standar

Contoh: **users, candidates, members, dues, activities**

### ❌ Tidak Cocok (Category C)

Service yang tidak punya 5 CRUD method standar:

- Read-only aggregation (reports, targets, calendar, org-chart)
- Workflow engine (approvals)
- Auth logic (auth)
- Multi-model kompleks (forum, letters, settings, org-structure)
- Infrastruktur (cron, chat)

---

## 3. Step-by-Step Refactor

### Step 0: Prerequisite

Pastikan `ScopeModule` tersedia — jika belum, import di module:

```ts
// users.module.ts
@Module({
  imports: [ScopeModule],  // ← sudah @Global(), tapi import eksplisit lebih jelas
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Jika module tidak meng-import `ScopeModule`, tidak masalah karena `@Global()`. Tapi beberapa codebase lebih suka eksplisit.

### Step 1: Ubah Class Declaration

```diff
- export class UsersService {
+ export class UsersService extends BaseCrudService<CreateUserDto, UpdateUserDto> {
```

### Step 2: Update Constructor

Parameter `prisma`, `scopeHelper`, `cache` — pindah ke `super()`.  
Tambahkan `super()` call dengan config object.

```diff
  constructor(
-   private readonly prisma: PrismaService,
-   private readonly scopeHelper: ScopeHelper,
+   prisma: PrismaService,           // ← no more private readonly
+   scopeHelper: ScopeHelper,        // ← passed to super
+   cache: CacheService,             // ← required by base
    private readonly mailService: MailService,  // ← custom dependency tetap private
  ) {
+   super(prisma, scopeHelper, cache, {
+     model: 'user',
+     prefix: 'users:',
+     notFound: 'User tidak ditemukan',
+     scopeStrategy: 'ranting',
+   });
  }
```

### Step 3: Implement Hooks

Pindahkan logika transformasi data ke hooks:

```ts
// BEFORE (in create method):
async create(dto: CreateUserDto) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      namaLengkap: dto.namaLengkap,
      role: dto.role as never,       // ← as never!
      passwordHash,
    },
  });
  // send email...
  return { success: true, data: user };
}

// AFTER (in hooks):
protected async beforeCreate(
  dto: CreateUserDto,
  scope?: UserScope,
): Promise<Record<string, unknown>> {
  const passwordHash = await bcrypt.hash(dto.password || 'password123', 12);
  return {
    email: dto.email,
    namaLengkap: dto.namaLengkap,
    role: dto.role,                  // ← no more as never
    rantingId: dto.rantingId || scope?.rantingId,
    passwordHash,
  };
}

protected async afterCreate(result: any, _dto: CreateUserDto): Promise<void> {
  // send welcome email
  this.sendWelcomeEmail(result.email, result.namaLengkap, ...);
}
```

### Step 4: Refactor findAll

```diff
  async findAll(query: UserFilterDto, scope?: UserScope) {
-   const where = { ... };
-   // ...build where manually...
-   return paginate(this.prisma.user, where, { ... });
+   return this.baseFindAll(
+     `users:list:${scope?.rantingId || 'all'}:${query.page || 1}`,
+     async () => {
+       const where: Record<string, unknown> = {};
+       if (query.role) where.role = query.role;
+       if (query.search) where.namaLengkap = { contains: query.search };
+       Object.assign(where, this.buildScopeFilter(scope));
+       return where;
+     },
+     { page: query.page, limit: query.limit, orderBy: { createdAt: 'desc' }, select: { ... } },
+   );
  }
```

**Key points:**
- Cache key harus **unique** per kombinasi filter
- `buildScopeFilter(scope)` untuk `ranting` strategy
- `buildKegiatanScopeFilter(scope)` untuk `kegiatan` strategy
- `buildIndirectScopeFilter(scope, 'anggota')` untuk `anggota_indirect` strategy
- `select` opsional — exclude sensitive fields

### Step 5: Refactor findOne

```diff
  async findOne(id: string, scope?: UserScope) {
-   const entity = await this.prisma.user.findUnique({ where: { id } });
-   if (!entity) throw new NotFoundException('...');
-   // manual scope verification...
-   return { success: true, data: entity };
+   return this.baseFindOne(id, scope, undefined /* include */, {
+     id: true,
+     email: true,
+     namaLengkap: true,
+     // exclude passwordHash
+   });
  }
```

`baseFindOne` otomatis:
1. Fetch entity → NotFoundException jika tidak ada
2. Scope verification via `verifyScope`
3. Kembalikan entity (interceptor wrapping `{ success, data }`)

### Step 6: Refactor create / update / remove

```diff
  async create(dto: CreateUserDto, scope?: UserScope) {
-   // manual logic + as never + { success }
-   return { success: true, data: user, message: '...' };
+   return this.baseCreate(dto, scope, undefined, 'User berhasil dibuat');
  }

  async update(id: string, dto: UpdateUserDto, scope?: UserScope) {
-   // manual logic + { success }
-   return { success: true, data: user, message: '...' };
+   return this.baseUpdate(id, dto, scope, 'User berhasil diperbarui');
  }

  async remove(id: string, scope?: UserScope) {
-   // manual logic + scope + { success }
+   return this.baseRemove(id, scope, 'User berhasil dihapus');
  }
```

### Step 7: Hapus Response Wrappers

Setelah semua CRUD method menggunakan `baseCreate/baseUpdate/baseRemove`:

```diff
- return { success: true, data: user, message: '...' };
+ return this.baseCreate(dto, scope, userId, '...');  // ← mengembalikan { data, message }

// Domain methods juga:
- return { success: true, data: result };
+ return result;  // ← interceptor menambahkan success: true
```

### Step 8: Handle Kasus Khusus (Soft Delete Kustom)

Jika service punya soft-delete yang berbeda (`isActive`, `status: 'cancelled'`), override `remove` manual:

```ts
// users: isActive = false (bukan deletedAt)
async remove(id: string, scope?: UserScope) {
  await this.verifyScope(id, scope);
  await this.prismaDelegate.update({
    where: { id },
    data: { isActive: false },
  });
  this.invalidateCache();
  return { message: 'User dinonaktifkan' };
}

// activities: status = 'cancelled'
async remove(id: string, scope?: UserScope) {
  await this.verifyScope(id, scope);
  await this.prismaDelegate.update({ where: { id }, data: { status: 'cancelled' } });
  this.invalidateCache();
  return { message: 'Kegiatan dibatalkan' };
}
```

---

## 4. Config Options Reference

```ts
interface CrudConfig {
  model: string;           // Prisma model name (lowercase): 'anggota', 'user', 'kegiatan'
  prefix: string;          // Cache prefix: 'members:', 'trainings:'
  notFound?: string;       // Custom not-found message (default: 'Data tidak ditemukan')
  softDelete?: boolean;    // If true, remove() sets deletedAt (default: false)
  scopeStrategy?: CrudScopeStrategy;  // 'ranting' | 'kegiatan' | 'anggota_indirect' (default: 'ranting')
}
```

### Contoh Config per Service

| Service | `model` | `prefix` | `scopeStrategy` | `softDelete` | Alasan |
|:--------|:--------|:---------|:----------------|:-------------|:-------|
| members | `anggota` | `members:` | `ranting` | ✅ true | Soft delete via deletedAt |
| trainings | `latihan` | `trainings:` | `ranting` | false | Hard delete |
| candidates | `calonAnggota` | `candidates:` | `ranting` | false | Hard delete |
| examiners | `user` | `examiners:` | — (default) | false | No scope |
| dues | `iuran` | `dues:` | `anggota_indirect` | false | Via anggota.rantingId |
| activities | `kegiatan` | `activities:` | `kegiatan` | false | Via scopeType/scopeId |
| claims | `klaim` | `claims:` | `anggota_indirect` | false | Via anggota.rantingId |
| registrations | `pendaftaran` | `registrations:` | — (default) | false | Public, no scope |
| users | `user` | `users:` | `ranting` | false | Custom via isActive |
| graduations | `kegiatan` | `graduations:` | `kegiatan` | false | Filter tipe='pendadaran' |

---

## 5. Hook API Reference

### beforeCreate

```ts
protected async beforeCreate(
  dto: TCreateDto,
  scope?: UserScope,
  userId?: string,
): Promise<Record<string, unknown>>
```

Gunakan untuk:
- Hash password (bcrypt)
- Auto-assign rantingId dari scope
- Parse date string → Date object
- Set default values (status, tipe)
- Transform field names

**Larangan:** Jangan throw error di sini untuk validasi bisnis — gunakan DTO validation atau validasi di controller.

### afterCreate

```ts
protected async afterCreate(
  result: any,       // entity from prisma create
  dto: TCreateDto,   // original DTO
): Promise<void>
```

Gunakan untuk:
- Send welcome/confirmation email
- Award gamification points
- Kirim notifikasi in-app
- Invalidasi cache prefix lain (misal `reports:`)

**PENTING:** `afterCreate` dipanggil **di luar Prisma transaction**. Jika gagal, CREATE tetap berhasil. Pattern fire-and-forget dengan `.catch()`.

### beforeUpdate

```ts
protected async beforeUpdate(
  id: string,
  dto: TUpdateDto,
): Promise<Record<string, unknown>>
```

Gunakan untuk:
- Sparse update — hanya include field yang `!== undefined`
- Hash password baru
- Parse date

### afterUpdate

```ts
protected async afterUpdate(
  result: any,
  dto: TUpdateDto,
): Promise<void>
```

Sama seperti `afterCreate` — side effects setelah update.

### beforeRemove / afterRemove

```ts
protected async beforeRemove(id: string): Promise<void>
protected async afterRemove(id: string): Promise<void>
```

Gunakan untuk: validasi tambahan sebelum delete, cleanup setelah delete.

---

## 6. Scope Strategies

### `ranting` — Direct rantingId Field

Entity memiliki field `rantingId` langsung (Anggota, User, Latihan).

```ts
scopeStrategy: 'ranting',
```

- **findAll**: `buildScopeFilter(scope)` → `{ ranting: { id: scope.rantingId } }`
- **findOne/update/remove**: `verifyScope(id, scope)` → verify `entity.rantingId` via `hasAccessToResourceAsync`

### `kegiatan` — scopeType / scopeId Fields

Entity memiliki `scopeType` dan `scopeId` (Kegiatan).

```ts
scopeStrategy: 'kegiatan',
```

- **findAll**: `buildKegiatanScopeFilter(scope)` → OR conditions per scope level
- **findOne/update/remove**: `verifyScope(id, scope)` → fetch entity, verify via `verifyKegiatanScope`

### `anggota_indirect` — Via Anggota Relation

Entity memiliki `anggotaId`, dan scope ditentukan oleh `anggota.rantingId` (Iuran, Dokumen, Klaim).

```ts
scopeStrategy: 'anggota_indirect',
```

- **findAll**: `buildIndirectScopeFilter(scope, 'anggota')`
- **findOne/update/remove**: `verifyScope(id, scope)` → fetch entity with `anggota.rantingId`

### No Scope — Public / No Restrictions

```ts
// Tidak perlu set scopeStrategy — controller tidak passing scope
```

- findAll / findOne — tidak ada filter scope
- update / remove — tidak ada scope verification

---

## 7. Contoh Real dari 10 Service

### Paling Sederhana: RegistrationsService

**Scope:** None (public registration)  
**Hook:** `beforeCreate` set status='pending'  
**Files:** 176 → ~148 lines, 3 `as never` eliminated

```ts
class RegistrationsService extends BaseCrudService<CreateRegistrationDto, UpdateRegistrationDto> {
  constructor(prisma, scopeHelper, cache, private readonly mailService: MailService) {
    super(prisma, scopeHelper, cache, {
      model: 'pendaftaran',
      prefix: 'registrations:',
      notFound: 'Pendaftaran tidak ditemukan',
    });
  }
  protected async beforeCreate(dto: CreateRegistrationDto) {
    return { ...dto, status: 'pending' };
  }
}
```

### Paling Kompleks: MembersService

**Scope:** `ranting`  
**Hook:** `beforeCreate` → generate NRA + parse dates  
**Hook:** `afterCreate` → send welcome email  
**Plus:** Domain methods: importCsv, exportCsv, findByEmail, getDocuments, getDues  
**Files:** 326 → 369 lines (grew due to added caching + CSV features)

```ts
class MembersService extends BaseCrudService<CreateMemberDto, UpdateMemberDto> {
  constructor(prisma, scopeHelper, cache, csvImportService, memberMailService, nraService) {
    super(prisma, scopeHelper, cache, {
      model: 'anggota', prefix: 'members:',
      notFound: 'Anggota tidak ditemukan', softDelete: true,
      scopeStrategy: 'ranting',
    });
  }
  protected async beforeCreate(dto, scope) {
    const rantingId = dto.rantingId || scope?.rantingId;
    return {
      ...dto, rantingId,
      nomorAnggota: await this.nraService.generateMemberNumber(rantingId || ''),
      statusData: 'complete', statusValidasi: 'pending',
    };
  }
  protected async afterCreate(result, _dto) {
    if (result?.email) this.memberMailService.sendToMember(...);
  }
}
```

### Indirect Scope: DuesService

**Scope:** `anggota_indirect` (iuran → anggota → ranting)  
**Hook:** `afterCreate` → award gamification points + send email  
**Hook:** `afterUpdate` → handle status change → points + email  
**Hook:** `afterRemove` → invalidate reports cache

### Kegiatan Scope: ActivitiesService

**Scope:** `kegiatan` (via scopeType/scopeId)  
**Hook:** `beforeCreate` → auto-resolve scope, set status='draft'  
**Hook:** `beforeUpdate` → sparse update  
**Domain:** addParticipant, importParticipants, recordPresence, uploadDocument

---

## 8. Troubleshooting

### Q: Service saya butuh select di findOne (exclude passwordHash)

Gunakan parameter `select` ke-4:

```ts
return this.baseFindOne(id, scope, undefined, {
  id: true, email: true, namaLengkap: true, role: true,
  // passwordHash tidak termasuk — otomatis di-exclude
});
```

### Q: Service saya butuh include di findOne

Gunakan parameter `include` ke-3:

```ts
return this.baseFindOne(id, scope, {
  ranting: true,
  pelatih: { select: { id: true, namaLengkap: true } },
});
```

### Q: Service saya punya filter tambahan di findAll

Tambahkan di callback `buildWhere`:

```ts
return this.baseFindAll(cacheKey, async () => {
  const where: Record<string, unknown> = { tipe: 'pendadaran' }; // filter tambahan
  Object.assign(where, this.buildKegiatanScopeFilter(scope));
  return where;
}, { ... });
```

### Q: Soft delete pakai deletedAt — tapi service saya pakai isActive

Override `remove` — jangan gunakan `softDelete: true`:

```ts
async remove(id: string, scope?: UserScope) {
  await this.verifyScope(id, scope);
  await this.prismaDelegate.update({ where: { id }, data: { isActive: false } });
  this.invalidateCache();
  return { message: '...' };
}
```

### Q: Domain method saya perlu return { data, message }

`{ data, message }` sudah benar — interceptor akan tambah `success: true`.

```ts
async domainMethod() {
  return { data: result, message: 'Berhasil' };
  // Response: { success: true, data: result, message: 'Berhasil' }
}
```

### Q: Module tidak import ScopeModule, error inject?

`ScopeModule` adalah `@Global()` — semua provider-nya (ScopeHelper, CacheService, dll) tersedia di seluruh aplikasi tanpa import. Jika error, periksa apakah ScopeModule benar-benar `@Global()` di definisinya.

---

## 9. Checklist

### Sebelum Refactor

- [ ] Service memiliki 5 CRUD method (findAll, findOne, create, update, remove)
- [ ] Model Prisma sudah benar (cek prisma.schema)
- [ ] DTO sudah benar (CreateXDto, UpdateXDto)
- [ ] Scope strategy jelas (ranting/kegiatan/anggota_indirect/none)
- [ ] Tidak ada multi-model dalam satu service

### Saat Refactor

- [ ] Class declaration → `extends BaseCrudService<CreateDto, UpdateDto>`
- [ ] Constructor → pass prisma, scopeHelper, cache ke super()
- [ ] Config → model, prefix, notFound, scopeStrategy, softDelete
- [ ] beforeCreate → transform DTO, hash password, parse dates
- [ ] afterCreate → send email, award points, invalidate cache
- [ ] beforeUpdate → sparse update, hash password if changed
- [ ] findAll → `baseFindAll` dengan cache key unique + scope filter
- [ ] findOne → `baseFindOne` dengan optional include/select
- [ ] create → `baseCreate`
- [ ] update → `baseUpdate`
- [ ] remove → `baseRemove` (atau override untuk soft delete custom)
- [ ] Hapus `new Logger()` — inherited
- [ ] Hapus `{ success, data, message }` — interceptor handles
- [ ] Hapus `as never` — gunakan `Record<string, unknown>`
- [ ] Hapus manual `NotFoundException` — base method throws
- [ ] Hapus manual `paginate()` — baseFindAll handles

### Setelah Refactor

- [ ] `pnpm build` atau `tsc --noEmit` — 0 errors
- [ ] Controller tetap kompatibel (method signatures tidak berubah)
- [ ] Test findAll → cache bekerja, scope filter benar
- [ ] Test create → hooks berjalan (email terkirim)
- [ ] Test update → sparse update, cache invalidated
- [ ] Test remove → soft delete / hard delete benar
- [ ] Test domain methods → response wrapper kompatibel dengan interceptor

---

## Quick Start: Template Service Minimal

```ts
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
    // inject dependencies tambahan di sini (private readonly ...)
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'xxx',          // Prisma model name (lowercase)
      prefix: 'xxx:',        // Cache prefix
      notFound: 'Tidak ditemukan',
      // scopeStrategy: 'ranting', // atau 'kegiatan' / 'anggota_indirect'
      // softDelete: true,
    });
  }

  // ── Hooks ──
  protected async beforeCreate(dto: CreateXxxDto, scope?: UserScope): Promise<Record<string, unknown>> {
    return { ...dto };
  }

  protected async beforeUpdate(_id: string, dto: UpdateXxxDto): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};
    if (dto.field !== undefined) data.field = dto.field;
    return data;
  }

  protected async afterCreate(result: any, _dto: CreateXxxDto): Promise<void> {
    // send email, notification, etc.
  }

  // ── CRUD ──
  async findAll(query: XxxFilterDto, scope?: UserScope) {
    return this.baseFindAll(
      `${this.CACHE_PREFIX}list:${scope?.rantingId || 'all'}:${query.page}`,
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
