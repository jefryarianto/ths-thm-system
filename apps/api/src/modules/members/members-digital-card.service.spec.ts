import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MembersDigitalCardService } from './members-digital-card.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { PenandatanganService } from '../penandatangan/penandatangan.service';
import { TingkatanService } from '../tingkatan/tingkatan.service';
import { CacheService } from '../../common/services/cache.service';
import { revokeLegacyMemberKtaCards } from './kta-card-revocation';

jest.mock('../documents/pdf-templates/styled-qr', () => ({
  buildStyledQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,FAKEQR'),
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
  const mockSigners = [{ signerName: 'Yoseph Pehan Betan', signerTitle: 'Koordinator Distrik' }];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrisma: any = {
    anggota: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    dokumen: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    ktaApplication: {
      findFirst: jest.fn(),
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
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(mockPrisma))),
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
    mockPrisma.ktaApplication.findFirst.mockResolvedValue({
      id: 'a1',
      status: 'CARD_GENERATED',
    });
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

    it('returns adminIssued=false when latest KTA has no admin issuer', async () => {
      mockPrisma.ktaApplication.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'CARD_GENERATED',
        diterbitkanOleh: null,
      });

      const result = await service.getDigitalCard('m-lrt-1');

      expect(result.data.adminIssued).toBe(false);
    });

    it('returns adminIssued=true when latest KTA was issued by admin', async () => {
      mockPrisma.ktaApplication.findFirst.mockResolvedValue({
        id: 'a1',
        status: 'CARD_GENERATED',
        diterbitkanOleh: 'admin-1',
      });

      const result = await service.getDigitalCard('m-lrt-1');

      expect(result.data.adminIssued).toBe(true);
    });

    it('should include signer dari tabel penandatangan (multi-signer)', async () => {
      const existing = {
        id: 'doc-signer',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'https://ths-thm.cloud/verify/abc123',
        status: 'generated',
      };
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [existing] });
      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockPenandatanganService.resolveSigners).toHaveBeenCalledWith(
        'kartu_anggota',
        'd-lrt',
      );
      expect(result.data.card?.signers).toEqual(mockSigners);
      // Backward-compat: signer pertama di signerName/signerTitle
      expect(result.data.card?.signerName).toBe('Yoseph Pehan Betan');
      expect(result.data.card?.signerTitle).toBe('Koordinator Distrik');
    });

    it('should include levelVisual (strip tingkat) dari tabel tingkatan', async () => {
      const existing = {
        id: 'doc-lv',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'https://ths-thm.cloud/verify/abc123',
        status: 'generated',
      };
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [existing] });
      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockTingkatanService.resolveLevelVisual).toHaveBeenCalledWith('Muda');
      expect(result.data.levelVisual).toEqual({
        stripCount: 1,
        color: '#ca8a04',
        label: 'Kuning 1',
      });
    });

    it('should include fotoDataUrl (data URL) agar foto privat bisa dirender <img>/Image.network', async () => {
      const existing = {
        id: 'doc-foto',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'https://ths-thm.cloud/verify/abc123',
        status: 'generated',
      };
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [existing] });
      const spy = jest
        .spyOn(service as unknown as { resolvePhotoDataUrl: () => Promise<string | null> }, 'resolvePhotoDataUrl')
        .mockResolvedValue('data:image/png;base64,PHOTO');

      const result = await service.getDigitalCard('m-lrt-1');

      expect(result.data.fotoDataUrl).toBe('data:image/png;base64,PHOTO');
      // Foto asli (bukan versi `.bg.png`) agar memenuhi bingkai kartu.
      expect(spy).toHaveBeenCalledWith(expect.anything(), false, 700);
    });

    it('should backfill tanggal terbit/berlaku untuk dokumen KTA lama yang kosong', async () => {
      const existing = {
        id: 'doc-old',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'https://ths-thm.cloud/verify/abc123',
        status: 'generated',
      };
      mockPrisma.anggota.findUnique.mockResolvedValue({
        ...mockMember,
        tanggalTerbit: null,
        tanggalBerlakuSampai: null,
        dokumen: [existing],
      });
      mockPrisma.anggota.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockPrisma.anggota.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'm-lrt-1', tanggalTerbit: null }),
        }),
      );
      expect(result.data.member.tanggalTerbit).toBeTruthy();
      expect(result.data.member.tanggalBerlakuSampai).toBeTruthy();
    });

    it('should NOT auto-generate dokumen saat GET digital-card tanpa kartu', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [] });

      const result = await service.getDigitalCard('m-lrt-1');

      expect(mockPrisma.dokumen.create).not.toHaveBeenCalled();
      expect(mockPrisma.qRValidation.create).not.toHaveBeenCalled();
      expect(result.data.generated).toBe(false);
      expect(result.data.card).toBeNull();
    });

    it('generateDigitalCard membuat dokumen + QR + tanggal terbit/berlaku (3 tahun)', async () => {
      const createdDocs: any[] = [];
      mockPrisma.dokumen.create.mockImplementation(async ({ data }: any) => {
        const doc = { id: 'doc-gen', ...data };
        createdDocs.push(doc);
        return doc;
      });
      // findUnique dipanggil dua kali (ensure + getDigitalCard) — kembalikan
      // dokumen yang sudah dibuat agar kartu terdeteksi.
      mockPrisma.anggota.findUnique.mockImplementation(async () => ({
        ...mockMember,
        dokumen: createdDocs,
      }));
      mockPrisma.anggota.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.generateDigitalCard('m-lrt-1');

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
      expect(result.data.card?.nomorDokumen).toBe('KTA-LRT-0103-001-1994');
      expect(result.data.generated).toBe(true);
      // Tanggal terbit & masa berlaku 3 tahun diisi saat generate
      expect(mockPrisma.anggota.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'm-lrt-1', tanggalTerbit: null }),
          data: expect.objectContaining({
            tanggalTerbit: expect.any(Date),
            tanggalBerlakuSampai: expect.any(Date),
          }),
        }),
      );
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
      expect(result.data.card?.id).toBe('doc-existing');
      expect(result.data.card?.nomorDokumen).toBe('KTA-LRT-0103-001-1994');
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

        const url = result.data.card!.verificationUrl as string;
        expect(url.startsWith('https://ths-thm.cloud/verify/')).toBe(true);
        expect(url).not.toContain('/api/documents/verify/');
        // Token pada URL adalah JWT QR bertanda tangan (3 segmen base64url)
        expect(url.replace('https://ths-thm.cloud/verify/', '').split('.')).toHaveLength(3);

        // QR juga digenerate dari URL publik, bukan endpoint JSON API
        const { buildStyledQrDataUrl } = jest.requireMock('../documents/pdf-templates/styled-qr');
        expect(buildStyledQrDataUrl).toHaveBeenCalledWith(
          expect.stringContaining('https://ths-thm.cloud/verify/'),
        );
      } finally {
        if (prevFrontend === undefined) delete process.env.FRONTEND_URL;
        else process.env.FRONTEND_URL = prevFrontend;
      }
    });

    it('should generate QR dari verificationUrl', async () => {
      const { buildStyledQrDataUrl } = jest.requireMock('../documents/pdf-templates/styled-qr');
      buildStyledQrDataUrl.mockResolvedValue('data:image/png;base64,FAKEQR');
      const existing = {
        id: 'doc-qr',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'https://ths-thm.cloud/verify/abc123',
        status: 'generated',
      };
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [existing] });

      const result = await service.getDigitalCard('m-lrt-1');

      expect(buildStyledQrDataUrl).toHaveBeenCalled();
      expect(result.data.qrCode).toBe('data:image/png;base64,FAKEQR');
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockPrisma.anggota.findUnique.mockResolvedValue(null);
      await expect(service.getDigitalCard('missing')).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when anggota tries another member's card", async () => {
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
      await expect(
        service.getDigitalCard('m-lrt-1', { rantingId: 'r-lain' } as any),
      ).rejects.toThrow(ForbiddenException);
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
      const svg = buildCardWatermarkSvg(
        3566,
        4500,
        'KARTU DIGITAL - Jefry Arianto Baba - LRT-0103-001-1994',
      );

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

    it('reset riwayat scan: hapus log + reset counter ke 0', async () => {
      mockPrisma.qrScan.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.qRValidation.update.mockResolvedValue({
        id: 'qr-1',
        isValid: true,
        scanCount: 0,
        scannedAt: null,
      });
      const result = await service.resetCardSecurity('m-lrt-1');

      expect(result.success).toBe(true);
      expect(result.data.deleted).toBe(2);
      expect(result.data.scanCount).toBe(0);
      expect(result.data.scanLog).toEqual([]);
      expect(mockPrisma.qrScan.deleteMany).toHaveBeenCalledWith({ where: { qrValidationId: 'qr-1' } });
      expect(mockPrisma.qRValidation.update).toHaveBeenCalledWith({
        where: { id: 'qr-1' },
        data: { scanCount: 0, scannedAt: null, isValid: true },
      });
    });

    it('reset gagal bila QR belum terdaftar', async () => {
      mockPrisma.dokumen.findFirst.mockResolvedValue(ktaDoc({ qrValidations: [] }));
      await expect(service.resetCardSecurity('m-lrt-1')).rejects.toThrow(NotFoundException);
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

    it('hides revoked card security from member', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'm-lrt-1' });
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      mockPrisma.dokumen.findFirst.mockResolvedValue(
        ktaDoc({
          status: 'revoked',
          qrValidations: [
            {
              id: 'qr-1',
              isValid: false,
              scanCount: 0,
              scannedAt: null,
              createdAt: new Date('2026-01-01T00:00:00Z'),
            },
          ],
        }),
      );

      await expect(
        service.getCardSecurity('m-lrt-1', undefined, {
          email: 'jefry@gmail.com',
          role: 'anggota',
        } as any),
      ).rejects.toThrow(NotFoundException);
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
      mockPrisma.anggota.findUnique.mockResolvedValue({
        id: 'm-lrt-1',
        rantingId: 'r-sanjuan',
      } as any);
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

    it('aktifkan kembali: status generated + QR aktif + perpanjang masa berlaku 3 bulan', async () => {
      mockPrisma.dokumen.findFirst.mockResolvedValue(
        ktaDoc({ status: 'generated', qrValidations: [{ id: 'qr-1', isValid: true }] }),
      );
      const before = new Date('2026-11-02T00:00:00Z');
      jest.useFakeTimers().setSystemTime(before);
      try {
        const result = await service.setCardActive('m-lrt-1', true);

        expect(result.data.status).toBe('generated');
        expect(result.data.isValid).toBe(true);
        expect(mockPrisma.dokumen.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ status: 'generated' }) }),
        );
        expect(mockPrisma.qRValidation.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ isValid: true }) }),
        );
        // Re-aktivasi: tanggalBerlakuSampai diperpanjang 3 bulan.
        const updateArgs = mockPrisma.anggota.update.mock.calls[0][0];
        expect(updateArgs.where.id).toBe('m-lrt-1');
        const expiry: Date = updateArgs.data.tanggalBerlakuSampai;
        expect(expiry.getUTCFullYear()).toBe(2027);
        expect(expiry.getUTCMonth()).toBe(1); // Februari (0-based) = Nov + 3
      } finally {
        jest.useRealTimers();
      }
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
        expect.objectContaining({
          data: expect.objectContaining({ source: 'printed', isValid: true }),
        }),
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
        expect.objectContaining({
          data: expect.objectContaining({ reason: 'hilang', source: 'printed' }),
        }),
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

    it('rotates revoked digital QR during admin issuance', async () => {
      const oldUrl = 'http://localhost:3000/verify/old-token';
      mockPrisma.dokumen.findFirst.mockResolvedValue({
        id: 'doc-1',
        status: 'revoked',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: oldUrl,
        qrValidations: [
          {
            id: 'qr-old',
            source: 'digital',
            isValid: true,
            verificationUrl: oldUrl,
          },
        ],
      } as any);
      mockPrisma.dokumen.update.mockImplementation(async ({ data }: any) => ({
        id: 'doc-1',
        ...data,
      }));
      let createCount = 0;
      mockPrisma.qRValidation.create.mockImplementation(async ({ data }: any) => {
        createCount += 1;
        return {
          id: `qr-${createCount}`,
          ...data,
          reason: data.reason ?? null,
          createdAt: new Date('2026-03-01T00:00:00Z'),
        };
      });

      const result = await service.issuePrintedCard('m-lrt-1', { reason: 'baru' });

      expect(result.data.issuance.source).toBe('printed');
      expect(mockPrisma.qRValidation.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ dokumenId: 'doc-1', isValid: true }),
          data: expect.objectContaining({ isValid: false }),
        }),
      );
      const updateArgs = mockPrisma.dokumen.update.mock.calls[0][0];
      expect(updateArgs.data.status).toBe('generated');
      expect(updateArgs.data.verificationUrl).not.toBe(oldUrl);
      expect(mockPrisma.qRValidation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'digital',
            isValid: true,
            verificationUrl: updateArgs.data.verificationUrl,
          }),
        }),
      );
    });

    it('internalAutoRegenerate mencabut QR fisik lama tanpa gate status terbaru', async () => {
      mockPrisma.ktaApplication.findFirst.mockResolvedValue({ id: 'a1', status: 'PAYMENT_PENDING' });
      mockPrisma.dokumen.findFirst.mockResolvedValue({
        id: 'doc-1',
        status: 'generated',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'http://localhost:3000/verify/digital-token',
        qrValidations: [
          {
            id: 'qr-d1',
            source: 'digital',
            isValid: true,
            verificationUrl: 'http://localhost:3000/verify/digital-token',
          },
        ],
      } as any);

      await service.issuePrintedCard('m-lrt-1', {
        reason: 'member_update_approved',
        internalAutoRegenerate: true,
      });

      expect(mockPrisma.ktaApplication.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.qRValidation.updateMany).toHaveBeenCalledWith({
        where: { dokumenId: 'doc-1', source: 'printed', isValid: true },
        data: { isValid: false },
      });
      expect(mockPrisma.qRValidation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            source: 'printed',
            isValid: true,
            reason: 'member_update_approved',
          }),
        }),
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

    it('returns no issuances to member when all QRs are revoked', async () => {
      mockPrisma.anggota.findFirst.mockResolvedValue({ id: 'm-lrt-1' });
      mockPrisma.anggota.findMany.mockResolvedValue([]);
      mockPrisma.dokumen.findFirst.mockResolvedValue({
        id: 'doc-1',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        qrValidations: [
          {
            id: 'qr-old',
            source: 'digital',
            reason: 'QR diganti saat penerbitan ulang admin',
            isValid: false,
            scanCount: 0,
            scannedAt: null,
            verificationUrl: 'http://localhost:3000/verify/old',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      } as any);

      const result = await service.getCardIssuances('m-lrt-1', undefined, {
        email: 'jefry@gmail.com',
        role: 'anggota',
      } as any);

      expect(result.data.issuances).toEqual([]);
    });

    it('admin tetap melihat QR revoked sebagai audit', async () => {
      mockPrisma.dokumen.findFirst.mockResolvedValue({
        id: 'doc-1',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        qrValidations: [
          {
            id: 'qr-old',
            source: 'digital',
            reason: 'QR diganti saat penerbitan ulang admin',
            isValid: false,
            scanCount: 0,
            scannedAt: null,
            verificationUrl: 'http://localhost:3000/verify/old',
            createdAt: new Date('2026-01-01T00:00:00Z'),
          },
        ],
      } as any);

      const result = await service.getCardIssuances('m-lrt-1', undefined, {
        role: 'superadmin',
      } as any);

      expect(result.data.issuances).toHaveLength(1);
      expect(result.data.issuances[0].isValid).toBe(false);
    });
  });

  describe('KTA issuable gate', () => {
    const validStatuses = ['PAYMENT_VERIFIED', 'CARD_GENERATING', 'CARD_GENERATED'];
    const invalidStatuses = ['SUBMITTED', 'APPROVED', 'PAYMENT_PENDING', 'REJECTED'];

    beforeEach(() => {
      mockPrisma.anggota.findUnique.mockResolvedValue({ ...mockMember, dokumen: [] } as any);
      mockPrisma.dokumen.findFirst.mockResolvedValue(null);
      mockPrisma.dokumen.create.mockResolvedValue({
        id: 'doc-1',
        status: 'generated',
        nomorDokumen: 'KTA-LRT-0103-001-1994',
        verificationUrl: 'http://localhost:3000/verify/digital-token',
      } as any);
      mockPrisma.anggota.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.qRValidation.create.mockResolvedValue({
        id: 'qr-p1',
        source: 'printed',
        reason: null,
        isValid: true,
        verificationUrl: 'http://localhost:3000/verify/printed-token',
        createdAt: new Date('2026-03-01T00:00:00Z'),
      } as any);
    });

    it.each(['generateDigitalCard', 'issuePrintedCard'])(
      '%s menolak tanpa pengajuan KTA',
      async (method) => {
        mockPrisma.ktaApplication.findFirst.mockResolvedValue(null);

        await expect((service as any)[method]('m-lrt-1')).rejects.toThrow(/KTA/);
        expect(mockPrisma.dokumen.create).not.toHaveBeenCalled();
        expect(mockPrisma.qRValidation.create).not.toHaveBeenCalled();
      },
    );

    it.each(['generateDigitalCard', 'issuePrintedCard'])(
      '%s menolak status pengajuan tidak valid',
      async (method) => {
        for (const status of invalidStatuses) {
          mockPrisma.ktaApplication.findFirst.mockResolvedValue({ id: 'a1', status });

          await expect((service as any)[method]('m-lrt-1')).rejects.toThrow(/KTA/);
        }
        expect(mockPrisma.dokumen.create).not.toHaveBeenCalled();
        expect(mockPrisma.qRValidation.create).not.toHaveBeenCalled();
      },
    );

    it.each(['generateDigitalCard', 'issuePrintedCard'])(
      '%s mengizinkan status pengajuan valid',
      async (method) => {
        for (const status of validStatuses) {
          mockPrisma.ktaApplication.findFirst.mockResolvedValue({ id: 'a1', status });

          await expect((service as any)[method]('m-lrt-1')).resolves.toBeDefined();
        }
      },
    );

    it('issuePrintedCard publik tetap menolak status terbaru PAYMENT_PENDING', async () => {
      mockPrisma.ktaApplication.findFirst.mockResolvedValue({ id: 'a1', status: 'PAYMENT_PENDING' });

      await expect(
        service.issuePrintedCard('m-lrt-1', { reason: 'member_update_approved' }),
      ).rejects.toThrow(/KTA/);
      expect(mockPrisma.qRValidation.create).not.toHaveBeenCalled();
    });

    it('issueCardsBatch menolak tanpa pengajuan KTA', async () => {
      mockPrisma.ktaApplication.findFirst.mockResolvedValue(null);

      await expect(service.issueCardsBatch(['m-lrt-1'])).rejects.toThrow(/KTA/);
      expect(mockPrisma.qRValidation.create).not.toHaveBeenCalled();
    });

    it('issueCardsBatch menolak status pengajuan tidak valid', async () => {
      for (const status of invalidStatuses) {
        mockPrisma.ktaApplication.findFirst.mockResolvedValue({ id: 'a1', status });

        await expect(service.issueCardsBatch(['m-lrt-1'])).rejects.toThrow(/KTA/);
      }
      expect(mockPrisma.qRValidation.create).not.toHaveBeenCalled();
    });

    it.each(validStatuses)('issueCardsBatch mengizinkan status %s', async (status) => {
      mockPrisma.ktaApplication.findFirst.mockResolvedValue({ id: 'a1', status });

      await expect(service.issueCardsBatch(['m-lrt-1'])).resolves.toEqual(
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('revokeLegacyMemberKtaCards', () => {
    type Qr = { id: string; dokumenId: string; source: 'digital' | 'printed'; isValid: boolean };
    type Doc = {
      id: string;
      anggotaId: string;
      status: 'generated' | 'downloaded' | 'revoked';
      qrValidations: Qr[];
    };
    type MemberDates = { tanggalTerbit: Date | null; tanggalBerlakuSampai: Date | null };

    const createFakePrisma = (docs: Doc[], members: Record<string, MemberDates>) => {
      const state = {
        docs: docs.map((doc) => ({
          ...doc,
          qrValidations: doc.qrValidations.map((qr) => ({ ...qr })),
        })),
        members: Object.fromEntries(
          Object.entries(members).map(([id, dates]) => [id, { ...dates }]),
        ),
        qrScanDeleteMany: jest.fn(),
      };

      const prisma: any = {
        dokumen: {
          findMany: jest.fn(async () => state.docs),
          updateMany: jest.fn(async ({ where, data }: any) => {
            const ids = new Set<string>(where.id?.in ?? []);
            let count = 0;
            for (const doc of state.docs) {
              if (ids.has(doc.id) && doc.status !== where.status?.not) {
                Object.assign(doc, data);
                count += 1;
              }
            }
            return { count };
          }),
        },
        qRValidation: {
          updateMany: jest.fn(async ({ where, data }: any) => {
            const ids = new Set<string>(where.id?.in ?? []);
            let count = 0;
            for (const doc of state.docs) {
              for (const qr of doc.qrValidations) {
                if (ids.has(qr.id) && qr.isValid) {
                  Object.assign(qr, data);
                  count += 1;
                }
              }
            }
            return { count };
          }),
        },
        anggota: {
          updateMany: jest.fn(async ({ where, data }: any) => {
            const ids = new Set<string>(where.id?.in ?? []);
            let count = 0;
            for (const [id, dates] of Object.entries(state.members)) {
              if (ids.has(id) && (dates.tanggalTerbit || dates.tanggalBerlakuSampai)) {
                Object.assign(dates, data);
                count += 1;
              }
            }
            return { count };
          }),
        },
        qrScan: { deleteMany: state.qrScanDeleteMany },
        $transaction: jest.fn(async (fn: any) => fn(prisma)),
      };

      return { prisma, state };
    };

    it('revokes digital-only KTA without deleting audit scans', async () => {
      const { prisma, state } = createFakePrisma(
        [
          {
            id: 'doc-digital',
            anggotaId: 'm-digital',
            status: 'generated',
            qrValidations: [
              {
                id: 'qr-digital',
                dokumenId: 'doc-digital',
                source: 'digital',
                isValid: true,
              },
            ],
          },
        ],
        {
          'm-digital': {
            tanggalTerbit: new Date('2026-01-01'),
            tanggalBerlakuSampai: new Date('2029-01-01'),
          },
        },
      );

      const result = await revokeLegacyMemberKtaCards(prisma);

      expect(result).toEqual({ documentsRevoked: 1, digitalQrsRevoked: 1, datesCleared: 1 });
      expect(state.docs.find((doc) => doc.id === 'doc-digital')).toMatchObject({
        status: 'revoked',
      });
      expect(state.docs[0].qrValidations[0]).toMatchObject({ isValid: false });
      expect(state.members['m-digital']).toEqual({
        tanggalTerbit: null,
        tanggalBerlakuSampai: null,
      });
      expect(state.qrScanDeleteMany).not.toHaveBeenCalled();
    });

    it('keeps documents that still have a valid printed QR', async () => {
      const { prisma, state } = createFakePrisma(
        [
          {
            id: 'doc-digital',
            anggotaId: 'm-print',
            status: 'generated',
            qrValidations: [
              {
                id: 'qr-digital',
                dokumenId: 'doc-digital',
                source: 'digital',
                isValid: true,
              },
            ],
          },
          {
            id: 'doc-printed',
            anggotaId: 'm-print',
            status: 'generated',
            qrValidations: [
              {
                id: 'qr-printed',
                dokumenId: 'doc-printed',
                source: 'printed',
                isValid: true,
              },
            ],
          },
        ],
        {
          'm-print': {
            tanggalTerbit: new Date('2026-01-01'),
            tanggalBerlakuSampai: new Date('2029-01-01'),
          },
        },
      );

      const result = await revokeLegacyMemberKtaCards(prisma);

      expect(result).toEqual({ documentsRevoked: 1, digitalQrsRevoked: 1, datesCleared: 0 });
      expect(state.docs.find((doc) => doc.id === 'doc-printed')).toMatchObject({
        status: 'generated',
      });
      expect(state.members['m-print'].tanggalTerbit).not.toBeNull();
      expect(state.qrScanDeleteMany).not.toHaveBeenCalled();
    });

    it('is idempotent when rerun', async () => {
      const { prisma } = createFakePrisma(
        [
          {
            id: 'doc-digital',
            anggotaId: 'm-digital',
            status: 'generated',
            qrValidations: [
              {
                id: 'qr-digital',
                dokumenId: 'doc-digital',
                source: 'digital',
                isValid: true,
              },
            ],
          },
        ],
        {
          'm-digital': {
            tanggalTerbit: new Date('2026-01-01'),
            tanggalBerlakuSampai: new Date('2029-01-01'),
          },
        },
      );

      await revokeLegacyMemberKtaCards(prisma);
      await expect(revokeLegacyMemberKtaCards(prisma)).resolves.toEqual({
        documentsRevoked: 0,
        digitalQrsRevoked: 0,
        datesCleared: 0,
      });
    });
  });
});
