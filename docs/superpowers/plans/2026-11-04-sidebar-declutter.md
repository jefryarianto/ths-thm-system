# Sidebar Declutter & Navigation Upgrade Implementation Plan

**Goal:** Mengurangi kepadatan sidebar: (1) Kurasi default-open, (2) Gabung grup tipis, (3) Dev-only tools, (4) Command Palette ⌘K, (5) Hub Pengaturan.

**Architecture:** 
- `navigation.ts`: Kurasi, gabung grup, `devOnly` flag, `sidebarHidden` flag.
- `Sidebar`: skip item dengan `sidebarHidden`.
- `CommandPalette`: baru, Radix Dialog, cari semua item.
- `SettingsHub`: hub page untuk semua item `sidebarHidden` grup Pengaturan.

**Tech Stack:** Next.js, Tailwind, Radix UI.

## Global Constraints
- `data-testid="login-submit"` dan `data-testid="login-steps"` tetap ada.
- `process.env.NODE_ENV` untuk dev-tools.
- Verifikasi: `vitest` suite, `typecheck`, `lint`, Playwright (login & navigasi).

---

### Task 1: Declutter `navigation.ts` (Fase 1)

**Files:** Modify `apps/web/src/components/layout/navigation.ts`

- [ ] **Step 1: Kurasi DEFAULT_OPEN_GROUPS**
- [ ] **Step 2: Gabung grup tipis (Keuangan→Utama, Pengguna→Keanggotaan)**
- [ ] **Step 3: Dev-only flag & Scan Stats pindah**
- [ ] **Step 4: Gamifikasi (adminOnly/minRole & default-closed)**
- [ ] **Step 5: Test & Commit**

---

### Task 2: Sidebar Skip Render (Fase 1)

**Files:** Modify `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Tambah prop `sidebarHidden` di `SidebarItem`**
- [ ] **Step 2: Skip render `sidebarHidden`**
- [ ] **Step 3: Commit**

---

### Task 3: Command Palette (Fase 2)

**Files:** 
- Create `apps/web/src/components/layout/command-palette.tsx`
- Modify `dashboard-header.tsx`, `layout.tsx`, `globals.css`

- [ ] **Step 1: Test & Implement CommandPalette**
- [ ] **Step 2: Wire ke Layout + Shortcut ⌘K**
- [ ] **Step 3: Commit**

---

### Task 4: Hub Pengaturan (Fase 2)

**Files:** Create `apps/web/app/(dashboard)/settings/page.tsx`, update navigation

- [ ] **Step 1: Buat hub page**
- [ ] **Step 2: Hide sub-settings di sidebar**
- [ ] **Step 3: Test & Commit**

---

### Task 5: Full Suite Verification

- [ ] **Step 1: Jalankan semua suites**
- [ ] **Step 2: Verifikasi Manual**
