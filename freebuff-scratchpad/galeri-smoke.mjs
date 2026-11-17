import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const apiRequire = createRequire('C:/ths-thm-system/apps/api/package.json');
const webRequire = createRequire('C:/ths-thm-system/apps/web/package.json');
apiRequire('dotenv').config({ path: 'C:/ths-thm-system/apps/api/.env', quiet: true });
const jwt = apiRequire('jsonwebtoken');
const sharp = apiRequire('sharp');
const { io } = webRequire('socket.io-client');
const { PrismaClient } = apiRequire('@prisma/client');

const HERE = dirname(fileURLToPath(import.meta.url));
const STORAGE = join(HERE, '..', 'apps', 'api', 'storage', 'galeri');
const BASE = 'http://localhost:3011/api';
const MOD_ID = '9bde9cac-bbc8-4c1b-8fc2-521eadb19a07';
const MEMBER_ID = '3b2b89a4-aaa8-427d-a7e9-d3cebb0296f3';

const watchdog = setTimeout(() => {
  console.error('TIMEOUT: skrip uji melewati 120 detik');
  process.exit(2);
}, 120_000);
watchdog.unref?.();

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` — ${detail}`}`);
}

const db = new PrismaClient();

const token = (id, role) =>
  jwt.sign({ sub: id, email: `${role}@smoke.test`, role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
const modToken = token(MOD_ID, 'superadmin');
const memberToken = token(MEMBER_ID, 'anggota');

// User sementara untuk memeriksa batas peran. Guard membaca role dari DB,
// jadi user-nya harus benar-benar ada.
const tempUserIds = [];
const roleTokens = {};
try {
  for (const role of ['admin_berita', 'admin_distrik', 'admin_ranting']) {
    const id = randomUUID();
    await db.user.create({
      data: {
        id,
        email: `smoke.${role}@example.test`,
        namaLengkap: `Smoke ${role}`,
        role,
        passwordHash: 'x',
      },
    });
    tempUserIds.push(id);
    roleTokens[role] = token(id, role);
  }
} catch (err) {
  check('menyiapkan user uji peran', false, String(err));
}

async function req(path, { method = 'GET', body, auth, raw } = {}) {
  const headers = {};
  if (auth) headers.Authorization = `Bearer ${auth}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  if (raw)
    return { status: res.status, type: res.headers.get('content-type'), bytes: (await res.arrayBuffer()).byteLength };
  const json = await res.json().catch(() => null);
  return { status: res.status, body: json };
}

const createdIds = [];
let socket;

try {
  await db.galeri.deleteMany({ where: { judul: { startsWith: 'SMOKE' } } });
  await fs.mkdir(STORAGE, { recursive: true });
  for (const name of await fs.readdir(STORAGE)) {
    if (name.startsWith('smoke-')) await fs.unlink(join(STORAGE, name)).catch(() => undefined);
  }

  const origJpeg = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#3366aa' } })
    .jpeg()
    .toBuffer();
  const thumbJpeg = await sharp({ create: { width: 16, height: 12, channels: 3, background: '#225588' } })
    .jpeg()
    .toBuffer();
  await fs.writeFile(join(STORAGE, 'smoke-orig.jpg'), origJpeg);
  await fs.writeFile(join(STORAGE, 'smoke-thumb.jpg'), thumbJpeg);

  // 25 item PENDING (FIFO), 1 PENDING milik moderator, 1 APPROVED publik.
  for (let i = 1; i <= 25; i += 1) {
    const item = await db.galeri.create({
      data: {
        judul: `SMOKE FOTO ${String(i).padStart(2, '0')}`,
        gambar: `/galeri/smoke-orig-${i}.jpg`,
        createdAt: new Date(Date.now() - (26 - i) * 60_000),
        status: 'PENDING',
        isVisible: false,
        storageKey: `smoke-orig-${i}.jpg`,
        thumbKey: `smoke-thumb-${i}.jpg`,
        deskripsi: `Deskripsi uji moderasi galeri nomor ${i}`,
        kategori: 'Kegiatan',
        uploaderId: MEMBER_ID,
        fileName: 'smoke.jpg',
        mimeType: 'image/jpeg',
        ukuranBytes: 1000,
      },
    });
    createdIds.push(item.id);
  }
  const selfId = randomUUID();
  await db.galeri.create({
    data: {
      id: selfId,
      judul: 'SMOKE SELF',
      gambar: '/galeri/smoke-self.jpg',
      status: 'PENDING',
      isVisible: false,
      storageKey: 'smoke-self.jpg',
      uploaderId: MOD_ID,
    },
  });
  createdIds.push(selfId);
  const approvedId = randomUUID();
  await db.galeri.create({
    data: {
      id: approvedId,
      judul: 'SMOKE PUBLIK',
      gambar: '/galeri/smoke-orig.jpg',
      status: 'APPROVED',
      isVisible: true,
      storageKey: 'smoke-orig.jpg',
      thumbKey: 'smoke-thumb.jpg',
      deskripsi: 'Foto publik untuk uji endpoint galeri',
      kategori: 'Kegiatan',
      uploaderId: MEMBER_ID,
      reviewerId: MOD_ID,
      reviewedAt: new Date(),
    },
  });
  createdIds.push(approvedId);

  // ── 1. Pagination FIFO + envelope + counts ──
  const p1 = await req('/galeri/admin?status=PENDING&page=1&limit=20', { auth: modToken });
  check('list PENDING page1 status 200', p1.status === 200, JSON.stringify(p1.body).slice(0, 200));
  check('page1 berisi 20 item', p1.body?.data?.length === 20, `dapat ${p1.body?.data?.length}`);
  check('page1 FIFO: FOTO 01 lebih dulu', p1.body?.data?.[0]?.judul === 'SMOKE FOTO 01', p1.body?.data?.[0]?.judul);
  check('meta.total = 26', p1.body?.meta?.total === 26, String(p1.body?.meta?.total));
  check('meta.counts.PENDING = 26', p1.body?.meta?.counts?.PENDING === 26, JSON.stringify(p1.body?.meta?.counts));

  const p2 = await req('/galeri/admin?status=PENDING&page=2&limit=20', { auth: modToken });
  check('page2 berisi 6 item', p2.body?.data?.length === 6, `dapat ${p2.body?.data?.length}`);
  check('page2 diawali FOTO 21', p2.body?.data?.[0]?.judul === 'SMOKE FOTO 21', p2.body?.data?.[0]?.judul);

  const bogus = await req('/galeri/admin?status=BOGUS&page=abc&limit=-5', { auth: modToken });
  check('status BOGUS diabaikan (tanpa filter)', bogus.status === 200 && bogus.body?.data?.length === 20, String(bogus.status));
  check('page=abc → 1, limit=-5 → 20', bogus.body?.meta?.page === 1 && bogus.body?.meta?.limit === 20, JSON.stringify(bogus.body?.meta));

  // ── 2. Endpoint publik ──
  const pub = await req('/public/galeri');
  const pubItem = pub.body?.data?.find((x) => x.id === approvedId);
  check('galeri publik memuat item APPROVED', !!pubItem, 'tidak ditemukan');
  check('item publik punya thumbnailUrl', pubItem?.thumbnailUrl === `/galeri/${approvedId}/thumbnail`, JSON.stringify(pubItem));
  check('item publik tidak membocorkan storageKey', pubItem && !('storageKey' in pubItem), JSON.stringify(pubItem));

  const thumb = await req(`/galeri/${approvedId}/thumbnail`, { raw: true });
  check('thumbnail publik 200 image/jpeg', thumb.status === 200 && thumb.type?.includes('image/jpeg') && thumb.bytes > 100, JSON.stringify(thumb));
  const image = await req(`/galeri/${approvedId}/image`, { raw: true });
  check('image publik 200', image.status === 200 && image.bytes > 100, JSON.stringify(image));

  // ── 3. Otorisasi ──
  const noAuth = await req('/galeri/admin');
  check('admin list tanpa token → 401', noAuth.status === 401, String(noAuth.status));
  const forbidden = await req('/galeri/admin', { auth: memberToken });
  check('admin list role anggota → 403', forbidden.status === 403, String(forbidden.status));

  // ── 4. Socket + bulk ──
  const events = [];
  socket = io('http://localhost:3011', { auth: { token: modToken }, transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket timeout')), 8000);
    socket.on('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
  socket.on('galeri:queue', (data) => events.push(data));

  const bulkIds = p1.body.data.slice(0, 3).map((x) => x.id);
  const bulk = await req('/galeri/review/bulk', { method: 'PATCH', auth: modToken, body: { ids: bulkIds, status: 'APPROVED' } });
  check('bulk 3 item → updated 3', bulk.status === 200 && bulk.body?.data?.updated === 3, JSON.stringify(bulk.body));
  await new Promise((r) => setTimeout(r, 1200));
  check('bulk mengirim tepat 1 event galeri:queue', events.length === 1, `dapat ${events.length}`);
  check('payload event {pending:23}', events[0]?.pending === 23, JSON.stringify(events[0]));

  const after = await req('/galeri/admin?status=PENDING&page=1&limit=20', { auth: modToken });
  check('counts PENDING turun ke 23', after.body?.meta?.counts?.PENDING === 23, JSON.stringify(after.body?.meta?.counts));

  const logCount = await db.galeriModerationLog.count({ where: { galeriId: bulkIds[0] } });
  check('log moderasi tercatat per item', logCount === 1, String(logCount));

  const history = await req(`/galeri/admin/${bulkIds[0]}/history`, { auth: modToken });
  check('riwayat moderasi 200 + 1 entri', history.status === 200 && history.body?.data?.length === 1, JSON.stringify(history.body));
  check('riwayat memuat nama aktor', !!history.body?.data?.[0]?.actor?.namaLengkap, JSON.stringify(history.body?.data?.[0]));

  // ── 5. Larangan meninjau unggahan sendiri ──
  const selfReview = await req(`/galeri/${selfId}/review`, { method: 'PATCH', auth: modToken, body: { status: 'APPROVED' } });
  check('review unggahan sendiri → 403', selfReview.status === 403, String(selfReview.status));
  const mixed = await req('/galeri/review/bulk', {
    method: 'PATCH',
    auth: modToken,
    body: { ids: [selfId, p2.body.data[0].id], status: 'APPROVED' },
  });
  check('bulk campur → updated 1, failed 1 (self)', mixed.body?.data?.updated === 1 && mixed.body?.data?.failed?.length === 1, JSON.stringify(mixed.body));

  // ── 6. Validasi unggahan + thumbnail ──
  const invalidForm = new FormData();
  invalidForm.append('judul', 'SMOKE INVALID');
  invalidForm.append('kategori', 'Ngawur');
  invalidForm.append('file', new Blob([origJpeg], { type: 'image/jpeg' }), 'x.jpg');
  const invalid = await req('/galeri/upload', { method: 'POST', auth: memberToken, body: invalidForm });
  check('kategori tidak valid → 400', invalid.status === 400, String(invalid.status));

  const shortForm = new FormData();
  shortForm.append('judul', 'SMOKE SHORT');
  shortForm.append('deskripsi', 'pendek');
  shortForm.append('file', new Blob([origJpeg], { type: 'image/jpeg' }), 'x.jpg');
  const shortDesc = await req('/galeri/upload', { method: 'POST', auth: memberToken, body: shortForm });
  check('deskripsi < 20 karakter → 400', shortDesc.status === 400, String(shortDesc.status));

  const form = new FormData();
  form.append('judul', 'SMOKE UPLOAD');
  form.append('kategori', 'Kegiatan');
  form.append('deskripsi', 'Deskripsi unggahan uji yang cukup panjang.');
  form.append('file', new Blob([origJpeg], { type: 'image/jpeg' }), 'x.jpg');
  const upload = await req('/galeri/upload', { method: 'POST', auth: memberToken, body: form });
  const uploaded = upload.body?.data;
  check('unggah valid → 201 + thumbKey', upload.status === 201 && !!uploaded?.thumbKey, JSON.stringify(upload.body).slice(0, 200));
  if (uploaded) {
    createdIds.push(uploaded.id);
    const uploadedThumb = await req(`/galeri/admin/${uploaded.id}/thumbnail`, { auth: modToken, raw: true });
    check('thumbnail admin 200 untuk unggahan baru', uploadedThumb.status === 200 && uploadedThumb.bytes > 100, JSON.stringify(uploadedThumb));
  }

  // ── 6b. Pengerasan unggahan: batas piksel + re-encode ──
  const hugeJpeg = await sharp({ create: { width: 9000, height: 3000, channels: 3, background: '#8899aa' } })
    .jpeg({ quality: 50 })
    .toBuffer();
  const hugeForm = new FormData();
  hugeForm.append('judul', 'SMOKE HUGE');
  hugeForm.append('file', new Blob([hugeJpeg], { type: 'image/jpeg' }), 'huge.jpg');
  const huge = await req('/galeri/upload', { method: 'POST', auth: memberToken, body: hugeForm });
  check(
    'dimensi 9000x3000 ditolak → 400',
    huge.status === 400 && /Dimensi foto terlalu besar/.test(JSON.stringify(huge.body)),
    JSON.stringify(huge.body).slice(0, 160),
  );

  const exifJpeg = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#aa6633' } })
    .jpeg()
    .withMetadata({ orientation: 6, exif: { IFD0: { ImageDescription: 'SMOKE-EXIF' } } })
    .toBuffer();
  const exifForm = new FormData();
  exifForm.append('judul', 'SMOKE EXIF');
  exifForm.append('deskripsi', 'Unggahan ber-EXIF untuk memastikan metadata terbuang.');
  exifForm.append('file', new Blob([exifJpeg], { type: 'image/jpeg' }), 'exif.jpg');
  const exifUpload = await req('/galeri/upload', { method: 'POST', auth: memberToken, body: exifForm });
  const exifItem = exifUpload.body?.data;
  check('unggah JPEG ber-EXIF → 201', exifUpload.status === 201 && !!exifItem?.storageKey, JSON.stringify(exifUpload.body).slice(0, 160));
  if (exifItem) {
    createdIds.push(exifItem.id);
    const stored = await fs.readFile(join(STORAGE, exifItem.storageKey));
    const storedMeta = await sharp(stored).metadata();
    check('byte asli tidak disimpan (hasil re-encode)', !stored.equals(exifJpeg), 'byte identik dengan input');
    check('EXIF/GPS terbuang', !storedMeta.exif && !stored.includes('SMOKE-EXIF'), JSON.stringify({ exif: !!storedMeta.exif }));
    check('orientasi EXIF diterapkan (40x20 → 20x40)', storedMeta.width === 20 && storedMeta.height === 40, `${storedMeta.width}x${storedMeta.height}`);
  }

  const heicForm = new FormData();
  heicForm.append('judul', 'SMOKE HEIC');
  const heicBytes = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(16)]);
  heicForm.append('file', new Blob([heicBytes], { type: 'image/heic' }), 'foto.heic');
  const heic = await req('/galeri/upload', { method: 'POST', auth: memberToken, body: heicForm });
  check('HEIC ditolak dengan pesan format → 400', heic.status === 400 && /JPEG, PNG, atau WebP/.test(JSON.stringify(heic.body)), JSON.stringify(heic.body).slice(0, 160));

  const pngJpeg = await sharp({ create: { width: 30, height: 30, channels: 3, background: '#336633' } }).png().toBuffer();
  const pngForm = new FormData();
  pngForm.append('judul', 'SMOKE PNG');
  pngForm.append('file', new Blob([pngJpeg], { type: 'image/png' }), 'foto-asli.png');
  const pngUpload = await req('/galeri/upload', { method: 'POST', auth: memberToken, body: pngForm });
  const pngItem = pngUpload.body?.data;
  check(
    'PNG dinormalkan ke JPEG',
    pngUpload.status === 201 && pngItem?.mimeType === 'image/jpeg' && String(pngItem?.fileName).endsWith('.jpg'),
    JSON.stringify(pngItem).slice(0, 160),
  );
  if (pngItem) {
    createdIds.push(pngItem.id);
    const pngStored = await fs.readFile(join(STORAGE, pngItem.storageKey));
    check('isi file tersimpan benar-benar JPEG', pngStored[0] === 0xff && pngStored[1] === 0xd8, 'bukan magic JPEG');
  }

  // ── 7. Batas peran: hanya superadmin & admin_berita ──
  const beritaList = await req('/galeri/admin', { auth: roleTokens.admin_berita });
  check('admin_berita boleh lihat antrian → 200', beritaList.status === 200, String(beritaList.status));

  const beritaPending = randomUUID();
  await db.galeri.create({
    data: {
      id: beritaPending,
      judul: 'SMOKE BERITA',
      gambar: '/galeri/smoke-berita.jpg',
      status: 'PENDING',
      isVisible: false,
      storageKey: 'smoke-berita.jpg',
      thumbKey: 'smoke-berita-thumb.jpg',
      uploaderId: MEMBER_ID,
    },
  });
  createdIds.push(beritaPending);
  const beritaReview = await req(`/galeri/${beritaPending}/review`, {
    method: 'PATCH',
    auth: roleTokens.admin_berita,
    body: { status: 'APPROVED' },
  });
  check('admin_berita boleh memutuskan → 200 APPROVED', beritaReview.status === 200 && beritaReview.body?.data?.status === 'APPROVED', JSON.stringify(beritaReview.body).slice(0, 160));

  for (const role of ['admin_distrik', 'admin_ranting']) {
    const list = await req('/galeri/admin', { auth: roleTokens[role] });
    check(`${role} ditolak dari daftar admin → 403`, list.status === 403, String(list.status));
    const review = await req(`/galeri/${approvedId}/review`, { method: 'PATCH', auth: roleTokens[role], body: { status: 'APPROVED' } });
    check(`${role} ditolak dari review → 403`, review.status === 403, String(review.status));
    const bulkDenied = await req('/galeri/review/bulk', { method: 'PATCH', auth: roleTokens[role], body: { ids: [approvedId], status: 'APPROVED' } });
    check(`${role} ditolak dari review/bulk → 403`, bulkDenied.status === 403, String(bulkDenied.status));
    const historyDenied = await req(`/galeri/admin/${approvedId}/history`, { auth: roleTokens[role] });
    check(`${role} ditolak dari riwayat → 403`, historyDenied.status === 403, String(historyDenied.status));
    const thumbDenied = await req(`/galeri/admin/${approvedId}/thumbnail`, { auth: roleTokens[role], raw: true });
    check(`${role} ditolak dari thumbnail admin → 403`, thumbDenied.status === 403, String(thumbDenied.status));
    const imageDenied = await req(`/galeri/admin/${approvedId}/image`, { auth: roleTokens[role], raw: true });
    check(`${role} ditolak dari image admin → 403`, imageDenied.status === 403, String(imageDenied.status));
  }

  // ── 8. Hapus foto: pemilik, superadmin, admin_berita ──
  const newPendingForDelete = async (label) =>
    db.galeri.create({
      data: {
        judul: label,
        gambar: '/galeri/smoke-del.jpg',
        status: 'PENDING',
        isVisible: false,
        storageKey: `smoke-del-${randomUUID()}.jpg`,
        thumbKey: `smoke-del-${randomUUID()}-thumb.jpg`,
        uploaderId: MEMBER_ID,
      },
    });

  const otherRow = await newPendingForDelete('SMOKE HAPUS 1');
  const deniedDelete = await req(`/galeri/${otherRow.id}`, { method: 'DELETE', auth: roleTokens.admin_distrik });
  check('admin_distrik hapus foto orang lain → 403', deniedDelete.status === 403, String(deniedDelete.status));
  check('foto tetap ada setelah 403', (await db.galeri.count({ where: { id: otherRow.id } })) === 1, 'terhapus');

  const ownRow = await newPendingForDelete('SMOKE HAPUS 2');
  const ownDelete = await req(`/galeri/${ownRow.id}`, { method: 'DELETE', auth: memberToken });
  check('pemilik hapus unggahannya sendiri → 200', ownDelete.status === 200 && (await db.galeri.count({ where: { id: ownRow.id } })) === 0, JSON.stringify(ownDelete.body));

  const beritaRow = await newPendingForDelete('SMOKE HAPUS 3');
  const beritaDelete = await req(`/galeri/${beritaRow.id}`, { method: 'DELETE', auth: roleTokens.admin_berita });
  check('admin_berita hapus foto orang lain → 200', beritaDelete.status === 200 && (await db.galeri.count({ where: { id: beritaRow.id } })) === 0, JSON.stringify(beritaDelete.body));

  const superRow = await newPendingForDelete('SMOKE HAPUS 4');
  const superDelete = await req(`/galeri/${superRow.id}`, { method: 'DELETE', auth: modToken });
  check('superadmin hapus foto orang lain → 200', superDelete.status === 200 && (await db.galeri.count({ where: { id: superRow.id } })) === 0, JSON.stringify(superDelete.body));
} catch (err) {
  check('skrip uji selesai tanpa exception', false, String(err));
} finally {
  socket?.disconnect();
  const leftovers = await db.galeri
    .findMany({ where: { judul: { startsWith: 'SMOKE' } }, select: { storageKey: true, thumbKey: true } })
    .catch(() => []);
  for (const row of leftovers) {
    for (const key of [row.storageKey, row.thumbKey]) {
      if (key) await fs.unlink(join(STORAGE, key)).catch(() => undefined);
    }
  }
  await db.galeri.deleteMany({ where: { judul: { startsWith: 'SMOKE' } } }).catch(() => undefined);
  if (tempUserIds.length) {
    await db.user.deleteMany({ where: { id: { in: tempUserIds } } }).catch(() => undefined);
  }
  for (const name of await fs.readdir(STORAGE).catch(() => [])) {
    if (name.startsWith('smoke-')) await fs.unlink(join(STORAGE, name)).catch(() => undefined);
  }
  await db.$disconnect();
}

clearTimeout(watchdog);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} cek lolos`);
process.exit(failed.length ? 1 : 0);
