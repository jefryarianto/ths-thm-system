import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getRequestContext } from '../common/utils/request-context';
import { applyMiddlewares } from './prisma-middleware';

/**
 * Model yang benar-benar memiliki kolom distrikId (tenant-aware).
 * Hanya model dalam daftar ini yang boleh difilter tenant — menambahkan
 * `distrikId` ke model lain (mis. Iuran, Notifikasi, Anggota, Dokumen) akan
 * membuat Prisma melempar PrismaClientValidationError sehingga anggota/admin
 * non-superadmin mendapat HTTP 500 ketika memanggil findMany.
 */
const TENANT_SCOPED_MODELS: ReadonlySet<string> = new Set([
  'Wilayah',
  'UnitLatihan',
  'TandaTangan',
  'Stempel',
  'Jabatan',
  'Kepengurusan',
  'Penandatangan',
  'DokumenPenandatangan',
  'CardTemplate',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    applyMiddlewares(this);

    // Prisma Extension 1: Tenant Isolation
    const tenantExtension = this.$extends({
      query: {
        $allModels: {
          async findMany({ args, query, model }) {
            const ctx = getRequestContext();
            if (ctx?.distrikId && TENANT_SCOPED_MODELS.has(model)) {
              // Apply tenant isolation for tenant-aware models
              // Add distrikId filter dynamically
              args.where = {
                ...args.where,
                distrikId: ctx.distrikId,
              } as any;
            }
            return query(args);
          },
        },
      },
    });

    // Prisma Extension 2: Automatic Audit Fields (createdById, updatedById)
    const auditExtension = tenantExtension.$extends({
      query: {
        $allModels: {
          async create({ args, query, model }) {
            const ctx = getRequestContext();
            const userId = ctx?.userId;

            // Only apply to models that have createdById/updatedById fields
            const modelsWithAuditFields = new Set([
              'anggota', 'kegiatan'
            ]);

            if (modelsWithAuditFields.has(model) && userId) {
              args.data = {
                ...args.data,
                createdById: userId,
                updatedById: userId,
              };
            }

            return query(args);
          },

          async update({ args, query, model }) {
            const ctx = getRequestContext();
            const userId = ctx?.userId;

            // Only apply to models that have updatedById field
            const modelsWithAuditFields = new Set([
              'anggota', 'kegiatan'
            ]);

            if (modelsWithAuditFields.has(model) && userId) {
              args.data = {
                ...args.data,
                updatedById: userId,
              };
            }

            return query(args);
          },
        },
      },
    });

    return auditExtension as this;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
