# KTA Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Samakan tampilan KTA di web, API PDF/PNG, dan Flutter: QR bergaya QRmonkey dengan logo tengah, blok tanda tangan + stempel kanan-bawah sisi belakang, serta font Plus Jakarta Sans.

**Architecture:** API menjadi source of truth QR image bergaya. Web memakai QR API bila ada dan memakai renderer bersama yang sama sebagai fallback. PDF/PNG dan Flutter memakan QR API yang sama. Konstanta layout/font ditaruh di `packages/card-design` agar tidak melenceng antar platform.

**Tech Stack:** Next.js SVG, NestJS + `qrcode` + `sharp` + `@react-pdf/renderer`, Flutter `CustomPainter`, `qrcode`, Plus Jakarta Sans, `jsqr` untuk uji scan.

**Spec:** `docs/superpowers/specs/2026-11-27-kta-visual-refresh-design.md`

## Global Constraints
- QR wajib `errorCorrectionLevel: 'H'`, quiet zone `4`, logo maksimal ~20% area QR, white halo ~30%.
- Font family exact: `Plus Jakarta Sans`, weights `400`, `600`, `700`.
- Fallback jabatan: `KOORDINATOR DISTRIK` bila `signerTitle` kosong.
- Stempel: hide bila `stampImage` kosong; tidak ada placeholder.
- Blok tanda tangan + stempel hanya di sisi belakang, anchor kanan-bawah.
- Prototipe `kta_mobile/` tidak diubah.
- Jangan commit kecuali user meminta.
- Jangan jalankan repo-wide `flutter analyze` atau `dart format`.

## Review Focus
- QR rusak setelah eye/body/logo styling → uji decode QR hasil API dengan `jsQR`.
- QR API tidak sinkron dengan fallback web → uji fallback memakai helper yang sama.
- Font Plus Jakarta tidak ter-embed di PNG/PDF/mobile → uji font family di SVG, PDF, Flutter, dan URL font ekspor PNG.
- `stampImage` kosong/relative/data URL → uji hide stamp dan resolver URL tidak menghasilkan `/api/uploads/data:...`.
- Posisi ttd/stempel melenceng antar web/PDF/mobile → uji golden/snapshot sisi belakang dengan blok kanan-bawah.

---

### Task 1: Font assets + shared card constants

**Files:**
- Create: `apps/web/public/kta/fonts/PlusJakartaSans-Regular.ttf`
- Create: `apps/web/public/kta/fonts/PlusJakartaSans-SemiBold.ttf`
- Create: `apps/web/public/kta/fonts/PlusJakartaSans-Bold.ttf`
- Create: `apps/web/public/kta/fonts/LICENSE-PlusJakartaSans.txt`
- Create: `apps/api/src/assets/fonts/` copies of the 3 TTF files + license
- Create: `apps/mobile_flutter/assets/fonts/` copies of the 3 TTF files + license
- Create: `apps/api/src/modules/documents/pdf-templates/plus-jakarta-font.ts`
- Modify: `packages/card-design/index.js:19-24,181-239`
- Modify: `apps/web/src/components/kta/kta-fonts.css:2-3`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/src/components/kta/exportPng.ts:18,21`
- Modify: `apps/api/nest-cli.json`
- Modify: `apps/api/Dockerfile:50-57`
- Modify: `apps/api/Dockerfile.font:7-15`
- Modify: `apps/mobile_flutter/pubspec.yaml:65-71`
- Modify: `apps/mobile_flutter/lib/core/utils/kta_layout.dart:23,73-81`
- Test: `apps/web/src/components/kta/__tests__/exportPng.test.ts`
- Test: `apps/mobile_flutter/test/kta_layout_test.dart`

**Interfaces:**
- Consumes: existing `FONTS` object.
- Produces: `FONTS.plusJakarta = 'Plus Jakarta Sans'`.
- Produces: `BACK.signer = { right:24, bottom:22, w:330, h:118, title:{right:0,top:0,fontSize:12}, name:{right:0,bottom:0,fontSize:14,underline:true}, sig:{right:150,bottom:34,w:175,h:52,rotate:-8}, stamp:{right:4,bottom:26,size:88,rotate:-8} }`.
- Produces: `KtaSpec.fontFamily = 'Plus Jakarta Sans'`.
- Produces: `PLUS_JAKARTA_FONT_DATA_URLS` and `PLUS_JAKARTA_FONT_CSS` from `plus-jakarta-font.ts`.

- [ ] **Step 1: Write failing tests**

Test assertions:
- `exportPng.test.ts` expects `fetch` called with `${assetBase}/fonts/PlusJakartaSans-Regular.ttf` and `PlusJakartaSans-Bold.ttf`.
- `kta_layout_test.dart` expects `KtaSpec.fontFamily == 'Plus Jakarta Sans'`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node "C:\ths-thm-system\node_modules\vitest\vitest.mjs" run src/components/kta/__tests__/exportPng.test.ts` in `apps/web`.  
Run: `flutter test test/kta_layout_test.dart` in `apps/mobile_flutter`.  
Expected: FAIL because assets/constants still use DejaVu.

- [ ] **Step 3: Vendor fonts and add shared constants**

Use `Plus Jakarta Sans` OFL-licensed TTF assets. Keep current font keys in `FONTS`, add the new key without renaming old keys. Add `BACK.signer`; do not overwrite unused `FRONT.signer`.

- [ ] **Step 4: Wire font into web, API, Docker, and Flutter**

Web SVG/export uses `Plus Jakarta Sans`; API Nest assets copy TTFs; Docker copies fonts to `/usr/share/fonts/ths/` and runs `fc-cache`; Flutter `FontLoader` loads the new TTFs.

- [ ] **Step 5: Run tests to verify they pass**

Run commands from Step 2.  
Expected: PASS.

---

### Task 2: Shared QRmonkey-style renderer + API QR source of truth

**Files:**
- Create: `packages/card-design/qr.js`
- Create: `packages/card-design/qr.test.js`
- Create: `apps/api/src/modules/documents/pdf-templates/styled-qr.ts`
- Create: `apps/api/src/modules/documents/pdf-templates/styled-qr.spec.ts`
- Modify: `packages/card-design/index.js`
- Modify: `packages/card-design/package.json`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/modules/members/members-digital-card.service.ts:642-648`
- Test: `apps/api/src/modules/members/members-digital-card.service.spec.ts`
- Test: `apps/api/src/modules/documents/pdf-templates/card-svg.spec.ts`

**Interfaces:**
- Consumes: `QRCode.create` from `qrcode`.
- Produces: `QR_STYLE = { errorCorrectionLevel:'H', quietZone:4, foreground:'#143B76', background:'#ffffff', bodyRadius:0.22, eyeFrameRadius:1.4, eyeBallRadius:1.1, logoRatio:0.20, haloRatio:0.30 }`.
- Produces: `buildQrMarkup(input:{data:string; logoHref?:string}):{markup:string; viewBox:string}`.
- Produces: `buildStyledQrSvg(input:{data:string; logoHref?:string; size?:number}):string`.
- Produces: `buildStyledQrDataUrl(data:string, logoHref?:string):Promise<string>`.
- Keeps: `private async buildQr(verificationUrl:string):Promise<string>` signature unchanged; it delegates to `buildStyledQrDataUrl`.

- [ ] **Step 1: Write failing QR helper tests**

Test assertions:
- `qr.test.js`: output contains 3 eye-frame groups, logo `<image>`, quiet zone in `viewBox`, and no ordinary body modules inside the three 7×7 finder areas.
- `styled-qr.spec.ts`: generated PNG decodes with `jsQR` back to the exact verification URL.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test packages/card-design/qr.test.js` from repo root.  
Run API spec with `CI=true node "C:\ths-thm-system\node_modules\jest\bin\jest.js" --runInBand src/modules/documents/pdf-templates/styled-qr.spec.ts` in `apps/api`.  
Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement shared QR markup**

Draw rounded body modules; skip finder-pattern modules; draw custom eye frames and eye balls; add white halo plus center logo. Never exceed 30% logo coverage.

- [ ] **Step 4: Implement API PNG data URL helper**

Use `sharp(Buffer.from(svg)).png().toBuffer()` and return `data:image/png;base64,...`. Pass `KTA_LOGO_DATA_URL` as `logoHref`.

- [ ] **Step 5: Replace API `buildQr` body**

Keep return type `Promise<string>` and all existing call sites unchanged.

- [ ] **Step 6: Run tests to verify they pass**

Run Step 2 commands plus `members-digital-card.service.spec.ts` and `card-svg.spec.ts`.  
Expected: PASS and decoded QR payload matches.

---

### Task 3: Web KTA signer/title/stamp + QR fallback parity

**Files:**
- Modify: `apps/web/src/components/kta/types.ts:3-32`
- Modify: `apps/web/src/lib/kta/api.ts:57-69,84-125`
- Modify: `apps/web/src/components/kta/KtaCard.tsx:22-33,70,117,128-131`
- Modify: `apps/web/app/(dashboard)/members/[id]/page.tsx:1587-1643`
- Modify: `apps/web/src/components/kta/__tests__/KtaCard.test.tsx`
- Modify: `apps/web/src/lib/kta/__tests__/api.test.ts`
- Modify: `apps/web/e2e/kta-admin.spec.ts`

**Interfaces:**
- Consumes: `FONTS.plusJakarta`, `BACK.signer`, `buildQrMarkup`.
- Produces: `Anggota.koordinatorJabatan?: string`.
- Produces: `Anggota.stempelUrl?: string`.
- Produces: `ApiDigitalCard.card.signerTitle?: string|null`.
- Produces: `ApiDigitalCard.stampImage?: string|null`.
- Mapping: `stempelUrl = stampImage ? '/api/uploads/'+encodeURIComponent(stampImage) : undefined`.

- [ ] **Step 1: Write failing web tests**

Assertions:
- `api.test.ts` maps `signerTitle` and `stampImage`.
- `KtaCard.test.tsx` back side renders dynamic title text, renders stamp image when present, renders no stamp when absent, and local QR fallback uses `buildQrMarkup`.
- `KtaCard.test.tsx` keeps `qrImageUrl` priority over `verifyUrl`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node "C:\ths-thm-system\node_modules\vitest\vitest.mjs" run src/lib/kta/__tests__/api.test.ts src/components/kta/__tests__/KtaCard.test.tsx` in `apps/web`.  
Expected: FAIL.

- [ ] **Step 3: Extend types and API adapter**

Add the two new `Anggota` fields and map both admin and member-detail flows. Keep `koordinator`/`tandaTanganUrl` unchanged for compatibility.

- [ ] **Step 4: Render signer block and styled fallback QR**

Use `BACK.signer` for right-bottom anchor. Render `koordinatorJabatan || 'KOORDINATOR DISTRIK'`, signature image, name underline, and stamp image only when `stempelUrl` exists. Replace manual `Qr` markup with `buildQrMarkup`.

- [ ] **Step 5: Run tests to verify they pass**

Run Step 2 command plus `KtaAdminPreview.test.tsx`.  
Expected: PASS.

---

### Task 4: API PDF/PNG signer block + PDF font consistency

**Files:**
- Modify: `apps/api/src/modules/documents/pdf-templates/card-svg.ts:28-37,102-134,405-486`
- Modify: `apps/api/src/modules/documents/pdf-templates/member-card.ts:1-16,53-425,974-1053`
- Test: `apps/api/src/modules/documents/pdf-templates/card-svg.spec.ts`
- Test: `apps/api/src/modules/documents/pdf-templates/member-card.spec.ts`

**Interfaces:**
- Consumes: `BACK.signer`, `PLUS_JAKARTA_FONT_DATA_URLS`, `FONTS.plusJakarta`.
- Produces: SVG/PDF text uses `font-family="Plus Jakarta Sans"`.
- Produces: `stampDataUrl` is rendered only when non-empty.
- Produces: signer title uses `signers[0].signerTitle || signerTitle || 'KOORDINATOR DISTRIK'`.

- [ ] **Step 1: Write failing PDF/SVG tests**

Assertions:
- `card-svg.spec.ts` generated SVG contains `Plus Jakarta Sans`, no `Roboto`/`OCR A Extended` in text nodes, and signer/stamp coordinates match `BACK.signer`.
- `member-card.spec.ts` asserts no `Times-Bold` remains and generated PDF props inherit Plus Jakarta Sans.

- [ ] **Step 2: Run tests to verify they fail**

Run API Jest targeted specs.  
Expected: FAIL.

- [ ] **Step 3: Update SVG renderer**

Map all font families to Plus Jakarta Sans, embed `@font-face` CSS when needed for sharp, and replace hardcoded signer/title/stamp positions with `BACK.signer`.

- [ ] **Step 4: Update React PDF renderer**

Register Plus Jakarta Sans TTFs via `Font.register`, set inherited `fontFamily`, replace `Times-Bold` usages, and use the same signer block constants.

- [ ] **Step 5: Run tests to verify they pass**

Run Step 2 commands plus `members-digital-card.service.spec.ts`.  
Expected: PASS.

---

### Task 5: Flutter KTA signer block, dynamic title, and font

**Files:**
- Modify: `apps/mobile_flutter/lib/data/models/card_data.dart:106-112`
- Modify: `apps/mobile_flutter/lib/data/models/member_kta.dart:7-57,73-103`
- Modify: `apps/mobile_flutter/lib/core/utils/kta_design.dart:64-90`
- Modify: `apps/mobile_flutter/lib/presentation/widgets/kta_card_widget.dart:357-366,654-674,730-731,890-911`
- Modify: `apps/mobile_flutter/test/kta_layout_test.dart`
- Modify: `apps/mobile_flutter/test/member_kta_test.dart`
- Modify: `apps/mobile_flutter/test/card_data_test.dart`
- Modify: `apps/mobile_flutter/test/kta_card_golden_test.dart`
- Regenerate: `apps/mobile_flutter/test/goldens/kta_front.png`
- Regenerate: `apps/mobile_flutter/test/goldens/kta_back.png`

**Interfaces:**
- Consumes: API `qrCode`, `signatureImage`, `stampImage`, `signerTitle`, `verificationUrl`.
- Produces: `MemberKta.signerTitle = ''` default.
- Produces: `MemberKta.verificationUrl = ''` default.
- Produces: `tandaTanganUrl` and `stampImageUrl` use absolute/resolved getters.
- Produces: `KtaSignerSpec` mirroring `BACK.signer`.

- [ ] **Step 1: Write failing Flutter tests**

Assertions:
- `member_kta_test.dart` asserts `signerTitle`, `tandaTanganUrl`, `stampImageUrl`, `qrImageUrl`, `verificationUrl`.
- `card_data_test.dart` asserts `data:` URLs pass through unchanged.
- `kta_card_golden_test.dart` supplies deterministic `CardData` with QR/signature/stamp/title and precaches `assets/images/logo.png`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `flutter test test/kta_layout_test.dart test/member_kta_test.dart test/card_data_test.dart test/kta_card_golden_test.dart` in `apps/mobile_flutter`.  
Expected: FAIL.

- [ ] **Step 3: Update models and font loading**

Add optional `signerTitle`/`verificationUrl`, fix `_resolveUploadUrl` data-URI pass-through, and switch `KtaSpec.fontFamily`/`FontLoader` to Plus Jakarta Sans.

- [ ] **Step 4: Update card widget**

Use one right-bottom signer block on the back side. Use dynamic title with fallback, hide stamp when empty, and keep API QR as the primary source. Add centered logo overlay only to the local `QrImageView` fallback, not to the API QR image.

- [ ] **Step 5: Regenerate and inspect goldens**

Run: `flutter test --update-goldens test/kta_card_golden_test.dart`, then `flutter test test/kta_card_golden_test.dart`.  
Expected: PASS and both goldens visually show right-bottom signer block plus styled QR.

---

### Task 6: Full verification and handoff

**Files:** none.

- [ ] **Step 1: API suite**

Run with env loaded from both env files:

```bash
set -a; source "C:\ths-thm-system\.env"; source "C:\ths-thm-system\apps\api\.env"; set +a
CI=true node "C:\ths-thm-system\node_modules\jest\bin\jest.js" --runInBand
```

Expected: all API tests pass.

- [ ] **Step 2: Web suite**

Run: `node "C:\ths-thm-system\node_modules\vitest\vitest.mjs" run` in `apps/web`.  
Expected: all web unit tests pass.

- [ ] **Step 3: Mobile suite**

Run: `flutter test` in `apps/mobile_flutter`.  
Expected: all tests pass, no repo-wide analyze/format.

- [ ] **Step 4: Lint/typecheck**

Run direct binaries; do not use `pnpm exec` if it triggers install/network warnings.  
Expected: 0 errors.

- [ ] **Step 5: Manual visual check**

Check web admin preview, member digital-card tab, `/digital-card/image`, `/digital-card/pdf`, and Flutter front/back export. Confirm identical QR, title, signature, and optional stamp.

- [ ] **Step 6: Stop for review**

No commit. Report changed files and verification results.
