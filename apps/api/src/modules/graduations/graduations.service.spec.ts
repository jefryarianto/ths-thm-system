// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { GraduationsService } from './graduations.service';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { MemberMailService } from '../../common/services/member-mail.service';
import { DocumentsService } from '../documents/documents.service';
import { NraService } from '../../common/services/nra.service';
import { NotificationsService } from '../notifications/notifications.service';

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
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    dokumen: {
      findFirst: jest.fn(),
    },
    anggota: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    undanganPendadaran: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    penugasanPenguji: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  const mockNotificationsService = {
    send: jest.fn().mockResolvedValue(undefined),
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
        { provide: NotificationsService, useValue: mockNotificationsService },
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

  describe('getResults', () => {
    it('should return hasil list with validation status', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(mockGraduation);
      mockPrisma.hasilPendadaran.findMany.mockResolvedValue([
        {
          id: 'h1',
          calonAnggotaId: 'c1',
          totalSkor: 85,
          ranking: 1,
          statusKelulusan: 'lulus',
          statusValidasi: 'pending',
          calonAnggota: {
            id: 'c1',
            namaLengkap: 'Budi',
            email: 'candidate@test.com',
            ranting: { nama: 'Ranting A' },
          },
        },
      ]);

      const result = await service.getResults('g1');

      expect(mockPrisma.hasilPendadaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { kegiatanId: 'g1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].statusValidasi).toBe('pending');
    });
  });

  describe('getExaminers', () => {
    it('should return examiner assignments with status', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(mockGraduation);
      mockPrisma.penugasanPenguji.findMany.mockResolvedValue([
        {
          id: 'p1',
          kegiatanId: 'g1',
          pengujiUserId: 'u1',
          status: 'pending',
          pengujiUser: { id: 'u1', namaLengkap: 'Penguji 1', email: 'p1@test.com' },
        },
      ]);

      const result = await service.getExaminers('g1');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('pending');
    });
  });

  describe('proposeExaminer', () => {
    beforeEach(() => {
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue(mockGraduation);
      mockPrisma.user.findUnique.mockReset();
      mockPrisma.penugasanPenguji.findFirst.mockReset();
      mockPrisma.penugasanPenguji.create.mockReset();
    });

    it('should create a pending assignment for a penguji', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'penguji' });
      mockPrisma.penugasanPenguji.findFirst.mockResolvedValue(null);
      mockPrisma.penugasanPenguji.create.mockResolvedValue({
        id: 'p1',
        kegiatanId: 'g1',
        pengujiUserId: 'u1',
        status: 'pending',
      });

      const result = await service.proposeExaminer('g1', { pengujiUserId: 'u1' });
      expect(result.status).toBe('pending');
      expect(mockPrisma.penugasanPenguji.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'pending' }) }),
      );
    });

    it('should throw BadRequestException when user is not a penguji', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'anggota' });
      await expect(service.proposeExaminer('g1', { pengujiUserId: 'u1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when already proposed', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'penguji' });
      mockPrisma.penugasanPenguji.findFirst.mockResolvedValue({ id: 'p1' });
      await expect(service.proposeExaminer('g1', { pengujiUserId: 'u1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reviewExaminer', () => {
    beforeEach(() => {
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue(mockGraduation);
      mockPrisma.penugasanPenguji.findUnique.mockReset();
      mockPrisma.penugasanPenguji.update.mockReset();
    });

    it('should approve a pending assignment', async () => {
      mockPrisma.penugasanPenguji.findUnique.mockResolvedValue({
        id: 'p1',
        kegiatanId: 'g1',
        status: 'pending',
      });
      mockPrisma.penugasanPenguji.update.mockResolvedValue({ id: 'p1', status: 'approved' });

      const result = await service.reviewExaminer('g1', 'p1', { approved: true }, 'user1');
      expect(result.status).toBe('approved');
      expect(mockPrisma.penugasanPenguji.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'approved', disetujuiOleh: 'user1' }),
        }),
      );
    });

    it('should throw NotFoundException for foreign assignment', async () => {
      mockPrisma.penugasanPenguji.findUnique.mockResolvedValue({
        id: 'p1',
        kegiatanId: 'other',
        status: 'pending',
      });
      await expect(service.reviewExaminer('g1', 'p1', { approved: true }, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when already processed', async () => {
      mockPrisma.penugasanPenguji.findUnique.mockResolvedValue({
        id: 'p1',
        kegiatanId: 'g1',
        status: 'approved',
      });
      await expect(service.reviewExaminer('g1', 'p1', { approved: true }, 'user1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approveScores', () => {
    it('should approve all pending scores', async () => {
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue(mockGraduation);
      mockPrisma.nilaiPendadaran.updateMany.mockReset().mockResolvedValue({ count: 3 });

      const result = await service.approveScores('g1', 'user1');
      expect(result).toEqual({ approved: 3 });
      expect(mockPrisma.nilaiPendadaran.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { kegiatanId: 'g1', statusValidasi: 'pending' },
          data: expect.objectContaining({ statusValidasi: 'approved', divalidasiOleh: 'user1' }),
        }),
      );
    });
  });

  describe('submitResults', () => {
    beforeEach(() => {
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue(mockGraduation);
      mockPrisma.kegiatan.update.mockReset();
      mockPrisma.nilaiPendadaran.count.mockReset();
    });

    it('should submit results to distrik when approved scores exist', async () => {
      mockPrisma.nilaiPendadaran.count.mockResolvedValue(2);
      mockPrisma.kegiatan.update.mockResolvedValue({
        id: 'g1',
        status: 'published',
        pengajuanNilaiAt: new Date('2026-08-08'),
      });

      const result = await service.submitResults('g1', 'user1');
      expect(result.success).toBe(true);
      expect(result.status).toBe('published');
    });

    it('should throw BadRequestException when no approved scores', async () => {
      mockPrisma.nilaiPendadaran.count.mockResolvedValue(0);
      await expect(service.submitResults('g1', 'user1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when already submitted', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({
        ...mockGraduation,
        pengajuanNilaiAt: new Date('2026-08-08'),
      });
      await expect(service.submitResults('g1', 'user1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvitations', () => {
    it('should return invitations with member info', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue(mockGraduation);
      mockPrisma.undanganPendadaran.findMany.mockResolvedValue([
        {
          id: 'inv1',
          kegiatanId: 'g1',
          anggotaId: 'a1',
          status: 'dikirim',
          anggota: { id: 'a1', namaLengkap: 'Jefry', nomorAnggota: 'LRT-0103-001', tingkat: 'Pratama', tahunDadar: '2020', email: 'a1@test.com', noHp: '0812' },
        },
      ]);

      const result = await service.getInvitations('g1');
      expect(mockPrisma.undanganPendadaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { kegiatanId: 'g1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].anggota.nomorAnggota).toBe('LRT-0103-001');
    });
  });

  describe('generateInvitations', () => {
    beforeEach(() => {
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue({
        ...mockGraduation,
        nama: 'Pendadaran 1',
        lokasi: 'Jakarta',
        tanggalMulai: new Date('2026-08-16'),
        status: 'published',
      });
      mockPrisma.anggota.findMany.mockReset();
      mockPrisma.undanganPendadaran.create.mockReset();
      mockNotificationsService.send.mockClear();
    });

    it('should invite senior members (>2 tahun dari tahun dadar) and Pratama members', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([
        // Senior: dadar 2020 (6 tahun) → diundang
        { id: 'a1', namaLengkap: 'Senior', email: 'senior@test.com', tingkat: 'Anggota', tahunDadar: '2020' },
        // Pratama → diundang walau dadar baru
        { id: 'a2', namaLengkap: 'Pratama', email: 'pratama@test.com', tingkat: 'Pratama', tahunDadar: '2025' },
        // Baru & bukan pratama → tidak memenuhi kriteria
        { id: 'a3', namaLengkap: 'Baru', email: 'baru@test.com', tingkat: 'Anggota', tahunDadar: '2025' },
      ]);
      mockPrisma.undanganPendadaran.create.mockResolvedValue({ id: 'inv1' });

      const result = await service.generateInvitations('g1');

      expect(result).toEqual({ generated: 2, skipped: 0, total: 2 });
      expect(mockPrisma.undanganPendadaran.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.send).toHaveBeenCalledTimes(2);
    });

    it('should skip duplicates and count them as skipped', async () => {
      mockPrisma.anggota.findMany.mockResolvedValue([
        { id: 'a1', namaLengkap: 'Senior', email: 'senior@test.com', tingkat: 'Anggota', tahunDadar: '2020' },
      ]);
      mockPrisma.undanganPendadaran.create.mockRejectedValue(new Error('duplicate'));

      const result = await service.generateInvitations('g1');

      expect(result).toEqual({ generated: 0, skipped: 1, total: 1 });
    });

    it('should throw BadRequestException when graduation closed/cancelled', async () => {
      mockPrisma.kegiatan.findUnique.mockResolvedValue({
        ...mockGraduation,
        status: 'cancelled',
      });
      await expect(service.generateInvitations('g1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmInvitation', () => {
    beforeEach(() => {
      mockPrisma.kegiatan.findUnique.mockReset().mockResolvedValue(mockGraduation);
      mockPrisma.undanganPendadaran.findUnique.mockReset();
      mockPrisma.undanganPendadaran.update.mockReset();
      mockPrisma.user.findUnique.mockReset();
      mockPrisma.anggota.findFirst.mockReset();
    });

    it('should allow admin to confirm manually', async () => {
      mockPrisma.undanganPendadaran.findUnique.mockResolvedValue({
        id: 'inv1',
        kegiatanId: 'g1',
        anggotaId: 'a1',
        status: 'dikirim',
      });
      mockPrisma.undanganPendadaran.update.mockResolvedValue({
        id: 'inv1',
        status: 'hadir',
        konfirmasiOleh: 'admin@ths-thm.org',
      });

      const result = await service.confirmInvitation(
        'g1',
        'inv1',
        { hadir: true, manualOleh: 'admin@ths-thm.org' },
        'user1',
      );
      expect(result.status).toBe('hadir');
      expect(mockPrisma.undanganPendadaran.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'hadir' }) }),
      );
    });

    it('should allow member to confirm their own invitation', async () => {
      mockPrisma.undanganPendadaran.findUnique.mockResolvedValue({
        id: 'inv1',
        kegiatanId: 'g1',
        anggotaId: 'a1',
        status: 'dikirim',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'member@test.com' });
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'a1' });
      mockPrisma.undanganPendadaran.update.mockResolvedValue({ id: 'inv1', status: 'tidak_hadir' });

      const result = await service.confirmInvitation('g1', 'inv1', { hadir: false }, 'user1');
      expect(result.status).toBe('tidak_hadir');
    });

    it('should throw ForbiddenException when member confirms someone elses invitation', async () => {
      mockPrisma.undanganPendadaran.findUnique.mockResolvedValue({
        id: 'inv1',
        kegiatanId: 'g1',
        anggotaId: 'a1',
        status: 'dikirim',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user2', email: 'other@test.com' });
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'a999' });

      await expect(service.confirmInvitation('g1', 'inv1', { hadir: true }, 'user2')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException for unknown invitation', async () => {
      mockPrisma.undanganPendadaran.findUnique.mockResolvedValue(null);
      await expect(service.confirmInvitation('g1', 'x', { hadir: true }, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getMyInvitations', () => {
    it('should return invitations for the logged-in member via email match', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'member@test.com' });
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'a1' });
      mockPrisma.undanganPendadaran.findMany.mockResolvedValue([
        {
          id: 'inv1',
          status: 'dikirim',
          kegiatan: { id: 'g1', nama: 'Pendadaran 1', lokasi: 'Jakarta', tanggalMulai: new Date('2026-08-16'), tanggalSelesai: new Date('2026-08-16'), status: 'published' },
        },
      ]);

      const result = await service.getMyInvitations('user1');
      expect(mockPrisma.undanganPendadaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { anggotaId: 'a1' } }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].kegiatan.nama).toBe('Pendadaran 1');
    });

    it('should return empty when user has no member record', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user1', email: 'member@test.com' });
      mockPrisma.anggota.findFirst.mockResolvedValue(null);

      const result = await service.getMyInvitations('user1');
      expect(result).toEqual([]);
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
