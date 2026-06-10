# Contributing to THS-THM System

## 📋 Coding Conventions

### API Fetching Patterns

Always use the shared hooks instead of manual `useEffect` + `useState` + `useCallback`:

| Hook | Use Case | File |
|------|----------|------|
| `useApi<T>` | Single data fetch | `web/src/lib/hooks/use-api.ts` |
| `usePaginatedList<T>` | Paginated list with `data` and `meta` | `web/src/lib/hooks/use-api.ts` |
| `useDebounce<T>` | Debounce search input | `web/src/lib/hooks/use-debounce.ts` |

**✅ DO:** Use hooks for all API data fetching:
```tsx
// Single fetch
const { data, loading, error, refetch } = useApi<Dashboard>(
  () => apiClient.get('/endpoint').then(r => r.data),
  []
);

// Paginated list
const { data, meta, loading, refetch } = usePaginatedList<Item>(
  () => apiClient.get('/items', { params: { page, limit: 10 } }).then(r => r.data),
  [page]
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

| Component | Location | Usage |
|-----------|----------|-------|
| `PageHeader` | `web/src/components/ui/page-header` | Page title + refresh |
| `PageContainer` | `web/src/components/ui/page-container` | Standard page wrapper |
| `DataTable` | `web/src/components/ui/data-table` | Table + pagination + empty states |
| `SearchBar` | `web/src/components/ui/search-bar` | Search input with debounce |
| `FilterSelect` | `web/src/components/ui/filter-select` | Dropdown filter |
| `SummaryBar` | `web/src/components/ui/summary-bar` | Total count display |
| `buildEmptyMessage()` | `web/src/lib/hooks/use-api` | Empty state text builder |
| `LoadingView` | `mobile/src/components/ui/shared` | Loading spinner |
| `FilterChips` | `mobile/src/components/ui/shared` | Horizontal filter chips |

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
└── mobile/       # Expo React Native app
packages/
├── templates/    # Document templates
└── csv_templates/ # CSV import templates
docs/             # Documentation & wiki
```
