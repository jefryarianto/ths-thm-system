# Panduan Keamanan — Secret Scanning

Sistem THS-THM memakai [gitleaks](https://github.com/gitleaks/gitleaks) untuk
mencegah kredensial masuk ke git history. Penegakan berlapis:

| Lapis                  | Kapan                                       | Alat                                                    |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------- |
| 1. Pre-commit hook     | Saat `git commit`, sebelum commit terbentuk | `scripts/pre-commit.sh` → `gitleaks protect --staged`   |
| 2. CI                  | Setiap push & PR                            | Job `gitleaks` di `.github/workflows/security-scan.yml` |
| 3. Konfigurasi bersama | Keduanya                                    | `.gitleaks.toml`                                        |

## 1. Instalasi (wajib untuk semua kontributor)

### Windows

```powershell
winget install Gitleaks.Gitleaks
# restart shell, lalu verifikasi:
gitleaks version
```

### macOS

```bash
brew install gitleaks
```

### Linux

```bash
# Contoh: unduh binary release
curl -sSfL https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz \
  | sudo tar -xz -C /usr/local/bin gitleaks
gitleaks version
```

Kemudian pasang git hook (sekali per clone):

```bash
bash scripts/install-hooks.sh
```

Hook pre-commit **tidak akan memblokir commit** bila binary gitleaks belum
terpasang — ia hanya mencetak peringatan + instruksi instalasi. Mesin tanpa
gitleaks tetap terlindungi oleh lapis CI.

## 2. Cara kerja hook pre-commit

- Memindai seluruh **staged changes** (`gitleaks protect --staged`) — commit
  berisi kredensial **ditolak** sebelum masuk history.
- Mencari binary `gitleaks` di `PATH`, lalu fallback ke path instalasi winget
  (Windows) — lihat `scripts/pre-commit.sh`.
- Staged diff kosong (mis. commit merge) → dilewati.
- Bypass darurat (gunakan sangat hemat):

```bash
git commit --no-verify
```

## 3. Cara kerja job CI

Job `gitleaks` di `security-scan.yml` (ruting: push/PR master + mingguan):

1. Checkout dengan `fetch-depth: 0` (full history).
2. `gitleaks git .` — scan **seluruh history** commit.
3. `gitleaks dir .` — scan **working tree** (menangkap file yang mungkin
   lolos dari history, mis. via artefak untracked yang ter-commit).
4. Hasil SARIF diunggah ke **GitHub Security tab** + artifact 30 hari.
5. Job **gagal** bila salah satu scan menemukan temuan.

## 4. Konfigurasi (`.gitleaks.toml`)

### Aturan kustom proyek

| ID Rule                          | Deteksi                                                          |
| -------------------------------- | ---------------------------------------------------------------- |
| `firebase-admin-sdk-private-key` | Private key service account (`-----BEGIN PRIVATE KEY-----`)      |
| `firebase-service-account-json`  | Isi JSON service account (`client_email`, `private_key_id`, ...) |
| `google-oauth-client-secret`     | Google OAuth `GOCSPX-...`                                        |
| `google-api-key`                 | API key Google/Firebase `AIza...`                                |
| `resend-api-key`                 | API key Resend `re_...`                                          |
| `jwt-hardcoded-secret`           | `JWT_SECRET`/`JWT_REFRESH_SECRET` hardcoded (bukan placeholder)  |

Di atas itu, `[extend] useDefault = true` menambahkan **ratusan aturan
bawaan** gitleaks (AWS, Stripe, Slack, generic API key, private key, dst.).

### Allowlist (false positive yang disengaja)

| Kelompok                                                                             | Alasan                                                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `*.spec.ts` / `*.test.ts`                                                            | Fixture test — nilai dummy (`test-key-...`, base64 "newsecret"), bukan kredensial asli |
| `GoogleService-Info.plist`, `google-services.json`                                   | Config client Firebase — identifier publik, di-restrict via Firebase Console           |
| `.env.example`, `docs/`, `packages/csv_templates/`, `CHANGELOG.md`                   | Placeholder & contoh (`change-me`, `your-api-key`, `xxx`)                              |
| `.github/workflows/`                                                                 | JWT dummy khusus CI (`ci-test-jwt-...`)                                                |
| `docker-compose*.yml`, `docs/QUICK_START.md`, `docs/DOCKER_DEV_SETUP.md`, `scripts/` | Kredensial DB lokal dev (`postgres`, `ths_thm_password`, `localhost`)                  |

> ⚠️ Aturan `docs/` hanya mengizinkan pola **placeholder** — kredensial asli
> di `docs/` tetap terdeteksi. Jangan menaruh kredensial di dokumentasi
> (lihat aturan di [CONTRIBUTING.md](../CONTRIBUTING.md)).

### Menambah allowlist baru

Jika gitleaks memblokir commit Anda padahal nilainya memang bukan secret:

1. Preferensi pertama: **ubah nilainya** jadi jelas-dummy (mis. `test-...`).
2. Bila memang pola sah, tambahkan entri `[[allowlists]]` di `.gitleaks.toml`
   yang seluju mungkin (path spesifik + regex nilai), dengan `description`
   yang menjelaskan alasannya.
3. Verifikasi: `gitleaks git . --config .gitleaks.toml --no-banner`
   harus exit 0.

## 5. Bila ada secret terlanjur ter-commit

1. **Rotasi kredensial segera** — anggap sudah terekspos meski belum di-push
   (bisa terekspos lewat backup/clone lain).
2. Hapus dari history bila perlu:

```bash
# Contoh dengan git-filter-repo (butuh repo bersih/clone baru)
pip install git-filter-repo
git filter-repo --path path/ke/file-secret.json --invert-paths
# atau untuk string tertentu:
git filter-repo --replace-text <(echo "GOCSPX-xxxx==>REDACTED")
```

Alternatif: [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/). 3. Koordinasikan force-push dengan tim (`git push --force-with-lease`). 4. Catat insiden di issue; pertimbangkan audit akses layanan terkait.

## 6. Referensi cepat

| Perintah                                            | Fungsi                                |
| --------------------------------------------------- | ------------------------------------- |
| `gitleaks protect --staged --config .gitleaks.toml` | Simulasi scan yang dijalankan hook    |
| `gitleaks git . --config .gitleaks.toml`            | Scan full history                     |
| `gitleaks dir . --config .gitleaks.toml`            | Scan working tree                     |
| `bash scripts/install-hooks.sh`                     | (Re)pasang pre-commit & pre-push hook |

> ℹ️ `gitleaks dir` memindai **semua** file, termasuk yang di-`.gitignore`
> (`.env`, `node_modules`, build cache). Di mesin lokal ini akan berisik &
> lambat — untuk harian cukup `protect --staged` (hanya staged changes).
> Scan `dir` yang bermakna ada di CI, karena checkout bersih tidak memuat
> file ter-ignore. Temuan pada file ter-ignore lokal tetap layak ditindak:
> itu artinya kredensial asli berada di disk dan perlu dirotasi/dipindah
> ke secret manager.

File terkait: `.gitleaks.toml`, `scripts/pre-commit.sh`,
`scripts/install-hooks.sh`, `.github/workflows/security-scan.yml`.
