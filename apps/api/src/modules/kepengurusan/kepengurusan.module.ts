import { Module } from '@nestjs/common';
import { KepengurusanController } from './kepengurusan.controller';
import { KepengurusanService } from './kepengurusan.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KepengurusanController],
  providers: [KepengurusanService],
  exports: [KepengurusanService],
})
export class KepengurusanModule {}
