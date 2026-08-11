/**
 * Generate ikon aplikasi mobile dari logo organisasi (THS-THM).
 * Memakai sharp (tersedia di root node_modules).
 *
 * Output:
 *  - apps/mobile/assets/images/icon.png         (1024x1024, Expo)
 *  - apps/mobile/assets/images/adaptive-icon.png (1024x1024, Expo adaptive)
 *  - apps/mobile/android/app/src/main/res/mipmap-<dpi>/ic_launcher.png (dan ic_launcher_round)
 *  - AppIcons/Assets.xcassets/AppIcon.appiconset/*.png
 *
 * Desain: logo transparan dikomposit di tengah background biru brand #023c69.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const LOGO_PATH = path.join(ROOT, 'apps/mobile/assets/images/logo.png');
const BG = '#023c69';

// ── Ukuran Android (px) ──
// ic_launcher (legacy) & ic_launcher_round
const ANDROID_LEGACY = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
};
// ic_launcher_foreground (adaptive icon, kanvas 108dp)
const ANDROID_FOREGROUND = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
};

// ── Ukuran iOS AppIcon (dari Contents.json) ──
const IOS_SIZES = [16, 20, 29, 32, 40, 48, 50, 55, 57, 58, 60, 64, 66, 72, 76, 80, 87, 88, 92, 100, 102, 108, 114, 120, 128, 144, 152, 167, 172, 180, 196, 216, 234, 256, 258, 512, 1024];

/** Scale logo terhadap kanvas (beri ruang aman seperti adaptive icon: 66/108 ≈ 0.61). */
const LOGO_SCALE = 0.62;

/** Buat canvas berbackground biru + logo di tengah. */
async function buildIcon(size, logoScale = LOGO_SCALE) {
  const logoSize = Math.round(size * logoScale);
  const logo = await sharp(LOGO_PATH).resize(logoSize, logoSize, { fit: 'contain' }).png().toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([
      {
        input: logo,
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();
}

/** Buat versi bulat (mask lingkaran) dari buffer persegi. */
async function roundify(buffer, size) {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`,
  );
  return sharp(buffer)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

/** Buat foreground adaptive icon: logo transparan di tengah (tanpa background). */
async function buildForeground(size) {
  // Safe zone adaptive icon = 66/108 dari kanvas → logo ≈ 0.61 dari ukuran kanvas
  const logoSize = Math.round(size * (66 / 108) * 0.92);
  return sharp(LOGO_PATH)
    .resize(logoSize, logoSize, { fit: 'contain' })
    .png()
    .toBuffer();
}

async function main() {
  // 1. Expo assets
  const expoIcon = await buildIcon(1024);
  const adaptiveIcon = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: BG },
  })
    .composite([
      {
        input: await sharp(LOGO_PATH).resize(640, 640, { fit: 'contain' }).png().toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(ROOT, 'apps/mobile/assets/images/icon.png'), expoIcon);
  fs.writeFileSync(path.join(ROOT, 'apps/mobile/assets/images/adaptive-icon.png'), adaptiveIcon);
  console.log('[OK] apps/mobile/assets/images/icon.png (1024x1024)');
  console.log('[OK] apps/mobile/assets/images/adaptive-icon.png (1024x1024)');

  // 2. Android mipmap
  const mipmapBase = path.join(ROOT, 'apps/mobile/android/app/src/main/res');
  for (const [dpi, size] of Object.entries(ANDROID_LEGACY)) {
    const dir = path.join(mipmapBase, `mipmap-${dpi}`);
    const square = await buildIcon(size);
    const round = await roundify(square, size);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), square);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), round);
    console.log(`[OK] mipmap-${dpi}/ic_launcher.png + ic_launcher_round.png (${size}px)`);
  }
  for (const [dpi, size] of Object.entries(ANDROID_FOREGROUND)) {
    const dir = path.join(mipmapBase, `mipmap-${dpi}`);
    const fg = await buildForeground(size);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fg);
    console.log(`[OK] mipmap-${dpi}/ic_launcher_foreground.png (${size}px)`);
  }

  // 3. iOS AppIcon
  const appIconDir = path.join(ROOT, 'AppIcons/Assets.xcassets/AppIcon.appiconset');
  for (const size of IOS_SIZES) {
    const buf = await buildIcon(size);
    fs.writeFileSync(path.join(appIconDir, `${size}.png`), buf);
  }
  console.log(`[OK] AppIcons/Assets.xcassets/AppIcon.appiconset/*.png (${IOS_SIZES.length} ukuran)`);

  // 4. Store listing icons
  fs.writeFileSync(path.join(ROOT, 'AppIcons/playstore.png'), await buildIcon(512));
  fs.writeFileSync(path.join(ROOT, 'AppIcons/appstore.png'), await buildIcon(1024));
  console.log('[OK] AppIcons/playstore.png (512x512)');
  console.log('[OK] AppIcons/appstore.png (1024x1024)');

  console.log('\nSelesai — semua ikon diregenerasi dari logo organisasi (bg #023c69).');
}

main().catch((err) => {
  console.error('Gagal generate ikon:', err);
  process.exit(1);
});