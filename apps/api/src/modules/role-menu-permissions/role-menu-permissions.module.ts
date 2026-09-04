import { Module } from '@nestjs/common';
import { RoleMenuPermissionsController } from './role-menu-permissions.controller';
import { RoleMenuPermissionsService } from './role-menu-permissions.service';

@Module({
  controllers: [RoleMenuPermissionsController],
  providers: [RoleMenuPermissionsService],
  exports: [RoleMenuPermissionsService],
})
export class RoleMenuPermissionsModule {}
