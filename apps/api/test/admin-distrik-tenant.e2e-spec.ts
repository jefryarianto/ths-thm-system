// @ts-nocheck
/**
 * E2E Tests: admin_distrik Tenant Isolation (per-distrik tenancy)
 *
 * Platform semantics being locked in here:
 *   - ScopeGuard resolves admin_distrik's scope THROUGH their rantingId:
 *     ranting → wilayah → distrik. An admin_distrik without rantingId gets an
 *     empty scope (national visibility) — a configuration to avoid (see notes).
 *   - Operational lists (members/users/kegiatan) collapse a ranting-anchored
 *     admin_distrik to ranting level — which is STRICTER than district-wide,
 *     so cross-DISTRICT access is impossible by construction. These tests
 *     verify that, plus the write-side escalation guards.
 *   - Settings-family modules (tanda tangan, stempel, template kartu, jabatan)
 *     DO use the district-wide scope.distrikId (covered by unit tests).
 *
 * Setup: TWO districts so cross-tenant paths are actually exercised.
 *   Distrik A → Wilayah A → Ranting A1, A2   (members, user, kegiatan)
 *   Distrik B → Wilayah B → Ranting B1       (members, user, kegiatan)
 *
 * Run: pnpm --filter @ths-thm/api test:e2e -- admin-distrik-tenant
 * (DATABASE_URL must point at an isolated test DB with migrations applied)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import bcrypt from 'bcryptjs';

jest.setTimeout(120000);

describe('admin_distrik Tenant Isolation E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Hierarchy ids
  let distrikAId: string;
  let distrikBId: string;
  let wilayahAId: string;
  let wilayahBId: string;
  let rantingA1Id: string;
  let rantingA2Id: string;
  let rantingB1Id: string;

  // Tokens
  let superadminToken: string;
  let districtAdminToken: string; // admin_distrik anchored at ranting A1
  let wilayahAdminToken: string; // admin_wilayah anchored at ranting A1
  let rantingBAdminToken: string; // admin_ranting in Distrik B (rival tenant)

  // Resource ids
  let memberInRantingA1: string;
  let memberInRantingA2: string;
  let memberInRantingB1: string;
  let kegiatanInRantingA1: string;
  let kegiatanInRantingA2: string;
  let kegiatanInRantingB1: string;
  let userInRantingB1: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);

    await cleanupTestData();

    // ── Hierarchy: 2 districts ──
    const nasional = await prisma.nasional.create({
      data: { nama: 'TEST_Nasional_Tenant', kode: 'NS-TENANT' },
    });

    const [dA, dB] = await Promise.all([
      prisma.distrik.create({
        data: { nama: 'TEST_Distrik_A', kodeDistrik: 'DA-TENANT', nasionalId: nasional.id },
      }),
      prisma.distrik.create({
        data: { nama: 'TEST_Distrik_B', kodeDistrik: 'DB-TENANT', nasionalId: nasional.id },
      }),
    ]);
    distrikAId = dA.id;
    distrikBId = dB.id;

    const [wA, wB] = await Promise.all([
      prisma.wilayah.create({
        data: { nama: 'TEST_Wilayah_A', kodeWilayah: 'WA-TENANT', distrikId: distrikAId },
      }),
      prisma.wilayah.create({
        data: { nama: 'TEST_Wilayah_B', kodeWilayah: 'WB-TENANT', distrikId: distrikBId },
      }),
    ]);
    wilayahAId = wA.id;
    wilayahBId = wB.id;

    const [rA1, rA2, rB1] = await Promise.all([
      prisma.ranting.create({
        data: { nama: 'TEST_Ranting_A1', kodeRanting: 'RA1-TENANT', wilayahId: wilayahAId },
      }),
      prisma.ranting.create({
        data: { nama: 'TEST_Ranting_A2', kodeRanting: 'RA2-TENANT', wilayahId: wilayahAId },
      }),
      prisma.ranting.create({
        data: { nama: 'TEST_Ranting_B1', kodeRanting: 'RB1-TENANT', wilayahId: wilayahBId },
      }),
    ]);
    rantingA1Id = rA1.id;
    rantingA2Id = rA2.id;
    rantingB1Id = rB1.id;

    // ── Users ──
    const passwordHash = await bcrypt.hash('test1234', 10);

    const superadmin = await prisma.user.create({
      data: {
        email: 'tenant-superadmin@test.com',
        passwordHash,
        namaLengkap: 'Super Admin Tenant',
        role: 'superadmin',
      },
    });

    await prisma.user.create({
      data: {
        email: 'tenant-distrik@test.com',
        passwordHash,
        namaLengkap: 'Admin Distrik A',
        role: 'admin_distrik',
        rantingId: rantingA1Id,
      },
    });

    await prisma.user.create({
      data: {
        email: 'tenant-wilayah@test.com',
        passwordHash,
        namaLengkap: 'Admin Wilayah A',
        role: 'admin_wilayah',
        rantingId: rantingA1Id,
      },
    });

    const userB1 = await prisma.user.create({
      data: {
        email: 'tenant-user-b1@test.com',
        passwordHash,
        namaLengkap: 'Admin Ranting B1',
        role: 'admin_ranting',
        rantingId: rantingB1Id,
      },
    });
    userInRantingB1 = userB1.id;

    // ── Members ──
    const [mA1, mA2, mB1] = await Promise.all([
      prisma.anggota.create({
        data: {
          namaLengkap: 'Anggota Ranting A1',
          jenisKelamin: 'L',
          nomorAnggota: 'TEST-TN-A1',
          rantingId: rantingA1Id,
          statusData: 'complete',
          statusValidasi: 'approved',
          noHp: '081200000001',
          alamat: 'Alamat A1',
        },
      }),
      prisma.anggota.create({
        data: {
          namaLengkap: 'Anggota Ranting A2',
          jenisKelamin: 'P',
          nomorAnggota: 'TEST-TN-A2',
          rantingId: rantingA2Id,
          statusData: 'complete',
          statusValidasi: 'approved',
          noHp: '081200000003',
          alamat: 'Alamat A2',
        },
      }),
      prisma.anggota.create({
        data: {
          namaLengkap: 'Anggota Ranting B1',
          jenisKelamin: 'P',
          nomorAnggota: 'TEST-TN-B1',
          rantingId: rantingB1Id,
          statusData: 'complete',
          statusValidasi: 'approved',
          noHp: '081200000002',
          alamat: 'Alamat B1',
        },
      }),
    ]);
    memberInRantingA1 = mA1.id;
    memberInRantingA2 = mA2.id;
    memberInRantingB1 = mB1.id;

    // ── Kegiatan (one per ranting + one distrik-scoped) ──
    const [kA1, kA2, kB1] = await Promise.all([
      prisma.kegiatan.create({
        data: {
          nama: 'Kegiatan Ranting A1',
          tipe: 'latihan',
          scopeType: 'ranting',
          scopeId: rantingA1Id,
          tanggalMulai: new Date(),
          tanggalSelesai: new Date(),
          lokasi: 'Aula A1',
          status: 'published',
          createdBy: superadmin.id,
        },
      }),
      prisma.kegiatan.create({
        data: {
          nama: 'Kegiatan Ranting A2',
          tipe: 'latihan',
          scopeType: 'ranting',
          scopeId: rantingA2Id,
          tanggalMulai: new Date(),
          tanggalSelesai: new Date(),
          lokasi: 'Aula A2',
          status: 'published',
          createdBy: superadmin.id,
        },
      }),
      prisma.kegiatan.create({
        data: {
          nama: 'Kegiatan Ranting B1',
          tipe: 'latihan',
          scopeType: 'ranting',
          scopeId: rantingB1Id,
          tanggalMulai: new Date(),
          tanggalSelesai: new Date(),
          lokasi: 'Aula B1',
          status: 'published',
          createdBy: superadmin.id,
        },
      }),
    ]);
    kegiatanInRantingA1 = kA1.id;
    kegiatanInRantingA2 = kA2.id;
    kegiatanInRantingB1 = kB1.id;

    // ── Logins ──
    const [suRes, daRes, waRes, rbRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'tenant-superadmin@test.com', password: 'test1234' }),
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'tenant-distrik@test.com', password: 'test1234' }),
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'tenant-wilayah@test.com', password: 'test1234' }),
      request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ identifier: 'tenant-user-b1@test.com', password: 'test1234' }),
    ]);

    superadminToken = suRes.body.data.accessToken;
    districtAdminToken = daRes.body.data.accessToken;
    wilayahAdminToken = waRes.body.data.accessToken;
    rantingBAdminToken = rbRes.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  /** Helper to safely delete test data — wraps raw SQL with error logging */
  async function clean(table: string, where: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).$executeRawUnsafe(`DELETE FROM ${table} WHERE ${where}`);
    } catch (e) {
      if (e instanceof Error) console.warn(`cleanup ${table}:`, e.message);
    }
  }

  /**
   * Raw-SQL cleanup, independent per table, only touching TEST_ / tenant-
   * prefixed rows (plus API-created rows under the test rantings) so seed and
   * real data are never affected.
   */
  async function cleanupTestData() {
    const testRantingIds = "SELECT id FROM ranting WHERE nama LIKE 'TEST_Ranting_%'";
    const testAnggotaIds = `SELECT id FROM anggota WHERE nomor_anggota LIKE 'TEST-TN-%' OR ranting_id IN (${testRantingIds})`;
    const testUserIds = "SELECT id FROM users WHERE email LIKE 'tenant-%'";

    // Kegiatan participants / presence referencing test anggota
    await clean('presensi_kegiatan', `anggota_id IN (${testAnggotaIds})`);
    await clean('kegiatan_peserta', `anggota_id IN (${testAnggotaIds})`);
    await clean('anggota', `id IN (${testAnggotaIds})`);
    // Kegiatan scoped to test rantings/distriks (before users — createdBy FK)
    await clean('kegiatan', `scope_id IN (${testRantingIds}) OR nama LIKE 'Kegiatan Legal %'`);
    // Users' dependents
    await clean('notifikasi', `user_id IN (${testUserIds})`);
    await clean('oauth_accounts', `user_id IN (${testUserIds})`);
    await clean('device_tokens', `user_id IN (${testUserIds})`);
    await clean('tanda_tangan', `user_id IN (${testUserIds})`);
    await clean('users', "email LIKE 'tenant-%'");
    await clean('ranting', "nama LIKE 'TEST_Ranting_%'");
    await clean('wilayah', "nama LIKE 'TEST_Wilayah_%'");
    await clean('distrik', "nama LIKE 'TEST_Distrik_%'");
    await clean('nasional', "nama LIKE 'TEST_Nasional_Tenant%'");
  }

  const get = (url: string, token: string) =>
    request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${token}`);

  // ═══════════════════════════════════════════════
  describe('Login & scope resolution', () => {
    it('admin_distrik scope resolves ranting → wilayah → distrik', async () => {
      const res = await get('/api/auth/scope', districtAdminToken).expect(200);
      expect(res.body.data.role).toBe('admin_distrik');
      expect(res.body.data.rantingId).toBe(rantingA1Id);
      expect(res.body.data.wilayahId).toBe(wilayahAId);
      expect(res.body.data.distrikId).toBe(distrikAId);
    });

    it('branch admin (admin_ranting B1) scope reports their ranting only', async () => {
      // Platform semantics: ScopeGuard resolves the full hierarchy only for
      // admin_distrik/admin_wilayah; branch admins get { rantingId }.
      const res = await get('/api/auth/scope', rantingBAdminToken).expect(200);
      expect(res.body.data.rantingId).toBe(rantingB1Id);
    });

    it('superadmin scope is empty (national)', async () => {
      const res = await get('/api/auth/scope', superadminToken).expect(200);
      expect(res.body.data.distrikId).toBeNull();
      expect(res.body.data.wilayahId).toBeNull();
      expect(res.body.data.rantingId).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════
  describe('Members list isolation', () => {
    it('admin_distrik sees only own-ranting members (stricter than district-wide)', async () => {
      const res = await get('/api/members', districtAdminToken).expect(200);
      const names = res.body.data.map((m: any) => m.namaLengkap);
      expect(names).toContain('Anggota Ranting A1');
      expect(names).not.toContain('Anggota Ranting A2');
      expect(names).not.toContain('Anggota Ranting B1');
    });

    it('admin_distrik ?distrikId=B cannot widen visibility', async () => {
      const res = await get(`/api/members?distrikId=${distrikBId}`, districtAdminToken).expect(200);
      const names = res.body.data.map((m: any) => m.namaLengkap);
      expect(names).not.toContain('Anggota Ranting B1');
    });

    it('rival tenant sees only their own ranting members', async () => {
      const res = await get('/api/members', rantingBAdminToken).expect(200);
      const names = res.body.data.map((m: any) => m.namaLengkap);
      expect(names).toContain('Anggota Ranting B1');
      expect(names).not.toContain('Anggota Ranting A1');
    });

    it('superadmin sees members from both districts', async () => {
      const res = await get('/api/members', superadminToken).expect(200);
      const names = res.body.data.map((m: any) => m.namaLengkap);
      expect(names).toContain('Anggota Ranting A1');
      expect(names).toContain('Anggota Ranting B1');
    });
  });

  // ═══════════════════════════════════════════════
  describe('Members cross-tenant access rejected', () => {
    it('GET member of rival distrik → 403', async () => {
      await get(`/api/members/${memberInRantingB1}`, districtAdminToken).expect(403);
      await get(`/api/members/${memberInRantingA1}`, rantingBAdminToken).expect(403);
    });

    it('GET member of sibling ranting (same distrik) → 403', async () => {
      await get(`/api/members/${memberInRantingA2}`, districtAdminToken).expect(403);
    });

    it('PATCH member of rival distrik → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/members/${memberInRantingB1}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({ noHp: '089900000001' })
        .expect(403);
    });

    it('DELETE member of rival distrik → 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/members/${memberInRantingB1}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .expect(403);
    });

    it('POST member into rival distrik ranting → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/members')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          namaLengkap: 'Smuggled Member',
          jenisKelamin: 'L',
          noHp: '081300000001',
          alamat: 'Jl. Smuggle',
          rantingId: rantingB1Id,
        })
        .expect(403);
    });

    it('POST member into sibling ranting of own distrik → 403 (ranting-anchored writes)', async () => {
      await request(app.getHttpServer())
        .post('/api/members')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          namaLengkap: 'Across Ranting Member',
          jenisKelamin: 'L',
          noHp: '081300000003',
          alamat: 'Jl. A2',
          rantingId: rantingA2Id,
        })
        .expect(403);
    });

    it('POST member without rantingId auto-assigns own ranting → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/members')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          namaLengkap: 'Anggota Auto Scope A1',
          jenisKelamin: 'L',
          noHp: '081300000004',
          alamat: 'Jl. Auto',
        })
        .expect(201);
      expect(res.body.data.rantingId).toBe(rantingA1Id);

      await request(app.getHttpServer())
        .delete(`/api/members/${res.body.data.id}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .expect(200);
    });
  });

  // ═══════════════════════════════════════════════
  describe('Users isolation & escalation guards', () => {
    it('admin_distrik lists only own-ranting users', async () => {
      const res = await get('/api/users', districtAdminToken).expect(200);
      const emails = res.body.data.map((u: any) => u.email);
      expect(emails).toContain('tenant-distrik@test.com');
      expect(emails).toContain('tenant-wilayah@test.com');
      expect(emails).not.toContain('tenant-user-b1@test.com');
    });

    it('GET user of rival distrik → 403 (rival admin viewing foreign user)', async () => {
      await get(`/api/users/${userInRantingB1}`, districtAdminToken).expect(403);
    });

    it('GET own user by rival admin → 200 (their own ranting)', async () => {
      const res = await get(`/api/users/${userInRantingB1}`, rantingBAdminToken).expect(200);
      expect(res.body.data.email).toBe('tenant-user-b1@test.com');
    });

    it('PATCH user of rival distrik → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${userInRantingB1}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({ namaLengkap: 'Hacked' })
        .expect(403);
    });

    it('DELETE user of rival distrik → 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${userInRantingB1}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .expect(403);
    });

    it('POST user with role=superadmin → 403 (no vertical escalation)', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          email: `tenant-escalate-${Date.now()}@test.com`,
          namaLengkap: 'Escalated User',
          role: 'superadmin',
        })
        .expect(403);
    });

    it('POST user into rival distrik ranting → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          email: `tenant-smuggle-${Date.now()}@test.com`,
          namaLengkap: 'Smuggled User',
          role: 'admin_ranting',
          rantingId: rantingB1Id,
        })
        .expect(403);
    });

    it('PATCH own user role→superadmin → 403', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          email: `tenant-own-${Date.now()}@test.com`,
          namaLengkap: 'Own User',
          role: 'admin_ranting',
        })
        .expect(201);
      expect(created.body.data.rantingId).toBe(rantingA1Id);
      const ownUserId = created.body.data.id;

      await request(app.getHttpServer())
        .patch(`/api/users/${ownUserId}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({ role: 'superadmin' })
        .expect(403);

      // cleanup
      await request(app.getHttpServer())
        .delete(`/api/users/${ownUserId}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .expect(200);
    });
  });

  // ═══════════════════════════════════════════════
  describe('Kegiatan isolation', () => {
    it('admin_distrik list shows only own-ranting kegiatan', async () => {
      const res = await get('/api/activities', districtAdminToken).expect(200);
      const names = res.body.data.map((a: any) => a.nama);
      expect(names).toContain('Kegiatan Ranting A1');
      expect(names).not.toContain('Kegiatan Ranting A2');
      expect(names).not.toContain('Kegiatan Ranting B1');
    });

    it('GET kegiatan of rival distrik → 403', async () => {
      await get(`/api/activities/${kegiatanInRantingB1}`, districtAdminToken).expect(403);
      await get(`/api/activities/${kegiatanInRantingA1}`, rantingBAdminToken).expect(403);
    });

    it('GET kegiatan of sibling ranting (same distrik) → 403', async () => {
      await get(`/api/activities/${kegiatanInRantingA2}`, districtAdminToken).expect(403);
    });

    it('PATCH kegiatan of rival distrik → 403', async () => {
      await request(app.getHttpServer())
        .patch(`/api/activities/${kegiatanInRantingB1}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({ nama: 'Hacked' })
        .expect(403);
    });

    it('DELETE (cancel) kegiatan of rival distrik → 403', async () => {
      await request(app.getHttpServer())
        .delete(`/api/activities/${kegiatanInRantingB1}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .expect(403);
    });

    it('POST kegiatan scoped to rival ranting → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/activities')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          nama: 'Illegal Kegiatan B1',
          tipe: 'latihan',
          scopeType: 'ranting',
          scopeId: rantingB1Id,
          tanggalMulai: new Date().toISOString(),
          tanggalSelesai: new Date().toISOString(),
          lokasi: 'Aula B1',
        })
        .expect(403);
    });

    it('POST kegiatan scoped to own ranting → 201 then cancellable', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/activities')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          nama: 'Kegiatan Legal A1',
          tipe: 'latihan',
          scopeType: 'ranting',
          scopeId: rantingA1Id,
          tanggalMulai: new Date().toISOString(),
          tanggalSelesai: new Date().toISOString(),
          lokasi: 'Aula A1',
        })
        .expect(201);
      expect(res.body.data.scopeId).toBe(rantingA1Id);

      await request(app.getHttpServer())
        .delete(`/api/activities/${res.body.data.id}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .expect(200);
    });

    it('POST kegiatan scoped to own distrik → 201 (create-guard is district-aware)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/activities')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          nama: 'Kegiatan Legal Distrik A',
          tipe: 'latihan',
          scopeType: 'distrik',
          scopeId: distrikAId,
          tanggalMulai: new Date().toISOString(),
          tanggalSelesai: new Date().toISOString(),
          lokasi: 'Aula Distrik A',
        })
        .expect(201);
      expect(res.body.data.scopeId).toBe(distrikAId);

      await request(app.getHttpServer())
        .delete(`/api/activities/${res.body.data.id}`)
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .expect(200);
    });

    it('POST kegiatan scoped to rival DISTRIK → 403', async () => {
      await request(app.getHttpServer())
        .post('/api/activities')
        .set('Authorization', `Bearer ${districtAdminToken}`)
        .send({
          nama: 'Illegal Kegiatan Distrik B',
          tipe: 'latihan',
          scopeType: 'distrik',
          scopeId: distrikBId,
          tanggalMulai: new Date().toISOString(),
          tanggalSelesai: new Date().toISOString(),
          lokasi: 'Aula B',
        })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════
  describe('Superadmin is not tenant-restricted', () => {
    it('reads rival-distrik member detail', async () => {
      const res = await get(`/api/members/${memberInRantingB1}`, superadminToken).expect(200);
      expect(res.body.data.namaLengkap).toBe('Anggota Ranting B1');
    });

    it('creates a user inside rival distrik ranting', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({
          email: `tenant-sa-b1-${Date.now()}@test.com`,
          namaLengkap: 'SA Created B1 User',
          role: 'admin_ranting',
          rantingId: rantingB1Id,
        })
        .expect(201);
      expect(created.body.data.rantingId).toBe(rantingB1Id);

      await request(app.getHttpServer())
        .delete(`/api/users/${created.body.data.id}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);
    });
  });
});
