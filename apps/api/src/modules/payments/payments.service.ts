import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';

@Injectable()
export class PaymentsService {
  private stripe: any;
  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' } as any);
  }

  async createIntent(dto: CreatePaymentIntentDto) {
    const iuran = await this.prisma.iuran.findUnique({ where: { id: dto.iuranId } });
    if (!iuran) throw new NotFoundException('Iuran not found');
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: dto.amount,
      currency: dto.currency,
      metadata: { iuranId: dto.iuranId },
    });
    // Store stripeIntentId for later verification
    await this.prisma.iuran.update({
      where: { id: dto.iuranId },
      data: { pembayaranIntentId: paymentIntent.id } as any,
    });
    return { clientSecret: paymentIntent.client_secret };
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    let event: any;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
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
