import { Controller, Post, Body, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequireScope } from '../../common/decorators/scope.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ScopedRequest } from '../../common/interfaces/user-scope.interface';

@ApiTags('Payments')
@Controller('payments')
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post('create-intent')
  @Roles('superadmin', 'admin_distrik', 'admin_wilayah', 'admin_ranting', 'anggota')
  @RequireScope('branch')
  createIntent(@Body() dto: CreatePaymentIntentDto, @Req() req: ScopedRequest) {
    return this.service.createIntent(dto, req.scope);
  }

  @Public()
  @Post('webhook')
  handleWebhook(@Headers('stripe-signature') signature: string, @Req() req: RawBodyRequest<Request>) {
    return this.service.handleWebhook(signature, req.rawBody!);
  }
}
