# KTA Typography and Preview Alignment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax.

**Goal:** Samakan tipografi dan layout blok signer KTA di web, API PNG/PDF, dan Flutter; kembalikan font UI website ke stack semula; ganti preview HTML lokal dengan output API PNG tanpa watermark.

**Architecture:** `packages/card-design` tetap menjadi source of truth layout KTA. Web dan Flutter membaca konstanta yang sama. API SVG dan React-PDF memetakan konstanta tersebut ke masing-masing renderer. Preview admin memakai endpoint image API yang sudah ada.

**Tech Stack:** Next.js, Vitest, NestJS, Jest, React-PDF, Flutter, Plus Jakarta Sans.

**Spec:** `docs/superpowers/specs/2026-11-27-kta-visual-refresh-design.md`

## Global Constraints
- Font KTA: `Plus Jakarta Sans`. Jangan ganti ke DejaVu.
- Font UI website: sans `['"Inter"', '"Open Sans"', 'Roboto', 'system-ui', 'sans-serif']`; serif `['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif']`.
- `BACK.signer.title = { left: 0, top: 0, fontSize: 18 }`.
- `BACK.signer.name = { left: 0, bottom: 35, fontSize: 18, underline: true }`.
- Nama signer sejajar dengan `TANGGAL TERBIT...`: `y = CARD.H - BACK.signer.bottom - BACK.signer.name.bottom`.
- Stempel hanya render bila data tersedia. Jangan tambah placeholder atau aset baru.
- `previewKTA` memakai `/api/members/{id}/digital-card/image` tanpa watermark. `downloadKTA` untuk PDF/PNG berwatermark tidak diubah.
- Jangan ubah `kta_mobile/`.
- Jangan jalankan repo-wide `flutter analyze` atau `dart format`.
- Jangan commit, push, merge, atau buat PR tanpa permintaan eksplisit.
- Worktree aktif: `C:\ths-thm-system\.worktrees\kta-typography-preview-alignment`.
- File `.env` hanya tersedia di worktree utama; untuk API Jest, source env dari `C:\ths-thm-system\.env` dan `C:\ths-thm-system\apps\api\.env`.

## Verification Commands
- Web unit: dari `apps/web`, jalankan `node "C:\ths-thm-system\.worktrees\kta-typography-preview-alignment\node_modules\vitest\vitest.mjs" run`.
- API unit: dari `apps/api`, source kedua env file di atas, lalu `CI=true node "C:\ths-thm-system\.worktrees\kta-typography-preview-alignment\node_modules\jest\bin\jest.js" --runInBand`.
- Flutter: dari `apps/mobile_flutter`, jalankan `flutter test --reporter expanded`.
- Typecheck: `pnpm --filter @ths-thm/web typecheck` dan `pnpm --filter @ths-thm/api typecheck`.
- Lint: `pnpm --filter @ths-thm/web lint` dan `pnpm --filter @ths-thm/api lint`.

---

### Task 1: Restore website UI font stacks

**Files:**
- Modify: `apps/web/tailwind.config.js:40-41`
- Test: `apps/web/src/lib/kta/__tests__/web-fonts.test.ts`

**Interfaces:**
- Produces: `fontFamily.sans` and `fontFamily.serif` equal the pre-`96ade8bd` stacks.
- Keeps: Plus Jakarta font files and `@font-face` declarations untouched.

- [x] **Step 1: Write failing test**
  - Assert `fontFamily.sans` deep-equals `['"Inter"', '"Open Sans"', 'Roboto', 'system-ui', 'sans-serif']`.
  - Assert `fontFamily.serif` deep-equals `['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif']`.

- [x] **Step 2: Run test to verify it fails**
  - Run targeted Vitest on `src/lib/kta/__tests__/web-fonts.test.ts` from `apps/web`.

- [x] **Step 3: Restore Tailwind font stacks**
  - Change only the two `fontFamily` entries in `apps/web/tailwind.config.js`.

- [x] **Step 4: Run test to verify it passes**
  - Run the same targeted Vitest command.

---

### Task 2: Canonicalize BACK.signer

**Files:**
- Modify: `packages/card-design/index.js:241-250`
- Test: `apps/web/src/lib/kta/__tests__/card-design-signer.test.ts`

**Interfaces:**
- Consumes: existing `BACK.signer`.
- Produces: left-anchored title/name geometry with `fontSize: 18` and `name.bottom: 35`.
- Keeps: signature and stamp geometry unless the shared block shift requires a minimal follow-up test adjustment.

- [x] **Step 1: Write failing test**
  - Assert exact values for `BACK.signer.title`, `BACK.signer.name`, `BACK.signer.underline`, and `BACK.signer.name.bottom`.

- [x] **Step 2: Run test to verify it fails**
  - Run targeted Vitest on `src/lib/kta/__tests__/card-design-signer.test.ts` from `apps/web`.

- [x] **Step 3: Update shared signer spec**
  - Replace right-anchored title/name with left-anchored fields.

- [x] **Step 4: Run test to verify it passes**
  - Run the same targeted Vitest command.

---

### Task 3: Align web KTA signer layout

**Files:**
- Modify: `apps/web/src/components/kta/KtaCard.tsx:57-71,128-133`
- Test: `apps/web/src/components/kta/__tests__/KtaCard.test.tsx`

**Interfaces:**
- Consumes: `BACK.signer`, `pt`, `y`, `W`, `H`.
- Produces: issue text `pt(4)`; left-aligned uppercase title/name; name baseline at `H - BACK.signer.bottom - BACK.signer.name.bottom`; underline from `signerLeft` to `signerLeft + BACK.signer.w`.

- [x] **Step 1: Write failing tests**
  - Assert issue text font size `pt(4)`.
  - Assert title/name `x` equals `W - BACK.signer.w + BACK.signer.left`.
  - Assert title/name font size `pt(4)` and `textAnchor` is absent or `start`.
  - Assert name `y` equals `H - BACK.signer.bottom - BACK.signer.name.bottom`.
  - Assert underline starts at title/name `x` and has width `BACK.signer.w`.
  - Assert stamp is absent when `stempelUrl` is absent.

- [x] **Step 2: Run tests to verify they fail**
  - Run targeted Vitest on `src/components/kta/__tests__/KtaCard.test.tsx` from `apps/web`.

- [x] **Step 3: Update KtaCard**
  - Use shared `BACK.signer` values for issue size, signer title/name, and underline.

- [x] **Step 4: Run tests to verify they pass**
  - Run the same targeted Vitest command.

---

### Task 4: Align API SVG/PNG signer layout

**Files:**
- Modify: `apps/api/src/modules/documents/pdf-templates/card-svg.ts:550-594`
- Test: `apps/api/src/modules/documents/pdf-templates/card-svg.spec.ts:64-78`

**Interfaces:**
- Consumes: `BACK.signer`.
- Produces: `anchor:'start'`, `titleX/nameX = signerLeft + left`, `nameY = CARD.H - bottom - name.bottom`.

- [x] **Step 1: Write failing test**
  - Assert SVG title/name coordinates and anchor match the canonical left-aligned block.

- [x] **Step 2: Run test to verify it fails**
  - Run targeted Jest on `src/modules/documents/pdf-templates/card-svg.spec.ts` from `apps/api` with env loaded.

- [x] **Step 3: Update card-svg renderer**
  - Replace right-aligned signer coordinates with canonical values.

- [x] **Step 4: Run test to verify it passes**
  - Run the same targeted Jest command.

---

### Task 5: Align API React-PDF signer layout

**Files:**
- Modify: `apps/api/src/modules/documents/pdf-templates/member-card.ts:335-363,1077-1109`
- Test: `apps/api/src/modules/documents/pdf-templates/member-card.spec.ts:144-156`

**Interfaces:**
- Consumes: `BACK.signer`.
- Produces: left-aligned title/name with `fontSize: 18` and `name.bottom: 35`.

- [x] **Step 1: Write failing test**
  - Assert PDF signer styles contain `left`, `textAlign:'left'`, `fontSize:18`, and `bottom:35`.

- [x] **Step 2: Run test to verify it fails**
  - Run targeted Jest on `src/modules/documents/pdf-templates/member-card.spec.ts` from `apps/api` with env loaded.

- [x] **Step 3: Update React-PDF styles**
  - Replace right-aligned signer styles with canonical values.

- [x] **Step 4: Run test to verify it passes**
  - Run the same targeted Jest command.

---

### Task 6: Align Flutter KTA signer layout

**Files:**
- Modify: `apps/mobile_flutter/lib/core/utils/kta_design.dart:74-95`
- Modify: `apps/mobile_flutter/lib/presentation/widgets/kta_card_widget.dart:632-715`
- Modify: `apps/mobile_flutter/test/kta_layout_test.dart`
- Modify: `apps/mobile_flutter/test/kta_card_golden_test.dart`
- Regenerate: `apps/mobile_flutter/test/goldens/kta_back.png`

**Interfaces:**
- Consumes: `KtaText.ptBackFieldLabel`.
- Produces: `KtaSignerSpec.titleLeft`, `nameLeft`, `nameBottom=35`, and left-aligned title/name.

- [x] **Step 1: Write failing tests**
  - Assert `KtaSignerSpec` fields match web/API geometry and title/name font size equals `KtaText.ptBackFieldLabel`.

- [x] **Step 2: Run tests to verify they fail**
  - Run `flutter test test/kta_layout_test.dart test/kta_card_golden_test.dart` from `apps/mobile_flutter`.

- [x] **Step 3: Update Flutter signer spec and widget**
  - Replace right-aligned fields with left-aligned canonical fields.

- [x] **Step 4: Regenerate golden**
  - Run `flutter test --update-goldens test/kta_card_golden_test.dart`, then rerun the targeted tests.

---

### Task 7: Replace preview HTML with API image output

**Files:**
- Modify: `apps/web/app/(dashboard)/members/[id]/page.tsx`
- Modify: `apps/web/src/lib/kta/preview.ts`
- Test: `apps/web/src/lib/kta/__tests__/preview.test.ts`

**Interfaces:**
- Consumes: `GET /api/members/{id}/digital-card/image` with auth token.
- Produces: blob URL opened in a new tab with front/back PNGs, CR80 print CSS, and blob URL revoked on unload.

- [x] **Step 1: Write failing e2e assertion**
  - Assert `previewKTA` calls the image endpoint without `watermark=1` and opens a preview using the returned image.

- [x] **Step 2: Run e2e test to verify it fails**
  - Run Playwright with the existing web e2e configuration if available.

- [x] **Step 3: Replace `previewKTA` body**
  - Fetch the image endpoint with auth header, create a blob URL, open a new window, render two images and print CSS, then revoke the blob URL on unload.

- [x] **Step 4: Run e2e and web unit tests**
  - Run the targeted e2e test plus the full web unit suite.

---

### Task 8: Full verification and handoff

**Files:** none.

- [x] **Step 1: Run full API unit suite**
  - From `apps/api`, source env from the main worktree and run Jest `--runInBand`.
  - Expected: PASS.

- [x] **Step 2: Run full web unit suite**
  - From `apps/web`, run Vitest.
  - Expected: PASS.

- [x] **Step 3: Run Flutter suite**
  - From `apps/mobile_flutter`, run `flutter test --reporter expanded`.
  - Expected: PASS.

- [x] **Step 4: Run lint and typecheck**
  - Run direct `pnpm --filter` commands from the worktree.
  - Expected: 0 errors.

- [x] **Step 5: Inspect diff**
  - Run `git status --short`, `git diff --check`, and `git diff --stat`.

- [x] **Step 6: Stop for review**
  - No commit. Report changed files and verification results.
