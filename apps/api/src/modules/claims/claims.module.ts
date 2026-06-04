import { Module } from "@nestjs/common";
import { ClaimsController } from "./claims.controller";
import { ClaimsService } from "./claims.service";
import { ScopeModule } from "../../common/scope.module";

@Module({
  imports: [ScopeModule],
  controllers: [ClaimsController],
  providers: [ClaimsService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
