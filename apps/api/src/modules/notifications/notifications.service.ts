import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from './events.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly eventsGateway?: EventsGateway,
  ) {}

  async send(userId: string, dto: any) {
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
        tipe,
        data: dto.data || null,
      },
    });

    // Push FCM to device tokens
    await this.pushFCM(userId, dto.judul, dto.isi);

    // Emit real-time via WebSocket
    this.eventsGateway?.sendNotification(userId, notification);
    const count = await this.prisma.notifikasi.count({ where: { userId, isRead: false } });
    this.eventsGateway?.sendUnreadCount(userId, count);

    return { success: true, data: notification, message: 'Notifikasi berhasil dikirim' };
  }

  async broadcast(dto: any) {
    const users = await this.prisma.user.findMany({ where: { isActive: true } });

    // Batch filter users by 'umum' preference (single query)
    const allowedIds = await this.batchCheckPreference(users.map((u) => u.id), 'umum');
    const allowedUsers = users.filter((u) => allowedIds.has(u.id));

    const notifications = [];
    for (const user of allowedUsers) {
      const notification = await this.prisma.notifikasi.create({
        data: {
          userId: user.id,
          judul: dto.judul,
          isi: dto.isi,
          tipe: 'umum',
        },
      });
      notifications.push(notification);
    }

    // Push FCM to filtered users
    await this.pushBroadcast(dto.judul, dto.isi, allowedUsers.map(u => u.id));

    // Emit real-time via WebSocket to each allowed user
    // Batch-fetch unread counts to avoid N+1 queries
    const countResults = await this.prisma.notifikasi.groupBy({
      by: ['userId'],
      where: { userId: { in: allowedUsers.map((u) => u.id) }, isRead: false },
      _count: true,
    });
    const countMap = new Map(countResults.map((r) => [r.userId, r._count]));
    for (const user of allowedUsers) {
      const notif = notifications.find((n) => n.userId === user.id);
      if (notif) {
        this.eventsGateway?.sendNotification(user.id, notif);
        this.eventsGateway?.sendUnreadCount(user.id, countMap.get(user.id) || 0);
      }
    }

    return { success: true, data: { sentTo: allowedUsers.length, total: users.length }, message: `Notifikasi broadcast ke ${allowedUsers.length}/${users.length} user` };
  }

  async sendToRole(dto: any) {
    const users = await this.prisma.user.findMany({
      where: { role: dto.role, isActive: true },
    });

    const tipe = dto.tipe || 'umum';

    // Batch filter users by notification preference (single query)
    const allowedIds = await this.batchCheckPreference(users.map((u) => u.id), tipe);
    const allowedUsers = users.filter((u) => allowedIds.has(u.id));

    for (const user of allowedUsers) {
      await this.prisma.notifikasi.create({
        data: {
          userId: user.id,
          judul: dto.judul,
          isi: dto.isi,
          tipe,
        },
      });
    }

    // Push FCM to filtered users
    await this.pushBroadcast(dto.judul, dto.isi, allowedUsers.map(u => u.id));

    // Emit real-time via WebSocket to each allowed user
    // Batch-fetch unread counts to avoid N+1 queries
    const countResults = await this.prisma.notifikasi.groupBy({
      by: ['userId'],
      where: { userId: { in: allowedUsers.map((u) => u.id) }, isRead: false },
      _count: true,
    });
    const countMap = new Map(countResults.map((r) => [r.userId, r._count]));
    for (const user of allowedUsers) {
      this.eventsGateway?.sendNotification(user.id, { judul: dto.judul, isi: dto.isi, tipe });
      this.eventsGateway?.sendUnreadCount(user.id, countMap.get(user.id) || 0);
    }

    return { success: true, data: { sentTo: allowedUsers.length, total: users.length }, message: `Notifikasi ke role ${dto.role} berhasil (${allowedUsers.length}/${users.length} menerima)` };
  }

  async findAll(userId: string, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const where: any = { userId };
    if (query.tipe) where.tipe = query.tipe;

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

  async markAsRead(id: string) {
    await this.prisma.notifikasi.update({ where: { id }, data: { isRead: true } });
    return { success: true, message: 'Notifikasi ditandai dibaca' };
  }

  async findOne(id: string) {
    const notif = await this.prisma.notifikasi.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notifikasi tidak ditemukan');
    return { success: true, data: notif };
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notifikasi.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, message: 'Semua notifikasi ditandai dibaca' };
  }

  async delete(id: string) {
    await this.prisma.notifikasi.delete({ where: { id } });
    return { success: true, message: 'Notifikasi berhasil dihapus' };
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
    { key: 'umum', label: 'Umum', description: 'Notifikasi umum dan pengumuman' },
  ];

  private prefKey(userId: string) {
    return `notif_pref:${userId}`;
  }

  async getPreferences(userId: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key: this.prefKey(userId) } });
    const saved = (setting?.value as Record<string, boolean>) || {};

    const prefs: Record<string, boolean> = {};
    for (const t of NotificationsService.NOTIFICATION_TYPES) {
      prefs[t.key] = saved[t.key] !== undefined ? saved[t.key] : true;
    }

    return { success: true, data: prefs, types: NotificationsService.NOTIFICATION_TYPES };
  }

  async updatePreferences(userId: string, prefs: Record<string, boolean>) {
    await this.prisma.setting.upsert({
      where: { key: this.prefKey(userId) },
      update: { value: prefs },
      create: { key: this.prefKey(userId), value: prefs },
    });
    return { success: true, message: 'Pengaturan notifikasi berhasil disimpan' };
  }

  private async isPreferenceEnabled(userId: string, tipe: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    const p = prefs.data as Record<string, boolean>;
    return p[tipe] !== false;
  }

  /** Batch-load preferences for multiple users — single query instead of N+1 */
  private async batchCheckPreference(userIds: string[], tipe: string): Promise<Set<string>> {
    const keys = userIds.map((id) => this.prefKey(id));
    const settings = await this.prisma.setting.findMany({ where: { key: { in: keys } } });
    const prefMap = new Map<string, Record<string, boolean>>();
    for (const s of settings) {
      // Extract userId from key "notif_pref:<userId>"
      const userId = s.key.replace('notif_pref:', '');
      prefMap.set(userId, s.value as Record<string, boolean>);
    }

    const allowed = new Set<string>();
    for (const id of userIds) {
      const saved = prefMap.get(id);
      // If no preference saved, default to true (enabled)
      if (!saved || saved[tipe] !== false) {
        allowed.add(id);
      }
    }
    return allowed;
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

      let admin: any;
      try {
        admin = require('firebase-admin');
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FCM_PROJECT_ID,
              privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
              clientEmail: process.env.FCM_CLIENT_EMAIL,
            }),
          });
        }
      } catch {
        console.warn('firebase-admin not available, using mock FCM');
        console.log(`[FCM Mock] Push to ${tokens.length} devices: ${title}`);
        return;
      }

      // Send in batches of 500 (FCM multicast limit)
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

        // Cleanup invalid tokens
        if (response.failureCount > 0) {
          response.responses.forEach((resp: any, idx: number) => {
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
      console.error('FCM push failed:', error);
    }
  }
}