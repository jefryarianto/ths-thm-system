import { Injectable, NotFoundException, Optional, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { generalNotificationEmail } from '../../mail/email-templates';
import { EventsGateway } from './events.gateway';
import { SendNotificationDto, BroadcastNotificationDto, SendToRoleDto, NotificationFilterDto } from './dto/notification.dto';
import { Role } from '@prisma/client';
import { CacheService } from '../../common/services/cache.service';

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
    // Check user notification preferences
    const tipe = dto.tipe || 'umum';
    const enabled = await this.isPreferenceEnabled(userId, tipe);
    if (!enabled) {
      return { success: true, data: null, message: 'Notifikasi ditunda (user mematikan notifikasi ini)' };
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

    // Send email notification if user has email (method handles errors internally)
    this.sendEmailNotification(userId, dto.judul, dto.isi, tipe);

    // Push FCM to device tokens
    await this.pushFCM(userId, dto.judul, dto.isi);

    // Emit real-time via WebSocket
    this.eventsGateway?.sendNotification(userId, notification);
    const count = await this.prisma.notifikasi.count({ where: { userId, isRead: false } });
    this.eventsGateway?.sendUnreadCount(userId, count);

    this.cache?.invalidatePrefix(this.CACHE_PREFIX + userId);
    return { success: true, data: notification, message: 'Notifikasi berhasil dikirim' };
  }

  async broadcast(dto: BroadcastNotificationDto) {
    const users = await this.prisma.user.findMany({ where: { isActive: true } });

    // Batch filter users by 'umum' preference (single query)
    const allowedIds = await this.batchCheckPreference(users.map((u) => u.id), 'umum');
    const allowedUsers = users.filter((u) => allowedIds.has(u.id));

    // Batch insert all notifications in a single query
    if (allowedUsers.length > 0) {
      await this.prisma.notifikasi.createMany({
        data: allowedUsers.map((user) => ({
          userId: user.id,
          judul: dto.judul,
          isi: dto.isi,
          tipe: 'umum',
        })),
      });
    }

    // Push FCM to filtered users
    await this.pushBroadcast(dto.judul, dto.isi, allowedUsers.map(u => u.id));

    // Emit real-time via WebSocket — parallelized with Promise.allSettled
    const countResults = await this.prisma.notifikasi.groupBy({
      by: ['userId'],
      where: { userId: { in: allowedUsers.map((u) => u.id) }, isRead: false },
      _count: true,
    });
    const countMap = new Map(countResults.map((r) => [r.userId, r._count]));

    await Promise.allSettled(
      allowedUsers.map((user) => {
        this.eventsGateway?.sendNotification(user.id, { judul: dto.judul, isi: dto.isi, tipe: 'umum' });
        this.eventsGateway?.sendUnreadCount(user.id, countMap.get(user.id) || 0);
      }),
    );

    return { success: true, data: { sentTo: allowedUsers.length, total: users.length }, message: `Notifikasi broadcast ke ${allowedUsers.length}/${users.length} user` };
  }

  async sendToRole(dto: SendToRoleDto) {
    const users = await this.prisma.user.findMany({
      where: { role: dto.role as Role, isActive: true },
    });

    const tipe = dto.tipe || 'umum';

    // Batch filter users by notification preference (single query)
    const allowedIds = await this.batchCheckPreference(users.map((u) => u.id), tipe);
    const allowedUsers = users.filter((u) => allowedIds.has(u.id));

    // Batch insert all notifications in a single query
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

    // Push FCM to filtered users
    await this.pushBroadcast(dto.judul, dto.isi, allowedUsers.map(u => u.id));

    // Emit real-time via WebSocket — parallelized with Promise.allSettled
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

    return { success: true, data: { sentTo: allowedUsers.length, total: users.length }, message: `Notifikasi ke role ${dto.role} berhasil (${allowedUsers.length}/${users.length} menerima)` };
  }

  async findAll(userId: string, query: NotificationFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const cacheKey = `${this.CACHE_PREFIX}${userId}:list:${page}:${limit}:${query.tipe || ''}:${query.search || ''}`;

    return this.cache?.getOrSet(cacheKey, async () => {
      const where: Record<string, unknown> = { userId };
      if (query.tipe) where.tipe = query.tipe;
      if (query.search) {
        where.OR = [
          { judul: { contains: query.search, mode: 'insensitive' } },
          { isi: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [data, total, unreadCount] = await Promise.all([
        this.prisma.notifikasi.findMany({
          where, skip: (page - 1) * limit, take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.notifikasi.count({ where }),
        this.prisma.notifikasi.count({ where: { userId, isRead: false } }),
      ]);

      return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), unreadCount } };
    }, 15) ?? this.findAllUncached(userId, query);
  }

  private async findAllUncached(userId: string, query: NotificationFilterDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Record<string, unknown> = { userId };
    if (query.tipe) where.tipe = query.tipe;
    if (query.search) {
      where.OR = [
        { judul: { contains: query.search, mode: 'insensitive' } },
        { isi: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notifikasi.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notifikasi.count({ where }),
      this.prisma.notifikasi.count({ where: { userId, isRead: false } }),
    ]);

    return { success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), unreadCount } };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notifikasi.count({
      where: { userId, isRead: false },
    });
    return { success: true, data: { count } };
  }

  async markAsRead(id: string, userId?: string) {
    const notif = await this.prisma.notifikasi.findUnique({ where: { id }, select: { userId: true } });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (userId && notif.userId !== userId) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    await this.prisma.notifikasi.update({ where: { id }, data: { isRead: true } });
    this.cache?.invalidatePrefix(this.CACHE_PREFIX + notif.userId);
    return { success: true, message: 'Notifikasi ditandai dibaca' };
  }

  async findOne(id: string, userId?: string) {
    const notif = await this.prisma.notifikasi.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (userId && notif.userId !== userId) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    return { success: true, data: notif };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notifikasi.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    this.cache?.invalidatePrefix(this.CACHE_PREFIX + userId);
    return { success: true, message: 'Semua notifikasi ditandai dibaca' };
  }

  async delete(id: string, userId?: string) {
    const notif = await this.prisma.notifikasi.findUnique({ where: { id }, select: { userId: true } });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    if (userId && notif.userId !== userId) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }
    await this.prisma.notifikasi.delete({ where: { id } });
    this.cache?.invalidatePrefix(this.CACHE_PREFIX + notif.userId);
    return { success: true, message: 'Notifikasi berhasil dihapus' };
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

    // Aggregate by type
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
      success: true,
      data: {
        total,
        unread,
        read: total - unread,
        byType: typeStats,
        types: NotificationsService.NOTIFICATION_TYPES,
      },
    };
  }

  // ─── Notification Preferences ───

  /**
   * Per-tipe notifikasi dengan channel inApp dan email.
   * Format value: { inApp: boolean, email: boolean }
   * Backward compatible: nilai boolean lama dianggap sama untuk kedua channel.
   */
  static readonly NOTIFICATION_TYPES = [
    { key: 'welcome', label: 'Selamat Datang', description: 'Notifikasi saat pertama kali mendaftar' },
    { key: 'data_incomplete', label: 'Data Tidak Lengkap', description: 'Pengingat untuk melengkapi data diri' },
    { key: 'reminder_latihan', label: 'Pengingat Latihan', description: 'Pengingat jadwal latihan rutin' },
    { key: 'reminder_pendadaran', label: 'Pengingat Pendadaran', description: 'Pengingat jadwal ujian pendadaran' },
    { key: 'reminder_iuran', label: 'Pengingat Iuran', description: 'Pengingat pembayaran iuran' },
    { key: 'status_klaim', label: 'Status Klaim', description: 'Update status pengajuan klaim dokumen' },
    { key: 'dokumen_ready', label: 'Dokumen Siap', description: 'Notifikasi dokumen telah selesai diproses' },
    { key: 'badge_earned', label: 'Badge Gamifikasi', description: 'Notifikasi saat mendapat badge baru' },
    { key: 'umum', label: 'Umum', description: 'Notifikasi umum dan pengumuman' },
  ];

  private prefKey(userId: string) {
    return `notif_pref:${userId}`;
  }

  /**
   * Normalize a preference value — supports both old (boolean) and new ({ inApp, email }) formats.
   */
  private normalizePref(value: unknown): { inApp: boolean; email: boolean } {
    if (typeof value === 'boolean') {
      return { inApp: value, email: value };
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return {
        inApp: obj.inApp !== false,
        email: obj.email !== false,
      };
    }
    return { inApp: true, email: true };
  }

  async getPreferences(userId: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key: this.prefKey(userId) } });
    const saved = (setting?.value as Record<string, unknown>) || {};

    const prefs: Record<string, { inApp: boolean; email: boolean }> = {};
    for (const t of NotificationsService.NOTIFICATION_TYPES) {
      prefs[t.key] = saved[t.key] !== undefined
        ? this.normalizePref(saved[t.key])
        : { inApp: true, email: true };
    }

    return { success: true, data: prefs, types: NotificationsService.NOTIFICATION_TYPES };
  }

  async updatePreferences(userId: string, data: Record<string, unknown>) {
    // Fetch existing preferences once — avoid N+1 queries inside the loop
    const existingSetting = await this.prisma.setting.findUnique({ where: { key: this.prefKey(userId) } });
    const existingData = (existingSetting?.value as Record<string, unknown>) || {};

    // Normalize incoming data to the new format
    const normalized: Record<string, { inApp: boolean; email: boolean }> = {};
    for (const t of NotificationsService.NOTIFICATION_TYPES) {
      if (data[t.key] !== undefined) {
        normalized[t.key] = this.normalizePref(data[t.key]);
      } else {
        // Keep existing value for types not sent in the request
        normalized[t.key] = existingData[t.key] !== undefined
          ? this.normalizePref(existingData[t.key])
          : { inApp: true, email: true };
      }
    }

    await this.prisma.setting.upsert({
      where: { key: this.prefKey(userId) },
      update: { value: normalized as never },
      create: { key: this.prefKey(userId), value: normalized as never },
    });
    return { success: true, message: 'Pengaturan notifikasi berhasil disimpan' };
  }

  /**
   * Check if a specific notification channel (inApp/email) is enabled for a type.
   */
  private async isChannelEnabled(userId: string, tipe: string, channel: 'inApp' | 'email'): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    const p = prefs.data as Record<string, { inApp: boolean; email: boolean }>;
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

    return { success: true, message: 'Device token berhasil didaftarkan' };
  }

  async unregisterDeviceToken(tokenId: string) {
    await this.prisma.deviceToken.update({
      where: { id: tokenId },
      data: { isActive: false },
    });
    return { success: true, message: 'Device token berhasil dihapus' };
  }

  private async sendEmailNotification(userId: string, judul: string, isi: string, tipe?: string): Promise<void> {
    try {
      // Check email preference for this notification type
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

      const tpl = generalNotificationEmail(user.namaLengkap, judul, isi);
      await this.mailService.sendMail({
        to: user.email,
        ...tpl,
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
            privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FCM_CLIENT_EMAIL,
          }),
        });
      }

      const BATCH_SIZE = 500;
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE);
        const message = {
          tokens: batch.map(t => t.token),
          notification: { title, body },
          data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`FCM batch ${Math.floor(i / BATCH_SIZE) + 1}: ${response.successCount} success, ${response.failureCount} failures`);

        if (response.failureCount > 0) {
          response.responses.forEach((resp: { success: boolean; error?: { code?: string } }, idx: number) => {
            if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
              this.prisma.deviceToken.updateMany({
                where: { token: batch[idx].token },
                data: { isActive: false },
              }).catch(() => {});
            }
          });
        }
      }
    } catch (error) {
      console.warn('FCM push failed (firebase-admin not configured):', (error as Error).message);
    }
  }
}
