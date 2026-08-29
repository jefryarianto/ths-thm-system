import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ContentController } from '../src/modules/content/content.controller';
import { ContentService } from '../src/modules/content/content.service';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const BERITA_ID = '11111111-1111-1111-1111-111111111111';

describe('Content — berita image upload (interceptor/multer layer)', () => {
  let app: INestApplication;
  let updateBeritaMock: jest.Mock;

  beforeAll(async () => {
    updateBeritaMock = jest.fn().mockResolvedValue({ success: true, data: { gambar: 'berita-x.png' } });
    const moduleRef = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [{ provide: ContentService, useValue: { updateBerita: updateBeritaMock } }],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('accepts a valid PNG upload', async () => {
    const res = await request(app.getHttpServer())
      .post(`/content/berita/${BERITA_ID}/image`)
      .attach('image', PNG, { filename: 'test.png', contentType: 'image/png' });
    // eslint-disable-next-line no-console
    console.log('[PNG] status=', res.status, 'body=', JSON.stringify(res.body).slice(0, 220));
    expect([200, 201]).toContain(res.status);
    expect(updateBeritaMock).toHaveBeenCalledWith(BERITA_ID, expect.objectContaining({ gambar: expect.stringContaining('berita-') }));
  });

  it('rejects a non-image extension with 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/content/berita/${BERITA_ID}/image`)
      .attach('image', Buffer.from('bukan gambar'), { filename: 'evil.txt', contentType: 'text/plain' });
    // eslint-disable-next-line no-console
    console.log('[TXT] status=', res.status, 'body=', JSON.stringify(res.body).slice(0, 220));
    expect(res.status).toBe(400);
  });
});
