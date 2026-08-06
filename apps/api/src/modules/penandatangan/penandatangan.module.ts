import { Module } from '@nestjs/common';
import { PenandatanganController } from './penandatangan.controller';
import { PenandatanganService } from './penandatangan.service';

@Module({
  controllers: [PenandatanganController],
  providers: [PenandatanganService],
  exports: [PenandatanganService],
})
export class PenandatanganModule {}
