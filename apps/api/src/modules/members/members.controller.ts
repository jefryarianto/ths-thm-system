import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { MembersDigitalCardService } from './members-digital-card.service';
import { MembersWorkflowService } from './members-workflow.service';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';
import { Response } from 'express';

@ApiTags('Members')
@Controller('members')
@ApiBearerAuth()
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly digitalCardService: MembersDigitalCardService,
    private readonly workflowService: MembersWorkflowService,
  ) {}

  @Get('me')
  @CrudAuth('anggota', 'penguji', 'admin_ranting', 'admin_wilayah', 'admin_distrik', 'superadmin', { scope: 'self', summary: 'Ambil data anggota untuk user yang login' })
  async getMe(@Req() req: ScopedRequest) {
    const user = (req as any).user;
    if (!user?.email) {
      return { success: false, message: 'User tidak memiliki email' };
    }
    const member = await this.membersService.findByEmail(user.email, user.namaLengkap);
    return member;
  }

  @Get('search')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'admin_kegiatan', 'penguji', 'anggota', { summary: 'Cari anggota untuk picker' })
  searchMembers(
    @Query('q') q?: string,
    @Query('rantingId') rantingId?: string,
    @Query('wilayahId') wilayahId?: string,
  ) {
    return this.membersService.searchMembers(q, rantingId, wilayahId);
  }

  @Get('incomplete')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil anggota dengan data tidak lengkap' })
  getIncompleteMembers(@Query() filter: MemberFilterDto, @Req() req: ScopedRequest) {
    return this.membersService.getIncompleteMembers(filter, req.scope);
  }

  @Get('incomplete/stats')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Statistik data tidak lengkap' })
  getIncompleteStats(@Req() req: ScopedRequest) {
    return this.membersService.getIncompleteStats(req.scope);
  }

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Ambil semua anggota' })
  findAll(@Query() filter: MemberFilterDto, @Req() req: ScopedRequest) {
    return this.membersService.findAll(filter, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Ambil detail anggota' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.findOne(id, req.scope);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah anggota baru' })
  create(@Body() dto: CreateMemberDto, @Req() req: ScopedRequest) {
    return this.membersService.create(dto, req.scope);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui anggota' })
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto, @Req() req: ScopedRequest) {
    return this.membersService.update(id, dto, req.scope, req.user?.id);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Hapus anggota' })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.remove(id, req.scope);
  }

  @Post('import')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Impor data anggota' })
  importCsv(@Body() data: any[], @Req() req: ScopedRequest) {
    return this.membersService.importCsv(data, req.scope);
  }

  @Get('export/csv')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ekspor data anggota' })
  exportCsv(@Query() filter: MemberFilterDto, @Req() req: ScopedRequest) {
    return this.membersService.exportCsv(filter, req.scope);
  }

  @Post(':id/validate')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Validasi anggota' })
  validate(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.validate(id, req.scope);
  }

  @Post(':id/approve')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Setujui anggota' })
  approve(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.approve(id, req.scope);
  }

  @Post(':id/resend-credentials')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Kirim ulang credential login anggota' })
  resendCredentials(@Param('id') id: string) {
    return this.membersService.resendCredentials(id);
  }

  @Patch(':id/suspend')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tangguhkan anggota' })
  suspend(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.suspend(id, req.scope);
  }

  @Patch(':id/reactivate')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Aktifkan kembali anggota' })
  reactivate(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.reactivate(id, req.scope);
  }

  @Get(':id/documents')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Ambil dokumen anggota' })
  getDocuments(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.getDocuments(id, req.user);
  }

  @Get(':id/dues')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Ambil iuran anggota' })
  getDues(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.getDues(id, req.user);
  }

  @Get(':id/digital-card')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Kartu Anggota Digital dengan QR Code' })
  getDigitalCard(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.digitalCardService.getDigitalCard(id, req.scope, req.user);
  }

  @Get(':id/digital-card/pdf')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Download Kartu Anggota Digital (PDF)' })
  async getDigitalCardPdf(@Param('id') id: string, @Req() req: ScopedRequest, @Res() res: Response) {
    const pdfBuffer = await this.digitalCardService.getDigitalCardPdf(id, req.scope, req.user);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kartu-anggota-${id}.pdf"`);
    res.send(pdfBuffer);
  }

  @Get(':id/digital-card/image')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { scope: 'self', summary: 'Preview Kartu Anggota Digital (PNG)' })
  async getDigitalCardImage(@Param('id') id: string, @Req() req: ScopedRequest, @Res() res: Response) {
    const pngBuffer = await this.digitalCardService.getDigitalCardImage(id, req.scope, req.user);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="kartu-anggota-${id}.png"`);
    res.send(pngBuffer);
  }
}
