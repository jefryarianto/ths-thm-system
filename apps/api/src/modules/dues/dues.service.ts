import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.periode) where.periode = query.periode;

    const [data, total] = await Promise.all([
      this.prisma.iuran.findMany({
        where, skip: (page - 1) * limit, take: limit,
        include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.iuran.count({ where }),
    ]);

    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async create(dto: any) {
    const due = await this.prisma.iuran.create({ data: dto });
    return { success: true, data: due, message: 'Pembayaran iuran berhasil dicatat' };
  }

  async findOne(id: string) {
    const due = await this.prisma.iuran.findUnique({ where: { id }, include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true } } } });
    if (!due) throw new NotFoundException('Iuran tidak ditemukan');
    return { success: true, data: due };
  }

  async update(id: string, dto: any) {
    const due = await this.prisma.iuran.update({ where: { id }, data: dto });
    return { success: true, data: due, message: 'Data iuran berhasil diperbarui' };
  }

  async remove(id: string) {
    await this.prisma.iuran.delete({ where: { id } });
    return { success: true, message: 'Data iuran berhasil dihapus' };
  }

  async getMemberDues(memberId: string) {
    const dues = await this.prisma.iuran.findMany({
      where: { anggotaId: memberId },
      orderBy: { periode: 'desc' },
    });
    return { success: true, data: dues };
  }

  async getArrears(query: any) {
    const arrears = await this.prisma.iuran.findMany({
      where: { status: 'menunggak' },
      include: { anggota: { select: { id: true, nomorAnggota: true, namaLengkap: true, noHp: true } } },
      orderBy: { periode: 'asc' },
    });

    const totalArrears = arrears.reduce((sum, i) => sum + Number(i.jumlah), 0);

    return { success: true, data: { items: arrears, totalArrears, count: arrears.length } };
  }

  async getDashboardStats() {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const periode = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    const [totalIuran, totalLunas, totalMenunggak, iuranBulanIni, anggotaAktif] =
      await Promise.all([
        this.prisma.iuran.aggregate({ _sum: { jumlah: true }, _count: true }),
        this.prisma.iuran.aggregate({ _sum: { jumlah: true }, where: { status: 'lunas' } }),
        this.prisma.iuran.aggregate({ _sum: { jumlah: true }, where: { status: 'menunggak' } }),
        this.prisma.iuran.findMany({ where: { periode }, select: { jumlah: true, status: true } }),
        this.prisma.anggota.count({ where: { statusKeanggotaan: 'aktif' } }),
      ]);

    const iuranBulanIniTotal = iuranBulanIni.reduce((sum, i) => sum + Number(i.jumlah), 0);
    const lunasBulanIni = iuranBulanIni.filter(i => i.status === 'lunas').length;
    const belumBayarBulanIni = anggotaAktif - iuranBulanIni.length;

    return {
      success: true,
      data: {
        totalIuran: Number(totalIuran._sum.jumlah || 0),
        totalTransaksi: totalIuran._count,
        totalLunas: Number(totalLunas._sum.jumlah || 0),
        totalMenunggak: Number(totalMenunggak._sum.jumlah || 0),
        iuranBulanIni: iuranBulanIniTotal,
        lunasBulanIni,
        belumBayarBulanIni,
        anggotaAktif,
      },
    };
  }

  async getReport(query: any) {
    const stats = await this.prisma.iuran.groupBy({
      by: ['status'],
      _count: true,
      _sum: { jumlah: true },
    });

    return { success: true, data: stats };
  }

  async exportReport(query: any) {
    const dues = await this.prisma.iuran.findMany({
      include: { anggota: { select: { nomorAnggota: true, namaLengkap: true } } },
    });
    return { success: true, data: dues };
  }

  async importDues(data: any[]) {
    let success = 0;
    for (const row of data) {
      try {
        await this.prisma.iuran.create({
          data: {
            anggotaId: row.anggota_id,
            periode: row.periode,
            jumlah: parseFloat(row.jumlah),
            tanggalBayar: row.tanggal_bayar ? new Date(row.tanggal_bayar) : null,
            metodeBayar: row.metode_bayar || 'manual',
            status: row.status || 'lunas',
          },
        });
        success++;
      } catch (e) { /* skip errors */ }
    }
    return { success: true, data: { imported: success, failed: data.length - success } };
  }

  async batchPayment(dto: any) {
    const { memberIds, periode, jumlah } = dto;
    for (const memberId of memberIds) {
      await this.prisma.iuran.create({
        data: { anggotaId: memberId, periode, jumlah, status: 'lunas', tanggalBayar: new Date(), metodeBayar: 'manual' },
      });
    }
    return { success: true, message: `Pembayaran massal untuk ${memberIds.length} anggota berhasil` };
  }
}