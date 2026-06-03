import { Module } from '@nestjs/common';
import { ExaminersController } from './examiners.controller';
import { ExaminersService } from './examiners.service';

@Module({
  controllers: [ExaminersController],
  providers: [ExaminersService],
  exports: [ExaminersService],
})
export class ExaminersModule {}
