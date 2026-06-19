import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { MembersModule } from '../members/members.module';

@Module({
  imports: [MembersModule],
  controllers: [UploadController],
})
export class UploadModule {}
