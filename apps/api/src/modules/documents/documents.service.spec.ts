// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentBatchService } from './document-batch.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { PenandatanganService } from '../penandatangan/penandatangan.service';

jest.mock('./pdf-generator', () => ({
  buildPdfDocument: jest.fn().mockReturnValue({}),
}));

jest.mock('@react-pdf/renderer', () => ({
  renderToStream: jest.fn().mockResolvedValue({
    pipe: jest.fn((writeStream) => {
      process.nextTick(() => writeStream.emit('finish'));
    }),
  }),
}));

describe('DocumentsService', () => {
  let service: DocumentsService;

  const mockPrisma = {
    dokumen: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    qRValidation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    qrScan: {
      create: jest.fn(),
    },
    anggota: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma),
    ),
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  const mockCache = {
    getOrSet: jest
      .fn()
      .mockImplementation((_key: string, factory: () => Promise<unknown>) => factory()),
    invalidatePrefix: jest.fn(),
  };

  const mockMemberMailService = {
    sendToMember: jest.fn().mockResolvedValue(undefined),
    sendToMemberWithArgs: jest.fn().mockResolvedValue(undefined),
  };

  const mockBatchService = {
    initQueue: jest.fn(),
    createBatch: jest.fn(),
    getBatchProgress: jest.fn(),
    getBatchList: jest.fn(),
    cancelBatch: jest.fn(),
  };

  const mockPenandatanganService = {
    findActive: jest.fn().mockResolvedValue({ nama: 'Yoseph Pehan Betan', jabatan: 'Koordinator Distrik' }),
    resolveActive: jest.fn().mockResolvedValue({ signerName: 'Yoseph Pehan Betan', signerTitle: 'Koordinator Distrik' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MemberMailService, useValue: mockMemberMailService },
        { provide: DocumentBatchService, useValue: mockBatchService },
        { provide: PenandatanganService, useValue: mockPenandatanganService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
    mockScopeHelper.buildIndirectScopeFilter.mockReturnValue({});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated documents', async () => {
      mockPrisma.dokumen.findMany.mockResolvedValue([{ id: 'd1', tipe: 'kartu_anggota' }]);
      mockPrisma.dokumen.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single document', async () => {
      mockPrisma.dokumen.findUnique.mockResolvedValue({ id: 'd1', tipe: 'kartu_anggota' });
      const result = await service.findOne('d1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.dokumen.findUnique.mockResolvedValue(null);
      await expect(service.findOne('d1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should revoke a document', async () => {
      await service.remove('d1');
      expect(mockPrisma.dokumen.update).toHaveBeenCalled();
      expect(mockPrisma.qRValidation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isValid: false }) }),
      );
    });
  });

  describe('getTypes', () => {
    it('should return document types', async () => {
      const result = await service.getTypes();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generate', () => {
    it('should generate document and send notification email', async () => {
      mockPrisma.dokumen.create.mockResolvedValue({ id: 'd1', nomorDokumen: 'DOC-2026-ABCD1234' });
      mockPrisma.qRValidation.create.mockResolvedValue({});
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: 'anggota@test.com',
        namaLengkap: 'Budi',
      });

      const result = await service.generate({ memberId: 'm1', type: 'kartu_anggota' });
      expect(mockMemberMailService.sendToMemberWithArgs).toHaveBeenCalledTimes(1);
    });

    it('should write verificationUrl format publik (/verify/...) bukan endpoint JSON API', async () => {
      mockPrisma.dokumen.create.mockResolvedValue({
        id: 'd1',
        nomorDokumen: 'DOC-2026-ABCD1234',
        verificationUrl: 'http://localhost:3000/verify/signed',
      });
      mockPrisma.qRValidation.create.mockResolvedValue({});
      mockPrisma.anggota.findUnique.mockResolvedValue({
        email: 'anggota@test.com',
        namaLengkap: 'Budi',
      });

      const prevFrontend = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'http://localhost:3000';
      try {
        await service.generate({ memberId: 'm1', type: 'sertifikat_pelatihan' });

        const data = mockPrisma.dokumen.create.mock.calls[0][0].data;
        expect(data.verificationUrl.startsWith('http://localhost:3000/verify/')).toBe(true);
        expect(data.verificationUrl).not.toContain('/api/documents/verify/');
        // Token pada URL adalah JWT QR bertanda tangan (3 segmen base64url)
        const qrToken = data.verificationUrl.replace('http://localhost:3000/verify/', '');
        expect(qrToken.split('.')).toHaveLength(3);
      } finally {
        if (prevFrontend === undefined) delete process.env.FRONTEND_URL;
        else process.env.FRONTEND_URL = prevFrontend;
      }
    });
  });

  describe('verifyByToken', () => {
    const ktaQr = (statusKeanggotaan = 'aktif') => ({
      id: 'qr1',
      dokumenId: 'd1',
      token: 't1',
      isValid: true,
      scanCount: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      dokumen: {
        id: 'd1',
        tipe: 'kartu_anggota',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        status: 'generated',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        anggota: {
          nomorAnggota: 'LRT-0103-001-1994',
          namaLengkap: 'Budi Santoso',
          fotoPath: 'foto/lrt-0103-001.png',
          jenisKelamin: 'L',
          tempatLahir: 'Kupang',
          tanggalLahir: new Date('1994-01-01T00:00:00Z'),
          statusKeanggotaan,
          ranting: {
            nama: 'Ranting A',
            wilayah: { nama: 'Wilayah B', distrik: { nama: 'Distrik C' } },
          },
        },
      },
    });

    it('should return member identity for a valid KTA card', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue(ktaQr());
      const result = await service.verifyByToken('t1');

      expect(result.data.valid).toBe(true);
      expect(result.data.tipe).toBe('kartu_anggota');
      expect(result.data.member.namaLengkap).toBe('Budi Santoso');
      expect(result.data.member.nomorAnggota).toBe('LRT-0103-001-1994');
      expect(result.data.member.statusKeanggotaan).toBe('aktif');
      expect(result.data.member.ranting).toBe('Ranting A');
      expect(result.data.member.distrik).toBe('Distrik C');
      expect(result.data.scanCount).toBe(1);
      expect(result.data.firstScanned).toBe(true);
      expect(result.data.lastScannedAt).toBeNull();
      expect(result.data.scanLimit).toBe(25);
      expect(result.data.scanLeft).toBe(24);
      // setiap verifikasi tercatat ke riwayat pemindaian (scan log)
      expect(mockPrisma.qrScan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ qrValidationId: 'qr1', ipAddress: null, userAgent: null }),
        }),
      );
      expect(mockPrisma.qRValidation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scanCount: { increment: 1 } }),
        }),
      );
    });

    it('should log scan metadata (IP & user-agent) when present', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue({ ...ktaQr(), scannedAt: new Date('2026-02-01T00:00:00Z') });
      const result = await service.verifyByToken('t1', {
        ip: '203.0.113.9',
        userAgent: 'Mozilla/5.0 (KTA-Scanner)',
      });

      expect(result.data.lastScannedAt).toBe('2026-02-01T00:00:00.000Z');
      expect(mockPrisma.qrScan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            qrValidationId: 'qr1',
            ipAddress: '203.0.113.9',
            userAgent: 'Mozilla/5.0 (KTA-Scanner)',
          }),
        }),
      );
    });

    it('should not include member block for non-KTA documents', async () => {
      const qr = ktaQr();
      qr.dokumen.tipe = 'sertifikat_pendadaran';
      mockPrisma.qRValidation.findUnique.mockResolvedValue(qr);
      const result = await service.verifyByToken('t1');
      expect(result.data.tipe).toBe('sertifikat_pendadaran');
      expect(result.data.member).toBeUndefined();
    });

    it('should throw NotFound when token is unknown', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue(null);
      await expect(service.verifyByToken('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound when QR is invalidated', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue({ ...ktaQr(), isValid: false });
      await expect(service.verifyByToken('t1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound when document is revoked', async () => {
      const qr = ktaQr();
      qr.dokumen.status = 'revoked';
      mockPrisma.qRValidation.findUnique.mockResolvedValue(qr);
      await expect(service.verifyByToken('t1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFound when member is no longer a member', async () => {
      mockPrisma.qRValidation.findUnique.mockResolvedValue(ktaQr('keluar'));
      await expect(service.verifyByToken('t1')).rejects.toThrow(NotFoundException);
    });

    it('should resolve JWT-signed token to its underlying QR token', async () => {
      // @ts-ignore
      const { signQrToken } = require('../../common/utils/qr-token.util');
      const signed = signQrToken({ ref: 't1', typ: 'kta', src: 'digital' });

      mockPrisma.qRValidation.findUnique.mockResolvedValue(ktaQr());
      const result = await service.verifyByToken(signed);

      expect(mockPrisma.qRValidation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { token: 't1' } }),
      );
      expect(result.data.valid).toBe(true);
    });

    it('should auto-invalidate the QR when scan limit is exceeded', async () => {
      const qr = { ...ktaQr(), scanCount: 25 };
      mockPrisma.qRValidation.findUnique.mockResolvedValue(qr);

      await expect(service.verifyByToken('t1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.qRValidation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isValid: false }) }),
      );
      // pemindaian yang memicu auto-invalidasi tetap tercatat
      expect(mockPrisma.qrScan.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ qrValidationId: 'qr1' }) }),
      );
    });

    it('should count scan before limit', async () => {
      const qr = { ...ktaQr(), scanCount: 24 };
      mockPrisma.qRValidation.findUnique.mockResolvedValue(qr);

      const result = await service.verifyByToken('t1');
      expect(result.data.valid).toBe(true);
      expect(result.data.scanCount).toBe(25);
    });
  });
});
