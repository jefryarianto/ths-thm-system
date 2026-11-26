import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import request from 'supertest';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';

describe('ClaimsController (HTTP)', () => {
  let app: INestApplication;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ id: 'claim-1', status: 'pending' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [{ provide: ClaimsService, useValue: service }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('POST /claims accepts multipart pekerjaan and pelantikan and forwards them to service.create', async () => {
    const res = await request(app.getHttpServer())
      .post('/claims')
      .field('tipe', 'keanggotaan')
      .field('email', 'klaimer@test.com')
      .field('tempatDadar', 'Jakarta')
      .field('tahunDadar', '2020')
      .field('modeBukti', 'cerita')
      .field(
        'ceritaHistori',
        'Saya berlatih sejak 2010 dan didadar oleh Andi serta Budi pada 2012.',
      )
      .field('pekerjaan', 'Guru')
      .field('pelantikan', '12 JULI 2020');

    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalledTimes(1);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipe: 'keanggotaan',
        email: 'klaimer@test.com',
        pekerjaan: 'Guru',
        pelantikan: '12 JULI 2020',
      }),
      expect.any(Object),
      'kartu_anggota',
    );
  });
});
