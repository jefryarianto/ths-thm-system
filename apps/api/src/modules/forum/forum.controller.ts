import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import {
  CreateThreadDto,
  CreatePostDto,
  UpdateThreadDto,
  UpdatePostDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ThreadFilterDto,
} from './dto/forum.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Forum')
@Controller('forum')
@ApiBearerAuth()
export class ForumController {
  constructor(private readonly service: ForumService) {}

  // ── Categories ────────────────────────────────────────

  @Get('categories')
  @ApiOperation({ summary: 'Daftar kategori forum' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getCategories() {
    return this.service.getCategories();
  }

  @Get('categories/:id')
  @ApiOperation({ summary: 'Detail kategori forum' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getCategory(@Param('id') id: string) {
    return this.service.getCategory(id);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Buat kategori forum (admin)' })
  @Roles('superadmin', 'admin_distrik')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Perbarui kategori forum (admin)' })
  @Roles('superadmin', 'admin_distrik')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Hapus kategori forum (admin)' })
  @Roles('superadmin', 'admin_distrik')
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }

  // ── Threads ───────────────────────────────────────────

  @Get('categories/:categoryId/threads')
  @ApiOperation({ summary: 'Thread dalam kategori' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getThreads(
    @Param('categoryId') categoryId: string,
    @Query() filter: ThreadFilterDto,
  ) {
    return this.service.getThreads(categoryId, filter);
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

  @Patch('threads/:id')
  @ApiOperation({ summary: 'Perbarui thread' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  updateThread(
    @Param('id') id: string,
    @Body() dto: UpdateThreadDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updateThread(id, dto, user.id);
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

  // ── Posts ─────────────────────────────────────────────

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

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Perbarui balasan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updatePost(id, dto, user.id);
  }

  @Patch('posts/:id/solution')
  @ApiOperation({ summary: 'Tandai sebagai solusi' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  markAsSolution(
    @Param('id') postId: string,
    @Query('threadId') threadId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.markAsSolution(postId, threadId, user.id);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Hapus balasan' })
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  deletePost(@Param('id') id: string) {
    return this.service.deletePost(id);
  }
}
