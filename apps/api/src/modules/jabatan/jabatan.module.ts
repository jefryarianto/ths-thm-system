import { Module } from '@nestjs/common';
import { JabatanController } from './jabatan.controller';
import { JabatanService } from './jabatan.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [JabatanController],
  providers: [JabatanService],
  exports: [JabatanService],
})
export class JabatanModule {}
