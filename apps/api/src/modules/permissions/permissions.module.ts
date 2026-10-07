import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { PrismaModule } from '../../prisma/prisma.module';

// @Global: RolesGuard (dipakai sebagai APP_GUARD global dan lewat @UseGuards
// di controller mana pun) menyuntik PermissionsService. Tanpa global, guard
// yang di-instantiate di konteks module lain (mis. FeatureFlagsModule) gagal
// boot: "Nest can't resolve dependencies of the RolesGuard".
@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionsService],
  controllers: [PermissionsController],
  exports: [PermissionsService],
})
export class PermissionsModule {}
