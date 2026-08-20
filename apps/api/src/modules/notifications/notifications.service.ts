import { Injectable, NotFoundException, Optional, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/services/cache.service';
import { MailService } from '../../mail/mail.service';
import { generalNotificationEmail, escapeHtml } from '../../mail/email-templates';
import { EventsGateway } from './events.gateway';
import {
  SendNotificationDto,
  BroadcastNotificationDto,
  SendToRoleDto,
  NotificationFilterDto,
} from './dto/notification.dto';
import { Role } from '@prisma/client';
import { paginate } from '../../common/utils/pagination';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly CACHE_PREFIX = 'notifications:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Optional() private readonly eventsGateway?: EventsGateway,
    private readonly cache?: CacheService,
  ) {}

  async send(userId: string, dto: SendNotificationDto) {
    const tipe = dto.tipe || 'umum';
    const enabled = await this.isPreferenceEnabled(userId, tipe);
    if (!enabled) {
      return null;
    }

    const notification = await this.prisma.notifikasi.create({
      data: {
        userId,
        judul: dto.judul,
        isi: dto.isi,
        tipe: tipe as never,
        data: (dto.data || undefined) as never,
      },
    });

    this.sendEmailNotification(userId, dto.judul, dto.isi, tipe);
    await this.pushFCM(userId, dto.judul, dto.isi);
    this.eventsGateway?.sendNotification(userId, notification);
    const count = await this.prisma.notifikasi.count({ where: { userId, isRead: false } });
    this.eventsGateway?.sendUnreadCount(userId, count);
    this.cache?.invalidatePrefix(this.CACHE_PREFIX + userId);

    return notification;
  }

  async broadcast(dto: BroadcastNotificationDto) {
    const users = await this.prisma.user.findMany({ where: { isActive: true } });
    const allowedIds = await this.batchCheckPreference(users.map((u) => u.id), 'umum');
    const allowedUsers = users.filter((u) => allowedIds.has(u.id));

    if (allowedUsers.length > 0) {
      await this.prisma.notifikasi.createMany({
        data: allowedUsers.map((user) => ({
          userId: user.id,
          judul: dto.judul,
          isi: dto.isi,
          tipe: 'umum' as never,
        })),
      });
    }

    await this.pushBroadcast(
      dto.judul,
      dto.isi,
      allowedUsers.map((u) => u.id),
    );

    const countResults = await this.prisma.notifikasi.groupBy({
      by: ['userId'],
      where: { userId: { in: allowedUsers.map((u) => u.id) }, isRead: false },
      _count: true,
    });
    const countMap = new Map(countResults.map((r) => [r.userId, r._count]));

    await Promise.allSettled(
      allowedUsers.map((user) => {
        this.eventsGateway?.sendNotification(user.id, {
          judul: dto.judul,
          isi: dto.isi,
          tipe: 'umum' as never,
        });
        this.eventsGateway?.sendUnreadCount(user.id, countMap.get(user.id) || 0);
      }),
    );

    return { sentTo: allowedUsers.length, total: users.length };
  }

  async sendToRole(dto: SendToRoleDto) {
    const users = await this.prisma.user.findMany({
      where: { role: dto.role as Role, isActive: true },
    });

    const tipe = dto.tipe || 'umum';
    const allowedIds = await this.batchCheckPreference(users.map((u) => u.id), tipe);
    const allowedUsers = users.filter((u) => allowedIds.has(u.id));

    if (allowedUsers.length > 0) {
      await this.prisma.notifikasi.createMany({
        data: allowedUsers.map((user) => ({
          userId: user.id,
          judul: dto.judul,
          isi: dto.isi,
          tipe: tipe as never,
        })),
      });
    }

    await this.pushBroadcast(
      dto.judul,
      dto.isi,
      allowedUsers.map((u) => u.id),
    );

    const countResults = await this.prisma.notifikasi.groupBy({
      by: ['userId'],
      where: { userId: { in: allowedUsers.map((u) => u.id) }, isRead: false },
      _count: true,
    });
    const countMap = new Map(countResults.map((r) => [r.userId, r._count]));

    await Promise.allSettled(
      allowedUsers.map((user) => {
        this.eventsGateway?.sendNotification(user.id, { judul: dto.judul, isi: dto.isi, tipe });
        this.eventsGateway?.sendUnreadCount(user.id, countMap.get(user.id) || 0);
      }),
    );

    return { sentTo: allowedUsers.length, total: users.length };
  }

  async findAll(userId: string, query: NotificationFilterDto) {
    const cacheKey = `${this.CACHE_PREFIX}${userId}:list:${query.page || 1}:${query.limit || 20}:${query.tipe || ''}:${query.search || ''}`;

    return (
      this.cache?.getOrSet(
        cacheKey,
        async () => {
          const where: Record<string, unknown> = { userId };
          if (query.tipe) where.tipe = query.tipe;
          if (query.search) {
            where.OR = [
              { judul: { contains: query.search, mode: 'insensitive' } },
              { isi: { contains: query.search, mode: 'insensitive' } },
            ];
          }

          const result = await paginate(this.prisma.notifikasi, where, {
            page: query.page,
            limit: query.limit || 20,
            orderBy: { createdAt: 'desc' },
          });

          const unreadCount = await this.prisma.notifikasi.count({
            where: { userId, isRead: false },
          });

          return { ...result, meta: { ...result.meta, unreadCount } };
        },
        15,
      ) ?? this.findAllUncached(userId, query)
    );
  }

  private async findAllUncached(userId: string, query: NotificationFilterDto) {
    const where: Record<string, unknown> = { userId };
    if (query.tipe) where.tipe = query.tipe;
    if (query.search) {
      where.OR = [
        { judul: { contains: query.search, mode: 'insensitive' } },
        { isi: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const result = await paginate(this.prisma.notifikasi, where, {
      page: query.page,
      limit: query.limit || 20,
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await this.prisma.notifikasi.count({ where: { userId, isRead: false } });
    return { ...result, meta: { ...result.meta, unreadCount } };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notifikasi.count({ where: { userId, isRead: false } });
    return { count };
  }

  async markAsRead(id: string, userId?: string) {
    const notif = await this.prisma.notifikasi.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (userId && notif.userId !== userId) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    await this.prisma.notifikasi.update({ where: { id }, data: { isRead: true } });
    this.cache?.invalidatePrefix(this.CACHE_PREFIX + notif.userId);
  }

  async findOne(id: string, userId?: string) {
    const notif = await this.prisma.notifikasi.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (userId && notif.userId !== userId) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    return notif;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notifikasi.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    this.cache?.invalidatePrefix(this.CACHE_PREFIX + userId);
  }

  async delete(id: string, userId?: string) {
    const notif = await this.prisma.notifikasi.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (userId && notif.userId !== userId) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    await this.prisma.notifikasi.delete({ where: { id } });
    this.cache?.invalidatePrefix(this.CACHE_PREFIX + notif.userId);
  }

  // ─── Stats ───

  async getStats(userId: string) {
    const [total, unread, byType] = await Promise.all([
      this.prisma.notifikasi.count({ where: { userId } }),
      this.prisma.notifikasi.count({ where: { userId, isRead: false } }),
      this.prisma.notifikasi.groupBy({
        by: ['tipe', 'isRead'],
        where: { userId },
        _count: true,
      }),
    ]);

    const typeStats: Record<string, { total: number; unread: number }> = {};
    for (const t of NotificationsService.NOTIFICATION_TYPES) {
      typeStats[t.key] = { total: 0, unread: 0 };
    }

    for (const row of byType) {
      const key = row.tipe as string;
      if (!typeStats[key]) typeStats[key] = { total: 0, unread: 0 };
      typeStats[key].total += row._count;
      if (!row.isRead) {
        typeStats[key].unread += row._count;
      }
    }

    return {
      total,
      unread,
      read: total - unread,
      byType: typeStats,
      types: NotificationsService.NOTIFICATION_TYPES,
    };
  }

  // ─── Notification Preferences ───

  static readonly NOTIFICATION_TYPES = [
    { key: 'welcome', label: 'Selamat Datang', description: 'Notifikasi saat pertama kali mendaftar' },
    { key: 'data_incomplete', label: 'Data Tidak Lengkap', description: 'Pengingat untuk melengkapi data diri' },
    { key: 'reminder_latihan', label: 'Pengingat Latihan', description: 'Pengingat jadwal latihan rutin' },
    { key: 'reminder_pendadaran', label: 'Pengingat Pendadaran', description: 'Pengingat jadwal ujian pendadaran' },
    { key: 'reminder_iuran', label: 'Pengingat Iuran', description: 'Pengingat pembayaran iuran' },
    { key: 'status_klaim', label: 'Status Klaim', description: 'Update status pengajuan klaim dokumen' },
    { key: 'dokumen_ready', label: 'Dokumen Siap', description: 'Notifikasi dokumen telah selesai diproses' },
    { key: 'badge_earned', label: 'Badge Gamifikasi', description: 'Notifikasi saat mendapat badge baru' },
    { key: 'approval_request', label: 'Persetujuan', description: 'Notifikasi saat ada pengajuan baru yang perlu disetujui' },
    { key: 'forum_reply', label: 'Balasan Forum', description: 'Notifikasi saat ada balasan baru di thread forum' },
    { key: 'forum_solution', label: 'Solusi Forum', description: 'Notifikasi saat balasan ditandai sebagai solusi' },
    { key: 'umum', label: 'Umum', description: 'Notifikasi umum dan pengumuman' },
  ];

  private prefKey(userId: string) {
    return `notif_pref:${userId}`;
  }

  private normalizePref(value: unknown): { inApp: boolean; email: boolean } {
    if (typeof value === 'boolean') {
      return { inApp: value, email: value };
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return { inApp: obj.inApp !== false, email: obj.email !== false };
    }
    return { inApp: true, email: true };
  }

  async getPreferences(userId: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key: this.prefKey(userId) } });
    const saved = (setting?.value as Record<string, unknown>) || {};

    const prefs: Record<string, { inApp: boolean; email: boolean }> = {};
    for (const t of NotificationsService.NOTIFICATION_TYPES) {
      prefs[t.key] =
        saved[t.key] !== undefined
          ? this.normalizePref(saved[t.key])
          : { inApp: true, email: true };
    }

    return { prefs, types: NotificationsService.NOTIFICATION_TYPES };
  }

  async updatePreferences(userId: string, data: Record<string, unknown>) {
    const existingSetting = await this.prisma.setting.findUnique({
      where: { key: this.prefKey(userId) },
    });
    const existingData = (existingSetting?.value as Record<string, unknown>) || {};

    const normalized: Record<string, { inApp: boolean; email: boolean }> = {};
    for (const t of NotificationsService.NOTIFICATION_TYPES) {
      if (data[t.key] !== undefined) {
        normalized[t.key] = this.normalizePref(data[t.key]);
      } else {
        normalized[t.key] =
          existingData[t.key] !== undefined
            ? this.normalizePref(existingData[t.key])
            : { inApp: true, email: true };
      }
    }

    await this.prisma.setting.upsert({
      where: { key: this.prefKey(userId) },
      update: { value: normalized as never },
      create: { key: this.prefKey(userId), value: normalized as never },
    });
  }

  private async isChannelEnabled(userId: string, tipe: string, channel: 'inApp' | 'email'): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    const p = prefs.prefs as Record<string, { inApp: boolean; email: boolean }>;
    const pref = p[tipe];
    return pref?.[channel] !== false;
  }

  private async isPreferenceEnabled(userId: string, tipe: string): Promise<boolean> {
    return this.isChannelEnabled(userId, tipe, 'inApp');
  }

  private async isEmailPreferenceEnabled(userId: string, tipe: string): Promise<boolean> {
    return this.isChannelEnabled(userId, tipe, 'email');
  }

  private async batchCheckPreference(userIds: string[], tipe: string): Promise<Set<string>> {
    const keys = userIds.map((id) => this.prefKey(id));
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const prefMap = new Map<string, Record<string, { inApp: boolean; email: boolean }>>();
    for (const s of settings) {
      const userId = s.key.replace('notif_pref:', '');
      prefMap.set(userId, this.normalizeSavedPrefs(s.value as Record<string, unknown>));
    }

    const allowed = new Set<string>();
    for (const id of userIds) {
      const saved = prefMap.get(id);
      if (!saved || saved[tipe]?.inApp !== false) {
        allowed.add(id);
      }
    }
    return allowed;
  }

  private normalizeSavedPrefs(saved: Record<string, unknown>): Record<string, { inApp: boolean; email: boolean }> {
    const result: Record<string, { inApp: boolean; email: boolean }> = {};
    for (const key of Object.keys(saved)) {
      result[key] = this.normalizePref(saved[key]);
    }
    return result;
  }

  async sendIncompleteNotifications(memberIds?: string[]) {
    const where: Record<string, unknown> = { statusData: 'incomplete', email: { not: null } };
    if (memberIds && memberIds.length > 0) {
      where.id = { in: memberIds };
    }

    const members = await this.prisma.anggota.findMany({
      where: where as any,
      select: { id: true, namaLengkap: true, email: true, missingFields: true },
    });

    const noEmail = members.filter((m) => !m.email).length;
    const membersWithEmail = members.filter((m): m is typeof m & { email: string } => !!m.email);

    const results = await Promise.allSettled(
      membersWithEmail.map(async (member) => {
        const missingFields = (member.missingFields as string[]) || ['data diri'];
        const tpl = {
          subject: 'Data Anggota Belum Lengkap — THS-THM',
          html: `<h2>Halo ${escapeHtml(member.namaLengkap)},</h2><p>Data keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut:</p><ul>${missingFields.map((f: string) => `<li>${escapeHtml(f.replace(/_/g, ' '))}</li>`).join('')}</ul><p>Silakan login ke sistem untuk melengkapi data.</p>`,
          text: `Halo ${member.namaLengkap},\n\nData keanggotaan Anda masih belum lengkap. Harap lengkapi data berikut: ${missingFields.join(', ')}\n\nSilakan login ke sistem untuk melengkapi data.`,
        };
        await this.mailService.sendMail({
          to: member.email,
          ...tpl,
          metadata: { module: 'notifications', template: 'dataIncompleteEmail', memberId: member.id },
        });
      }),
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      this.logger.warn(`sendIncompleteNotifications: ${failed}/${membersWithEmail.length} emails failed`);
    }

    return { sent, noEmail, failed, total: members.length };
  }

  async registerDeviceToken(userId: string, token: string, platform: string) {
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, isActive: true },
      create: { userId, token, platform },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken: token },
    });

  }

  async unregisterDeviceToken(tokenId: string) {
    await this.prisma.deviceToken.update({
      where: { id: tokenId },
      data: { isActive: false },
    });
  }


  /**
   * One-time cleanup: delete stale data_incomplete notifications.
   * notifikasi.userId stores anggota.id (not User.id) for data_incomplete type.
   */
  async cleanupStaleIncompleteNotifications() {
    const staleNotifs = await this.prisma.notifikasi.findMany({
      where: { tipe: 'data_incomplete' },
      select: { id: true, userId: true },
    });

    if (staleNotifs.length === 0) return { deleted: 0, kept: 0 };

    // notifikasi.userId = anggota.id for data_incomplete notifications
    const anggotaIds = [...new Set(staleNotifs.map((n) => n.userId))];

    const members = await this.prisma.anggota.findMany({
      where: { id: { in: anggotaIds } },
      select: { id: true, namaLengkap: true, tempatLahir: true, tanggalLahir: true, alamat: true, noHp: true, email: true },
    });

    const completeAnggotaIds = new Set<string>();
    for (const m of members) {
      if (m.namaLengkap && m.tempatLahir && m.tanggalLahir && m.alamat && m.noHp && m.email) {
        completeAnggotaIds.add(m.id);
      }
    }

    const toDelete = staleNotifs.filter((n) => completeAnggotaIds.has(n.userId));
    const toKeep = staleNotifs.filter((n) => !completeAnggotaIds.has(n.userId));

    if (toDelete.length > 0) {
      await this.prisma.notifikasi.deleteMany({
        where: { id: { in: toDelete.map((n) => n.id) } },
      });
    }

    for (const aid of completeAnggotaIds) {
      this.cache?.invalidatePrefix(this.CACHE_PREFIX + aid);
    }

    this.logger.log(`cleanupStaleIncompleteNotifications: deleted ${toDelete.length}, kept ${toKeep.length}`);
    return { deleted: toDelete.length, kept: toKeep.length };
  }


  private async sendEmailNotification(userId: string, judul: string, isi: string, tipe?: string): Promise<void> {
    try {
      if (tipe) {
        const emailEnabled = await this.isEmailPreferenceEnabled(userId, tipe);
        if (!emailEnabled) {
          this.logger.log(`Email not sent for user ${userId}: ${tipe} email channel disabled`);
          return;
        }
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, namaLengkap: true },
      });

      if (!user?.email) return;

      const tpl = await this.mailService.renderWithOverride(
        'generalNotificationEmail',
        () => generalNotificationEmail(user.namaLengkap, judul, isi),
        { nama: user.namaLengkap, judul, isi },
      );
      await this.mailService.sendMail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        metadata: { module: 'notifications', template: 'generalNotificationEmail', userId, notifType: tipe },
      });
    } catch (error) {
      this.logger.error(`sendEmailNotification failed for user ${userId}: ${(error as Error).message}`);
    }
  }

  private async pushFCM(userId: string, title: string, body: string) {
    await this.pushBroadcast(title, body, [userId]);
  }

  private async pushBroadcast(title: string, body: string, userIds: string[]) {
    try {
      if (userIds.length === 0) return;

      const tokens = await this.prisma.deviceToken.findMany({
        where: { userId: { in: userIds }, isActive: true },
      });

      if (tokens.length === 0) return;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FCM_PROJECT_ID,
            privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\\\n/g, '\n'),
            clientEmail: process.env.FCM_CLIENT_EMAIL,
          }),
        });
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const message = {
          tokens: batch.map((t) => t.token),
          notification: { title, body },
          data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        this.logger.log(
          `FCM batch ${Math.floor(i / BATCH_SIZE) + 1}: ${response.successCount} success, ${response.failureCount} failures`,
        );

        if (response.failureCount > 0) {
          response.responses.forEach(
            (resp: { success: boolean; error?: { code?: string } }, idx: number) => {
              if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
                this.prisma.deviceToken
                  .updateMany({ where: { token: batch[idx].token }, data: { isActive: false } })
                  .catch(() => {});
              }
            },
          );
        }
      }
    } catch (error) {
      this.logger.warn('FCM push failed (firebase-admin not configured):', (error as Error).message);
    }
  }
}
