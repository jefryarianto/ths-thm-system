// Reproduce the org-chart-editor "Gagal memuat data kepengurusan" error locally.
const BASE = 'http://127.0.0.1:3001/api';

const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'superadmin@ths-thm.org', password: '5tr6w1nG#1' }),
});
const loginBody = await login.json().catch(() => null);
console.log('login status:', login.status);
if (!login.ok) {
  console.log(JSON.stringify(loginBody).slice(0, 500));
  process.exit(1);
}
const token = loginBody?.data?.accessToken;
console.log('token length:', token?.length);

const queries = ['level=nasional', '', 'level=nasional&unitId=abc', 'level=ranting', 'level=wilayah'];
for (const q of queries) {
  const res = await fetch(`${BASE}/kepengurusan?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  console.log(`\n--- GET /kepengurusan?${q}`);
  console.log('status:', res.status);
  console.log(text.slice(0, 600));
}
