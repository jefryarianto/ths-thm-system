import { Controller, Post, Get, Body, Param, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreateSnapTokenDto } from './dto/create-snap-token.dto';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('snap-token')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  createSnapToken(@Body() dto: CreateSnapTokenDto, @Req() req: ScopedRequest) {
    return this.service.createSnapToken(dto, req.scope);
  }

  @Public()
  @Post('notification')
  handleNotification(@Body() payload: Record<string, unknown>) {
    return this.service.handleNotification(payload as any);
  }

  @Get('status/:orderId')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  getPaymentStatus(@Param('orderId') orderId: string) {
    return this.service.getPaymentStatus(orderId);
  }
}