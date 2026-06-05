import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UserFilterDto } from './dto/user.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findAll(@Query() query: UserFilterDto, @Req() req: ScopedRequest) { return this.service.findAll(query, req.scope); }

  @Get(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  findOne(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.findOne(id, req.scope); }

  @Post()
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  create(@Body() dto: CreateUserDto, @Req() req: ScopedRequest) { return this.service.create(dto, req.scope); }

  @Patch(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting')
  @RequireScope('branch')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: ScopedRequest) { return this.service.update(id, dto, req.scope); }

  @Delete(':id')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah')
  @RequireScope('branch')
  remove(@Param('id') id: string, @Req() req: ScopedRequest) { return this.service.remove(id, req.scope); }
}
