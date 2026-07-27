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
import { ApiTags, ApiBearerAuth, ApiBody, ApiParam, ApiOkResponse, ApiCreatedResponse, ApiQuery } from '@nestjs/swagger';
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
  @ApiOkResponse({ description: 'Daftar semua kategori forum dengan jumlah thread per kategori' })
  getCategories() {
    return this.categoryService.findAll();
  }

  @Get('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Detail kategori forum' })
  @ApiParam({ name: 'id', description: 'ID Kategori Forum', required: true })
  @ApiOkResponse({ description: 'Detail kategori forum' })
  getCategory(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Post('categories')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Buat kategori forum (admin)' })
  @ApiBody({ type: CreateCategoryDto, description: 'Data kategori forum baru' })
  @ApiCreatedResponse({ description: 'Kategori forum berhasil dibuat' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Perbarui kategori forum (admin)' })
  @ApiParam({ name: 'id', description: 'ID Kategori Forum', required: true })
  @ApiBody({ type: UpdateCategoryDto, description: 'Data kategori forum yang diperbarui' })
  @ApiOkResponse({ description: 'Kategori forum berhasil diperbarui' })
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete('categories/:id')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Hapus kategori forum (admin)' })
  @ApiParam({ name: 'id', description: 'ID Kategori Forum', required: true })
  @ApiOkResponse({ description: 'Kategori forum berhasil dihapus' })
  deleteCategory(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  // ── Threads ───────────────────────────────────────────

  @Get('categories/:categoryId/threads')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Thread dalam kategori' })
  @ApiParam({ name: 'categoryId', description: 'ID Kategori Forum', required: true })
  @ApiQuery({ name: 'search', required: false, description: 'Cari thread berdasarkan judul/konten' })
  @ApiQuery({ name: 'isPinned', required: false, description: 'Filter thread yang dipin' })
  @ApiOkResponse({ description: 'Daftar thread dalam kategori' })
  getThreads(
    @Param('categoryId') categoryId: string,
    @Query() filter: ThreadFilterDto,
  ) {
    return this.service.getThreads(categoryId, filter);
  }

  @Get('threads/:id')
  @Public()
  @ApiParam({ name: 'id', description: 'ID Thread', required: true })
  @ApiOkResponse({ description: 'Detail thread beserta semua balasan' })
  getThread(@Param('id') id: string) {
    return this.service.getThread(id);
  }

  @Post('threads')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Buat thread baru' })
  @ApiBody({ type: CreateThreadDto, description: 'Data thread baru' })
  @ApiCreatedResponse({ description: 'Thread berhasil dibuat' })
  createThread(@Body() dto: CreateThreadDto, @CurrentUser() user: { id: string }) {
    return this.service.createThread(dto, user.id);
  }

  @Patch('threads/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Perbarui thread' })
  @ApiParam({ name: 'id', description: 'ID Thread', required: true })
  @ApiBody({ type: UpdateThreadDto, description: 'Data thread yang diperbarui' })
  @ApiOkResponse({ description: 'Thread berhasil diperbarui' })
  updateThread(
    @Param('id') id: string,
    @Body() dto: UpdateThreadDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updateThread(id, dto, user.id);
  }

  @Patch('threads/:id/pin')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Pin/unpin thread (admin)' })
  @ApiParam({ name: 'id', description: 'ID Thread', required: true })
  @ApiOkResponse({ description: 'Status pin thread berubah' })
  togglePin(@Param('id') id: string) {
    return this.service.togglePin(id);
  }

  @Patch('threads/:id/lock')
  @CrudAuth('superadmin', 'admin_distrik', { summary: 'Lock/unlock thread (admin)' })
  @ApiParam({ name: 'id', description: 'ID Thread', required: true })
  @ApiOkResponse({ description: 'Status lock thread berubah' })
  toggleLock(@Param('id') id: string) {
    return this.service.toggleLock(id);
  }

  @Delete('threads/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Hapus thread' })
  @ApiParam({ name: 'id', description: 'ID Thread', required: true })
  @ApiOkResponse({ description: 'Thread berhasil dihapus' })
  deleteThread(@Param('id') id: string) {
    return this.service.deleteThread(id);
  }

  // ── Posts ─────────────────────────────────────────────

  @Post('threads/:id/posts')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Balas thread' })
  @ApiParam({ name: 'id', description: 'ID Thread', required: true })
  @ApiBody({ type: CreatePostDto, description: 'Konten balasan' })
  @ApiCreatedResponse({ description: 'Balasan berhasil dikirim' })
  createPost(
    @Param('id') id: string,
    @Body() dto: CreatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.createPost(id, dto, user.id);
  }

  @Patch('posts/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Perbarui balasan' })
  @ApiParam({ name: 'id', description: 'ID Post/Balasan', required: true })
  @ApiBody({ type: UpdatePostDto, description: 'Konten balasan yang diperbarui' })
  @ApiOkResponse({ description: 'Balasan berhasil diperbarui' })
  updatePost(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.updatePost(id, dto, user.id);
  }

  @Patch('posts/:id/solution')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Tandai sebagai solusi' })
  @ApiParam({ name: 'id', description: 'ID Post/Balasan', required: true })
  @ApiQuery({ name: 'threadId', required: true, description: 'ID Thread yang berisi post ini' })
  @ApiOkResponse({ description: 'Post ditandai sebagai solusi' })
  markAsSolution(
    @Param('id') postId: string,
    @Query('threadId') threadId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.markAsSolution(postId, threadId, user.id);
  }

  @Delete('posts/:id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota', { summary: 'Hapus balasan' })
  @ApiParam({ name: 'id', description: 'ID Post/Balasan', required: true })
  @ApiOkResponse({ description: 'Balasan berhasil dihapus' })
  deletePost(@Param('id') id: string) {
    return this.service.deletePost(id);
  }
}
