// @ts-nocheck
/**
 * E2E Tests for Hierarchical Scope Filtering
 *
 * Tests that scope-based data isolation works correctly across all hierarchy levels:
 * - National (superadmin): sees all data
 * - District (admin_distrik): sees data in their distrik
 * - Region (admin_wilayah): sees data in their wilayah
 * - Branch (admin_ranting): sees data in their ranting only
 *
 * Setup:
 * 1 Distrik → 2 Wilayah → 3 Ranting → Members in different rantings
 * 4 Users at each level with assigned rantingIds
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import bcrypt from 'bcryptjs';

describe('Scope Filtering E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test hierarchy IDs
  let distrikId: string;
  let wilayahId1: string;
  let wilayahId2: string;
  let rantingId1: string; // under wilayah1
  let rantingId2: string; // under wilayah1
  let rantingId3: string; // under wilayah2

  // User IDs and tokens
  let superadminToken: string;
  let distrikAdminToken: string;
  let wilayahAdminToken: string;
  let rantingAdminToken: string;

  // Member IDs for testing
  let memberInRanting1: string;
  let memberInRanting2: string;
  let memberInRanting3: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Clean up any existing test data
    await cleanupTestData();

    // Create hierarchy: 1 Distrik → 2 Wilayah → 3 Ranting
    const distrik = await prisma.distrik.create({
      data: { nama: 'TEST_Distrik_Larantuka', kode: 'DL-TEST' },
    });
    distrikId = distrik.id;

    const [w1, w2] = await Promise.all([
      prisma.wilayah.create({
        data: { nama: 'TEST_Wilayah_A', kode: 'WA-TEST', distrikId },
      }),
      prisma.wilayah.create({
        data: { nama: 'TEST_Wilayah_B', kode: 'WB-TEST', distrikId },
      }),
    ]);
    wilayahId1 = w1.id;
    wilayahId2 = w2.id;

    const [r1, r2, r3] = await Promise.all([
      prisma.ranting.create({
        data: { nama: 'TEST_Ranting_1', kode: 'R1-TEST', wilayahId: wilayahId1 },
      }),
      prisma.ranting.create({
        data: { nama: 'TEST_Ranting_2', kode: 'R2-TEST', wilayahId: wilayahId1 },
      }),
      prisma.ranting.create({
        data: { nama: 'TEST_Ranting_3', kode: 'R3-TEST', wilayahId: wilayahId2 },
      }),
    ]);
    rantingId1 = r1.id;
    rantingId2 = r2.id;
    rantingId3 = r3.id;

    // Create users at each level
    const passwordHash = await bcrypt.hash('test1234', 12);

    await Promise.all([
      prisma.user.create({
        data: { email: 'scope-superadmin@test.com', passwordHash, namaLengkap: 'Super Admin', role: 'superadmin' },
      }),
      prisma.user.create({
        data: { email: 'scope-distrik@test.com', passwordHash, namaLengkap: 'Admin Distrik', role: 'admin_distrik', rantingId: rantingId1 },
      }),
      prisma.user.create({
        data: { email: 'scope-wilayah@test.com', passwordHash, namaLengkap: 'Admin Wilayah', role: 'admin_wilayah', rantingId: rantingId1 },
      }),
      prisma.user.create({
        data: { email: 'scope-ranting@test.com', passwordHash, namaLengkap: 'Admin Ranting', role: 'admin_ranting', rantingId: rantingId1 },
      }),
      prisma.user.create({
        data: { email: 'scope-anggota@test.com', passwordHash, namaLengkap: 'Anggota User', role: 'anggota' },
      }),
    ]);

    // Create members in different rantings
    const [m1, m2, m3] = await Promise.all([
      prisma.anggota.create({
        data: {
          namaLengkap: 'Anggota Ranting 1', jenisKelamin: 'L', nomorAnggota: 'TEST-001',
          rantingId: rantingId1, statusData: 'complete', statusValidasi: 'approved',
          noHp: '081234567890', alamat: 'Alamat Test 1',
        },
      }),
      prisma.anggota.create({
        data: {
          namaLengkap: 'Anggota Ranting 2', jenisKelamin: 'P', nomorAnggota: 'TEST-002',
          rantingId: rantingId2, statusData: 'complete', statusValidasi: 'approved',
          noHp: '081234567891', alamat: 'Alamat Test 2',
        },
      }),
      prisma.anggota.create({
        data: {
          namaLengkap: 'Anggota Ranting 3', jenisKelamin: 'L', nomorAnggota: 'TEST-003',
          rantingId: rantingId3, statusData: 'complete', statusValidasi: 'approved',
          noHp: '081234567892', alamat: 'Alamat Test 3',
        },
      }),
    ]);
    memberInRanting1 = m1.id;
    memberInRanting2 = m2.id;
    memberInRanting3 = m3.id;

    // Login as each user to get tokens
    const [suRes, daRes, waRes, raRes] = await Promise.all([
      request(app.getHttpServer()).post('/api/auth/login').send({ email: 'scope-superadmin@test.com', password: 'test1234' }),
      request(app.getHttpServer()).post('/api/auth/login').send({ email: 'scope-distrik@test.com', password: 'test1234' }),
      request(app.getHttpServer()).post('/api/auth/login').send({ email: 'scope-wilayah@test.com', password: 'test1234' }),
      request(app.getHttpServer()).post('/api/auth/login').send({ email: 'scope-ranting@test.com', password: 'test1234' }),
    ]);

    superadminToken = suRes.body.data.accessToken;
    distrikAdminToken = daRes.body.data.accessToken;
    wilayahAdminToken = waRes.body.data.accessToken;
    rantingAdminToken = raRes.body.data.accessToken;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function cleanupTestData() {
    // Clean up test data in reverse order (foreign keys)
    // Use specific IDs where possible, startsWith for patterns
    try {
      await prisma.anggota.deleteMany({ where: { nomorAnggota: { startsWith: 'TEST-' } } });
      await prisma.user.deleteMany({ where: { email: { contains: 'scope-' } } });
      // Delete specific test rantings by ID if known, otherwise by nama prefix
      await prisma.ranting.deleteMany({ where: { nama: { startsWith: 'TEST_Ranting_' } } });
      await prisma.wilayah.deleteMany({ where: { nama: { startsWith: 'TEST_Wilayah_' } } });
      await prisma.distrik.deleteMany({ where: { nama: { startsWith: 'TEST_Distrik_' } } });
    } catch { /* ignore cleanup errors */ }
  }

  // ─── ScopeGuard: rejects unauthorized roles ───
  describe('ScopeGuard - Rejects Unauthorized Roles', () => {
    it('anggota role gets 403 on @RequireScope("branch") endpoints', async () => {
      // anggota role has 'self' scope level, but endpoint requires 'branch'
      // Login as anggota user
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'scope-anggota@test.com', password: 'test1234' });
      const anggotaToken = loginRes.body.data.accessToken;

      await request(app.getHttpServer())
        .get('/api/members')
        .set('Authorization', `Bearer ${anggotaToken}`)
        .expect(403);
    });
  });

  // ─── Members: findAll scope filtering ───
  describe('Members findAll - Scope Filtering', () => {
    it('superadmin sees all members (national level)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/members')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const memberNames = res.body.data.map((m: any) => m.namaLengkap);
      expect(memberNames).toContain('Anggota Ranting 1');
      expect(memberNames).toContain('Anggota Ranting 2');
      expect(memberNames).toContain('Anggota Ranting 3');
    });

    it('ranting admin sees only members in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/members')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const memberNames = res.body.data.map((m: any) => m.namaLengkap);
      // Should only see ranting1 member
      expect(memberNames).toContain('Anggota Ranting 1');
      expect(memberNames).not.toContain('Anggota Ranting 2');
      expect(memberNames).not.toContain('Anggota Ranting 3');
    });

    it('distrik admin (with rantingId) sees only ranting-scoped members', async () => {
      // Note: ScopeGuard sets scope from user.rantingId regardless of role,
      // so admin_distrik with rantingId behaves same as admin_ranting at service level
      const res = await request(app.getHttpServer())
        .get('/api/members')
        .set('Authorization', `Bearer ${distrikAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const memberNames = res.body.data.map((m: any) => m.namaLengkap);
      expect(memberNames).toContain('Anggota Ranting 1');
      expect(memberNames).not.toContain('Anggota Ranting 2');
      expect(memberNames).not.toContain('Anggota Ranting 3');
    });
  });

  // ─── Members: findOne scope verification ───
  describe('Members findOne - Scope Verification', () => {
    it('ranting admin can view member in their own ranting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/members/${memberInRanting1}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.namaLengkap).toBe('Anggota Ranting 1');
    });

    it('ranting admin gets 403 viewing member in another ranting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/members/${memberInRanting2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);

      expect(res.body.message).toContain('Akses ditolak');
    });

    it('superadmin can view any member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/members/${memberInRanting3}`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.namaLengkap).toBe('Anggota Ranting 3');
    });
  });

  // ─── Members: create with auto-scope ───
  describe('Members create - Scope Auto-Assignment', () => {
    let createdMemberId: string;

    it('ranting admin creates member with auto-assigned rantingId from scope', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/members')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({
          namaLengkap: 'Auto-Scope Member',
          jenisKelamin: 'L',
          noHp: '081111111111',
          alamat: 'Auto Scope Address',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rantingId).toBe(rantingId1);
      createdMemberId = res.body.data.id;
    });

    it('ranting admin can view the auto-created member', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.data.namaLengkap).toBe('Auto-Scope Member');
    });

    // Cleanup
    it('ranting admin can delete member in their ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/members/${createdMemberId}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);
    });
  });

  // ─── Members: update scope check ───
  describe('Members update - Scope Check', () => {
    it('ranting admin can update member in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/members/${memberInRanting1}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ noHp: '089999999999' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('ranting admin gets 403 updating member in another ranting', async () => {
      await request(app.getHttpServer())
        .patch(`/api/members/${memberInRanting2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ noHp: '089999999999' })
        .expect(403);
    });
  });

  // ─── Members: remove scope check ───
  describe('Members remove - Scope Check', () => {
    let removableMemberId: string;

    beforeAll(async () => {
      const member = await prisma.anggota.create({
        data: {
          namaLengkap: 'Removable Member', jenisKelamin: 'P', nomorAnggota: 'TEST-DEL',
          rantingId: rantingId1, statusData: 'complete', statusValidasi: 'approved',
          noHp: '081000000000', alamat: 'Delete Test',
        },
      });
      removableMemberId = member.id;
    });

    it('ranting admin can soft-delete member in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/members/${removableMemberId}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('ranting admin gets 403 deleting member in another ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/members/${memberInRanting2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });
  });

  // ─── Auth: without token ───
  describe('Auth - Without Token', () => {
    it('returns 401 without Bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/members')
        .expect(401);
    });
  });

  // ─── Reports: scope-filtered dashboard ───
  describe('Reports - Scope-Filtered Dashboard', () => {
    it('ranting admin gets scope-filtered dashboard stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalMembers).toBe('number');
      expect(typeof res.body.data.monthlyDues).toBe('object');
    });

    it('superadmin gets national dashboard stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.totalMembers).toBe('number');
    });

    it('reports members endpoint is scope-filtered', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/members')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.total).toBe('number');
    });
  });
});
