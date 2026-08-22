import { Prisma } from '@prisma/client';
import { getRequestContext } from '../common/utils/request-context';

const modelsWithDeletedAt = new Set([
  'anggota',
  'kegiatan',
  'calonAnggota',
  'klaim',
  'latihan',
  'iuran',
  'dokumen',
  'notifikasi',
  'suratMasuk',
  'suratKeluar',
  'dokumenOrganisasi',
  'user',
  'userSession',
  'auditLog',
  'dataRevision',
  'importBatch',
  'emailLog',
  'emailEvent',
  'webhookEvent',
  'oAuthAccount',
  'nationalHoliday',
  'periode',
  'jabatan',
  'kepengurusan',
  'gamificationProfile',
  'gamificationBadge',
  'gamificationEvent',
  'gamificationReward',
  'gamificationRedemption',
  'chatRoom',
  'chatMember',
  'chatMessage',
  'forumThread',
  'forumPost',
  'qrCode',
  'checkIn',
  'undanganPendadaran',
  'iuranRecurring',
  'memberReferral',
  'transferRequest',
  'nilaiPendadaran',
  'hasilPendadaran',
  'ujianPraktek',
  'ujianPraktekPenilai',
  'ujianPraktekItem',
  'aspekPenilaian',
  'itemPenilaian',
  'penugasanPenguji',
  'absensiLatihan',
  'evaluasiLatihan',
  'kegiatanPeserta',
  'presensiKegiatan',
  'dokumenKegiatan',
  'paymentTransaction',
  'bankInfo',
  'tandaTangan',
  'stempel',
  'qrValidation',
  'deviceToken',
  'emailTemplate',
  'setting',
  'suppressedEmail',
  'donasiProgram',
  'berita',
  'galeri',
  'sejarah',
  'sambutan',
  'organisasi',
  'wilayah',
  'ranting',
  'distrik',
  'nasional',
  'unitLatihan',
]);

const modelsWithAuditFields = new Set([
  'anggota',
  'kegiatan',
  'calonAnggota',
  'klaim',
  'latihan',
  'iuran',
  'dokumen',
  'notifikasi',
  'suratMasuk',
  'suratKeluar',
  'dokumenOrganisasi',
]);

export function softDeleteMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action, args } = params;

    if (!model || !modelsWithDeletedAt.has(model)) {
      return next(params);
    }

    switch (action) {
      case 'findUnique':
      case 'findFirst':
        args.where = {
          ...args.where,
          deletedAt: null,
        };
        break;

      case 'findMany':
        args.where = {
          ...args.where,
          deletedAt: null,
        };
        break;

      case 'findUniqueOrThrow':
      case 'findFirstOrThrow':
        args.where = {
          ...args.where,
          deletedAt: null,
        };
        break;

      case 'delete':
        params.action = 'update';
        params.args = {
          ...args,
          data: {
            deletedAt: new Date(),
          },
        };
        break;

      case 'deleteMany':
        params.action = 'updateMany';
        params.args = {
          ...args,
          data: {
            deletedAt: new Date(),
          },
        };
        break;

      case 'update':
      case 'updateMany':
        args.where = {
          ...args.where,
          deletedAt: null,
        };
        break;
    }

    return next(params);
  };
}

export function auditFieldsMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action, args } = params;

    if (!model || !modelsWithAuditFields.has(model)) {
      return next(params);
    }

    const ctx = getRequestContext();
    const userId = ctx?.userId;

    if (!userId) {
      return next(params);
    }

    switch (action) {
      case 'create':
      case 'createMany':
        if (args.data) {
          const dataArray = Array.isArray(args.data) ? args.data : [args.data];
          for (const data of dataArray) {
            data.createdById = userId;
            data.updatedById = userId;
          }
        }
        break;

      case 'update':
      case 'updateMany':
      case 'upsert':
        if (args.data) {
          args.data.updatedById = userId;
        }
        break;
    }

    return next(params);
  };
}

export function queryFilterMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action, args } = params;

    if (!model || !modelsWithDeletedAt.has(model)) {
      return next(params);
    }

    if (action.startsWith('find') || action === 'count') {
      args.where = {
        ...args.where,
        deletedAt: null,
      };
    }

    return next(params);
  };
}

export function applyMiddlewares(prisma: any) {
  prisma.$use(softDeleteMiddleware());
  prisma.$use(auditFieldsMiddleware());
  prisma.$use(queryFilterMiddleware());
}