import { Module } from "@nestjs/common";
import { ExaminersController } from "./examiners.controller";
import { ExaminersService } from "./examiners.service";
import { ScopeModule } from "../../common/scope.module";

@Module({
  imports: [ScopeModule],
  controllers: [ExaminersController],
  providers: [ExaminersService],
  exports: [ExaminersService],
})
export class ExaminersModule {}
