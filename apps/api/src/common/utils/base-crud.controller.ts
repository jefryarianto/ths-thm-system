import { Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';

/**
 * Base CRUD controller providing 5 standard HTTP route handlers.
 *
 * Subclasses inherit these routes and override individual methods to add
 * auth decorators (`@Roles`, `@RequireScope`, `@ApiOperation`, etc.).
 *
 * ⚠️ **Security**: Override EVERY CRUD method to add `@Roles` / `@RequireScope`.
 *    If a method is NOT overridden, its endpoint is exposed WITHOUT auth guards.
 *
 * ## Usage
 *
 * ```ts
 * @ApiTags('Examiners')
 * @Controller('examiners')
 * @ApiBearerAuth()
 * export class ExaminersController extends BaseCrudController {
 *   constructor(service: ExaminersService) { super(service); }
 *
 *   @Get()
 *   @Roles('superadmin', 'admin_distrik')
 *   @RequireScope('branch')
 *   @ApiOperation({ summary: 'Ambil semua penguji' })
 *   findAll(@Query() q: any) { return super.findAll(q); }
 *
 *   // Extra domain endpoints sit alongside inherited CRUD
 *   @Post(':id/assign')
 *   assign(@Param('id') id: string, @Body() dto: any) { return this.service.assign(id, dto); }
 * }
 * ```
 */
export abstract class BaseCrudController {
  constructor(protected readonly service: any) {}

  // ── CRUD Handlers ──────────────────────────────────────

  @Get()
  async findAll(@Query() query: any): Promise<any> {
    return this.service.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return this.service.findOne(id);
  }

  @Post()
  async create(@Body() dto: any): Promise<any> {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: any): Promise<any> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    return this.service.remove(id);
  }
}
