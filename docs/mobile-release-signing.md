# Setup Release Signing untuk APK Flutter

Agar APK yang dihasilkan CI **signed dengan keystore stabil**, aplikasi bisa
di-update tanpa uninstall (penting untuk pengujian di LDPlayer / perangkat
pengguna). Tanpa secret ini, CI hanya menghasilkan APK debug-signed.

## 1. Buat keystore release (sekali saja, jaga baik-baik!)

```bash
keytool -genkeypair -v \
  -keystore ths-thm-release.jks \
  -storetype PKCS12 -keyalg RSA -keysize 2048 -validity 36500 \
  -alias ths-thm-release \
  -storepass "PASSWORD_KEYSTORE" \
  -dname "CN=THS-THM Release, OU=Mobile, O=THS-THM, L=Manokwari, ST=Papua Barat, C=ID"
```

> ⚠️ **Keystore harus disimpan aman selamanya.** Kalau hilang, APK update tidak
> bisa di-signed dengan signature yang sama → pengguna harus uninstall dulu.
> `.gitignore` sudah mengabaikan `*.jks`, `*.keystore`, `key.properties`, dan
> `*.jks.b64` agar tidak pernah masuk ke repo.

## 2. Daftarkan 4 GitHub Secret

Repo → **Settings** → **Secrets and variables** → **Actions** → *New repository secret*:

| Nama secret | Nilai |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | isi file `.jks` hasil encode base64 (lihat di bawah) |
| `KEY_STORE_PASSWORD` | password keystore (`storePassword`) |
| `KEY_PASSWORD` | password key — untuk PKCS12 **sama** dengan `KEY_STORE_PASSWORD` |
| `KEY_ALIAS` | alias, mis. `ths-thm-release` |

Encode base64 di Windows (PowerShell):

```powershell
$b64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("ths-thm-release.jks"))
[IO.File]::WriteAllText("ths-thm-release.jks.b64", $b64)
```

Encode base64 di Linux/macOS:

```bash
base64 -w0 ths-thm-release.jks > ths-thm-release.jks.b64
```

## 3. Cara kerja CI

Workflow `.github/workflows/flutter-apk-build.yml` berjalan otomatis pada:
- push ke `master` yang mengubah `apps/mobile_flutter/**`
- push tag `v*` (mis. `git tag v1.0.0 && git push origin v1.0.0`)
- pemicu manual (tab **Actions** → *Run workflow*)

Workflow menulis `key.properties` dari secret, membangun
`flutter build apk --release`, lalu:
- **selalu** meng-upload APK sebagai artifact (`flutter-release-apk`)
- pada tag `v*`, juga membuat **GitHub Release** berisi APK tersebut

Bila secret belum diset, build tetap berhasil tapi fallback ke debug signing.

## 4. Ambil APK untuk LDPlayer

1. Tab **Actions** → pilih run "Flutter APK Build & Release"
2. Scroll ke bawah → download artifact `flutter-release-apk`
3. Extract → seret `app-release.apk` ke jendela LDPlayer (atau toolbar *Install APK*)

Setelah secret diset, APK hasil CI berlabel signature yang sama → LDPlayer
melakukan **update** atas aplikasi lama, bukan install paralel.

## 5. Signing lokal (opsional)

Salin `key.properties.template` → `key.properties` di folder `android/`, isi
nilai asli, lalu `flutter build apk --release`. File `key.properties` sudah
di-ignore git.

## Verifikasi signature APK

```bash
keytool -printcert -jarfile app-release.apk | Select-String "SHA256"
```

 cocok dengan SHA256 fingerprint keystore → APK signed dengan benar.
