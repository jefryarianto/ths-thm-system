import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DuesService } from './dues.service';

@Injectable()
export class DuesCronService {
  private readonly logger = new Logger(DuesCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly duesService: DuesService
  ) {}

  // Jalankan setiap awal bulan tanggal 1 jam 00:00
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleAutomaticDues() {
    this.logger.log('Starting automatic dues generation for this month...');
    try {
      const now = new Date();
      // Format YYYY-MM
      const periodMonth = String(now.getMonth() + 1).padStart(2, '0');
      const periodYear = now.getFullYear();
      const periode = `${periodYear}-${periodMonth}`;
      
      // Hitung tanggal terakhir bulan ini sebagai dueDate
      const lastDayOfMonth = new Date(periodYear, now.getMonth() + 1, 0);
      lastDayOfMonth.setHours(23, 59, 59, 999);
      
      // Ambil treshold 1 bulan yang lalu untuk anggota baru
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Cari anggota aktif, yang terdaftar lebih dari 1 bulan sebelumnya
      const eligibleAnggota = await this.prisma.anggota.findMany({
        where: {
          statusKeanggotaan: 'aktif',
          createdAt: { lte: oneMonthAgo }, // bergabung (data terbuat) lebih dari 1 bulan yg lalu
          deletedAt: null,
        },
        select: { id: true, createdAt: true }
      });

      let createdCount = 0;

      for (const anggota of eligibleAnggota) {
        // Cek apakah iuran periode ini untuk anggota ini sudah dibuat
        const existing = await this.prisma.iuran.findUnique({
          where: {
            anggotaId_periode: {
              anggotaId: anggota.id,
              periode,
            }
          }
        });

        if (!existing) {
          // Buat iuran menggunakan database raw atau Prisma
          await this.prisma.iuran.create({
            data: {
              anggotaId: anggota.id,
              periode,
              jumlah: 50000, // asumsikan rate tetap 50000 / bln, bisa disesuaikan
              status: 'belum_dibayar',
              dueDate: lastDayOfMonth,
            }
          });
          createdCount++;
        }
      }

      this.logger.log(`Successfully generated ${createdCount} dues for period ${periode}`);
    } catch (error) {
      this.logger.error('Failed to generate automatic dues', error);
    }
  }
}
