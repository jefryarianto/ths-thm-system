import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

export interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string | null;
  isActive: boolean;
}

export interface CreateBankInfoDto {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl?: string;
}

export interface UpdateBankInfoDto {
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  qrisImageUrl?: string;
  isActive?: boolean;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly CACHE_PREFIX = 'payments:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
  ) {}

  // ── Bank Info CRUD ──

  async getAllBankInfo(): Promise<BankInfo[]> {
    const banks = await this.prisma.bankInfo.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return banks.map((b) => ({
      id: b.id,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      accountName: b.accountName,
      qrisImageUrl: b.qrisImageUrl,
      isActive: b.isActive,
    }));
  }

  async getActiveBankInfo(): Promise<BankInfo[]> {
    const banks = await this.prisma.bankInfo.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return banks.map((b) => ({
      id: b.id,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      accountName: b.accountName,
      qrisImageUrl: b.qrisImageUrl,
      isActive: b.isActive,
    }));
  }

  async createBankInfo(dto: CreateBankInfoDto): Promise<BankInfo> {
    const bank = await this.prisma.bankInfo.create({
      data: {
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        accountName: dto.accountName,
        qrisImageUrl: dto.qrisImageUrl || null,
      },
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.logger.log(`Bank info created: ${bank.bankName} - ${bank.accountNumber}`);

    return {
      id: bank.id,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      qrisImageUrl: bank.qrisImageUrl,
      isActive: bank.isActive,
    };
  }

  async updateBankInfo(id: string, dto: UpdateBankInfoDto): Promise<BankInfo> {
    const existing = await this.prisma.bankInfo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bank info tidak ditemukan');

    const bank = await this.prisma.bankInfo.update({
      where: { id },
      data: {
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber }),
        ...(dto.accountName !== undefined && { accountName: dto.accountName }),
        ...(dto.qrisImageUrl !== undefined && { qrisImageUrl: dto.qrisImageUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.logger.log(`Bank info updated: ${bank.id}`);

    return {
      id: bank.id,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      accountName: bank.accountName,
      qrisImageUrl: bank.qrisImageUrl,
      isActive: bank.isActive,
    };
  }

  async deleteBankInfo(id: string): Promise<void> {
    const existing = await this.prisma.bankInfo.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Bank info tidak ditemukan');

    await this.prisma.bankInfo.delete({ where: { id } });

    this.cache.invalidatePrefix(this.CACHE_PREFIX);
    this.logger.log(`Bank info deleted: ${id}`);
  }

  // ── Original payment methods (updated to use database) ──

  /**
   * Legacy method — returns active bank info from database
   */
  async getBankInfo(): Promise<Omit<BankInfo, 'id' | 'isActive'>[]> {
    const cacheKey = `${this.CACHE_PREFIX}bank-info`;
    const cached = this.cache.get<Omit<BankInfo, 'id' | 'isActive'>[]>(cacheKey);
    if (cached) return cached;

    const banks = await this.getActiveBankInfo();
    const result = banks.map((b) => ({
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      accountName: b.accountName,
      qrisImageUrl: b.qrisImageUrl,
    }));

    // Cache for 5 minutes
    this.cache.set(cacheKey, result, 300);
    return result;
  }

  async findOne(id: string, scope?: UserScope) {
    const iuran = await this.prisma.iuran.findUnique({
      where: { id },
      include: {
        anggota: { select: { id: true, namaLengkap: true, nomorAnggota: true, rantingId: true, ranting: { select: { id: true, nama: true } } } },
        verifikator: { select: { id: true, namaLengkap: true, email: true } },
      },
    });

    if (!iuran) throw new NotFoundException('Pembayaran tidak ditemukan');

    if (scope && iuran.anggota?.rantingId) {
      if (
        !(await this.scopeHelper.hasAccessToResourceAsync(
          this.prisma,
          scope,
          iuran.anggota.rantingId,
        ))
      ) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    return { success: true, data: iuran };
  }

  async uploadProof(
    iuranId: string,
    payload: { catatan?: string; file?: Express.Multer.File },
    scope?: UserScope,
  ) {
    const iuran = await this.prisma.iuran.findUnique({
      where: { id: iuranId },
      include: { anggota: { select: { rantingId: true } } },
    });

    if (!iuran) throw new NotFoundException('Iuran tidak ditemukan');

    if (scope && iuran.anggota?.rantingId) {
      if (
        !(await this.scopeHelper.hasAccessToResourceAsync(
          this.prisma,
          scope,
          iuran.anggota.rantingId,
        ))
      ) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    if (iuran.status === 'lunas') {
      throw new ForbiddenException('Iuran ini sudah lunas');
    }

    let buktiPath: string | null = iuran.buktiBayarPath;
    if (payload.file) {
      buktiPath = `/api/uploads/proofs/${payload.file.filename}`;
    } else if (payload.catatan) {
      buktiPath = payload.catatan;
    }

    const updated = await this.prisma.iuran.update({
      where: { id: iuranId },
      data: {
        status: 'menunggu_verifikasi',
        metodeBayar: 'transfer',
        buktiBayarPath: buktiPath,
      },
    });

    this.cache.invalidatePrefix('dues:');
    this.cache.invalidatePrefix('reports:');

    return {
      success: true,
      data: updated,
      message: 'Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.',
    };
  }

  async verifyPayment(iuranId: string, userId: string, scope?: UserScope) {
    const iuran = await this.prisma.iuran.findUnique({
      where: { id: iuranId },
      include: { anggota: { select: { id: true, rantingId: true } } },
    });

    if (!iuran) throw new NotFoundException('Iuran tidak ditemukan');

    if (scope && iuran.anggota?.rantingId) {
      if (
        !(await this.scopeHelper.hasAccessToResourceAsync(
          this.prisma,
          scope,
          iuran.anggota.rantingId,
        ))
      ) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    if (iuran.status === 'lunas') {
      throw new ForbiddenException('Iuran ini sudah lunas');
    }

    const updated = await this.prisma.iuran.update({
      where: { id: iuranId },
      data: {
        status: 'lunas',
        tanggalBayar: new Date(),
        diverifikasiOleh: userId || null,
        diverifikasiAt: new Date(),
      },
    });

    this.cache.invalidatePrefix('dues:');
    this.cache.invalidatePrefix('reports:');

    this.logger.log(`Payment verified for iuran ${iuranId} by user ${userId}`);

    return {
      success: true,
      data: updated,
      message: 'Pembayaran berhasil diverifikasi',
    };
  }

  async rejectPayment(iuranId: string, scope?: UserScope) {
    const iuran = await this.prisma.iuran.findUnique({
      where: { id: iuranId },
      include: { anggota: { select: { rantingId: true } } },
    });

    if (!iuran) throw new NotFoundException('Iuran tidak ditemukan');

    if (scope && iuran.anggota?.rantingId) {
      if (
        !(await this.scopeHelper.hasAccessToResourceAsync(
          this.prisma,
          scope,
          iuran.anggota.rantingId,
        ))
      ) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    const updated = await this.prisma.iuran.update({
      where: { id: iuranId },
      data: {
        status: 'belum_dibayar',
        buktiBayarPath: null,
      },
    });

    this.cache.invalidatePrefix('dues:');
    this.cache.invalidatePrefix('reports:');

    return {
      success: true,
      data: updated,
      message: 'Pembayaran ditolak. Status dikembalikan ke belum dibayar.',
    };
  }
}