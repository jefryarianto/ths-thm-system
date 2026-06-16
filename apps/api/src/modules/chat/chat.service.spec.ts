import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ChatService', () => {
  let service: ChatService;

  const mockPrisma = {
    chatRoom: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    chatMember: {
      upsert: jest.fn(),
    },
  };

  const mockRoom = { id: 'room-1', name: 'General', type: 'public', isGroup: false };
  const mockMessage = {
    id: 'msg-1',
    roomId: 'room-1',
    senderId: 'a1',
    content: 'Hello!',
    type: 'text',
    sender: { id: 'a1', namaLengkap: 'Anggota 1', nomorAnggota: 'THS-00001', fotoPath: null },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateRoom', () => {
    it('should return existing room when found', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);

      const result = await service.findOrCreateRoom('room-1');
      expect(result).toEqual(mockRoom);
      expect(mockPrisma.chatRoom.create).not.toHaveBeenCalled();
    });

    it('should create a new room when not found', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);
      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);

      const result = await service.findOrCreateRoom('room-1', 'General', 'group');
      expect(result).toEqual(mockRoom);
      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith({
        data: { id: 'room-1', name: 'General', type: 'group', isGroup: true },
      });
    });

    it('should default to direct type when not specified', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);
      mockPrisma.chatRoom.create.mockResolvedValue({ ...mockRoom, type: 'direct', isGroup: false });

      await service.findOrCreateRoom('room-2');
      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith({
        data: { id: 'room-2', name: 'room-2', type: 'direct', isGroup: false },
      });
    });
  });

  describe('saveMessage', () => {
    it('should save a message and return it with sender info', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.chatMessage.create.mockResolvedValue(mockMessage);

      const result = await service.saveMessage({
        roomId: 'room-1',
        senderId: 'a1',
        content: 'Hello!',
        type: 'text',
      });

      expect(result).toEqual(mockMessage);
      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith({
        data: { roomId: 'room-1', senderId: 'a1', content: 'Hello!', type: 'text' },
        include: {
          sender: { select: { id: true, namaLengkap: true, nomorAnggota: true, fotoPath: true } },
        },
      });
    });

    it('should default type to text when not provided', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(mockRoom);
      mockPrisma.chatMessage.create.mockResolvedValue(mockMessage);

      await service.saveMessage({
        roomId: 'room-1',
        senderId: 'a1',
        content: 'Hello!',
      });

      expect(mockPrisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'text' }),
        }),
      );
    });

    it('should auto-create room if it does not exist', async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue(null);
      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);
      mockPrisma.chatMessage.create.mockResolvedValue(mockMessage);

      const result = await service.saveMessage({
        roomId: 'new-room',
        senderId: 'a1',
        content: 'Hello new room!',
      });

      expect(result).toEqual(mockMessage);
      expect(mockPrisma.chatRoom.create).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        roomId: 'room-1',
        senderId: 'a1',
        content: 'First',
        createdAt: new Date('2025-01-01T00:00:00Z'),
        sender: { id: 'a1', namaLengkap: 'Anggota 1', nomorAnggota: 'THS-00001', fotoPath: null },
      },
      {
        id: 'msg-2',
        roomId: 'room-1',
        senderId: 'a2',
        content: 'Second',
        createdAt: new Date('2025-01-02T00:00:00Z'),
        sender: { id: 'a2', namaLengkap: 'Anggota 2', nomorAnggota: 'THS-00002', fotoPath: null },
      },
    ];

    it('should return paginated messages in chronological order', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValue([...mockMessages].reverse());

      const result = await service.getMessages('room-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('msg-1'); // chronologically first after reverse
      expect(result[1].id).toBe('msg-2');
      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith({
        where: { roomId: 'room-1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          sender: { select: { id: true, namaLengkap: true, nomorAnggota: true, fotoPath: true } },
        },
      });
    });

    it('should respect custom limit', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValue([mockMessages[0]]);

      await service.getMessages('room-1', 1);

      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('should filter messages before a cursor date when provided', async () => {
      mockPrisma.chatMessage.findMany.mockResolvedValue([]);
      const beforeDate = '2025-01-15T00:00:00Z';

      await service.getMessages('room-1', 50, beforeDate);

      expect(mockPrisma.chatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { roomId: 'room-1', createdAt: { lt: expect.any(Date) } },
        }),
      );
    });
  });

  describe('getUserRooms', () => {
    const mockRooms = [
      { id: 'room-1', name: 'General', type: 'public', _count: { members: 5, messages: 100 } },
      { id: 'room-2', name: 'Admin Group', type: 'group', _count: { members: 3, messages: 50 } },
    ];

    it('should return general rooms plus role and private rooms', async () => {
      mockPrisma.chatRoom.findMany.mockResolvedValue(mockRooms);

      const result = await service.getUserRooms({ id: 'user-1', role: 'admin_ranting' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4); // 2 general + 1 role + 1 private

      // General rooms
      expect(result.data[0].id).toBe('room-1');
      expect(result.data[0].name).toBe('General');
      expect((result.data[0] as { memberCount: number }).memberCount).toBe(5);

      // Role-based room
      expect(result.data[2].id).toBe('role:admin_ranting');
      expect(result.data[2].name).toBe('admin_ranting Room');
      expect(result.data[2].type).toBe('role');

      // Private room
      expect(result.data[3].id).toBe('user:user-1');
      expect(result.data[3].name).toBe('My Chat');
      expect(result.data[3].type).toBe('private');
    });
  });

  describe('markAsRead', () => {
    it('should upsert a chat member record with lastReadAt', async () => {
      mockPrisma.chatMember.upsert.mockResolvedValue({
        id: 'cm-1',
        roomId: 'room-1',
        anggotaId: 'a1',
        lastReadAt: new Date(),
      });

      const result = await service.markAsRead('room-1', 'a1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.chatMember.upsert).toHaveBeenCalledWith({
        where: { roomId_anggotaId: { roomId: 'room-1', anggotaId: 'a1' } },
        update: { lastReadAt: expect.any(Date) },
        create: { roomId: 'room-1', anggotaId: 'a1' },
      });
    });
  });
});
