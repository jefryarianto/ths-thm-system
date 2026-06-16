import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { CreateThreadDto, CreatePostDto } from './dto/forum.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Forum')
@Controller('forum')
@ApiBearerAuth()
export class ForumController {
  constructor(private readonly service: ForumService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Daftar kategori forum' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getCategories() {
    return this.service.getCategories();
  }

  @Get('categories/:categoryId/threads')
  @ApiOperation({ summary: 'Thread dalam kategori' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getThreads(
    @Param('categoryId') categoryId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getThreads(categoryId, Number(page) || 1, Number(limit) || 20);
  }

  @Get('threads/:id')
  @ApiOperation({ summary: 'Detail thread + balasan' })
  @Public()
  getThread(@Param('id') id: string) {
    return this.service.getThread(id);
  }

  @Post('threads')
  @ApiOperation({ summary: 'Buat thread baru' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  createThread(@Body() dto: CreateThreadDto, @CurrentUser() user: { id: string }) {
    return this.service.createThread(dto, user.id);
  }

  @Post('threads/:id/posts')
  @ApiOperation({ summary: 'Balas thread' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  createPost(
    @Param('id') id: string,
    @Body() dto: CreatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createPost(id, dto, user.id);
  }

  @Patch('threads/:id/pin')
  @ApiOperation({ summary: 'Pin/unpin thread (admin)' })
  @Roles('superadmin', 'admin_distrik')
  togglePin(@Param('id') id: string) {
    return this.service.togglePin(id);
  }

  @Patch('threads/:id/lock')
  @ApiOperation({ summary: 'Lock/unlock thread (admin)' })
  @Roles('superadmin', 'admin_distrik')
  toggleLock(@Param('id') id: string) {
    return this.service.toggleLock(id);
  }

  @Delete('threads/:id')
  @ApiOperation({ summary: 'Hapus thread' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  deleteThread(@Param('id') id: string) {
    return this.service.deleteThread(id);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Hapus balasan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  deletePost(@Param('id') id: string) {
    return this.service.deletePost(id);
  }
}