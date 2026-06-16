import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find or create a chat room by ID.
   * Public/general rooms are auto-created; private rooms must already exist.
   */
  async findOrCreateRoom(roomId: string, name?: string, type = 'direct') {
    let room = await this.prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      room = await this.prisma.chatRoom.create({
        data: { id: roomId, name: name || roomId, type, isGroup: type === 'group' },
      });
    }
    return room;
  }

  /**
   * Save a chat message to the database.
   */
  async saveMessage(data: { roomId: string; senderId: string; content: string; type?: string }) {
    // Ensure room exists
    await this.findOrCreateRoom(data.roomId);

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: data.roomId,
        senderId: data.senderId,
        content: data.content,
        type: data.type || 'text',
      },
      include: {
        sender: {
          select: { id: true, namaLengkap: true, nomorAnggota: true, fotoPath: true },
        },
      },
    });
    return message;
  }

  /**
   * Get messages for a room, paginated.
   */
  async getMessages(roomId: string, limit = 50, before?: string) {
    const where: any = { roomId };
    if (before) {
      where.createdAt = { lt: new Date(before) };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: { id: true, namaLengkap: true, nomorAnggota: true, fotoPath: true },
        },
      },
    });

    return messages.reverse();
  }

  /**
   * Get all available rooms for a user (general + role-based + private).
   */
  async getUserRooms(user: { id: string; role: string }) {
    const generalRooms = await this.prisma.chatRoom.findMany({
      where: { type: { in: ['public', 'group'] } },
      include: {
        _count: { select: { members: true, messages: true } },
      },
    });

    return {
      success: true,
      data: [
        ...generalRooms.map((r) => ({
          id: r.id,
          name: r.name || r.id,
          type: r.type,
          memberCount: r._count.members,
          messageCount: r._count.messages,
        })),
        { id: `role:${user.role}`, name: `${user.role} Room`, type: 'role' },
        { id: `user:${user.id}`, name: 'My Chat', type: 'private' },
      ],
    };
  }

  /**
   * Mark messages as read for a user in a room.
   */
  async markAsRead(roomId: string, anggotaId: string) {
    await this.prisma.chatMember.upsert({
      where: { roomId_anggotaId: { roomId, anggotaId } },
      update: { lastReadAt: new Date() },
      create: { roomId, anggotaId },
    });
    return { success: true };
  }
}
