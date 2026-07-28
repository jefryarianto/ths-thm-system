# Mobile App Architecture — Shared Component Library

> Last updated: 2026-07-28

## Overview

The mobile app (`apps/mobile/`) uses a shared component library in `src/components/ui/shared.tsx` to eliminate code duplication across 13 detail/reference screens. All shared components live in a single file, making them easy to discover and maintain.

---

## 📦 ScreenShell

The top-level layout wrapper for all detail and reference screens.

### Props

| Prop | Type | Required | Default | Description |
|:-----|:-----|:--------:|:-------:|:------------|
| `title` | `string` | ✅ | — | Header title text |
| `children` | `React.ReactNode` | ✅ | — | Scrollable content |
| `variant` | `'detail' \| 'reference'` | ✅ | — | Controls header paddingTop (60 vs 54) and refresh button |
| `onRefresh` | `() => void` | — | — | Refresh button handler (reference variant only) |
| `badgeLabel` | `string` | — | — | Status badge label text |
| `badgeColor` | `string` | — | — | Badge text color |
| `badgeBg` | `string` | — | — | Badge background color |

### Usage

```tsx
// Detail variant (no refresh button)
<ScreenShell title="Detail Anggota" variant="detail">
  {content}
</ScreenShell>

// Detail variant with status badge
<ScreenShell title="Detail Anggota" variant="detail"
  badgeLabel="Aktif" badgeColor="#16a34a" badgeBg="#ecfdf5">
  {content}
</ScreenShell>

// Reference variant (with refresh button + badge)
<ScreenShell title="Detail Klaim" variant="reference"
  onRefresh={refetch}
  badgeLabel="Diproses" badgeColor="#2563eb" badgeBg="#dbeafe">
  {content}
</ScreenShell>
```

### Consumers (13 screens)

| Variant | Screen | Badge Used? |
|:--------|:-------|:----------:|
| `detail` | members/detail | ✅ statusKeanggotaan |
| `detail` | candidates/detail | ✅ 5 status |
| `detail` | documents/detail | ✅ draft/published/archived |
| `detail` | letters/detail | ✅ 5 status surat |
| `detail` | activities/detail | ✅ published/closed/cancelled |
| `detail` | graduations/detail | ✅ draft/published/closed/cancelled |
| `detail` | trainings/detail | ✅ derived from hariTanggal |
| `detail` | assessments/detail | ✅ STATUS_STYLES |
| `reference` | reference-claim | ✅ pending/diproses/disetujui/ditolak |
| `reference` | reference-letter | ✅ 5 status surat |
| `reference` | reference-document | ✅ draft/published/archived |
| `reference` | reference-member | ✅ statusKeanggotaan |
| `reference` | reference-candidate | ✅ 5 status calon |

---

## 🏷️ TabBar

Tab selector with gray background + blue active state + icon + label.

### Props

| Prop | Type | Required | Description |
|:-----|:-----|:--------:|:------------|
| `tabs` | `{ key: string; label: string; icon: string }[]` | ✅ | Tab definitions |
| `activeKey` | `string` | ✅ | Currently active tab key |
| `onChange` | `(key: string) => void` | ✅ | Handler when tab is pressed |

### Usage

```tsx
const tabs = [
  { key: 'info', label: 'Info', icon: 'information-circle' },
  { key: 'participants', label: `Peserta (${count})`, icon: 'people' },
];

<TabBar tabs={tabs} activeKey={activeTab}
  onChange={(key) => setActiveTab(key as typeof activeTab)} />
```

### Consumers (4 screens)

- activities/detail.tsx
- trainings/detail.tsx
- graduations/detail.tsx
- assessments/detail.tsx

---

## 👤 ProfileCard

Centered profile card with avatar circle + name + status badge + subtitle.

### Props

| Prop | Type | Required | Description |
|:-----|:-----|:--------:|:------------|
| `name` | `string` | ✅ | Full name |
| `initial` | `string` | ✅ | Single character for avatar circle |
| `badgeLabel` | `string` | ✅ | Status label |
| `badgeColor` | `string` | ✅ | Badge text color |
| `badgeBg` | `string` | ✅ | Badge background color |
| `subtitle` | `string` | — | Optional second line (e.g. ranting name) |
| `containerStyle` | `ViewStyle` | — | Custom container styles |

### Usage

```tsx
<ProfileCard
  name={member.namaLengkap}
  initial={member.namaLengkap.charAt(0)}
  badgeLabel="Aktif"
  badgeColor="#16a34a"
  badgeBg="#ecfdf5"
  subtitle={member.ranting?.nama}
  containerStyle={{ margin: 16, marginBottom: 0 }}
/>
```

### Consumers (4 screens)

- members/detail.tsx
- candidates/detail.tsx
- approvals/reference-member.tsx
- approvals/reference-candidate.tsx

---

## 📇 InfoRow

Horizontal key-value row with icon.

### Props

| Prop | Type | Required | Description |
|:-----|:-----|:--------:|:------------|
| `icon` | `string` | ✅ | Ionicons icon name |
| `label` | `string` | ✅ | Uppercase label text |
| `value` | `string` | ✅ | Value text |

### Usage

```tsx
<InfoRow icon="calendar" label="Tanggal" value={formatDate(training.hariTanggal)} />
<InfoRow icon="location" label="Lokasi" value={training.lokasi} />
```

### Consumers (8 screens)

- trainings/detail.tsx (5 InfoRows)
- documents/detail.tsx (4 InfoRows)
- All 5 reference screens (2-6 InfoRows each)
- reference-document.tsx

---

## 📊 StatusCard

Status header card with colored left border, icon box, title, badge, and timeline rows.

### Props

| Prop | Type | Required | Description |
|:-----|:-----|:--------:|:------------|
| `icon` | `string` | ✅ | Ionicons icon name |
| `color` | `string` | ✅ | Accent color (border, text, icon) |
| `bg` | `string` | ✅ | Icon box + badge background |
| `title` | `string` | ✅ | Card title |
| `badgeLabel` | `string` | ✅ | Status badge text |
| `variant` | `'header' \| 'centered'` | — | `'header'` (default) or `'centered'` for letters |
| `createdAt` | `string` | — | Timeline: "Diajukan" date |
| `updatedAt` | `string` | — | Timeline: "Diperbarui" date |
| `subtitle` | `string` | — | Second line (e.g. document number) |
| `id` | `string` | — | ID text at bottom |

### Usage

```tsx
{/* Header variant (default) */}
<StatusCard
  icon="checkmark-circle" color="#16a34a" bg="#dcfce7"
  title="Sertifikat" badgeLabel="Disetujui"
  createdAt={claim.createdAt} updatedAt={claim.updatedAt}
/>

{/* Centered variant (for letters) */}
<StatusCard
  variant="centered"
  icon="mail" color="#16a34a" bg="#ecfdf5"
  title={letter.nomorSurat} badgeLabel="Terkirim"
/>
```

### Consumers (4 reference screens)

- approvals/reference-claim.tsx (header variant)
- approvals/reference-letter.tsx (centered variant)
- approvals/reference-document.tsx (header variant)
- approvals/reference-member.tsx (header — via ProfileCard)
- approvals/reference-candidate.tsx (via ProfileCard)

---

## 🔴 StatusBadge

Small inline badge with colored background and text.

### Props

| Prop | Type | Required | Description |
|:-----|:-----|:--------:|:------------|
| `label` | `string` | ✅ | Badge text |
| `color` | `string` | ✅ | Text color |
| `bg` | `string` | ✅ | Background color |

### Usage

```tsx
<StatusBadge label="Aktif" color="#16a34a" bg="#ecfdf5" />
```

### Consumers (5 screens)

- documents/detail.tsx (inside info row)
- assessments/detail.tsx (inside info row)
- approvals/reference-claim.tsx (via StatusCard)
- approvals/reference-letter.tsx (via StatusCard)
- approvals/reference-document.tsx (via StatusCard)

---

## 🧩 ReferenceScreenState

State handler for loading/error/ID-guard in reference screens.

### Props

| Prop | Type | Required | Description |
|:-----|:-----|:--------:|:------------|
| `id` | `string \| undefined` | ✅ | Item ID (undefined = ID guard) |
| `loading` | `boolean` | ✅ | Loading state |
| `error` | `string \| null` | ✅ | Error message (null = no error) |
| `title` | `string` | ✅ | Screen title for header |
| `onRetry` | `() => void` | ✅ | Retry callback |

### Usage

```tsx
const stateView = (
  <ReferenceScreenState id={id} loading={loading}
    error={error} title="Detail Klaim" onRetry={refetch} />
);
if (stateView) return stateView;
if (!claim) return null;

return (
  <ScreenShell title="Detail Klaim" variant="reference" onRefresh={refetch}>
    {/* ... */}
  </ScreenShell>
);
```

### Consumers (5 reference screens)

All reference screens use this exact pattern: ID guard → loading → error → success content inside ScreenShell.

---

## 🧰 Other Shared Components

| Component | Props | Usage |
|:----------|:------|:------|
| `LoadingView` | `message?: string` | Full-screen loading with spinner |
| `ErrorView` | `message: string; onRetry?: () => void` | Full-screen error with retry button |
| `SectionTitle` | `icon: string; text: string` | Section header with icon |
| `FilterChips` | `options: {value, label}[]; selected: string; onChange: (v) => void` | Horizontal filter chip row |
| `SearchBar` | `value: string; onChangeText: (t) => void; placeholder?: string` | Search input with clear button |

---

## 📁 File Structure

```
src/components/ui/
└── shared.tsx           ← All shared components (~400 lines)

src/screens/
├── activities/detail.tsx       → ScreenShell, TabBar
├── trainings/detail.tsx         → ScreenShell, TabBar, InfoRow
├── graduations/detail.tsx       → ScreenShell, TabBar
├── assessments/detail.tsx       → ScreenShell, TabBar, StatusBadge
├── members/detail.tsx           → ScreenShell, ProfileCard
├── candidates/detail.tsx        → ScreenShell, ProfileCard
├── documents/detail.tsx         → ScreenShell, InfoRow, StatusBadge
├── letters/detail.tsx           → ScreenShell
└── approvals/
    ├── reference-claim.tsx      → ScreenShell(!!!), StatusCard, InfoRow
    ├── reference-letter.tsx     → ScreenShell, StatusCard, InfoRow
    ├── reference-document.tsx   → ScreenShell, StatusCard, InfoRow
    ├── reference-member.tsx     → ScreenShell, ProfileCard, InfoRow
    └── reference-candidate.tsx  → ScreenShell, ProfileCard, InfoRow
```

---

## 📊 Lines of Code Savings

| Component | Consumer Savings | Shared Cost | Net | # Screens |
|:----------|:---------------:|:-----------:|:---:|:---------:|
| `ScreenShell` | −418 | +103 | **−315** | 13 |
| `TabBar` | −141 | +75 | **−66** | 4 |
| `ProfileCard` | −57 | +25 | −32 | 4 |
| `InfoRow` | −45 | +18 | −27 | 8 |
| `StatusCard` | −60 | +60 | 0 | 4 |
| `StatusBadge` | −12 | +6 | −6 | 5 |
| `cardSection` | −5 | +8 | +3 | 5 |
| **Total** | **−738** | **+295** | **−443** | **13** |
