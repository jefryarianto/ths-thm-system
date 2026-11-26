# KTA Admin Validation Review Design

**Goal:** Admin web must be able to verify KTA applications from the data actually submitted: an immutable application snapshot, the uploaded payment proof, payment details, and validation notes recorded per role level. Verification must be blocked when no valid proof exists.

## Intent

The current admin pages mostly show status summaries. `/kta/distrik-process` verifies payment from a status row and sends `buktiPath: ''` without showing the uploaded proof. `CreateKtaDto` is validated but ignored, so there is no submitted payload snapshot. `KtaAppHistory` already stores `level`, `actorRole`, and `catatan`, but payment verification writes no note.

## Goals

- Snapshot member/application data at submit time for individual, self, and bulk submissions.
- Expose payment proof privately through a dedicated authenticated admin endpoint; do not make `kta-proof-*` public.
- Persist payment-verification notes into the existing `KtaAppHistory` row for level `DISTRIK`.
- Render a review panel in admin web with snapshot, proof, payment data, and validation notes grouped by role level.
- Replace the direct district verify action with a review-first flow.
- Keep mobile additive-compatible: `histories` remains a flat array and `catatan` stays optional.

## Non-goals

- No new status, level, or role.
- No structured snapshot tables.
- No public proof URL or signed URL scheme.
- No grouped-history API shape change.
- No change to the card generation flow.
- No forced `catatan` on older mobile clients.

## Constraints

- `KtaApplication` currently has `buktiBayarPath`, `biaya`, `rekeningTujuan`, `statusPembayaran`, but no snapshot field.
- `KtaAppHistory` has `level`, `actorRole`, `catatan`, `isSkipped`, `skippedReason`; histories are pre-created per level at submit.
- `POST /kta-applications` validates `CreateKtaDto` but currently ignores it; `POST /kta-applications/me` has no body.
- `verifyPayment` accepts inline `{ buktiPath?: string }`, writes history without `catatan`, and trusts arbitrary `buktiPath`.
- `/api/uploads/kta-proofs/*` requires a Bearer header but only checks header presence; plain `<img src>` fails.
- `BuktiPreviewModal` renders `<img>` only; uploaded proofs can be PDF.
- Mobile expects `histories` to remain a flat array and sends `{ buktiPath: '' }` on verify.
- Prisma `Decimal` may be serialized as string; web must use `formatRupiah`.

## Approaches

### Chosen: JSON snapshot plus authenticated proof endpoint

Add nullable `submittedSnapshot Json?` to `KtaApplication`, add an authenticated proof-stream endpoint, save payment notes to existing history rows, and render a new web review panel.

Tradeoff: smallest schema and API change; snapshot is opaque to ordinary SQL filtering but the product needs display and audit, not querying.

### Rejected: structured snapshot and validation tables

Separate normalized tables for snapshot fields and validation notes would be more query-friendly and auditable, but requires more migration, API, and UI work without a current query requirement.

### Rejected: current member data only

Rendering current member data would not preserve what was submitted and would violate the requested snapshot behavior.

## Decisions

- `POST /kta-applications` captures the validated `CreateKtaDto` as `snapshot.payload`; `/me` and bulk use `payload: null`.
- Hierarchical snapshot values are `{ id, nama }` objects, with `distrik.alamat` stored as `alamatDistrik`.
- `snapshot.missingFields` is the freshly computed `calculateMissingFields(member)` result at submit.
- Verification is blocked when `buktiBayarPath` is absent or the filename is invalid.
- The web groups the flat histories array by `level`; API response shape does not change.
- Legacy applications with no snapshot are labeled as such and fall back to current member data.

## Design detail

### Schema

Add nullable `submittedSnapshot Json? @map("submitted_snapshot")` to `KtaApplication`. Migration is additive nullable with no backfill.

### Snapshot shape v1

`{ version: 1, submittedAt, submittedBy: { id, role }, payload, anggota, missingFields }`.

`anggota` contains the member fields used for KTA: `id`, `nomorAnggota`, `namaLengkap`, `jenisKelamin`, `tempatLahir`, `tanggalLahir`, `alamat`, `noHp`, `email`, `fotoPath`, `statusKeanggotaan`, `tingkat`, `tempatDadar`, `tahunDadar`, `pekerjaan`, `ranting`, `wilayah`, `distrik`, `alamatDistrik`. Dates are ISO strings; nulls are preserved. Do not store internal audit columns or dynamic issuance-only fields.

### API

- `submit`, `submitSelf`, and `submitBulk` write the snapshot in the same transaction as application/history creation.
- Detail/list/district-queue responses inherit `submittedSnapshot` automatically.
- Add `GET /kta-applications/:id/proof` before `@Get(':id')` with the same roles and scope as detail: `admin_ranting`, `admin_wilayah`, `admin_distrik`, `admin_nasional`, `superadmin`; `@UseGuards(ScopeGuard)`; `@RequireScope('branch')`.
- The proof service verifies scope, requires valid `buktiBayarPath`, validates filename prefix `kta-proof-` and allowlisted extensions, resolves under `UPLOAD_DIR/kta-proofs`, and returns stream metadata.
- Add `VerifyPaymentKtaDto` with optional legacy `buktiPath?: string` and optional `catatan?: string`. Keep `buktiPath` accepted for compatibility but ignore it; always use the stored path.
- `verifyPayment` rejects when no valid proof exists and writes `catatan` to the `PAYMENT_VERIFIED` history row.

### Web

- Add `KtaReviewPanel` under `apps/web/src/components/kta/` to render snapshot, proof, payment data, and grouped validation notes.
- Add `KtaProofPreview` that fetches proof with `apiClient.get(..., { responseType: 'blob' })`, creates and revokes object URLs, renders images through `BuktiPreviewModal`, and renders PDFs through iframe/download.
- `/kta/[id]` renders the panel read-only.
- `/kta/distrik-process` replaces the direct verify icon with a `Tinjau & Verifikasi` modal containing the panel, a catatan textarea, and a confirm button.
- Verify button is disabled when no valid proof is available.

### Contracts and tests

- Add Swagger annotations for the new DTO and proof endpoint, then regenerate `apps/api/swagger.json`, `apps/web/src/types/api.d.ts`, and `packages/api-client/src/index.ts`.
- Cover snapshot creation, proof authorization/path validation, verification guard and note persistence, web review rendering, proof blob handling, and the district verify request.
- Verify with full API and web suites, TypeScript checks, regenerated contracts, and `git diff --check`.
