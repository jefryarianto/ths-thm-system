import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AspectService } from './aspect.service';
import { ScopeModule } from '../../common/scope.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [ScopeModule, PrismaModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AspectService],
  exports: [AssessmentsService, AspectService],
})
export class AssessmentsModule {}
