import { Module } from '@nestjs/common';
import { GraduationsController } from './graduations.controller';
import { GraduationsService } from './graduations.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [DocumentsModule],
  controllers: [GraduationsController],
  providers: [GraduationsService],
  exports: [GraduationsService],
})
export class GraduationsModule {}
