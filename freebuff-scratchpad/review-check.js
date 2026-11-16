const { io } = require('socket.io-client');
const fs = require('fs');
const API = 'http://localhost:3011';
const login = async (identifier, password) => {
  const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier, password }) });
  return (await r.json()).data.accessToken;
};
const upload = async (token, judul) => {
  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync('../../freebuff-scratchpad/uji2.jpg')], { type: 'image/jpeg' }), 'x.jpg');
  fd.append('judul', judul);
  fd.append('deskripsi', 'Foto uji penyederhanaan alur moderasi galeri berpaginasi.');
  fd.append('kategori', 'Kegiatan');
  const r = await fetch(`${API}/api/galeri/upload`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
  return (await r.json()).data;
};
const api = async (path, token) => (await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })).json();
(async () => {
  const mod = await login('qa.mod@ths-thm.local', 'UjiGaleri#2026');
  const member = await login('qa.anggota@ths-thm.local', 'UjiGaleri#2026');
  const items = [];
  for (let i = 1; i <= 4; i++) items.push(await upload(member, `Uji Ringkas ${i}`));

  const socket = io(API, { auth: { token: mod }, reconnection: false });
  const events = [];
  socket.on('galeri:queue', (d) => events.push(d.pending));
  await new Promise((res) => socket.on('connect', res));

  const before = await api('/api/galeri/admin?status=PENDING&page=1&limit=2', mod);
  console.log('LIST_PAGE1', JSON.stringify({ total: before.meta.total, page: before.meta.page, limit: before.meta.limit, totalPages: before.meta.totalPages, rows: before.data.length, counts: before.meta.counts, first: before.data[0]?.judul }));

  const bogus = await api('/api/galeri/admin?status=PENDING&page=abc&limit=-5', mod);
  console.log('LIST_BAD_QUERY', JSON.stringify({ page: bogus.meta.page, limit: bogus.meta.limit, rows: bogus.data.length }));

  const unknown = await api('/api/galeri/admin?status=BOGUS&page=1&limit=50', mod);
  console.log('LIST_UNKNOWN_STATUS', JSON.stringify({ total: unknown.meta.total, rows: unknown.data.length, counts: unknown.meta.counts }));

  const ids = items.slice(0, 2).map((x) => x.id);
  const bulk = await fetch(`${API}/api/galeri/review/bulk`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mod}` }, body: JSON.stringify({ ids, status: 'APPROVED' }) });
  console.log('BULK', JSON.stringify((await bulk.json()).data));
  await new Promise((r) => setTimeout(r, 800));
  console.log('SOCKET_EVENTS', JSON.stringify(events));

  const after = await api('/api/galeri/admin?status=PENDING&page=1&limit=20', mod);
  console.log('AFTER', JSON.stringify({ total: after.meta.total, counts: after.meta.counts, first: after.data[0]?.judul }));
  socket.close();
  process.exit(0);
})();
