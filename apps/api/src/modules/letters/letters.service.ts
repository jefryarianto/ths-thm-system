import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LetterFilterDto, CreateIncomingLetterDto, UpdateIncomingLetterDto, CreateOutgoingLetterDto, UpdateOutgoingLetterDto, CreateDispositionDto } from './dto/letter.dto';

@Injectable()
export class LettersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCombined(query: LetterFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [masuk, keluar, totalMasuk, totalKeluar] = await Promise.all([
      this.prisma.suratMasuk.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.suratKeluar.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.suratMasuk.count(),
      this.prisma.suratKeluar.count(),
    ]);

    const combined = [
      ...masuk.map((m) => ({ ...m, type: 'masuk' as const })),
      ...keluar.map((k) => ({ ...k, type: 'keluar' as const })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = totalMasuk + totalKeluar;
    const totalPages = Math.ceil(total / limit);

    return { success: true, data: combined.slice(0, limit), meta: { total, page, limit, totalPages } };
  }

  async incomingFindAll(query: LetterFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const [data, total] = await Promise.all([
      this.prisma.suratMasuk.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { tanggalTerima: 'desc' } }),
      this.prisma.suratMasuk.count(),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async incomingFindOne(id: string) {
    const letter = await this.prisma.suratMasuk.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Surat tidak ditemukan');
    return { success: true, data: letter };
  }

  async incomingCreate(dto: CreateIncomingLetterDto) {
    const letter = await this.prisma.suratMasuk.create({
      data: {
        nomorSurat: dto.nomorSurat,
        tanggalSurat: new Date(dto.tanggalSurat),
        tanggalTerima: new Date(dto.tanggalTerima),
        pengirim: dto.pengirim,
        perihal: dto.perihal,
        fileScanPath: dto.fileScanPath,
        status: 'diterima',
      },
    });
    return { success: true, data: letter, message: 'Surat masuk berhasil dicatat' };
  }

  async incomingUpdate(id: string, dto: UpdateIncomingLetterDto) {
    const data: Record<string, unknown> = {};
    if (dto.nomorSurat) data.nomorSurat = dto.nomorSurat;
    if (dto.tanggalSurat) data.tanggalSurat = new Date(dto.tanggalSurat);
    if (dto.pengirim) data.pengirim = dto.pengirim;
    if (dto.perihal) data.perihal = dto.perihal;
    if (dto.status) data.status = dto.status;
    if (dto.fileScanPath) data.fileScanPath = dto.fileScanPath;

    const letter = await this.prisma.suratMasuk.update({ where: { id }, data });
    return { success: true, data: letter, message: 'Surat masuk berhasil diperbarui' };
  }

  async incomingRemove(id: string) {
    await this.prisma.suratMasuk.delete({ where: { id } });
    return { success: true, message: 'Surat masuk berhasil dihapus' };
  }

  async createDisposition(suratMasukId: string, dto: CreateDispositionDto) {
    const disposition = await this.prisma.disposisi.create({
      data: {
        suratMasukId,
        dariUserId: dto.dariUserId,
        kepadaUserId: dto.kepadaUserId,
        isi: dto.isi,
      },
    });
    return { success: true, data: disposition, message: 'Disposisi berhasil dicatat' };
  }

  async outgoingFindAll(query: LetterFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const [data, total] = await Promise.all([
      this.prisma.suratKeluar.findMany({ skip: (page - 1) * limit, take: limit, orderBy: { tanggalSurat: 'desc' } }),
      this.prisma.suratKeluar.count(),
    ]);
    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async outgoingFindOne(id: string) {
    const letter = await this.prisma.suratKeluar.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException('Surat tidak ditemukan');
    return { success: true, data: letter };
  }

  async outgoingCreate(dto: CreateOutgoingLetterDto) {
    const letter = await this.prisma.suratKeluar.create({
      data: {
        nomorSurat: dto.nomorSurat,
        tanggalSurat: new Date(dto.tanggalSurat),
        tujuan: dto.tujuan,
        perihal: dto.perihal,
        isi: dto.isi,
        filePath: dto.filePath,
        status: 'draft',
      },
    });
    return { success: true, data: letter, message: 'Draft surat keluar berhasil dibuat' };
  }

  async outgoingUpdate(id: string, dto: UpdateOutgoingLetterDto) {
    const data: Record<string, unknown> = {};
    if (dto.nomorSurat) data.nomorSurat = dto.nomorSurat;
    if (dto.tanggalSurat) data.tanggalSurat = new Date(dto.tanggalSurat);
    if (dto.tujuan) data.tujuan = dto.tujuan;
    if (dto.perihal) data.perihal = dto.perihal;
    if (dto.isi) data.isi = dto.isi;
    if (dto.status) data.status = dto.status;

    const letter = await this.prisma.suratKeluar.update({ where: { id }, data });
    return { success: true, data: letter, message: 'Surat keluar berhasil diperbarui' };
  }

  async outgoingRemove(id: string) {
    await this.prisma.suratKeluar.delete({ where: { id } });
    return { success: true, message: 'Surat keluar berhasil dihapus' };
  }

  async outgoingSend(id: string) {
    const letter = await this.prisma.suratKeluar.update({
      where: { id },
      data: { status: 'terkirim' },
    });
    return { success: true, data: letter, message: 'Surat berhasil dikirim' };
  }

  async incomingExport() {
    const letters = await this.prisma.suratMasuk.findMany();
    return { success: true, data: letters };
  }

  async outgoingExport() {
    const letters = await this.prisma.suratKeluar.findMany();
    return { success: true, data: letters };
  }
}
