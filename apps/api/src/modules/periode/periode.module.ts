import { Module } from '@nestjs/common';
import { PeriodeController } from './periode.controller';
import { PeriodeService } from './periode.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PeriodeController],
  providers: [PeriodeService],
  exports: [PeriodeService],
})
export class PeriodeModule {}
