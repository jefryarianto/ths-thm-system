import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Stripe = require('stripe');

@Injectable()
export class PaymentsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stripe: any;
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');
  }

  async createIntent(dto: CreatePaymentIntentDto, scope?: UserScope) {
    const iuran = await this.prisma.iuran.findUnique({
      where: { id: dto.iuranId },
      include: { anggota: { select: { rantingId: true } } },
    });
    if (!iuran) throw new NotFoundException('Iuran not found');

    // Scope verification: iuran → anggota → ranting
    if (scope && !(await this.scopeHelper.hasAccessToResourceAsync(this.prisma, scope, (iuran as any).anggota?.rantingId))) {
      throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: dto.amount,
      currency: dto.currency,
      metadata: { iuranId: dto.iuranId },
    });
    await this.prisma.iuran.update({
      where: { id: dto.iuranId },
      data: { status: 'menunggu_verifikasi' },
    });
    return { clientSecret: paymentIntent.client_secret };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(signature: string, rawBody: Buffer) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intent = event.data.object as any;
      const iuranId = intent.metadata?.iuranId;
      if (iuranId) {
        await this.prisma.iuran.update({
          where: { id: iuranId },
          data: { status: 'lunas', tanggalBayar: new Date() },
        });
      }
    }
    return { received: true };
  }
}
