# Shared UI Components Reference

This document catalogs all shared UI components that were extracted during the refactoring process. Use these components instead of writing inline code to maintain consistency and reduce duplication.

---

## StatCard — `@/components/cards/stat-card`

The canonical stat card component. Used across the entire app for displaying metrics.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string` | required | Card label |
| `value` | `string \| number` | required | Main value to display |
| `icon` | `ReactNode` | required | Icon element (e.g., `<Users size={20} />`) |
| `color` | `'blue' \| 'green' \| 'yellow' \| 'red' \| 'purple' \| 'orange' \| 'indigo' \| 'teal' \| 'pink' \| 'cyan' \| 'amber' \| 'slate'` | `'blue'` | Color theme |
| `variant` | `'large' \| 'mini'` | `'large'` | Size variant |
| `sub` | `string` | — | Optional subtitle (large variant only) |

**Usage:**

```tsx
import StatCard from '@/components/cards/stat-card';

// Large (default) variant
<StatCard label="Total Iuran" value="Rp 15jt" icon={<DollarSign size={20} />} color="blue" sub="Keseluruhan" />

// Mini variant (compact, icon on left)
<StatCard label="Hadir" value={42} icon={<Users size={18} />} color="green" variant="mini" />
```

**Consumed by:**

- `gamification/StatCards` — gamification dashboard
- `members/MemberStatCards` — members list page
- `reports/ReportsStatCard` — reports overview tab
- `dues/DuesStatCards` — dues page (both main cards + mini row)
- `trainings/[id]/page` — training detail stats
- `graduations/[id]/page` — graduation detail stats
- `notifications/page` — notification stats
- `cards/stat-card` tests in `components/ui/__tests__/shared-components.test.tsx`

---

## DetailRow — `@/components/ui/detail-row`

Display row with icon, label, and value. Supports optional clickable links.

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `ComponentType<{size?: number; className?: string}>` | required | Icon component (not element) |
| `label` | `string` | required | Row label (shown uppercase) |
| `value` | `string \| null` | required | Display value; shows "Tidak ada data" when null |
| `href` | `string` | — | If provided, wraps the row in an `<a>` link |
| `hoverable` | `boolean` | `true` | Disables hover/truncate effects when `false` |

**Usage:**

```tsx
import DetailRow from '@/components/ui/detail-row';

// Static row
<DetailRow icon={User} label="Nama Lengkap" value="Budi Santoso" />

// Clickable row
<DetailRow icon={Mail} label="Email" value="test@example.com" href="mailto:test@example.com" />

// Non-interactive row (no hover)
<DetailRow icon={Calendar} label="Tanggal" value="15 Jan 2025" hoverable={false} />
```

**Exported as `InfoRow` in:**

- `candidates/constants` — candidate detail pages
- `members/constants` — member detail pages
- `trainings/constants` — training detail pages (with `hoverable={false}`)

---

## StatusBadge — Multiple Locations

Each module has its own `StatusBadge` component that reflects its specific status values.

### Registrations — `@/components/registrations/constants`

Statuses: `pending`, `verified`, `approved`, `rejected`

```tsx
import { StatusBadge, STATUS_OPTIONS } from '@/components/registrations/constants';
<StatusBadge status="verified" />;
```

### Candidates — `@/components/candidates/constants`

Statuses: `diusulkan`, `mengikuti_pendadaran`, `lulus`, `gagal`, `dibatalkan` (includes icon)

```tsx
import { StatusBadge, STATUS_STYLES } from '@/components/candidates/constants';
<StatusBadge status="lulus" />;
```

### Members — `@/components/members/constants`

Supports both flat and nested label maps.

```tsx
import { StatusBadge, FLAT_STATUS_LABELS } from '@/components/members/constants';
<StatusBadge status="aktif" bordered /> {/* Border style for detail pages */}
<StatusBadge status="pending" labels={STATUS_LABELS.validasi} />
```

### Claims — `@/components/claims/constants`

Statuses: `pending`, `diproses`, `disetujui`, `ditolak` (colors only, no component)

```tsx
import { STATUS_COLORS, STATUS_OPTIONS } from '@/components/claims/constants';
```

### Activities — `@/components/activities/constants`

```tsx
import { ACTIVITY_STATUS_COLORS, ACTIVITY_STATUS_OPTIONS } from '@/components/activities/constants';
```

---

## DetailSkeleton — Multiple Locations

Loading skeleton components for detail pages.

| Location                | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `candidates/constants`  | Candidate profile (avatar + header skeleton)     |
| `members/constants`     | Member profile (avatar + header + 2-column grid) |
| `graduations/constants` | Simple card skeleton                             |
| `trainings/constants`   | Simple card skeleton                             |

---

## Constants Files — Filter Options & Labels

| Module        | File                                     | Exports                                                                                                                      |
| ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Activities    | `components/activities/constants.ts`     | `ACTIVITY_STATUS_COLORS`, `ACTIVITY_STATUS_OPTIONS`, `ACTIVITY_TIPE_OPTIONS`                                                 |
| Users         | `components/users/constants.ts`          | `ROLE_OPTIONS`, `ROLE_BADGES`, `ROLE_LABELS`                                                                                 |
| Members       | `components/members/constants.tsx`       | `STATUS_BADGES`, `STATUS_LABELS`, `FLAT_STATUS_LABELS`, `DUES_STATUS_STYLES`, `DOCUMENT_TYPES`, `formatRupiah`, `formatDate` |
| Candidates    | `components/candidates/constants.tsx`    | `STATUS_STYLES`, `STATUS_LABELS`, `STATUS_ICONS`, `formatDate`                                                               |
| Graduations   | `components/graduations/constants.tsx`   | `STATUS_STYLES`, `STATUS_LABELS`, `formatDate`, `formatShort`                                                                |
| Registrations | `components/registrations/constants.tsx` | `STATUS_COLORS`, `STATUS_LABELS`, `STATUS_OPTIONS`, `StatusBadge`                                                            |
| Notifications | `components/notifications/constants.ts`  | `TIPE_OPTIONS`, `tipeColors`                                                                                                 |
| Trainings     | `components/trainings/constants.tsx`     | `MATERI_OPTIONS`, `MATERI_LABELS`, `formatDate`, `formatTime`, `InfoRow` (shared DetailRow), `DetailSkeleton`                |
| Claims        | `components/claims/constants.ts`         | `STATUS_COLORS`, `STATUS_OPTIONS`                                                                                            |
| Dashboard     | `components/dashboard/constants.ts`      | `STATUS_COLORS`, `STATUS_LABELS`, `colorMap`, `statConfigs`, `quickActions`, `formatRupiah`, `formatTime`                    |

---

## Component Actions

| Component       | Location                               | Description                                                      |
| --------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `MemberActions` | `components/members/MemberActions.tsx` | Approve/suspend/reactivate/detail buttons for member rows        |
| `DuesStatCards` | `components/dues/DuesStatCards.tsx`    | 4 main stat cards + 4 mini stat row (uses `StatCard` internally) |
| `DuesCharts`    | `components/dues/DuesCharts.tsx`       | Bar chart + pie chart for dues (uses recharts)                   |
| `DetailStats`   | `components/members/constants.tsx`     | 4 stat cards for member detail (uses `StatCard` mini)            |

---

## Migration Tips

- **New detail page**: Use `DetailRow` (or `InfoRow`) + `DetailSkeleton` from the appropriate module's constants file.
- **New stat display**: Use `StatCard` with appropriate `variant` and `color`.
- **New filter select**: Create a constants file exporting `STATUS_OPTIONS` (or equivalent) as `{value, label}[]`.
- **New status badges**: Create a `StatusBadge` component in the module's constants file following the existing patterns.
