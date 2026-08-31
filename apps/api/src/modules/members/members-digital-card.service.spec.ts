import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MembersDigitalCardService } from './members-digital-card.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { PenandatanganService } from '../penandatangan/penandatangan.service';
import { TingkatanService } from '../tingkatan/tingkatan.service';
import { CacheService } from '../../common/services/cache.service';

// Mock QRCode — hindari generate PNG asli saat test
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,FAKEQR'),
}));

describe('MembersDigitalCardService', () => {
  let service: MembersDigitalCardService;

  // ── Fixture anggota dengan format NRA baru (LRT-0103-001-1994) ──
  const mockMember = {
    id: 'm-lrt-1',
    nomorAnggota: 'LRT-0103-001-1994',
    namaLengkap: 'Jefry Arianto Baba',
    jenisKelamin: 'L',
    tempatLahir: 'Oebafok',
    tanggalLahir: new Date('1983-07-06'),
    alamat: null,
    noHp: null,
    email: null,
    fotoPath: 'Jefry Arianto Baba.jpg',
    statusKeanggotaan: 'aktif',
    tingkat: 'Muda',
    tempatDadar: 'Lekunik',
    tahunDadar: '1994',
    rantingId: 'r-sanjuan',
    ranting: {
      id: 'r-sanjuan',
      nama: 'San Juan Lebao',
      wilayah: {
        id: 'w-larantuka',
        nama: 'Wilayah Larantuka & Solor',
        distrik: { id: 'd-lrt', nama: 'Keuskupan Larantuka' },
      },
    },
    dokumen: [] as any[],
  };

  // ── Signer dari tabel penandatangan (multi-signer) ──
  const mockSigners = [
    { signerName: 'Yoseph Pehan Betan', signerTitle: 'Koordinator Distrik' },
  ];

  const mockPrisma = {
    anggota: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    dokumen: {
      create: jest.fn(),
    },
    qRValidation: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  };

  const mockScopeHelper = {
    hasAccessToResourceAsync: jest.fn().mockResolvedValue(true),
  };

  const mockPenandatanganService = {
    resolveSigners: jest.fn().mockResolvedValue(mockSigners),
    resolveActive: jest.fn().mockResolvedValue(mockSigners[0]),
  };

  // Tingkatan → visual strip (sesuai seeder: Muda = Kuning 1)
  const mockTingkatanService = {
    resolveLevelVisual: jest.fn().mockImplementation(async (tingkat?: string | null) => {
      if (tingkat === 'Muda') return { stripCount: 1, color: '#ca8a04', label: 'Kuning 1' };
      if (tingkat === 'Utama') return { stripCount: 3, color: '#ca8a04', label: 'Kuning 3' };
      return { stripCount: 0, color: '#94a3b8', label: 'Tanpa strip' };
    }),
    getAllLevelVisuals: jest.fn().mockResolvedValue({}),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    invalidatePrefix: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersDigitalCardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ScopeHelper, useValue: mockScopeHelper },
        { provide: PenandatanganService, useValue: mockPenandatanganService },
        { provide: TingkatanService, useValue: mockTingkatanService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<MembersDigitalCardService>(MembersDigitalCardService);
    jest.clearAllMocks();

    // Defaults
    mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
    mockPenandatanganService.resolveSigners.mockResolvedValue(mockSigners);
    mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [] });
    mockPrisma.dokumen.create.mockImplementation(async ({ data }: any) => ({
      id: 'doc-1',
      nomorDokumen: data.nomorDokumen,
      verificationUrl: data.verificationUrl,
      status: data.status,
    }));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDigitalCard', () => {
    it('should return NRA format baru (LRT-0103-xxx) pada kartu digital', async () => {
      const result = await service.getDigitalCard('m-lrt-1');

      expect(result.success).toBe(true);
      // NRA format baru harus muncul di data member
      expect(result.data.member.nomorAnggota).toBe('LRT-0103-001-1994');
      // Struktur org (ranting/wilayah/distrik) ikut terbawa
      expect(result.data.member.ranting).toBe('San Juan Lebao');
      expect(result.data.member.wilayah).toBe('Wilayah Larantuka & Solor');
      expect(result.data.member.distrik).toBe('Keuskupan Larantuka');
    });

    it('should include signer dari tabel penandatangan (multi-signer)', async () => {
      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockPenandatanganService.resolveSigners).toHaveBeenCalledWith('kartu_anggota', 'd-lrt');
      expect(result.data.card.signers).toEqual(mockSigners);
      // Backward-compat: signer pertama di signerName/signerTitle
      expect(result.data.card.signerName).toBe('Yoseph Pehan Betan');
      expect(result.data.card.signerTitle).toBe('Koordinator Distrik');
    });

    it('should include levelVisual (strip tingkat) dari tabel tingkatan', async () => {
      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockTingkatanService.resolveLevelVisual).toHaveBeenCalledWith('Muda');
      expect(result.data.levelVisual).toEqual({ stripCount: 1, color: '#ca8a04', label: 'Kuning 1' });
    });

    it('should generate new card dokumen + QR validation when none exists', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [] });

      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockPrisma.dokumen.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.qRValidation.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.dokumen.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            anggotaId: 'm-lrt-1',
            tipe: 'kartu_anggota',
            status: 'generated',
          }),
        }),
      );
      // Nomor dokumen memakai NRA baru
      expect(result.data.card.nomorDokumen).toBe('KTA-LRT-0103-001-1994');
    });

    it('should reuse existing card dokumen (tidak generate duplikat)', async () => {
      const existing = {
        id: 'doc-existing',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'https://ths-thm.cloud/verify/abc123',
        status: 'generated',
      };
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [existing] });

      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockPrisma.dokumen.create).not.toHaveBeenCalled();
      expect(mockPrisma.qRValidation.create).not.toHaveBeenCalled();
      expect(result.data.card.id).toBe('doc-existing');
      expect(result.data.card.nomorDokumen).toBe('KTA-LRT-0103-001-1994');
    });

    it('should generate QR dari verificationUrl', async () => {
      const { toDataURL } = jest.requireMock('qrcode');
      toDataURL.mockResolvedValue('data:image/png;base64,FAKEQR');

      const result = await service.getDigitalCard('m-lrt-1');

      expect(toDataURL).toHaveBeenCalled();
      expect(result.data.qrCode).toBe('data:image/png;base64,FAKEQR');
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      await expect(service.getDigitalCard('missing')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when anggota tries another member\'s card', async () => {
      // Akun login terhubung ke anggota m-lrt-1, tapi mencoba akses kartu m-lain
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'm-lrt-1' });
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      await expect(
        service.getDigitalCard('m-lain', undefined, {
          email: 'jefry@gmail.com',
          namaLengkap: 'Jefry Arianto Baba',
          role: 'anggota',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow anggota to access their own card (self-scope)', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'm-lrt-1' });
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      const result = await service.getDigitalCard('m-lrt-1', undefined, {
        email: 'jefry@gmail.com',
        namaLengkap: 'Jefry Arianto Baba',
        role: 'anggota',
      } as any);
      expect(result.success).toBe(true);
      expect(result.data.member.nomorAnggota).toBe('LRT-0103-001-1994');
    });

    it('should throw ForbiddenException when scope has no access to ranting', async () => {
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(false);
      await expect(service.getDigitalCard('m-lrt-1', { rantingId: 'r-lain' } as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow access when scope matches ranting', async () => {
      mockScopeHelper.hasAccessToResourceAsync.mockResolvedValue(true);
      const result = await service.getDigitalCard('m-lrt-1', { rantingId: 'r-sanjuan' } as any);
      expect(result.success).toBe(true);
      expect(mockScopeHelper.hasAccessToResourceAsync).toHaveBeenCalledWith(
        mockPrisma,
        expect.objectContaining({ rantingId: 'r-sanjuan' }),
        'r-sanjuan',
      );
    });
  });
});
