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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { ForumCategoryService } from './forum-category.service';
import {
  CreateThreadDto,
  CreatePostDto,
  UpdateThreadDto,
  UpdatePostDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  ThreadFilterDto,
} from './dto/forum.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Forum')
@Controller('forum')
@ApiBearerAuth()
export class ForumController {
  constructor(
    private readonly service: ForumService,
    private readonly categoryService: ForumCategoryService,
  ) {}

  // ── Categories (via ForumCategoryService / BaseCrudService) ──

  @Get('categories')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Daftar kategori forum' })
  getCategories() {
    return this.categoryService.findAll();
  }

  @Get('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Detail kategori forum' })
  getCategory(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post('categories')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Buat kategori forum (admin)' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Perbarui kategori forum (admin)' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus kategori forum (admin)' })
  deleteCategory(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  // ── Threads ───────────────────────────────────────────

  @Get('categories/:categoryId/threads')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Thread dalam kategori' })
  getThreads(
    @Param('categoryId') categoryId: string,
    @Query() filter: ThreadFilterDto,
  ) {
    return this.service.getThreads(categoryId, filter);
  }

  @Get('threads/:id')
  @Public()
  getThread(@Param('id') id: string) {
    return this.service.getThread(id);
  }

  @Post('threads')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Buat thread baru' })
  createThread(@Body() dto: CreateThreadDto, @CurrentUser() user: { id: string }) {
    return this.service.createThread(dto, user.id);
  }

  @Patch('threads/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Perbarui thread' })
  updateThread(
    @Param('id') id: string,
    @Body() dto: UpdateThreadDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updateThread(id, dto, user.id);
  }

  @Patch('threads/:id/pin')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Pin/unpin thread (admin)' })
  togglePin(@Param('id') id: string) {
    return this.service.togglePin(id);
  }

  @Patch('threads/:id/lock')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Lock/unlock thread (admin)' })
  toggleLock(@Param('id') id: string) {
    return this.service.toggleLock(id);
  }

  @Delete('threads/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Hapus thread' })
  deleteThread(@Param('id') id: string) {
    return this.service.deleteThread(id);
  }

  // ── Posts ─────────────────────────────────────────────

  @Post('threads/:id/posts')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Balas thread' })
  createPost(
    @Param('id') id: string,
    @Body() dto: CreatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createPost(id, dto, user.id);
  }

  @Patch('posts/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Perbarui balasan' })
  updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updatePost(id, dto, user.id);
  }

  @Patch('posts/:id/solution')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Tandai sebagai solusi' })
  markAsSolution(
    @Param('id') postId: string,
    @Query('threadId') threadId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.markAsSolution(postId, threadId, user.id);
  }

  @Delete('posts/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Hapus balasan' })
  deletePost(@Param('id') id: string) {
    return this.service.deletePost(id);
  }
}
