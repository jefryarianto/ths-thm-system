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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    anggota: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    dokumen: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    qRValidation: {
      create: jest.fn().mockResolvedValue(undefined),
      update: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    qrScan: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn((arg: any) =>
      Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma),
    ),
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

    it('should normalize verificationUrl legacy (/api/documents/verify/...) ke /verify/ agar dibuka di browser', async () => {
      const prevFrontend = process.env.FRONTEND_URL;
      process.env.FRONTEND_URL = 'https://ths-thm.cloud';
      try {
        const existing = {
          id: 'doc-legacy',
          nomorDokumen: 'KTA-LRT-0103-001-1994',
          verificationUrl: 'https://ths-thm.cloud/api/documents/verify/legacy-uuid-123',
          status: 'generated',
        };
        mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [existing] });

        const result = await service.getDigitalCard('m-lrt-1');

        const url = result.data.card.verificationUrl as string;
        expect(url.startsWith('https://ths-thm.cloud/verify/')).toBe(true);
        expect(url).not.toContain('/api/documents/verify/');
        // Token pada URL adalah JWT QR bertanda tangan (3 segmen base64url)
        expect(url.replace('https://ths-thm.cloud/verify/', '').split('.')).toHaveLength(3);

        // QR juga digenerate dari URL publik, bukan endpoint JSON API
        const { toDataURL } = jest.requireMock('qrcode');
        expect(toDataURL).toHaveBeenCalledWith(
          expect.stringContaining('https://ths-thm.cloud/verify/'),
          expect.anything(),
        );
      } finally {
        if (prevFrontend === undefined) delete process.env.FRONTEND_URL;
        else process.env.FRONTEND_URL = prevFrontend;
      }
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

  describe('watermark SVG', () => {
    it('buildCardWatermarkSvg mengembalikan tile diagonal berisi teks kartu', () => {
      // @ts-ignore
      const { buildCardWatermarkSvg } = require('./members-digital-card.service');
      const svg = buildCardWatermarkSvg(3566, 4500, 'KARTU DIGITAL - Jefry Arianto Baba - LRT-0103-001-1994');

      expect(svg).toContain('width="3566"');
      expect(svg).toContain('height="4500"');
      expect(svg).toContain('rotate(-28');
      expect(svg).toContain('KARTU DIGITAL - Jefry Arianto Baba - LRT-0103-001-1994');
    });

    it('xmlEscape mengamankan tanda kutip pada nama anggota', () => {
      // @ts-ignore
      const { xmlEscape } = require('./members-digital-card.service');
      expect(xmlEscape(`O'Brien & "Co"`)).toBe('O&apos;Brien &amp; &quot;Co&quot;');
    });
  });

  describe('getCardSecurity', () => {
    const ktaDoc = (overrides: any = {}) => ({
      id: 'doc-1',
      nomorDokumen: 'KTA-LRT-0103-001-1994',
      status: 'generated',
      qrValidations: [
        {
          id: 'qr-1',
          isValid: true,
          scanCount: 3,
          scannedAt: new Date('2026-02-01T10:00:00Z'),
          createdAt: new Date('2026-01-01T00:00:00Z'),
        },
      ],
      ...overrides,
    });

    beforeEach(() => {
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'm-lrt-1',
        rantingId: 'r-sanjuan',
      } as any);
      mockPrisma.dokumen.findFirst.mockResolvedValue(ktaDoc());
      mockPrisma.qrScan.findMany.mockResolvedValue([
        {
          id: 'scan-1',
          scannedAt: new Date('2026-02-01T10:00:00Z'),
          ipAddress: '203.0.113.9',
          userAgent: 'Mozilla/5.0 (KTA-Scanner) very long',
        },
      ]);
    });

    it('mengembalikan status QR + riwayat scan dengan IP tersamarkan', async () => {
      const result = await service.getCardSecurity('m-lrt-1');

      expect(result.data.qr.isValid).toBe(true);
      expect(result.data.qr.scanCount).toBe(3);
      expect(result.data.scanLimit).toBe(25);
      expect(result.data.scanLeft).toBe(22);
      expect(result.data.scanLog[0].ipAddress).toBe('203.0.113.x');
      expect(result.data.scanLog[0].userAgent).toBe('Mozilla/5.0 (KTA-Scanner) very long');
    });

    it('mengambil 100 riwayat scan terbaru (desc)', async () => {
      await service.getCardSecurity('m-lrt-1');
      expect(mockPrisma.qrScan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100, orderBy: { scannedAt: 'desc' } }),
      );
    });

    it('melempar NotFound bila QR belum terdaftar', async () => {
      mockPrisma.dokumen.findFirst.mockResolvedValue(ktaDoc({ qrValidations: [] }));
      await expect(service.getCardSecurity('m-lrt-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setCardActive', () => {
    const ktaDoc = (overrides: any = {}) => ({
      id: 'doc-1',
      nomorDokumen: 'KTA-LRT-0103-001-1994',
      status: 'revoked',
      qrValidations: [{ id: 'qr-1', isValid: false }],
      ...overrides,
    });

    beforeEach(() => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ id: 'm-lrt-1', rantingId: 'r-sanjuan' } as any);
      mockPrisma.dokumen.findFirst.mockResolvedValue(ktaDoc());
    });

    it('cabut kartu: status revoked + semua QR nonaktif (transaksi)', async () => {
      const result = await service.setCardActive('m-lrt-1', false);

      expect(result.data.status).toBe('revoked');
      expect(result.data.isValid).toBe(false);
      expect(mockPrisma.dokumen.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'revoked' }) }),
      );
      expect(mockPrisma.qRValidation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isValid: false }) }),
      );
    });

    it('aktifkan kembali: status generated + QR aktif', async () => {
      mockPrisma.dokumen.findFirst.mockResolvedValue(ktaDoc({ status: 'generated', qrValidations: [{ id: 'qr-1', isValid: true }] }));
      const result = await service.setCardActive('m-lrt-1', true);

      expect(result.data.status).toBe('generated');
      expect(result.data.isValid).toBe(true);
      expect(mockPrisma.dokumen.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'generated' }) }),
      );
      expect(mockPrisma.qRValidation.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isValid: true }) }),
      );
    });
  });

  describe('issuePrintedCard', () => {
    beforeEach(() => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [] } as any);
      mockPrisma.dokumen.findFirst.mockResolvedValue(null);
      mockPrisma.dokumen.create.mockResolvedValue({
        id: 'doc-1',
        status: 'generated',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
      } as any);
      mockPrisma.qRValidation.create.mockResolvedValue({
        id: 'qr-p1',
        source: 'printed',
        reason: null,
        isValid: true,
        verificationUrl: 'http://localhost:3000/verify/printed-token',
        createdAt: new Date('2026-03-01T00:00:00Z'),
      } as any);
    });

    it('membuat QR printed baru saat belum ada dokumen (buat dokumen dulu)', async () => {
      const result = await service.issuePrintedCard('m-lrt-1');

      expect(mockPrisma.dokumen.create).toHaveBeenCalled();
      expect(mockPrisma.qRValidation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ source: 'printed', isValid: true }) }),
      );
      expect(result.data.pdfUrl).toContain('printed/pdf?issuanceId=qr-p1');
    });

    it('alasan hilang/rusak mencabut QR fisik lama yang masih aktif', async () => {
      mockPrisma.dokumen.findFirst.mockResolvedValue({
        id: 'doc-1',
        status: 'generated',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
      } as any);

      await service.issuePrintedCard('m-lrt-1', { reason: 'hilang' });

      expect(mockPrisma.qRValidation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dokumenId: 'doc-1', source: 'printed', isValid: true }),
          data: expect.objectContaining({ isValid: false }),
        }),
      );
      expect(mockPrisma.qRValidation.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ reason: 'hilang', source: 'printed' }) }),
      );
    });

    it('dokumen status revoked ikut diaktifkan kembali saat terbit kartu fisik', async () => {
      mockPrisma.dokumen.findFirst.mockResolvedValue({
        id: 'doc-1',
        status: 'revoked',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
      } as any);
      mockPrisma.dokumen.update.mockResolvedValue({ id: 'doc-1', status: 'generated' } as any);

      await service.issuePrintedCard('m-lrt-1');

      expect(mockPrisma.dokumen.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'generated' }) }),
      );
    });
  });

  describe('getCardIssuances', () => {
    it('mengembalikan riwayat penerbitan digital & fisik (terbaru dulu)', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [] } as any);
      mockPrisma.dokumen.findFirst.mockResolvedValue({
        id: 'doc-1',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        qrValidations: [
          {
            id: 'qr-p2',
            source: 'printed',
            reason: 'hilang',
            isValid: true,
            scanCount: 0,
            scannedAt: null,
            verificationUrl: 'http://localhost:3000/verify/p2',
            createdAt: new Date('2026-03-05T00:00:00Z'),
          },
          {
            id: 'qr-d1',
            source: 'digital',
            reason: null,
            isValid: true,
            scanCount: 7,
            scannedAt: new Date('2026-02-01T10:00:00Z'),
            verificationUrl: 'http://localhost:3000/verify/d1',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      } as any);

      const result = await service.getCardIssuances('m-lrt-1');

      expect(result.data.issuances).toHaveLength(2);
      expect(result.data.issuances[0].source).toBe('printed');
      expect(result.data.issuances[0].edisi).toBe(2);
      expect(result.data.issuances[1].edisi).toBe(1);
      expect(result.data.issuances[1].scanCount).toBe(7);
    });

    it('anggota tanpa dokumen: issuances kosong (bukan error)', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [] } as any);
      mockPrisma.dokumen.findFirst.mockResolvedValue(null);

      const result = await service.getCardIssuances('m-lrt-1');

      expect(result.data.issuances).toEqual([]);
    });
  });
});
