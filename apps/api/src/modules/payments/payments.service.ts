import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSnapTokenDto } from './dto/create-snap-token.dto';
import { UserScope } from '../../common/interfaces/user-scope.interface';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { GamificationService } from '../gamification/gamification.service';
import { paymentConfirmationEmail } from '../../mail/email-templates';
import { MemberMailService } from '../../common/services/member-mail.service';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const midtransClient = require('midtrans-client');

interface MidtransTransactionDetails {
  order_id: string;
  gross_amount: number;
}

interface MidtransCustomerDetails {
  first_name: string;
  email?: string;
  phone?: string;
}

interface MidtransNotification {
  transaction_status: string;
  order_id: string;
  payment_type?: string;
  transaction_id?: string;
  fraud_status?: string;
}

@Injectable()
export class PaymentsService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private snap: any;
  private readonly midtransEnabled: boolean;
  private readonly logger = new Logger(PaymentsService.name);
  private readonly CACHE_PREFIX = 'payments:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeHelper: ScopeHelper,
    private readonly cache: CacheService,
    private readonly memberMailService: MemberMailService,
    @Inject(forwardRef(() => GamificationService))
    private readonly gamificationService: GamificationService,
  ) {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    const clientKey = process.env.MIDTRANS_CLIENT_KEY;
    this.midtransEnabled = !!(serverKey && clientKey);
    if (this.midtransEnabled) {
      this.snap = new midtransClient.Snap({
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        serverKey: serverKey,
        clientKey: clientKey,
      });
    }
  }

  async createSnapToken(dto: CreateSnapTokenDto, scope?: UserScope) {
    if (!this.midtransEnabled) {
      throw new BadRequestException(
        'Midtrans tidak dikonfigurasi — pembayaran online belum tersedia',
      );
    }

    const iuran = await this.prisma.iuran.findUnique({
      where: { id: dto.iuranId },
      include: { anggota: { select: { id: true, namaLengkap: true, email: true, noHp: true, rantingId: true } } },
    });

    if (!iuran) throw new NotFoundException('Iuran tidak ditemukan');

    if (scope && iuran.anggota?.rantingId) {
      if (
        !(await this.scopeHelper.hasAccessToResourceAsync(
          this.prisma,
          scope,
          iuran.anggota.rantingId,
        ))
      ) {
        throw new ForbiddenException('Akses ditolak: diluar cakupan wilayah Anda');
      }
    }

    if (iuran.status === 'lunas') {
      throw new BadRequestException('Iuran ini sudah lunas');
    }

    const orderId = `DUES-${iuran.id.substring(0, 8)}-${Date.now()}`;
    const amount = Math.round(Number(iuran.jumlah));

    const transactionDetails: MidtransTransactionDetails = {
      order_id: orderId,
      gross_amount: amount,
    };

    const customerDetails: MidtransCustomerDetails = {
      first_name: iuran.anggota?.namaLengkap || 'Anggota',
      email: iuran.anggota?.email || undefined,
      phone: iuran.anggota?.noHp || undefined,
    };

    const parameter = {
      transaction_details: transactionDetails,
      customer_details: customerDetails,
      item_details: [
        {
          id: iuran.id,
          price: amount,
          quantity: 1,
          name: `Iuran THS-THM - ${iuran.periode}`,
        },
      ],
      callbacks: {
        finish: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payments/finish`,
      },
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);

      await this.prisma.paymentTransaction.create({
        data: {
          iuranId: iuran.id,
          orderId: orderId,
          amount: amount,
          status: 'pending',
          rawResponse: JSON.parse(JSON.stringify(transaction)),
        },
      });

      await this.prisma.iuran.update({
        where: { id: iuran.id },
        data: {
          status: 'menunggu_verifikasi',
          metodeBayar: 'online',
        },
      });

      this.cache.invalidatePrefix('dues:');
      this.cache.invalidatePrefix('reports:');

      return {
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        orderId: orderId,
      };
    } catch (error) {
      this.logger.error('Failed to create Snap transaction:', error);
      throw new BadRequestException(
        'Gagal membuat transaksi pembayaran. Silakan coba lagi.',
      );
    }
  }

  async handleNotification(payload: MidtransNotification) {
    if (!this.midtransEnabled) {
      throw new BadRequestException('Midtrans tidak dikonfigurasi');
    }

    const { transaction_status, order_id, payment_type, transaction_id, fraud_status } = payload;

    const paymentTx = await this.prisma.paymentTransaction.findUnique({
      where: { orderId: order_id },
      include: { iuran: { include: { anggota: true } } },
    });

    if (!paymentTx) {
      this.logger.warn(`Payment transaction not found for order ${order_id}`);
      return { received: true };
    }

    let newStatus: string;
    let iuranStatus: string;

    if (transaction_status === 'capture' && fraud_status === 'accept') {
      newStatus = 'settlement';
      iuranStatus = 'lunas';
    } else if (transaction_status === 'settlement') {
      newStatus = 'settlement';
      iuranStatus = 'lunas';
    } else if (transaction_status === 'pending') {
      newStatus = 'pending';
      iuranStatus = 'menunggu_verifikasi';
    } else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      newStatus = transaction_status;
      iuranStatus = 'belum_dibayar';
    } else {
      newStatus = transaction_status;
      iuranStatus = 'menunggu_verifikasi';
    }

    await this.prisma.paymentTransaction.update({
      where: { id: paymentTx.id },
      data: {
        status: newStatus,
        paymentType: payment_type || null,
        transactionId: transaction_id || null,
        rawResponse: JSON.parse(JSON.stringify(payload)),
      },
    });

    await this.prisma.iuran.update({
      where: { id: paymentTx.iuranId },
      data: {
        status: iuranStatus as 'belum_dibayar' | 'menunggu_verifikasi' | 'lunas',
        tanggalBayar: iuranStatus === 'lunas' ? new Date() : undefined,
        metodeBayar: 'online',
      },
    });

    if (iuranStatus === 'lunas') {
      try {
        await this.gamificationService.recordDuesPayment(paymentTx.iuran.anggotaId, true);
        this.memberMailService.sendToMemberWithArgs(
          paymentTx.iuran.anggotaId,
          paymentConfirmationEmail,
          [Number(paymentTx.iuran.jumlah), paymentTx.iuran.periode, true],
          { template: 'paymentConfirmationEmail' },
          'dues',
        );
      } catch (error) {
        this.logger.warn('Failed to award gamification or send email:', error);
      }
    }

    this.cache.invalidatePrefix('dues:');
    this.cache.invalidatePrefix('reports:');

    this.logger.log(
      `Payment ${order_id}: ${transaction_status} → iuran ${paymentTx.iuranId} → ${iuranStatus}`,
    );

    return { received: true };
  }

  async getPaymentStatus(orderId: string) {
    const paymentTx = await this.prisma.paymentTransaction.findUnique({
      where: { orderId },
      include: { iuran: true },
    });

    if (!paymentTx) throw new NotFoundException('Transaksi tidak ditemukan');

    return {
      orderId: paymentTx.orderId,
      status: paymentTx.status,
      iuranStatus: paymentTx.iuran.status,
      amount: Number(paymentTx.amount),
      paymentType: paymentTx.paymentType,
      transactionId: paymentTx.transactionId,
    };
  }
}