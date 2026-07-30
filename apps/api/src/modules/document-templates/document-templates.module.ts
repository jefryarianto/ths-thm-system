import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DocumentTemplatesService } from './document-templates.service';
import { DocumentTemplatesController } from './document-templates.controller';
import { ScopeHelper } from '../../common/utils/scope-helpers';

@Module({
  imports: [PrismaModule],
  controllers: [DocumentTemplatesController],
  providers: [DocumentTemplatesService, ScopeHelper],
  exports: [DocumentTemplatesService],
})
export class DocumentTemplatesModule {}
