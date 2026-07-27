import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import { CrudAuth } from '../../common/decorators/crud-auth.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil semua pengguna' })
  findAll(@Query() query: UserFilterDto, @Req() req: ScopedRequest) {
    return this.service.findAll(query, req.scope);
  }

  @Get(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Ambil detail pengguna' })
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.findOne(id, req.scope);
  }

  @Post()
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Tambah pengguna baru' })
  create(@Body() dto: CreateUserDto, @Req() req: ScopedRequest) {
    return this.service.create(dto, req.scope);
  }

  @Patch(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', { summary: 'Perbarui pengguna' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: ScopedRequest) {
    return this.service.update(id, dto, req.scope);
  }

  @Delete(':id')
  @CrudAuth('superadmin', 'admin_distrik', 'admin_wilayah', { summary: 'Hapus pengguna' })
  remove(@Param('id') id: string, @Req() req: ScopedRequest) {
    return this.service.remove(id, req.scope);
  }
}
