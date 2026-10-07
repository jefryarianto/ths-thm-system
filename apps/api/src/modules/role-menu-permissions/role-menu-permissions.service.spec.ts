import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { MENU_REGISTRY, MENU_KEYS, ROLE_LEVEL, ROLE_VALUES } from '@ths-thm/shared-types';
import { RoleMenuPermissionsService } from './role-menu-permissions.service';
import { RoleMenuPermissionsController } from './role-menu-permissions.controller';
import { PrismaService } from '../../prisma/prisma.service';

describe('RoleMenuPermissionsService', () => {
  let service: RoleMenuPermissionsService;
  let module: TestingModule;

  const mockPrisma = {
    $transaction: jest.fn(),
    roleMenuPermission: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.roleMenuPermission.createMany.mockResolvedValue({ count: 0 });
    // Interactive transaction: callback dijalankan dengan prisma yang sama
    // (mock tidak punya klien tx terpisah).
    mockPrisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn(mockPrisma),
    );

    module = await Test.createTestingModule({
      providers: [
        RoleMenuPermissionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RoleMenuPermissionsService>(RoleMenuPermissionsService);
  });

  afterAll(async () => {
    await module?.close();
  });

  it('terdefinisi', () => {
    expect(service).toBeDefined();
  });

  describe('seedFromMenuRegistry', () => {
    it('menghasilkan satu baris per (role, menuKey)', async () => {
      await service.seedFromMenuRegistry();

      const { data } = mockPrisma.roleMenuPermission.createMany.mock.calls[0][0];
      expect(data).toHaveLength(MENU_REGISTRY.length * ROLE_VALUES.length);

      // Tidak ada pasangan duplikat — kalau ada, skipDuplicates tidak cukup.
      const pairs = data.map((r: { role: string; menuKey: string }) => `${r.role}:${r.menuKey}`);
      expect(new Set(pairs).size).toBe(pairs.length);
    });

    it('isEnabled = role >= minRole, mengikuti ROLE_LEVEL (semantik sidebar)', async () => {
      await service.seedFromMenuRegistry();

      const { data, skipDuplicates } = mockPrisma.roleMenuPermission.createMany.mock.calls[0][0];
      // skipDuplicates wajib: inilah yang membuat seed idempoten dan tidak
      // pernah menimpa override superadmin yang sudah tersimpan.
      expect(skipDuplicates).toBe(true);

      const byPair = new Map<string, boolean>(
        data.map((r: { role: string; menuKey: string; isEnabled: boolean }) => [
          `${r.role}:${r.menuKey}`,
          r.isEnabled,
        ]),
      );

      const mismatches: string[] = [];
      for (const menu of MENU_REGISTRY) {
        for (const role of ROLE_VALUES) {
          const expected = ROLE_LEVEL[role] >= ROLE_LEVEL[menu.minRole];
          const actual = byPair.get(`${role}:${menu.menuKey}`);
          if (actual !== expected) {
            mismatches.push(`${role}/${menu.menuKey}: dapat ${actual}, expected ${expected}`);
          }
        }
      }
      expect(mismatches).toEqual([]);
    });

    it('superadmin mendapat seluruh menu (level tertinggi)', async () => {
      await service.seedFromMenuRegistry();

      const { data } = mockPrisma.roleMenuPermission.createMany.mock.calls[0][0];
      const superadminRows = data.filter(
        (r: { role: string; isEnabled: boolean }) => r.role === 'superadmin' && r.isEnabled,
      );
      expect(superadminRows).toHaveLength(MENU_REGISTRY.length);
    });

    it('anggota hanya mendapat menu berminRole anggota', async () => {
      await service.seedFromMenuRegistry();

      const { data } = mockPrisma.roleMenuPermission.createMany.mock.calls[0][0];
      const anggotaRows = data.filter((r: { role: string }) => r.role === 'anggota');
      const enabled = anggotaRows.filter((r: { isEnabled: boolean }) => r.isEnabled);

      expect(enabled).toHaveLength(
        MENU_REGISTRY.filter((m) => ROLE_LEVEL.anggota >= ROLE_LEVEL[m.minRole]).length,
      );
      // Menu berminRole di atas anggota tidak boleh ter-centang.
      for (const row of enabled) {
        const menu = MENU_REGISTRY.find((m) => m.menuKey === row.menuKey)!;
        expect(ROLE_LEVEL.anggota >= ROLE_LEVEL[menu.minRole]).toBe(true);
      }
    });
  });

  describe('onApplicationBootstrap', () => {
    it('melewati seed ketika SKIP_DB_CONNECT=true (CI swagger:export)', async () => {
      const prev = process.env.SKIP_DB_CONNECT;
      process.env.SKIP_DB_CONNECT = 'true';
      const spy = jest.spyOn(service, 'seedFromMenuRegistry');

      try {
        await service.onApplicationBootstrap();
        expect(spy).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
        if (prev === undefined) delete process.env.SKIP_DB_CONNECT;
        else process.env.SKIP_DB_CONNECT = prev;
      }
    });

    it('menghidupkan seed pada boot normal', async () => {
      const prev = process.env.SKIP_DB_CONNECT;
      delete process.env.SKIP_DB_CONNECT;
      const spy = jest.spyOn(service, 'seedFromMenuRegistry').mockResolvedValue(0);

      try {
        await service.onApplicationBootstrap();
        expect(spy).toHaveBeenCalled();
      } finally {
        spy.mockRestore();
        if (prev !== undefined) process.env.SKIP_DB_CONNECT = prev;
      }
    });

    it('kegagalan seed TIDAK menggagalkan boot', async () => {
      const prev = process.env.SKIP_DB_CONNECT;
      delete process.env.SKIP_DB_CONNECT;
      const spy = jest
        .spyOn(service, 'seedFromMenuRegistry')
        .mockRejectedValue(new Error('database unreachable'));

      try {
        await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
      } finally {
        spy.mockRestore();
        if (prev !== undefined) process.env.SKIP_DB_CONNECT = prev;
      }
    });
  });

  describe('bulkUpdate', () => {
    it('mengembalikan jumlah baris yang diupsert', async () => {
      mockPrisma.roleMenuPermission.upsert.mockResolvedValue({});
      const n = await service.bulkUpdate('admin_ranting', {
        members: true,
        reports: false,
      });
      expect(n).toBe(2);
      expect(mockPrisma.roleMenuPermission.upsert).toHaveBeenCalledTimes(2);
    });

    it('menjalankan seluruh upsert dalam SATU transaksi', async () => {
      mockPrisma.roleMenuPermission.upsert.mockResolvedValue({});
      await service.bulkUpdate('admin_ranting', { members: true, reports: false });

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // Semua upsert terjadi di dalam callback transaksi.
      expect(mockPrisma.roleMenuPermission.upsert).toHaveBeenCalledTimes(2);
    });

    it('menolak role di luar ROLE_VALUES tanpa menyentuh DB', async () => {
      await expect(service.bulkUpdate('root', { members: true })).rejects.toThrow(
        'Role tidak dikenal: root',
      );
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.roleMenuPermission.upsert).not.toHaveBeenCalled();
    });

    it('permissions kosong = no-op tanpa transaksi', async () => {
      const n = await service.bulkUpdate('anggota', {});
      expect(n).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('kegagalan upsert di tengah transaksi diteruskan (tidak diam-diam parsial)', async () => {
      mockPrisma.roleMenuPermission.upsert
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('db down'));

      await expect(
        service.bulkUpdate('admin_ranting', { members: true, reports: false }),
      ).rejects.toThrow('db down');
    });
  });
});

describe('RoleMenuPermissionsController', () => {
  let controller: RoleMenuPermissionsController;
  let ctrlModule: TestingModule;

  const mockService = {
    getAllPermissions: jest.fn(),
    getAllMenuKeys: jest.fn(),
    getPermissionsForRole: jest.fn(),
    updatePermission: jest.fn(),
    bulkUpdate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    ctrlModule = await Test.createTestingModule({
      controllers: [RoleMenuPermissionsController],
      providers: [{ provide: RoleMenuPermissionsService, useValue: mockService }],
    }).compile();

    controller = ctrlModule.get<RoleMenuPermissionsController>(RoleMenuPermissionsController);
  });

  afterAll(async () => {
    await ctrlModule?.close();
  });

  describe('getAll', () => {
    it('menuKeys selalu memuat seluruh registry walau tabel kosong', async () => {
      mockService.getAllPermissions.mockResolvedValue({});
      mockService.getAllMenuKeys.mockResolvedValue([]); // DB kosong

      const res = await controller.getAll();

      // Ini perbaikan chicken-and-egg: dulu menuKeys diambil dari tabel,
      // sehingga matriks kosong selamanya pada instalasi baru.
      expect(res.menuKeys).toEqual(expect.arrayContaining([...MENU_KEYS]));
      expect(res.menuKeys).toHaveLength(MENU_KEYS.length);
    });

    it('key legacy di DB ikut disertakan (tidak hilang dari tampilan)', async () => {
      mockService.getAllPermissions.mockResolvedValue({});
      mockService.getAllMenuKeys.mockResolvedValue(['keyLegacyLama']); // bukan dari registry

      const res = await controller.getAll();

      expect(res.menuKeys).toContain('keyLegacyLama');
      expect(res.menuKeys).toEqual(expect.arrayContaining([...MENU_KEYS]));
    });

    it('tidak menduplikasi key yang ada di dua sumber', async () => {
      mockService.getAllPermissions.mockResolvedValue({});
      mockService.getAllMenuKeys.mockResolvedValue([...MENU_KEYS, 'keyLegacyLama']);

      const res = await controller.getAll();

      const dupes = res.menuKeys.filter((k, i) => res.menuKeys.indexOf(k) !== i);
      expect(dupes).toEqual([]);
    });

    it('mengembalikan permissions apa adanya dari service', async () => {
      const matrix = { admin_ranting: { members: true } };
      mockService.getAllPermissions.mockResolvedValue(matrix);
      mockService.getAllMenuKeys.mockResolvedValue([]);

      const res = await controller.getAll();
      expect(res.permissions).toEqual(matrix);
    });
  });

  describe('getMyMenus', () => {
    it('mengembalikan izin milik role yang sedang login', async () => {
      mockService.getPermissionsForRole.mockResolvedValue({ forum: true, reports: false });

      const res = await controller.getMyMenus({ id: 'u1', role: 'admin_ranting' });

      expect(mockService.getPermissionsForRole).toHaveBeenCalledWith('admin_ranting');
      expect(res).toEqual({ permissions: { forum: true, reports: false } });
    });

    it('hanya meminta baris sendiri — tidak pernah matriks role lain', async () => {
      mockService.getPermissionsForRole.mockResolvedValue({});
      await controller.getMyMenus({ id: 'u9', role: 'anggota' });
      expect(mockService.getPermissionsForRole).toHaveBeenCalledWith('anggota');
      expect(mockService.getAllPermissions).not.toHaveBeenCalled();
      expect(mockService.getAllMenuKeys).not.toHaveBeenCalled();
    });
  });

  describe('urutan route my-menus vs :role', () => {
    it('GET /role-menu-permissions/my-menus tidak tertangkap oleh @Get(\':role\')', async () => {
      // Regresi urutan deklarasi: bila my-menus dideklarasikan setelah :role,
      // Express mencocokkan literal 'my-menus' sebagai param :role dan
      // getForRole yang terpanggil → respons { permissions } tidak pernah ada.
      mockService.getPermissionsForRole.mockResolvedValue({ forum: true });

      const app = ctrlModule.createNestApplication();
      // Modul uji tidak punya guard global — suntikkan request.user manual
      // (yang dibaca @CurrentUser) agar getMyMenus terpanggil dengan role
      // yang benar, persis seperti alur login asli.
      app.use((req: { user?: unknown }, _res: unknown, next: () => void) => {
        req.user = { id: 'u1', role: 'admin_ranting' };
        next();
      });
      await app.init();
      try {
        const res = await request(app.getHttpServer()).get('/role-menu-permissions/my-menus');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ permissions: { forum: true } });
        expect(mockService.getPermissionsForRole).toHaveBeenCalledWith('admin_ranting');
      } finally {
        await app.close();
      }
    });
  });
});
