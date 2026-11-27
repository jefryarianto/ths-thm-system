# Claim Form Parity Design

## Goal

Samakan form klaim web admin dan aplikasi mobile dengan form publik `/klaim`, termasuk penempatan radio `Cara Pembuktian Keanggotaan` yang berdampingan horizontal di mobile.

## Authority

Form publik `apps/web/app/klaim/page.tsx` adalah acuan desain, urutan field, label, helper text, batas panjang, dan pesan validasi.

## Non-Goals

- Tidak mengubah API, DTO, Prisma schema, generated client, atau contract.
- Tidak mengubah perilaku submit public selain ekstraksi validator.
- Tidak mengubah halaman detail/list klaim admin.
- Tidak mengubah batas 3 berkas bukti di mobile.
- Tidak menjalankan repo-wide Flutter analyze atau dart format.

## Decisions

### Web

- Tambahkan `modeBukti` dengan default `unggah` dan `ceritaHistori` ke `apps/web/app/(dashboard)/claims/new/page.tsx`.
- Tambahkan kartu radio `Unggah bukti` dan `Ceritakan histori` setelah pemilihan ranting, sebelum bagian bukti.
- Saat `modeBukti === 'unggah'`, tampilkan upload dengan label publik dan `maxFiles=6`.
- Saat `modeBukti === 'cerita'`, tampilkan field `Cerita Histori Keanggotaan *`, `maxLength=1000`, helper `Minimal 20 karakter, maksimal 1000 karakter`, dan counter.
- Urutan field admin: Nama/Jenis Kelamin, Tempat/Tanggal Lahir, Dadar, Pekerjaan/Pelantikan, No HP/Email, Alamat, Distrik/Wilayah/Ranting, radio, upload/cerita, Catatan, submit.
- Label Dadar mengikuti publik: `Tempat Pendadaran (Dadar) *` dan `Tahun Pendadaran (Dadar) *`.
- `pekerjaan` memakai `maxLength=120`; `pelantikan` memakai `maxLength=160`.
- Validasi admin memakai validator publik yang diekstrak; error tetap ditampilkan sebagai toast error pertama.
- Payload admin dibangun dengan helper tipis `buildAdminClaimFormData` dari `apps/web/src/components/claims/admin-claim-form-data.ts`, yang memanggil `buildPublicClaimFormData` dari `apps/web/src/components/claims/public-claim-payload.ts`.
- Ekstrak validator dari `apps/web/app/klaim/page.tsx:247-272` ke `apps/web/src/components/claims/claim-form-validation.ts` dengan signature:
  `validateClaimForm(form: PublicClaimFormValues, org: { distrikId: string; wilayahId: string; rantingId: string }, buktiFileCount: number): Record<string, string>`.
- UI publik hanya berubah pada pemanggilan validator hasil ekstraksi.

### Mobile

- Tambahkan `pekerjaan` dan `pelantikan` ke `ClaimCreateRequested`, `buildClaimFields`, dan `buildClaimFormData`.
- Kirim `catatan` untuk klaim keanggotaan memakai controller yang sudah ada.
- Urutan field: Nama, Jenis Kelamin, Tempat Lahir, Tanggal Lahir, Tempat/Tahun Dadar, Pekerjaan, Pelantikan, No HP, Email, Alamat, `OrgStructureFields`, radio, upload/cerita, Catatan.
- `Alamat` berada setelah Email dan sebelum `OrgStructureFields`.
- `RadioListTile` vertikal diganti `RadioGroup<String>` berisi `Row` dengan dua `Expanded` kartu horizontal: `Unggah bukti` dan `Ceritakan histori`.
- Inner `Radio<String>` hanya menetapkan `value`; `groupValue` dan `onChanged` dikelola `RadioGroup`.
- Validator dan pesan snackbar mobile disamakan persis dengan form publik, termasuk `Unggah minimal satu berkas bukti`, `Nama lengkap minimal 3 karakter`, `Pilih ranting`, `Tempat pendadaran wajib diisi`, dan `Tahun pendadaran wajib diisi`.
- Jalur submit tetap: multipart untuk `unggah`, JSON untuk `cerita`.

## Verification

- Web: `pnpm --filter @ths-thm/web exec vitest run && pnpm --filter @ths-thm/web exec tsc --noEmit`
- Mobile focused: dari `apps/mobile_flutter`, `flutter test test/claim_account_form_test.dart test/claim_payload_test.dart`
- Tidak menjalankan API suite atau Flutter analyze/format repo-wide.
