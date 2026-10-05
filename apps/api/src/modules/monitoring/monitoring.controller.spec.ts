import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let reflector: Reflector;

  const serviceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: MonitoringService, useValue: serviceMock },
        Reflector,
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    reflector = module.get<Reflector>(Reflector);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Monitoring endpoints are system-wide, so only superadmin may access them.
  const SUPERADMIN_ONLY = ['superadmin'];

  it('guards findAll with superadmin only', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, controller.findAll);
    expect(roles).toEqual(SUPERADMIN_ONLY);
  });

  it('guards findOne with superadmin only', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, controller.findOne);
    expect(roles).toEqual(SUPERADMIN_ONLY);
  });

  it('guards create with superadmin only', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, controller.create);
    expect(roles).toEqual(SUPERADMIN_ONLY);
  });

  it('guards update with superadmin only', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, controller.update);
    expect(roles).toEqual(SUPERADMIN_ONLY);
  });

  it('guards delete with superadmin only', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, controller.delete);
    expect(roles).toEqual(SUPERADMIN_ONLY);
  });

  it('guards toggle with superadmin only', () => {
    const roles = reflector.get<string[]>(ROLES_KEY, controller.toggle);
    expect(roles).toEqual(SUPERADMIN_ONLY);
  });

  it('delegates findAll to the service', async () => {
    serviceMock.findAll.mockResolvedValueOnce([{ id: 'alert-1' }]);

    await controller.findAll();

    expect(serviceMock.findAll).toHaveBeenCalled();
  });

  it('delegates toggle to the service with the alert id', async () => {
    serviceMock.toggle.mockResolvedValueOnce({ id: 'alert-1', aktif: false });

    await controller.toggle('alert-1');

    expect(serviceMock.toggle).toHaveBeenCalledWith('alert-1');
  });
});
