import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ClaimsService } from './claims.service';
import { CreateClaimDto, UpdateClaimDto, ClaimFilterDto, RejectClaimDto } from './dto/claim.dto';

@ApiTags('Claims')
@Controller('claims')
@ApiBearerAuth()
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}
  @Get() findAll(@Query() q: ClaimFilterDto) { return this.service.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateClaimDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateClaimDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post(':id/approve') approve(@Param('id') id: string) { return this.service.approve(id); }
  @Post(':id/reject') reject(@Param('id') id: string, @Body() b: RejectClaimDto) { return this.service.reject(id, b?.reason); }
  @Post(':id/process') process(@Param('id') id: string) { return this.service.process(id); }
}
