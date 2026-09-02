import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PeriodeModule } from '../periode/periode.module';

@Module({
  imports: [PrismaModule, PeriodeModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
