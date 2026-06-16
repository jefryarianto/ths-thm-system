import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('THS-THM API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let refreshToken: string;
  let e2eUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    // Debug: verify env vars are properly loaded
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.DATABASE_URL).toBeDefined();

    // Try login first, register only if needed (idempotent)
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'e2e@test.com', password: 'test1234' });

    if (loginRes.status < 300 && loginRes.body?.data?.accessToken) {
      accessToken = loginRes.body.data.accessToken;
      refreshToken = loginRes.body.data.refreshToken;
      e2eUserId = loginRes.body.data.user?.id || '';
    } else {
      // Login failed — user may not exist, try to register
      const regRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'e2e@test.com',
          password: 'test1234',
          namaLengkap: 'E2E Test User',
          role: 'superadmin',
        });

      if (regRes.status < 300 && regRes.body?.data?.accessToken) {
        accessToken = regRes.body.data.accessToken;
        refreshToken = regRes.body.data.refreshToken;
        e2eUserId = regRes.body.data.user?.id || '';
      } else {
        // Both login and register failed — print response for debugging
        console.log(
          'LOGIN response:',
          loginRes.status,
          JSON.stringify(loginRes.body || {}).slice(0, 200),
        );
        console.log(
          'REGISTER response:',
          regRes.status,
          JSON.stringify(regRes.body || {}).slice(0, 200),
        );
        console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
      }
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
    it('GET /api/notifications/count — should return unread count', () => {
      return request(app.getHttpServer())
        .get('/api/notifications/count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(typeof res.body.data.count).toBe('number');
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
      return request(app.getHttpServer()).get('/api/notifications/count').expect(401);
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
          expect(typeof res.body.data.members).toBe('number');
          expect(typeof res.body.data.trainings).toBe('number');
          expect(typeof res.body.data.candidates).toBe('number');
          expect(Array.isArray(res.body.data.topMembers)).toBe(true);
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

  // ─── Notification Preferences ───
  describe('Notification Preferences', () => {
    it('GET /api/notifications/preferences — should return preferences with inApp/email structure', () => {
      return request(app.getHttpServer())
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeDefined();
          expect(res.body.types).toBeDefined();
          expect(Array.isArray(res.body.types)).toBe(true);
          // Each preference should have inApp and email fields
          for (const val of Object.values(res.body.data)) {
            const pref = val as { inApp: boolean; email: boolean };
            expect(typeof pref.inApp).toBe('boolean');
            expect(typeof pref.email).toBe('boolean');
          }
        });
    });

    it('PATCH /api/notifications/preferences — should save and return preferences', () => {
      return request(app.getHttpServer())
        .patch('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ welcome: false, umum: true, reminder_iuran: false })
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
        });
    });

    it('GET /api/notifications/preferences — should return updated preferences in {inApp,email} format', () => {
      return request(app.getHttpServer())
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.welcome.inApp).toBe(false);
          expect(res.body.data.welcome.email).toBe(false);
          expect(res.body.data.umum.inApp).toBe(true);
          expect(res.body.data.umum.email).toBe(true);
          expect(res.body.data.reminder_iuran.inApp).toBe(false);
          expect(res.body.data.reminder_iuran.email).toBe(false);
        });
    });

    it('PATCH /api/notifications/preferences — should reset preferences back to defaults', () => {
      return request(app.getHttpServer())
        .patch('/api/notifications/preferences')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(200);
    });

    it('GET /api/notifications/preferences — should reject without auth', () => {
      return request(app.getHttpServer()).get('/api/notifications/preferences').expect(401);
    });
  });

  // ─── Notification Sending ───
  describe('Notification Sending', () => {
    it('POST /api/notifications/send — superadmin can send notification', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: e2eUserId, judul: 'Test E2E', isi: 'Test notifikasi E2E', tipe: 'umum' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toContain('berhasil');
        });
    });

    it('POST /api/notifications/send — should reject without judul', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: e2eUserId, isi: 'Test tanpa judul' })
        .expect(400);
    });

    it('POST /api/notifications/send — should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/send')
        .send({ userId: e2eUserId, judul: 'Test Unauthorized', isi: 'Should fail' })
        .expect(401);
    });

    it('POST /api/notifications/broadcast — superadmin can broadcast', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/broadcast')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ judul: 'Broadcast E2E', isi: 'Test broadcast E2E', tipe: 'umum' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.sentTo).toBeDefined();
        });
    });

    it('POST /api/notifications/role — superadmin can send to role', () => {
      return request(app.getHttpServer())
        .post('/api/notifications/role')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: 'superadmin', judul: 'Role E2E', isi: 'Test role E2E', tipe: 'umum' })
        .expect(201)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.sentTo).toBeGreaterThanOrEqual(0);
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

    it('GET /api/members — should reject without auth', () => {
      return request(app.getHttpServer()).get('/api/members').expect(401);
    });
  });

  // ─── Letters ───
  describe('Letters', () => {
    it('GET /api/letters/incoming — should return incoming letters', () => {
      return request(app.getHttpServer())
        .get('/api/letters/incoming')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/letters/outgoing — should return outgoing letters', () => {
      return request(app.getHttpServer())
        .get('/api/letters/outgoing')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/letters — should reject without auth', () => {
      return request(app.getHttpServer()).get('/api/letters/incoming').expect(401);
    });
  });

  // ─── Candidates ───
  describe('Candidates', () => {
    it('GET /api/candidates — should return candidate list', () => {
      return request(app.getHttpServer())
        .get('/api/candidates')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res: any) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('GET /api/candidates — should reject without auth', () => {
      return request(app.getHttpServer()).get('/api/candidates').expect(401);
    });
  });
});
