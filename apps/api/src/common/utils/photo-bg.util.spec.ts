import sharp from 'sharp';
import { removePhotoBackground } from './photo-bg.util';

/**
 * Regression test: removePhotoBackground must ALWAYS produce a portrait
 * 900×1200 canvas, regardless of how the phone stored the photo:
 *   • raw landscape dims + EXIF orientation=6 (how most phones store portrait photos)
 *   • true landscape pixels (no EXIF) — front-camera bug on some devices
 *   • portrait pixels (no EXIF)
 * Earlier code read `sharp(input).rotate().metadata()` which reports INPUT-HEADER
 * dims (raw sensor), so EXIF-portrait photos were detected as "landscape" and
 * rotated twice → output landscape + subject distorted.
 */

/** Light-gray 4032x3024 image with a dark subject blob. */
async function baseLandscape() {
  return sharp({
    create: { width: 4032, height: 3024, channels: 3, background: { r: 230, g: 230, b: 230 } },
  })
    .composite([
      { input: Buffer.from('<svg width="900" height="900"><rect width="900" height="900" fill="#7c4a2e"/></svg>'), left: 1200, top: 700 },
    ])
    .jpeg()
    .toBuffer();
}

/** Same content but already portrait pixels (3024x4032), no EXIF. */
async function basePortraitPixels() {
  return sharp({
    create: { width: 3024, height: 4032, channels: 3, background: { r: 230, g: 230, b: 230 } },
  })
    .composite([
      { input: Buffer.from('<svg width="900" height="900"><rect width="900" height="900" fill="#7c4a2e"/></svg>'), left: 1050, top: 900 },
    ])
    .jpeg()
    .toBuffer();
}

/** Count opaque pixels (alpha>128) in the top `pct`% band of output. */
async function opaqueInTopPct(buffer: Buffer, pct: number): Promise<number> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0;
  const limitY = Math.floor((info.height * pct) / 100);
  for (let y = 0; y < limitY; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 128) count++;
    }
  }
  return count;
}

describe('removePhotoBackground orientation', () => {
  it('EXIF portrait (orientation=6) → portrait 900x1200 with subject intact', async () => {
    const raw = await baseLandscape();
    const withOrientation = await sharp(raw).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const out = await removePhotoBackground(withOrientation);
    const info = await sharp(out).metadata();
    expect(info.width).toBe(900);
    expect(info.height).toBe(1200);
    expect(await opaqueInTopPct(out, 60)).toBeGreaterThan(1000);
  });

  it('true landscape (no EXIF) → portrait 900x1200', async () => {
    const raw = await baseLandscape();
    const out = await removePhotoBackground(raw);
    const info = await sharp(out).metadata();
    expect(info.width).toBe(900);
    expect(info.height).toBe(1200);
    expect(await opaqueInTopPct(out, 60)).toBeGreaterThan(1000);
  });

  it('portrait pixels (no EXIF) → portrait 900x1200', async () => {
    const raw = await basePortraitPixels();
    const out = await removePhotoBackground(raw);
    const info = await sharp(out).metadata();
    expect(info.width).toBe(900);
    expect(info.height).toBe(1200);
    expect(await opaqueInTopPct(out, 60)).toBeGreaterThan(1000);
  });

  it('non-image input → graceful fallback (returns input)', async () => {
    const junk = Buffer.from('not an image at all');
    const out = await removePhotoBackground(junk);
    expect(out).toEqual(junk);
  });
});
