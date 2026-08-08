// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GraduationsService } from './graduations.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { DocumentsService } from '../documents/documents.service';
import { NraService } from '../../common/services/nra.service';

describe('GraduationsService', () => {
  let service: GraduationsService;

  const mockPrisma = {
    kegiatan: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    calonAnggota: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    hasilPendadaran: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    nilaiPendadaran: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    dokumen: {
      findFirst: jest.fn(),
    },
    anggota: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockGraduation = {
    id: 'g1',
    tipe: 'pendadaran',
    scopeType: 'nasional',
    scopeId: 'national',
  };

  const mockCandidate = {
    id: 'c1',
    namaLengkap: 'Budi',
    jenisKelamin: 'L',
    tempatLahir: 'Jakarta',
    tanggalLahir: new Date('2000-01-01'),
    alamat: 'Jl. Merdeka',
    noHp: '08123456789',
    email: 'candidate@test.com',
    tingkat: 'Sabuk Putih',
    rantingId: 'r1',
  };

  const mockScopeHelper = {
    buildScopeFilter: jest.fn().mockReturnValue({}),
    buildIndirectScopeFilter: jest.fn().mockReturnValue({}),
    hasAccessToResource: jest.fn().mockReturnValue(true),
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
    verifyKegiatanScope: jest.fn(),
  };

  const mockMailService = {
    sendMail: jest.fn().mockResolvedValue(true),
    renderWithOverride: jest.fn().mockResolvedValue({
      subject: 'Pendadaran - THS-THM',
      html: '<p>Graduation info</p>',
    }),
  };

  const mockMemberMailService = {
    sendToMember: jest.fn().mockResolvedValue(undefined),
    sendToMemberWithArgs: jest.fn().mockResolvedValue(undefined),
  };

  const mockDocumentsService = {
    generateCertificate: jest.fn().mockResolvedValue(undefined),
  };

  const mockNraService = {
    generateMemberNumber: jest.fn().mockResolvedValue('NRA-0001'),
  };

  const mockCache = {
    getOrSet: jest.fn().mockImplementation((_key, factory) => factory()),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraduationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: CacheService, useValue: mockCache },
        { provide: MailService, useValue: mockMailService },
        { provide: MemberMailService, useValue: mockMemberMailService },
        { provide: DocumentsService, useValue: mockDocumentsService },
        { provide: NraService, useValue: mockNraService },
      ],
    }).compile();

    service = module.get<GraduationsService>(GraduationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated graduations', async () => {
      mockPrisma.kegiatan.findMany.mockResolvedValue([{ id: 'g1', tipe: 'pendadaran' }]);
      mockPrisma.kegiatan.count.mockResolvedValue(1);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a single graduation', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({ id: 'g1', tipe: 'pendadaran' });
      const result = await service.findOne('g1');
      expect(result.id).toBe('g1');
    });

    it('should throw NotFoundException when not found', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(null);
      await expect(service.findOne('g1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a graduation', async () => {
      mockPrisma.kegiatan.create.mockResolvedValue({ id: 'g1', tipe: 'pendadaran' });
      const result = await service.create({
        nama: 'Pendadaran 1',
        lokasi: 'Jakarta',
        tanggalMulai: '2026-01-01',
      } as any);
    });
  });

  describe('getParticipants', () => {
    it('should return participants', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(mockGraduation);
      mockPrisma.calonAnggota.findMany.mockResolvedValue([
        { id: 'c1', status: 'mengikuti_pendadaran' },
      ]);
      const result = await service.getParticipants('g1');
      expect(result).toHaveLength(1);
    });
  });

  describe('graduate', () => {
    it('should process graduation results and send email', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(mockGraduation);
      mockPrisma.hasilPendadaran.create.mockResolvedValue({ id: 'h1' });
      mockPrisma.calonAnggota.update.mockResolvedValue({
        id: 'c1',
        email: 'candidate@test.com',
        namaLengkap: 'Budi',
      });
      const result = await service.graduate('g1', {
        results: [{ candidateId: 'c1', totalSkor: 85, ranking: 1, lulus: true }],
      } as any);
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'candidate@test.com' }),
      );
    });
  });

  describe('validateResult', () => {
    beforeEach(() => {
      // Reset implementasi yang bisa bocor antar test (clearAllMocks tidak mereset mockResolvedValue)
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue(mockGraduation);
      mockPrisma.calonAnggota.findUnique.mockReset();
      mockPrisma.anggota.findUnique.mockReset();
      mockPrisma.anggota.create.mockReset();
      mockPrisma.dokumen.findFirst.mockReset();
      mockPrisma.hasilPendadaran.findFirst.mockReset();
      mockPrisma.hasilPendadaran.update.mockReset();
      mockNraService.generateMemberNumber.mockReset();
    });

    it('should approve a single result and set validasi fields', async () => {
      mockPrisma.hasilPendadaran.findFirst.mockResolvedValue({
        id: 'h1',
        statusKelulusan: 'lulus',
        totalSkor: 85,
      });
      mockPrisma.hasilPendadaran.update.mockResolvedValue({ id: 'h1' });
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(mockCandidate);
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'a1', nomorAnggota: 'NRA-0001' });
      mockPrisma.dokumen.findFirst.mockResolvedValue(null);
      mockNraService.generateMemberNumber.mockResolvedValue('NRA-0001');
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([]);

      const result = await service.validateResult(
        'g1',
        { candidateId: 'c1', approved: true } as any,
        'user1',
      );

      expect(mockPrisma.hasilPendadaran.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'h1' },
          data: expect.objectContaining({ statusValidasi: 'approved', divalidasiOleh: 'user1' }),
        }),
      );
      expect(result).toEqual({ validated: 1, skipped: 0 });
    });

    it('should still count as validated when post-approval doc generation fails', async () => {
      const loggerErrorSpy = jest
        .spyOn((service as any).logger, 'error')
        .mockImplementation(() => undefined);

      mockPrisma.hasilPendadaran.findFirst.mockResolvedValue({
        id: 'h1',
        statusKelulusan: 'lulus',
        totalSkor: 85,
      });
      mockPrisma.hasilPendadaran.update.mockResolvedValue({ id: 'h1' });
      // Calon tidak ditemukan → ensureAnggotaAndDocument gagal, tapi validasi tetap sukses
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);

      const result = await service.validateResult(
        'g1',
        { candidateId: 'c1', approved: true } as any,
        'user1',
      );

      expect(mockPrisma.anggota.create).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(result).toEqual({ validated: 1, skipped: 0 });
    });

    it('should reject a result without creating member documents', async () => {
      mockPrisma.hasilPendadaran.findFirst.mockResolvedValue({
        id: 'h1',
        statusKelulusan: 'lulus',
      });
      mockPrisma.hasilPendadaran.update.mockResolvedValue({ id: 'h1' });

      const result = await service.validateResult(
        'g1',
        { candidateId: 'c1', approved: false } as any,
        'user1',
      );

      expect(mockPrisma.hasilPendadaran.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ statusValidasi: 'rejected' }),
        }),
      );
      expect(mockPrisma.anggota.create).not.toHaveBeenCalled();
      expect(result).toEqual({ validated: 1, skipped: 0 });
    });

    it('should approve bulk results and create anggota + certificate for lulus', async () => {
      mockPrisma.hasilPendadaran.findFirst.mockResolvedValue({
        id: 'h1',
        statusKelulusan: 'lulus',
        totalSkor: 85,
      });
      mockPrisma.hasilPendadaran.update.mockResolvedValue({ id: 'h1' });
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(mockCandidate);
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'a1', nomorAnggota: 'NRA-0001' });
      mockPrisma.dokumen.findFirst.mockResolvedValue(null);
      mockNraService.generateMemberNumber.mockResolvedValue('NRA-0001');
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([]);

      const result = await service.validateResult(
        'g1',
        { results: [{ candidateId: 'c1', approved: true }] } as any,
        'user1',
      );

      expect(mockPrisma.anggota.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.anggota.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: mockCandidate.email }) }),
      );
      expect(mockDocumentsService.generateCertificate).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'a1', finalScore: 85 }),
      );
      expect(mockMemberMailService.sendToMemberWithArgs).toHaveBeenCalledWith(
        'a1',
        expect.any(Function),
        [true, 85],
        expect.any(Object),
        'graduations',
        expect.any(Object),
      );
      expect(result).toEqual({ validated: 1, skipped: 0 });
    });

    it('should skip results without an existing HasilPendadaran', async () => {
      mockPrisma.hasilPendadaran.findFirst.mockResolvedValue(null);

      const result = await service.validateResult(
        'g1',
        { results: [{ candidateId: 'c1', approved: true }] } as any,
        'user1',
      );

      expect(mockPrisma.hasilPendadaran.update).not.toHaveBeenCalled();
      expect(result).toEqual({ validated: 0, skipped: 1 });
    });

    it('should handle mixed bulk results (valid + missing)', async () => {
      mockPrisma.hasilPendadaran.findFirst.mockImplementation(async ({ where }: any) => {
        return where.calonAnggotaId === 'c1'
          ? { id: 'h1', statusKelulusan: 'lulus', totalSkor: 85 }
          : null;
      });
      mockPrisma.hasilPendadaran.update.mockResolvedValue({ id: 'h1' });
      // Chain lengkap agar jalur post-approval c1 berhasil (bukan jadi log error)
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(mockCandidate);
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      mockPrisma.anggota.create.mockResolvedValue({ id: 'a1', nomorAnggota: 'NRA-0001' });
      mockPrisma.dokumen.findFirst.mockResolvedValue(null);
      mockNraService.generateMemberNumber.mockResolvedValue('NRA-0001');
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([]);

      const result = await service.validateResult(
        'g1',
        { results: [{ candidateId: 'c1', approved: true }, { candidateId: 'missing', approved: true }] } as any,
        'user1',
      );

      expect(mockPrisma.hasilPendadaran.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ validated: 1, skipped: 1 });
    });

    it('should throw BadRequestException without candidateId or results', async () => {
      await expect(service.validateResult('g1', {} as any, 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateDocuments', () => {
    const approvedResult = {
      id: 'h1',
      calonAnggotaId: 'c1',
      totalSkor: 85,
      calonAnggota: { ...mockCandidate },
    };

    beforeEach(() => {
      // Reset implementasi yang bisa bocor antar test
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue(mockGraduation);
      mockPrisma.hasilPendadaran.findMany.mockReset().mockResolvedValue([approvedResult]);
      mockPrisma.calonAnggota.findUnique.mockReset();
      mockPrisma.anggota.findUnique.mockReset().mockResolvedValue(null);
      mockPrisma.anggota.create.mockReset().mockResolvedValue({ id: 'a1', nomorAnggota: 'NRA-0001' });
      mockPrisma.dokumen.findFirst.mockReset().mockResolvedValue(null);
      mockNraService.generateMemberNumber.mockReset().mockResolvedValue('NRA-0001');
      mockPrisma.nilaiPendadaran.findMany.mockReset().mockResolvedValue([]);
    });

    it('should generate documents for approved lulus candidates', async () => {
      const result = await service.generateDocuments('g1');

      expect(result).toEqual({ generated: 1, total: 1, errors: [] });
      expect(mockPrisma.anggota.create).toHaveBeenCalledTimes(1);
      expect(mockDocumentsService.generateCertificate).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'a1', finalScore: 85 }),
      );
    });

    it('should not duplicate certificates when one already exists', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'a1' });
      mockPrisma.dokumen.findFirst.mockResolvedValue({ id: 'd1' });

      const result = await service.generateDocuments('g1', { candidateId: 'c1' });

      expect(mockPrisma.hasilPendadaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ calonAnggotaId: 'c1' }),
        }),
      );
      expect(result.generated).toBe(1);
      expect(mockPrisma.anggota.create).not.toHaveBeenCalled();
      expect(mockDocumentsService.generateCertificate).not.toHaveBeenCalled();
    });

    it('should skip member creation but still generate certificate when member exists without doc', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'a1' });
      // dokumen belum ada → sertifikat tetap digenerate tanpa membuat anggota baru
      mockPrisma.dokumen.findFirst.mockResolvedValue(null);

      const result = await service.generateDocuments('g1');

      expect(result.generated).toBe(1);
      expect(mockPrisma.anggota.create).not.toHaveBeenCalled();
      expect(mockDocumentsService.generateCertificate).toHaveBeenCalledWith(
        expect.objectContaining({ memberId: 'a1' }),
      );
    });

    it('should report errors without failing the whole batch', async () => {
      mockPrisma.hasilPendadaran.findMany.mockResolvedValue([
        approvedResult,
        { id: 'h2', calonAnggotaId: 'missing', totalSkor: 50, calonAnggota: null },
      ]);
      mockPrisma.calonAnggota.findUnique.mockResolvedValue(null);

      const result = await service.generateDocuments('g1');

      expect(result.generated).toBe(1);
      expect(result.total).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('missing');
    });
  });

  describe('getEvaluations', () => {
    it('should return raw scores and aggregated summary', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(mockGraduation);
      mockPrisma.nilaiPendadaran.findMany.mockResolvedValue([
        {
          calonAnggotaId: 'c1',
          skor: 80,
          calonAnggota: { id: 'c1', namaLengkap: 'Budi', ranting: { nama: 'Ranting A' } },
          itemPenilaian: {
            namaItem: 'Jurus',
            skorMaksimal: 100,
            bobot: 1,
            aspek: { namaAspek: 'Teknik', bobot: 1 },
          },
          penguji: { id: 'p1', namaLengkap: 'Penguji 1' },
          ujianPraktek: { id: 'u1', nama: 'Ujian 1' },
        },
        {
          calonAnggotaId: 'c1',
          skor: 70,
          calonAnggota: { id: 'c1', namaLengkap: 'Budi', ranting: { nama: 'Ranting A' } },
          itemPenilaian: {
            namaItem: 'Sikap',
            skorMaksimal: 100,
            bobot: 1,
            aspek: { namaAspek: 'Sikap', bobot: 1 },
          },
          penguji: { id: 'p1', namaLengkap: 'Penguji 1' },
          ujianPraktek: { id: 'u1', nama: 'Ujian 1' },
        },
      ]);

      const result = await service.getEvaluations('g1');

      expect(mockPrisma.nilaiPendadaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { kegiatanId: 'g1' } }),
      );
      expect(result.scores).toHaveLength(2);
      expect(result.summary).toEqual({
        c1: { nama: 'Budi', skor: 150, items: 2 },
      });
    });
  });
});
