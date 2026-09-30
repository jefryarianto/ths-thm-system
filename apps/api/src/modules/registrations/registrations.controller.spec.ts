import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegistrationsController } from './registrations.controller';
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/registration.dto';

describe('RegistrationsController & DTO', () => {
  let controller: RegistrationsController;

  const mockRegistrationsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    verify: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    importCsv: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RegistrationsController],
      providers: [{ provide: RegistrationsService, useValue: mockRegistrationsService }],
    }).compile();

    controller = module.get<RegistrationsController>(RegistrationsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create endpoint', () => {
    it('delegates to service.create', async () => {
      const dto: CreateRegistrationDto = {
        namaLengkap: 'Antonius Budi',
        jenisKelamin: 'L',
        rantingId: 'ranting-123',
      };
      mockRegistrationsService.create.mockResolvedValue({ id: 'reg-1', ...dto });

      const result = await controller.create(dto);
      expect(result).toEqual({ id: 'reg-1', ...dto });
      expect(mockRegistrationsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('CreateRegistrationDto transformation and validation', () => {
    it('validates a valid registration payload with all fields', async () => {
      const raw = {
        namaLengkap: 'Maria Magdalena',
        jenisKelamin: 'P',
        tempatLahir: 'Jakarta',
        tanggalLahir: '2000-01-01',
        alamat: 'Jl. Melati No. 10',
        noHp: '081234567890',
        email: 'maria@example.com',
        sumberInfo: 'Teman',
        rantingId: 'ranting-01',
      };

      const transformed = plainToInstance(CreateRegistrationDto, raw);
      const errors = await validate(transformed);
      expect(errors.length).toBe(0);
      expect(transformed.namaLengkap).toBe('Maria Magdalena');
      expect(transformed.email).toBe('maria@example.com');
      expect(transformed.noHp).toBe('081234567890');
    });

    it('transforms empty strings in optional fields to undefined and passes validation', async () => {
      const raw = {
        namaLengkap: 'Yohanes',
        jenisKelamin: 'L',
        tempatLahir: '',
        tanggalLahir: '',
        alamat: '',
        noHp: '',
        email: '',
        sumberInfo: '',
        rantingId: 'ranting-01',
      };

      const transformed = plainToInstance(CreateRegistrationDto, raw);
      const errors = await validate(transformed);
      expect(errors.length).toBe(0);
      expect(transformed.email).toBeUndefined();
      expect(transformed.noHp).toBeUndefined();
      expect(transformed.tempatLahir).toBeUndefined();
      expect(transformed.tanggalLahir).toBeUndefined();
      expect(transformed.alamat).toBeUndefined();
      expect(transformed.sumberInfo).toBeUndefined();
    });

    it('fails validation when required fields are missing', async () => {
      const raw = {
        jenisKelamin: 'L',
      };

      const transformed = plainToInstance(CreateRegistrationDto, raw);
      const errors = await validate(transformed);
      expect(errors.length).toBeGreaterThan(0);
      const fields = errors.map((e) => e.property);
      expect(fields).toContain('namaLengkap');
      expect(fields).toContain('rantingId');
    });

    it('fails validation when email is invalid format', async () => {
      const raw = {
        namaLengkap: 'Yohanes',
        jenisKelamin: 'L',
        email: 'invalid-email-address',
        rantingId: 'ranting-01',
      };

      const transformed = plainToInstance(CreateRegistrationDto, raw);
      const errors = await validate(transformed);
      expect(errors.length).toBeGreaterThan(0);
      const emailErr = errors.find((e) => e.property === 'email');
      expect(emailErr).toBeDefined();
    });
  });
});
