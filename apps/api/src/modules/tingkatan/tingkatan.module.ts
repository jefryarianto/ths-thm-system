import { Module } from '@nestjs/common';
import { TingkatanController } from './tingkatan.controller';
import { TingkatanService } from './tingkatan.service';

@Module({
  controllers: [TingkatanController],
  providers: [TingkatanService],
  exports: [TingkatanService],
})
export class TingkatanModule {}
