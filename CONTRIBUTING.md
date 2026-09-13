# Contributing to THS-THM System

## 📋 Coding Conventions

### API Fetching Patterns

Always use the shared hooks instead of manual `useEffect` + `useState` + `useCallback`:

| Hook                  | Use Case                              | File                                |
| --------------------- | ------------------------------------- | ----------------------------------- |
| `useApi<T>`           | Single data fetch                     | `web/src/lib/hooks/use-api.ts`      |
| `usePaginatedList<T>` | Paginated list with `data` and `meta` | `web/src/lib/hooks/use-api.ts`      |
| `useDebounce<T>`      | Debounce search input                 | `web/src/lib/hooks/use-debounce.ts` |

**✅ DO:** Use hooks for all API data fetching:

```tsx
// Single fetch
const { data, loading, error, refetch } = useApi<Dashboard>(
  () => apiClient.get('/endpoint').then((r) => r.data),
  [],
);

// Paginated list
const { data, meta, loading, refetch } = usePaginatedList<Item>(
  () => apiClient.get('/items', { params: { page, limit: 10 } }).then((r) => r.data),
  [page],
);
```

**❌ DON'T:** Use manual `useEffect` + `useState` + `useCallback`:

```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const fetchData = useCallback(async () => { ... }, []);
useEffect(() => { fetchData(); }, [fetchData]);
```

### Response Unwrapping

Use the `unwrap` helper to extract data from API responses:

```tsx
import apiClient, { unwrap } from '@/lib/api-client';

// ✅ DO: Use unwrap
setData(unwrap(response));

// ✅ DO: Use unwrap with explicit type
const items = unwrap<Item[]>(response);

// ❌ DON'T: Access .data.data directly
setData(response.data.data);
```

For API responses with a `.success` check, destructure instead:

```tsx
// ✅ DO: Destructure
const { success, data: result } = response.data;
if (success) setStats(result);

// ❌ DON'T: Chain .data.data
if (response.data.success) setStats(response.data.data);
```

### Shared UI Components

| Component             | Location                               | Usage                             |
| --------------------- | -------------------------------------- | --------------------------------- |
| `PageHeader`          | `web/src/components/ui/page-header`    | Page title + refresh              |
| `PageContainer`       | `web/src/components/ui/page-container` | Standard page wrapper             |
| `DataTable`           | `web/src/components/ui/data-table`     | Table + pagination + empty states |
| `SearchBar`           | `web/src/components/ui/search-bar`     | Search input with debounce        |
| `FilterSelect`        | `web/src/components/ui/filter-select`  | Dropdown filter                   |
| `SummaryBar`          | `web/src/components/ui/summary-bar`    | Total count display               |
| `buildEmptyMessage()` | `web/src/lib/hooks/use-api`            | Empty state text builder          |
| `LoadingView`         | `mobile/src/components/ui/shared`      | Loading spinner                   |
| `FilterChips`         | `mobile/src/components/ui/shared`      | Horizontal filter chips           |

### TypeScript Best Practices

1. **Don't use `any`** — prefer `unknown` with proper narrowing
2. **Define interfaces locally** in each page file unless shared across multiple pages
3. **Use `Record<string, unknown>`** for dynamic params objects instead of `any`
4. **Prefer `const { data } = await fetch()`** over `const res = await fetch(); res.data`

### Import Order

1. React / Next.js
2. Third-party libraries (axios, recharts, lucide-react, etc.)
3. Internal modules (`@/lib/`, `@/components/`)
4. Types/interfaces (defined in-file or imported)

### ESLint Rules

A custom `no-restricted-syntax` rule warns against `.data.data` patterns. Run `npx eslint .` to check for violations.

---

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev

# Run tests
pnpm test

# TypeScript check
pnpm typecheck
```

## 📁 Project Structure

```
apps/
├── api/          # NestJS backend
├── web/          # Next.js admin dashboard
├── mobile/       # Expo React Native app
└── mobile-flutter/ # Flutter rewrite (scaffold)
packages/
├── templates/    # Document templates
├── csv_templates/ # CSV import templates (+ contoh data)
└── shared-types/ # Tipe TypeScript bersama
docs/             # SEMUA dokumentasi & panduan
```

---

## 🗂️ Struktur Dokumentasi (`docs/`)

Semua dokumentasi hidup di `docs/` — **bukan di root**. Struktur:

| Lokasi                  | Isi                                                        |
| ----------------------- | ---------------------------------------------------------- |
| `docs/SPEC/`, `PRD/`, `BRD/`, `ERD/`, `DFD/`, `QA/`, `API/`, `Roadmap/`, `Roles/`, `Prompt_AI/` | Dokumen perencanaan & spesifikasi (lihat `docs/README.md`) |
| `docs/*.md` (root folder docs) | Panduan operasional: `QUICK_START`, `DOCKER_DEV_SETUP`, `DEPLOY-ths-thm`, `EMAIL_TEMPLATES`, `TESTING`, `TENANT-ISOLATION`, `DEPLOYMENT_SAFETY`, `COOKBOOK-BaseCrudService`, dst. |
| `docs/archive/`         | Dokumen usang/snapshot sesi — disimpan sebagai referensi, tidak lagi dirawat |

Aturan:

1. **Panduan baru → `docs/<NAMA>.md`**, lalu daftarkan di tabel `docs/README.md`.
2. **Dokumen tidak lagi relevan → pindah ke `docs/archive/`**, jangan dibiarkan membingungkan di depan.
3. README.md root hanya berisi overview + link ke `docs/` — tidak untuk log/append otomatis.
4. **File kredensial (plist/JSON Firebase, client secret) tidak boleh disimpan di `docs/`** — dokumentasi berarti dibagikan; kredensial tidak.

## 🧹 Kebersihan Repo: Artefak Tidak Boleh di Root

Root hanya untuk file konfigurasi proyek. Inventaris root yang **diperbolehkan**:

- Konfigurasi toolchain: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`, `.gitignore`, `.gitattributes`, konfigurasi lint/format
- Docker & deploy: `docker-compose*.yml`, `Dockerfile.dev*`, `render.yaml`, `ecosystem.config.js`, `setup.ps1`, `deploy-to-vps.ps1`
- Dokumen repo: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`

**Tidak boleh commit ke root** (atau mana pun di repo):

| Kategori | Contoh | Harus ke mana |
| -------- | ------ | ------------- |
| Log & output debug | `api-server.log`, `api-error.txt`, `migrate-out.log` | Jangan commit — jalur lokal sudah di-`.gitignore`; tempel potongan relevan ke issue/PR |
| Artefak build | `.apk`, `.ipa`, `.zip` hasil build | Store/release (Play Console, TestFlight), bukan repo |
| Media mentah | video demo, hasil rekaman, gambar satu kali | Drive/storage tim; aset aplikasi resmi ke `apps/*/public` atau `apps/*/assets` |
| Skrip sekali pakai | helper encode/decode, script eksperimen | Hapus setelah selesai, atau masuk `scripts/` jika layak dirawat |
| Data berisi PII | CSV/XLSX anggota asli | Jangan pernah masuk repo — simpan di drive terbatas akses |
| Kredensial | `*firebase-adminsdk*.json`, `*client_secret*.json`, `.env*`, keystore | Secret manager / penyimpanan aman; jalurnya sudah di-`.gitignore` |
| Dokumen MD ad-hoc | `START_HERE.md`, `SETUP_STATUS.md` | `docs/` (aktif) atau `docs/archive/` (usang) |

Penegakan otomatis:

1. **`.gitignore`** mencegah pola umum (`.env`, `*client_secret*`, `*firebase-adminsdk*`, keystore, dll.) ter-track.
2. **Pre-commit hook gitleaks** (`bash scripts/install-hooks.sh`) memindai staged changes — commit berisi secret **ditolak**. Konfigurasi: `.gitleaks.toml`.
3. **CI `security-scan.yml`** menjalankan gitleaks atas full history + working tree pada setiap push/PR.

Jika hook memblokir commit Anda: bukan bug — kemungkinan ada kredensial di staged changes. Rotasi/hapus, lalu commit ulang. (Bypass darurat: `git commit --no-verify` — gunakan dengan sangat hemat.)
