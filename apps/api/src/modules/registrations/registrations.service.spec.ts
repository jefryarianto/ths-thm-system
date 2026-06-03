import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RegistrationsService } from './registrations.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('RegistrationsService', () => {
  let service: RegistrationsService;

  const mockPrisma = {
    pendaftaran: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    calonAnggota: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated registrations', async () => {
      const mockData = [{ id: '1', namaLengkap: 'Budi', status: 'pending' }];
      mockPrisma.pendaftaran.findMany.mockResolvedValue(mockData);
      mockPrisma.pendaftaran.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by status', async () => {
      mockPrisma.pendaftaran.findMany.mockResolvedValue([]);
      mockPrisma.pendaftaran.count.mockResolvedValue(0);

      await service.findAll({ status: 'pending' });
      expect(mockPrisma.pendaftaran.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'pending' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a single registration', async () => {
      mockPrisma.pendaftaran.findUnique.mockResolvedValue({ id: '1', namaLengkap: 'Budi' });

      const result = await service.findOne('1');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.pendaftaran.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a registration with pending status', async () => {
      const dto = { namaLengkap: 'Budi' };
      mockPrisma.pendaftaran.create.mockResolvedValue({ id: '1', ...dto, status: 'pending' });

      const result = await service.create(dto);
      expect(result.success).toBe(true);
      expect(mockPrisma.pendaftaran.create).toHaveBeenCalledWith({
        data: { namaLengkap: 'Budi', status: 'pending' },
      });
    });
  });

  describe('update', () => {
    it('should update a registration', async () => {
      const dto = { namaLengkap: 'Updated' };
      mockPrisma.pendaftaran.update.mockResolvedValue({ id: '1', ...dto });

      const result = await service.update('1', dto);
      expect(result.success).toBe(true);
    });
  });

  describe('remove', () => {
    it('should delete a registration', async () => {
      mockPrisma.pendaftaran.delete.mockResolvedValue({});

      const result = await service.remove('1');
      expect(result.success).toBe(true);
    });
  });

  describe('verify', () => {
    it('should return valid for complete registration', async () => {
      mockPrisma.pendaftaran.findUnique.mockResolvedValue({
        id: '1',
        namaLengkap: 'Budi',
        jenisKelamin: 'L',
      });

      const result = await service.verify('1');
      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
    });

    it('should return invalid with missing fields', async () => {
      mockPrisma.pendaftaran.findUnique.mockResolvedValue({
        id: '2',
        namaLengkap: null,
        jenisKelamin: null,
      });

      const result = await service.verify('2');
      expect(result.data.valid).toBe(false);
      expect(result.data.missingFields).toContain('nama_lengkap');
      expect(result.data.missingFields).toContain('jenis_kelamin');
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.pendaftaran.findUnique.mockResolvedValue(null);
      await expect(service.verify('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve registration and create candidate', async () => {
      mockPrisma.pendaftaran.findUnique.mockResolvedValue({
        id: '1',
        namaLengkap: 'Budi',
        jenisKelamin: 'L',
        tempatLahir: 'Jakarta',
        tanggalLahir: new Date('2000-01-01'),
        alamat: 'Jl. Merdeka',
        noHp: '081234567',
        email: 'budi@test.com',
        sumberInfo: 'ranting1',
      });
      mockPrisma.calonAnggota.create.mockResolvedValue({ id: 'ca1', namaLengkap: 'Budi' });
      mockPrisma.pendaftaran.update.mockResolvedValue({});

      const result = await service.approve('1', 'user1');
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('ca1');
      expect(mockPrisma.calonAnggota.create).toHaveBeenCalled();
      expect(mockPrisma.pendaftaran.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'approved' },
      });
    });

    it('should throw NotFoundException when registration not found', async () => {
      mockPrisma.pendaftaran.findUnique.mockResolvedValue(null);
      await expect(service.approve('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('should reject registration with reason', async () => {
      mockPrisma.pendaftaran.update.mockResolvedValue({});

      const result = await service.reject('1', 'Data tidak lengkap');
      expect(result.success).toBe(true);
      expect(result.message).toBe('Data tidak lengkap');
      expect(mockPrisma.pendaftaran.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { status: 'rejected', catatan: 'Data tidak lengkap' },
      });
    });

    it('should reject registration with default message', async () => {
      mockPrisma.pendaftaran.update.mockResolvedValue({});

      const result = await service.reject('1');
      expect(result.message).toBe('Pendaftaran ditolak');
    });
  });

  describe('importCsv', () => {
    it('should import registrations from CSV data', async () => {
      mockPrisma.pendaftaran.create.mockResolvedValue({});

      const data = [
        { nama_lengkap: 'Budi', no_hp: '081' },
        { name: 'Siti', no_hp: '082' },
      ];
      const result = await service.importCsv(data);
      expect(result.success).toBe(true);
      expect(result.data.imported).toBe(2);
    });

    it('should skip rows that fail', async () => {
      mockPrisma.pendaftaran.create
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('fail'));

      const data = [{ nama_lengkap: 'Budi' }, { nama_lengkap: 'Siti' }];
      const result = await service.importCsv(data);
      expect(result.data.imported).toBe(1);
    });
  });
});