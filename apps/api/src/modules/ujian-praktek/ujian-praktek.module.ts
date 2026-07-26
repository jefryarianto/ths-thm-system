import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UjianPraktekController } from './ujian-praktek.controller';
import { UjianPraktekService } from './ujian-praktek.service';

@Module({
  controllers: [UjianPraktekController],
  providers: [UjianPraktekService, PrismaService],
  exports: [UjianPraktekService],
})
export class UjianPraktekModule {}
