import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { MembersDigitalCardService } from './members-digital-card.service';
import { MembersWorkflowService } from './members-workflow.service';
import { CreateMemberDto, UpdateMemberDto, MemberFilterDto } from './dto/member.dto';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
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
  @ApiOperation({ summary: 'Ambil data anggota untuk user yang login' })
  @Roles('anggota', 'penguji', 'admin_ranting', 'admin_wilayah', 'admin_distrik', 'superadmin')
  async getMe(@Req() req: ScopedRequest) {
    const user = (req as any).user;
    // Lookup Anggota by email matching the logged-in user's email
    if (!user?.email) {
      return { success: false, message: 'User tidak memiliki email' };
    }
    const member = await this.membersService.findByEmail(user.email);
    return member;
  }

  @Get()
  @ApiOperation({ summary: 'Ambil semua anggota' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
    'anggota',
  )
  @RequireScope('branch')
  findAll(@Query() filter: MemberFilterDto, @Req() req: ScopedRequest) {
    return this.membersService.findAll(filter, req.scope);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ambil detail anggota' })
  @Roles(
    'superadmin',
    'admin_distrik',
    'admin_wilayah',
    'admin_ranting',
    'admin_kegiatan',
    'penguji',
    'anggota',
  )
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.findOne(id, req.scope);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah anggota baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateMemberDto, @Req() req: ScopedRequest) {
    return this.membersService.create(dto, req.scope);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Perbarui anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto, @Req() req: ScopedRequest) {
    return this.membersService.update(id, dto, req.scope);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.membersService.remove(id, req.scope);
  }

  @Post('import')
  @ApiOperation({ summary: 'Impor data anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  importCsv(@Body() data: any[], @Req() req: ScopedRequest) {
    return this.membersService.importCsv(data, req.scope);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Ekspor data anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  exportCsv(@Query() filter: MemberFilterDto, @Req() req: ScopedRequest) {
    return this.membersService.exportCsv(filter, req.scope);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validasi anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  validate(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.validate(id, req.scope);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Setujui anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  approve(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.approve(id, req.scope);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Tangguhkan anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  suspend(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.suspend(id, req.scope);
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Aktifkan kembali anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  reactivate(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.workflowService.reactivate(id, req.scope);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Ambil dokumen anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  getDocuments(@Param('id') id: string) {
    return this.membersService.getDocuments(id);
  }

  @Get(':id/dues')
  @ApiOperation({ summary: 'Ambil iuran anggota' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  getDues(@Param('id') id: string) {
    return this.membersService.getDues(id);
  }

  @Get(':id/digital-card')
  @ApiOperation({ summary: 'Kartu Anggota Digital dengan QR Code' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  getDigitalCard(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.digitalCardService.getDigitalCard(id, req.scope);
  }

  @Get(':id/digital-card/pdf')
  @ApiOperation({ summary: 'Download Kartu Anggota Digital (PDF)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  async getDigitalCardPdf(@Param('id') id: string, @Req() req: ScopedRequest, @Res() res: Response) {
    const pdfBuffer = await this.digitalCardService.getDigitalCardPdf(id, req.scope);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="kartu-anggota-${id}.pdf"`);
    res.send(pdfBuffer);
  }

  @Get(':id/digital-card/image')
  @ApiOperation({ summary: 'Preview Kartu Anggota Digital (PNG)' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  async getDigitalCardImage(@Param('id') id: string, @Req() req: ScopedRequest, @Res() res: Response) {
    const pngBuffer = await this.digitalCardService.getDigitalCardImage(id, req.scope);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="kartu-anggota-${id}.png"`);
    res.send(pngBuffer);
  }
}
