import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('THS-THM API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Try login first, register only if needed (idempotent)
    try {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'e2e@test.com', password: 'test1234' });
      if (loginRes.status === 201 && loginRes.body.data?.accessToken) {
        accessToken = loginRes.body.data.accessToken;
        refreshToken = loginRes.body.data.refreshToken;
      }
    } catch { /* user may not exist yet */ }

    if (!accessToken) {
      const regRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'e2e@test.com', password: 'test1234', namaLengkap: 'E2E Test User', role: 'superadmin' });
      accessToken = regRes.body.data.accessToken;
      refreshToken = regRes.body.data.refreshToken;
    }

    expect(accessToken).toBeDefined();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Health ───
  describe('Health', () => {
    it('GET /api/health — should return ok', () => {
      return request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.status).toBe('ok');
        });
    });
  });

  // ─── Auth ───
  describe('Auth', () => {
    it('POST /api/auth/register — should create user or conflict', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'e2e-new@test.com', password: 'test1234', namaLengkap: 'E2E New User' })
        .expect((res: any) => {
          expect([201, 409]).toContain(res.status);
        });
    });

    it('POST /api/auth/login — should return tokens', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'e2e@test.com', password: 'test1234' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.accessToken).toBeDefined();
          accessToken = res.body.data.accessToken;
        });
    });

    it('POST /api/auth/login — should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'wrong' })
        .expect(401);
    });

    it('GET /api/auth/me — should return profile', () => {
      return request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.email).toBe('e2e@test.com');
        });
    });
  });

  // ─── Notifications ───
  describe('Notifications', () => {
    it('GET /api/notifications/count — should return unread count (0 for new user)', () => {
      return request(app.getHttpServer())
        .get('/api/notifications/count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.count).toBe(0);
        });
    });

    it('GET /api/notifications — should return notification list', () => {
      return request(app.getHttpServer())
        .get('/api/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/notifications/count — should reject without auth', () => {
      return request(app.getHttpServer())
        .get('/api/notifications/count')
        .expect(401);
    });
  });

  // ─── Reports ───
  describe('Reports', () => {
    it('GET /api/reports/dashboard — should return dashboard stats', () => {
      return request(app.getHttpServer())
        .get('/api/reports/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(typeof res.body.data.totalMembers).toBe('number');
          expect(typeof res.body.data.totalCandidates).toBe('number');
          expect(typeof res.body.data.totalDuesCollected).toBe('number');
          expect(Array.isArray(res.body.data.memberStatus)).toBe(true);
          expect(Array.isArray(res.body.data.monthlyDues)).toBe(true);
        });
    });
  });

  // ─── Dues ───
  describe('Dues', () => {
    it('GET /api/dues — should return dues list', () => {
      return request(app.getHttpServer())
        .get('/api/dues')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/dues/dashboard/stats — should return dashboard stats', () => {
      return request(app.getHttpServer())
        .get('/api/dues/dashboard/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(typeof res.body.data.totalIuran).toBe('number');
          expect(typeof res.body.data.anggotaAktif).toBe('number');
        });
    });
  });

  // ─── Members ───
  describe('Members', () => {
    it('GET /api/members — should return member list', () => {
      return request(app.getHttpServer())
        .get('/api/members')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
  });
});