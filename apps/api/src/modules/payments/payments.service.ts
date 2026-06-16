import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';

export interface BankInfo {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrisImageUrl: string | null;
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

  getBankInfo(): BankInfo {
    return {
      bankName: process.env.BANK_NAME || 'BCA',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '-',
      accountName: process.env.BANK_ACCOUNT_NAME || 'THS-THM',
      qrisImageUrl: process.env.QRIS_IMAGE_URL || null,
    };
  }

  async uploadProof(iuranId: string, payload: { catatan: string; buktiBayarPath?: string }, scope?: UserScope) {
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

    const updated = await this.prisma.iuran.update({
      where: { id: iuranId },
      data: {
        status: 'menunggu_verifikasi',
        metodeBayar: 'transfer',
        buktiBayarPath: payload.buktiBayarPath || payload.catatan || null,
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