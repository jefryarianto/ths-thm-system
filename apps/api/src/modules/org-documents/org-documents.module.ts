import { Module } from '@nestjs/common';
import { OrgDocumentsController } from './org-documents.controller';
import { OrgDocumentsService } from './org-documents.service';

@Module({
  controllers: [OrgDocumentsController],
  providers: [OrgDocumentsService],
  exports: [OrgDocumentsService],
})
export class OrgDocumentsModule {}
