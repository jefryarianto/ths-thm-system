import { Type } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ROLE_VALUES, Role } from './roles.constant';

import { ActivitiesController } from '../../modules/activities/activities.controller';
import { CardTemplatesController } from '../../modules/card-templates/card-templates.controller';
import { ContentController } from '../../modules/content/content.controller';
import { DocumentsController } from '../../modules/documents/documents.controller';
import { DuesController } from '../../modules/dues/dues.controller';
import { ForumController } from '../../modules/forum/forum.controller';
import { GaleriController } from '../../modules/galeri/galeri.controller';
import { JabatanController } from '../../modules/jabatan/jabatan.controller';
import { KepengurusanController } from '../../modules/kepengurusan/kepengurusan.controller';
import { MembersController } from '../../modules/members/members.controller';
import { OrgStructureController } from '../../modules/org-structure/org-structure.controller';
import { PaymentsController } from '../../modules/payments/payments.controller';
import { SearchController } from '../../modules/search/search.controller';
import { SettingsController } from '../../modules/settings/settings.controller';

type Endpoint = { controller: string; method: string; roles: string[] };

const CONTROLLERS: Array<[string, Type<unknown>]> = [
  ['ActivitiesController', ActivitiesController],
  ['CardTemplatesController', CardTemplatesController],
  ['ContentController', ContentController],
  ['DocumentsController', DocumentsController],
  ['DuesController', DuesController],
  ['ForumController', ForumController],
  ['GaleriController', GaleriController],
  ['JabatanController', JabatanController],
  ['KepengurusanController', KepengurusanController],
  ['MembersController', MembersController],
  ['OrgStructureController', OrgStructureController],
  ['PaymentsController', PaymentsController],
  ['SearchController', SearchController],
  ['SettingsController', SettingsController],
];

/**
 * Kontrak akses `admin_nasional` per endpoint.
 *
 * Daftar ini adalah sumber kebenaran: menambah/menghapus `admin_nasional` pada
 * salah satu endpoint di bawah akan menggagalkan tes, sehingga perubahan
 * kebijakan harus disengaja dan ditinjau — bukan sekadar tidak konsisten
 * antara endpoint daftar dan detail (atau antara baca dan tulis).
 *
 * Endpoint yang sengaja TIDAK memberi akses `admin_nasional` (mutasi anggota,
 * endpoint self pembayaran, dan endpoint sistem khusus superadmin) tidak
 * dicantumkan di sini.
 */
const ADMIN_NASIONAL_CONTRACT: Record<string, string[]> = {
  ActivitiesController: [
    'addParticipant',
    'create',
    'findAll',
    'findOne',
    'getDocuments',
    'getPresence',
    'importParticipants',
    'recordPresence',
    'remove',
    'removeParticipant',
    'update',
    'uploadDocument',
  ],
  CardTemplatesController: [
    'activate',
    'create',
    'findAll',
    'findOne',
    'getActive',
    'remove',
    'update',
  ],
  ContentController: [
    'createBerita',
    'deleteBerita',
    'getAllBerita',
    'getBeritaById',
    'getMyBeritaSubmissions',
    'submitBerita',
    'updateBerita',
    'uploadBeritaImage',
  ],
  DocumentsController: [
    'batchGenerate',
    'cancelBatch',
    'cancelBatchPatch',
    'downloadDocumentFile',
    'estimateBatch',
    'exportBatchCsv',
    'findAll',
    'findOne',
    'generate',
    'generateAward',
    'generateCertificate',
    'getBatchList',
    'getBatchListAlias',
    'getBatchProgress',
    'getCertificateImage',
    'getCertificatePdf',
    'getTypes',
    'remove',
    'retryBatch',
    'verifyQR',
  ],
  DuesController: [
    'batchPayment',
    'create',
    'exportReport',
    'findAll',
    'findOne',
    'getArrears',
    'getDashboardStats',
    'getMemberDues',
    'getMyDues',
    'getReport',
    'importDues',
    'remove',
    'submitPaymentConfirmation',
    'update',
  ],
  ForumController: [
    'createCategory',
    'createPost',
    'createThread',
    'deleteCategory',
    'deletePost',
    'deleteThread',
    'getCategories',
    'getCategory',
    'getThreads',
    'markAsSolution',
    'replyToPost',
    'toggleLock',
    'togglePin',
    'updateCategory',
    'updatePost',
    'updateThread',
  ],
  GaleriController: ['adminImage', 'adminList', 'review'],
  JabatanController: ['create', 'findAll', 'findOne', 'remove', 'update'],
  KepengurusanController: [
    'approve',
    'bulkApprove',
    'bulkReject',
    'create',
    'exportCsv',
    'findAll',
    'findOne',
    'findPending',
    'importCsv',
    'reject',
    'remove',
    'reparent',
    'update',
  ],
  MembersController: [
    'findAll',
    'findOne',
    'getCardIssuances',
    'getCardSecurity',
    'getDigitalCard',
    'getDigitalCardImage',
    'getDigitalCardPdf',
    'getDocuments',
    'getDues',
    'getIncompleteMembers',
    'getIncompleteStats',
    'getMe',
    'searchMembers',
  ],
  OrgStructureController: [
    'createDistrik',
    'createRanting',
    'createWilayah',
    'deleteDistrik',
    'deleteRanting',
    'deleteWilayah',
    'getAllDistrik',
    'getAllNasional',
    'getAllRanting',
    'getAllWilayah',
    'getDistrik',
    'getOrgTree',
    'getRanting',
    'getWilayah',
    'importOrg',
    'updateDistrik',
    'updateRanting',
    'updateWilayah',
  ],
  PaymentsController: [
    'createBankInfo',
    'deleteBankInfo',
    'findOne',
    'getAllBankInfo',
    'rejectPayment',
    'updateBankInfo',
    'verifyPayment',
  ],
  SearchController: ['search'],
  SettingsController: [
    'createPeriod',
    'deletePeriod',
    'deleteSignature',
    'deleteStamp',
    'getAllSettings',
    'getBrandingColors',
    'getOrganisasi',
    'getPeriods',
    'getSejarah',
    'getSetting',
    'getSignatures',
    'getStamp',
    'getStamps',
    'removeDocTemplateImage',
    'updateBrandingColors',
    'updateOrganisasi',
    'updatePeriod',
    'updateSejarah',
    'updateSettings',
    'uploadDocTemplateImage',
    'uploadSignature',
    'uploadStamp',
  ],
};

function collectEndpoints(): Endpoint[] {
  const endpoints: Endpoint[] = [];

  for (const [controllerName, controller] of CONTROLLERS) {
    const proto = controller.prototype as Record<string, unknown>;
    for (const method of Object.getOwnPropertyNames(proto)) {
      if (method === 'constructor') continue;
      const handler = proto[method];
      if (typeof handler !== 'function') continue;
      const roles = Reflect.getMetadata(ROLES_KEY, handler) as string[] | undefined;
      if (Array.isArray(roles)) {
        endpoints.push({ controller: controllerName, method, roles });
      }
    }
  }

  return endpoints;
}

function adminNasionalMatrix(endpoints: Endpoint[]): Record<string, string[]> {
  const matrix: Record<string, string[]> = {};
  for (const { controller, method, roles } of endpoints) {
    if (!roles.includes('admin_nasional')) continue;
    (matrix[controller] ??= []).push(method);
  }
  for (const key of Object.keys(matrix)) matrix[key].sort();
  return matrix;
}

describe('Role contract — admin_nasional', () => {
  const endpoints = collectEndpoints();

  it('should discover role metadata on the decorated endpoints', () => {
    expect(endpoints.length).toBeGreaterThan(100);
  });

  it('should only use known role names', () => {
    const invalid = endpoints.flatMap(({ controller, method, roles }) =>
      roles
        .filter((role) => !ROLE_VALUES.includes(role as Role))
        .map((role) => `${controller}.${method}: ${role}`),
    );
    expect(invalid).toEqual([]);
  });

  it('should always grant superadmin wherever admin_nasional is allowed', () => {
    const violations = endpoints
      .filter(({ roles }) => roles.includes('admin_nasional') && !roles.includes('superadmin'))
      .map(({ controller, method }) => `${controller}.${method}`);
    expect(violations).toEqual([]);
  });

  it('should match the per-endpoint admin_nasional contract', () => {
    expect(adminNasionalMatrix(endpoints)).toEqual(ADMIN_NASIONAL_CONTRACT);
  });

  it('should grant admin_nasional read access wherever CRUD write is allowed', () => {
    const byController = new Map<string, Map<string, string[]>>();
    for (const { controller, method, roles } of endpoints) {
      const methods = byController.get(controller) ?? new Map<string, string[]>();
      methods.set(method, roles);
      byController.set(controller, methods);
    }

    const violations: string[] = [];
    for (const [controller, methods] of byController) {
      const allows = (method: string) => (methods.get(method) ?? []).includes('admin_nasional');

      if (allows('create') || allows('update') || allows('remove')) {
        for (const readMethod of ['findAll', 'findOne']) {
          if (methods.has(readMethod) && !allows(readMethod)) {
            violations.push(`${controller}.${readMethod}`);
          }
        }
      }

      // Daftar dan detail harus konsisten: tidak boleh bisa melihat daftar
      // tetapi 403 saat membuka salah satu barisnya.
      if (allows('findAll') && methods.has('findOne') && !allows('findOne')) {
        violations.push(`${controller}.findOne`);
      }
    }

    expect(violations).toEqual([]);
  });
});
