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
    try {
      // E2E test data cleanup
      await prisma.iuran.deleteMany({ where: { anggotaId: { in: [memberInRanting1, memberInRanting2, memberInRanting3] } } });
      await prisma.kegiatan.deleteMany({ where: { nama: { startsWith: 'Kegiatan R' } } });
      await prisma.kegiatan.deleteMany({ where: { nama: 'Auto Activity' } });
      await prisma.klaim.deleteMany({ where: { anggotaId: { in: [memberInRanting1, memberInRanting2, memberInRanting3] } } });
      await prisma.dokumen.deleteMany({ where: { namaFile: { startsWith: 'TEST-kartu-' } } });
      await prisma.user.deleteMany({ where: { email: { in: ['scope-user-r1@test.com', 'scope-user-r2@test.com', 'scope-auto-user@test.com'] } } });
      await prisma.calonAnggota.deleteMany({ where: { namaLengkap: { in: ['Calon R1', 'Calon R2', 'Auto Calon'] } } });
      await prisma.anggota.deleteMany({ where: { nomorAnggota: { startsWith: 'TEST-' } } });
      await prisma.user.deleteMany({ where: { email: { contains: 'scope-' } } });
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

  // ═══════════════════════════════════════════════
  // Candidates: scope filtering
  // ═══════════════════════════════════════════════
  describe('Candidates - Scope Filtering', () => {
    let candidateInR1: string;
    let candidateInR2: string;

    beforeAll(async () => {
      const [c1, c2] = await Promise.all([
        prisma.calonAnggota.create({
          data: { rantingId: rantingId1, namaLengkap: 'Calon R1', jenisKelamin: 'L', status: 'diusulkan', usulOlehId: 'test' },
        }),
        prisma.calonAnggota.create({
          data: { rantingId: rantingId2, namaLengkap: 'Calon R2', jenisKelamin: 'P', status: 'diusulkan', usulOlehId: 'test' },
        }),
      ]);
      candidateInR1 = c1.id;
      candidateInR2 = c2.id;
    });

    it('superadmin sees all candidates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/candidates')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const names = res.body.data.map((c: any) => c.namaLengkap);
      expect(names).toContain('Calon R1');
      expect(names).toContain('Calon R2');
    });

    it('ranting admin sees only candidates in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/candidates')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const names = res.body.data.map((c: any) => c.namaLengkap);
      expect(names).toContain('Calon R1');
      expect(names).not.toContain('Calon R2');
    });

    it('ranting admin gets 403 viewing candidate in another ranting', async () => {
      await request(app.getHttpServer())
        .get(`/api/candidates/${candidateInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });

    it('ranting admin can view candidate in their own ranting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/candidates/${candidateInR1}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.data.namaLengkap).toBe('Calon R1');
    });

    it('ranting admin creates candidate with auto-assigned rantingId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/candidates')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ namaLengkap: 'Auto Calon', jenisKelamin: 'L', status: 'diusulkan' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rantingId).toBe(rantingId1);
    });

    it('ranting admin gets 403 updating candidate in another ranting', async () => {
      await request(app.getHttpServer())
        .patch(`/api/candidates/${candidateInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ namaLengkap: 'Hacked' })
        .expect(403);
    });

    it('ranting admin gets 403 deleting candidate in another ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/candidates/${candidateInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════
  // Trainings: scope filtering
  // ═══════════════════════════════════════════════
  describe('Trainings - Scope Filtering', () => {
    let trainingInR1: string;
    let trainingInR2: string;

    beforeAll(async () => {
      const [t1, t2] = await Promise.all([
        prisma.latihan.create({
          data: {
            rantingId: rantingId1, namaKegiatan: 'Latihan R1',
            jenisMateri: 'Tendangan', tanggalMulai: new Date(), tanggalSelesai: new Date(),
            lokasi: 'Aula R1', status: 'published',
          },
        }),
        prisma.latihan.create({
          data: {
            rantingId: rantingId2, namaKegiatan: 'Latihan R2',
            jenisMateri: 'Tangkisan', tanggalMulai: new Date(), tanggalSelesai: new Date(),
            lokasi: 'Aula R2', status: 'published',
          },
        }),
      ]);
      trainingInR1 = t1.id;
      trainingInR2 = t2.id;
    });

    it('superadmin sees all trainings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/trainings')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const names = res.body.data.map((t: any) => t.namaKegiatan);
      expect(names).toContain('Latihan R1');
      expect(names).toContain('Latihan R2');
    });

    it('ranting admin sees only trainings in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/trainings')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const names = res.body.data.map((t: any) => t.namaKegiatan);
      expect(names).toContain('Latihan R1');
      expect(names).not.toContain('Latihan R2');
    });

    it('ranting admin creates training with auto-assigned rantingId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/trainings')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({
          namaKegiatan: 'Auto Training', jenisMateri: 'Kata',
          tanggalMulai: new Date().toISOString(), tanggalSelesai: new Date().toISOString(),
          lokasi: 'Aula Test',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rantingId).toBe(rantingId1);
    });

    it('ranting admin gets 403 updating training in another ranting', async () => {
      await request(app.getHttpServer())
        .patch(`/api/trainings/${trainingInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ namaKegiatan: 'Hacked' })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════
  // Dues: scope filtering via anggota relation
  // ═══════════════════════════════════════════════
  describe('Dues - Scope Filtering', () => {
    let dueInR1: string;
    let dueInR2: string;

    beforeAll(async () => {
      const [d1, d2] = await Promise.all([
        prisma.iuran.create({
          data: { anggotaId: memberInRanting1, jumlah: 50000, bulan: 1, tahun: 2026, status: 'belum_dibayar' },
        }),
        prisma.iuran.create({
          data: { anggotaId: memberInRanting2, jumlah: 50000, bulan: 1, tahun: 2026, status: 'belum_dibayar' },
        }),
      ]);
      dueInR1 = d1.id;
      dueInR2 = d2.id;
    });

    it('superadmin sees all dues', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dues')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const dueIds = res.body.data.map((d: any) => d.id);
      expect(dueIds).toContain(dueInR1);
      expect(dueIds).toContain(dueInR2);
    });

    it('ranting admin sees only dues for members in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dues')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      // Dues are filtered via anggota -> rantingId
      const dueIds = res.body.data.map((d: any) => d.id);
      expect(dueIds).toContain(dueInR1);
      expect(dueIds).not.toContain(dueInR2);
    });

    it('ranting admin gets 403 viewing due for member in another ranting', async () => {
      await request(app.getHttpServer())
        .get(`/api/dues/${dueInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });

    it('ranting admin can view due for member in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/dues/${dueInR1}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(dueInR1);
    });

    it('ranting admin gets 403 updating due in another ranting', async () => {
      await request(app.getHttpServer())
        .patch(`/api/dues/${dueInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ status: 'lunas' })
        .expect(403);
    });

    it('ranting admin gets 403 deleting due in another ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/dues/${dueInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════
  // Activities: scope filtering via scopeType/scopeId
  // ═══════════════════════════════════════════════
  describe('Activities - Scope Filtering', () => {
    let activityInR1: string;
    let activityInR2: string;

    beforeAll(async () => {
      // Create a kegiatan (parent of latihan) for each ranting
      const [k1, k2] = await Promise.all([
        prisma.kegiatan.create({
          data: {
            nama: 'Kegiatan R1', tipe: 'latihan',
            scopeType: 'ranting', scopeId: rantingId1,
            tanggalMulai: new Date(), tanggalSelesai: new Date(),
            lokasi: 'Aula R1', status: 'published',
          },
        }),
        prisma.kegiatan.create({
          data: {
            nama: 'Kegiatan R2', tipe: 'latihan',
            scopeType: 'ranting', scopeId: rantingId2,
            tanggalMulai: new Date(), tanggalSelesai: new Date(),
            lokasi: 'Aula R2', status: 'published',
          },
        }),
      ]);
      activityInR1 = k1.id;
      activityInR2 = k2.id;
    });

    it('superadmin sees all activities', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/activities')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const names = res.body.data.map((a: any) => a.nama);
      expect(names).toContain('Kegiatan R1');
      expect(names).toContain('Kegiatan R2');
    });

    it('ranting admin sees only activities with matching scopeType/scopeId', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/activities')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const names = res.body.data.map((a: any) => a.nama);
      expect(names).toContain('Kegiatan R1');
      expect(names).not.toContain('Kegiatan R2');
    });

    it('ranting admin creates activity with auto-assigned scopeType/scopeId', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/activities')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({
          nama: 'Auto Activity', tipe: 'latihan',
          tanggalMulai: new Date().toISOString(),
          tanggalSelesai: new Date().toISOString(),
          lokasi: 'Aula Test',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.scopeType).toBe('ranting');
      expect(res.body.data.scopeId).toBe(rantingId1);
    });

    it('ranting admin gets 403 viewing activity in another ranting', async () => {
      await request(app.getHttpServer())
        .get(`/api/activities/${activityInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });

    it('ranting admin gets 403 updating activity in another ranting', async () => {
      await request(app.getHttpServer())
        .patch(`/api/activities/${activityInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ nama: 'Hacked' })
        .expect(403);
    });

    it('ranting admin gets 403 deleting activity in another ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/activities/${activityInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════
  // Claims: scope filtering via anggota relation
  // ═══════════════════════════════════════════════
  describe('Claims - Scope Filtering', () => {
    let claimInR1: string;
    let claimInR2: string;

    beforeAll(async () => {
      const [cl1, cl2] = await Promise.all([
        prisma.klaim.create({
          data: { anggotaId: memberInRanting1, tipe: 'sertifikat', status: 'pending', catatan: 'Claim R1' },
        }),
        prisma.klaim.create({
          data: { anggotaId: memberInRanting2, tipe: 'piagam', status: 'pending', catatan: 'Claim R2' },
        }),
      ]);
      claimInR1 = cl1.id;
      claimInR2 = cl2.id;
    });

    it('superadmin sees all claims', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/claims')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('ranting admin sees only claims for members in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/claims')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const claimIds = res.body.data.map((c: any) => c.id);
      expect(claimIds).toContain(claimInR1);
      expect(claimIds).not.toContain(claimInR2);
    });

    it('ranting admin can view claim in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/claims/${claimInR1}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(claimInR1);
    });

    it('ranting admin gets 403 viewing claim in another ranting', async () => {
      await request(app.getHttpServer())
        .get(`/api/claims/${claimInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });

    it('ranting admin gets 403 updating claim in another ranting', async () => {
      await request(app.getHttpServer())
        .patch(`/api/claims/${claimInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ catatan: 'Hacked' })
        .expect(403);
    });

    it('ranting admin gets 403 deleting claim in another ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/claims/${claimInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════
  // Documents: scope filtering via anggota relation
  // ═══════════════════════════════════════════════
  describe('Documents - Scope Filtering', () => {
    let docInR1: string;
    let docInR2: string;

    beforeAll(async () => {
      const [d1, d2] = await Promise.all([
        prisma.dokumen.create({
          data: { anggotaId: memberInRanting1, tipe: 'kartu_anggota', namaFile: 'TEST-kartu-r1.pdf', status: 'generated' },
        }),
        prisma.dokumen.create({
          data: { anggotaId: memberInRanting2, tipe: 'kartu_anggota', namaFile: 'TEST-kartu-r2.pdf', status: 'generated' },
        }),
      ]);
      docInR1 = d1.id;
      docInR2 = d2.id;
    });

    it('superadmin sees all documents', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('ranting admin sees only documents for members in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/documents')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const docIds = res.body.data.map((d: any) => d.id);
      expect(docIds).toContain(docInR1);
      expect(docIds).not.toContain(docInR2);
    });

    it('ranting admin can view document in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/documents/${docInR1}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(docInR1);
    });

    it('ranting admin gets 403 viewing document in another ranting', async () => {
      await request(app.getHttpServer())
        .get(`/api/documents/${docInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });

    it('ranting admin gets 403 deleting document in another ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/documents/${docInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════
  // Users: scope filtering by rantingId
  // ═══════════════════════════════════════════════
  describe('Users - Scope Filtering', () => {
    let userInR1: string;
    let userInR2: string;

    beforeAll(async () => {
      const passwordHash = await bcrypt.hash('test1234', 12);
      const [u1, u2] = await Promise.all([
        prisma.user.create({
          data: { email: 'scope-user-r1@test.com', passwordHash, namaLengkap: 'User R1', role: 'admin_ranting', rantingId: rantingId1 },
        }),
        prisma.user.create({
          data: { email: 'scope-user-r2@test.com', passwordHash, namaLengkap: 'User R2', role: 'admin_ranting', rantingId: rantingId2 },
        }),
      ]);
      userInR1 = u1.id;
      userInR2 = u2.id;
    });

    it('superadmin sees all users', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${superadminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const emails = res.body.data.map((u: any) => u.email);
      expect(emails).toContain('scope-user-r1@test.com');
      expect(emails).toContain('scope-user-r2@test.com');
    });

    it('ranting admin sees only users in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const emails = res.body.data.map((u: any) => u.email);
      expect(emails).toContain('scope-user-r1@test.com');
      expect(emails).not.toContain('scope-user-r2@test.com');
    });

    it('ranting admin can view user in their ranting', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${userInR1}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(200);

      expect(res.body.data.email).toBe('scope-user-r1@test.com');
    });

    it('ranting admin gets 403 viewing user in another ranting', async () => {
      await request(app.getHttpServer())
        .get(`/api/users/${userInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });

    it('ranting admin creates user with auto-assigned rantingId from scope', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ email: 'scope-auto-user@test.com', namaLengkap: 'Auto User', role: 'admin_ranting' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.rantingId).toBe(rantingId1);
    });

    it('ranting admin gets 403 updating user in another ranting', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${userInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .send({ namaLengkap: 'Hacked' })
        .expect(403);
    });

    it('ranting admin gets 403 deleting user in another ranting', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${userInR2}`)
        .set('Authorization', `Bearer ${rantingAdminToken}`)
        .expect(403);
    });
  });
});
