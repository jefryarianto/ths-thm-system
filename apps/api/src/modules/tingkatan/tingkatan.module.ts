import { Module } from '@nestjs/common';
import { TingkatanService } from './tingkatan.service';
import { TingkatanController } from './tingkatan.controller';
import { PrismaModule } from '../../common/services/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TingkatanController],
  providers: [TingkatanService],
  exports: [TingkatanService],
})
export class TingkatanModule {}
