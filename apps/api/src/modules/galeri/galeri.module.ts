import { Module } from '@nestjs/common';
import { GaleriController } from './galeri.controller';
import { GaleriService } from './galeri.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GaleriController],
  providers: [GaleriService],
})
export class GaleriModule {}
