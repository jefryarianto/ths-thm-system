import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';

const logger = new Logger('SwaggerDocs');

/**
 * Enhanced Swagger setup with scope-aware documentation.
 *
 * Adds comprehensive descriptions to the Swagger UI including:
 * - Hierarchical scope system explanation
 * - Role permissions table
 * - API tags for all modules
 */
export function setupSwagger(app: Parameters<typeof SwaggerModule.createDocument>[0]) {
  const description = [
    '## THS-THM System Manajemen API',
    '',
    '### 🔐 Authentication',
    'Semua endpoint memerlukan JWT Bearer token. Login via `POST /api/auth/login`.',
    '',
    '### 🏗️ Hierarchical Scope System',
    'Data diakses berdasarkan hierarki organisasi:',
    '',
    '| Level | Scope | Role | Cakupan Data |',
    '|-------|-------|------|-------------|',
    '| Nasional | `national` | superadmin | Semua data |',
    '| Distrik | `district` | admin_distrik | Data dalam 1 distrik |',
    '| Wilayah | `region` | admin_wilayah | Data dalam 1 wilayah |',
    '| Ranting | `branch` | admin_ranting, admin_kegiatan, penguji | Data dalam 1 ranting |',
    '| Diri | `self` | anggota | Data pribadi saja |',
    '',
    '### 📋 Role Permissions',
    '| Role | Keterangan |',
    '|------|------------|',
    '| `superadmin` | Full access ke semua data dan pengaturan |',
    '| `admin_distrik` | Kelola data dalam distrik (1 atau lebih wilayah) |',
    '| `admin_wilayah` | Kelola data dalam wilayah (1 atau lebih ranting) |',
    '| `admin_ranting` | Kelola data dalam 1 ranting |',
    '| `admin_kegiatan` | Kelola kegiatan dan latihan |',
    '| `penguji` | Kelola penilaian dan evaluasi |',
    '| `anggota` | Akses data pribadi, dokumen, dan iuran |',
    '',
    '### ⚠️ Scope Enforcement',
    'Endpoint dengan `@RequireScope` akan mem-filter data secara otomatis. ',
    'Branch-level user hanya melihat data di ranting-nya. Mutation endpoints (create/update/remove) ',
    'juga memverifikasi scope sebelum mengubah data.',
    '',
    '### 🔒 Scope-Aware Endpoints',
    'Semua endpoint CRUD utama (Members, Candidates, Trainings, Activities, Graduations, ',
    'Assessments, Dues, Documents, Claims, Users, Reports, Examiners) telah terintegrasi ',
    'dengan scope filtering otomatis. Lihat decorator `@Roles` dan `@RequireScope` pada ',
    'masing-masing endpoint untuk detail akses.',
  ].join('\n');

  const config = new DocumentBuilder()
    .setTitle('THS-THM API')
    .setDescription(description)
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token dari login endpoint',
      },
    )
    .addServer('http://localhost:3001', 'Development')
    .addServer('https://ths-thm-api.onrender.com', 'Production')
    .addTag('Auth', 'Autentikasi dan manajemen session')
    .addTag('Members', 'Data anggota THS-THM — scope-filtered CRUD')
    .addTag('Candidates', 'Data calon anggota — scope-filtered CRUD')
    .addTag('Trainings', 'Latihan rutin dan kegiatan — scope-filtered CRUD')
    .addTag('Activities', 'Kegiatan dan absensi — scope filtered by scopeType/scopeId')
    .addTag('Graduations', 'Pendadaran dan kelulusan — scope filtered by scopeType/scopeId')
    .addTag('Assessments', 'Penilaian dan aspek evaluasi — scope filtered by kegiatan')
    .addTag('Dues', 'Iuran dan pembayaran — scope filtered via anggota relation')
    .addTag('Documents', 'Dokumen anggota — scope filtered via anggota relation')
    .addTag('Org-Documents', 'Dokumen organisasi — shared across org')
    .addTag('Claims', 'Klaim anggota — scope filtered via anggota relation')
    .addTag('Letters', 'Surat masuk dan keluar — admin-level access')
    .addTag('Payments', 'Pembayaran online (Stripe) — scope verified via iuran to anggota')
    .addTag('Reports', 'Laporan dan dashboard — scope-aware queries')
    .addTag('Notifications', 'Notifikasi FCM')
    .addTag('Users', 'Manajemen user dan role — scope filtered by rantingId')
    .addTag('Examiners', 'Manajemen penguji — scope check on assign')
    .addTag('Settings', 'Pengaturan sistem — global')
    .addTag('Registrations', 'Pendaftaran baru — admin-level access')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  logger.log('Swagger docs available at /api/docs');
}
