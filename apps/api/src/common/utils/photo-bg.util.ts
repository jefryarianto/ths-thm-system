/**
 * Util penghapus background foto pasfoto (ala SIM).
 *
 * Strategi: background pasfoto umumnya warna solid (merah/biru/hijau).
 * 1. Warna background diestimasi dari piksel di tepi gambar (median).
 * 2. Flood-fill dari seluruh tepi: piksel yang "cocok" dengan warna background
 *    DAN terhubung ke tepi dijadikan transparan. Pendekatan ini melindungi
 *    subjek (wajah/baju) meski warnanya mirip background, karena hanya area
 *    yang tersambung ke tepi yang dihapus.
 * 3. Tepi transisi diperhalus (feather) via interpolasi alpha.
 *
 * Output: PNG dengan background transparan — kartu bisa menaruh foto di atas
 * background sendiri tanpa kotak berwarna.
 */

// sharp adalah CJS module — pakai require (gaya codebase) agar typecheck aman.
// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

export interface RemovePhotoBgOptions {
  /** Toleransi warna (jarak euclidean RGB). Default: otomatis dari tepi. */
  tolerance?: number;
}

function colorDist(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Hapus background foto pasfoto → PNG transparan.
 * Fallback: jika sharp tidak tersedia / gagal, kembalikan input apa adanya.
 */
export async function removePhotoBackground(
  input: Buffer,
  options: RemovePhotoBgOptions = {},
): Promise<Buffer> {
  try {
    const meta = await sharp(input).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (!width || !height) return input;

    const { data, info } = await sharp(input)
      .rotate() // hormati EXIF orientation
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = info.width;
    const h = info.height;
    const px = (x: number, y: number) => (y * w + x) * 4;
    const rgbAt = (x: number, y: number): [number, number, number] => [
      data[px(x, y)],
      data[px(x, y) + 1],
      data[px(x, y) + 2],
    ];

    // ── 1. Estimasi warna background dari ring tepi ──
    const border: Array<[number, number, number]> = [];
    const ring = 3; // beberapa piksel dari tepi (hindari artefak kamera)
    const step = Math.max(1, Math.floor((w + h) / 200));
    for (let x = ring; x < w - ring; x += step) {
      border.push(rgbAt(x, ring), rgbAt(x, h - 1 - ring));
    }
    for (let y = ring; y < h - ring; y += step) {
      border.push(rgbAt(ring, y), rgbAt(w - 1 - ring, y));
    }
    if (border.length === 0) return input;

    const bgColor: [number, number, number] = [
      median(border.map((c) => c[0])),
      median(border.map((c) => c[1])),
      median(border.map((c) => c[2])),
    ];

    // ── 2. Toleransi adaptif ──
    // Border berisi cluster background (jarak kecil) + mungkin subjek (jaket/baju,
    // jarak besar). Percentile rata-rata mudah tercemar subjek — pakai "gap pertama
    // signifikan" dari cluster background untuk memisahkan keduanya.
    const dists = border.map((c) => colorDist(c, bgColor)).sort((a, b) => a - b);
    let clusterEnd = 40; // fallback aman: jangan pernah terlalu agresif
    for (let i = 1; i < dists.length; i++) {
      const gap = dists[i] - dists[i - 1];
      if (gap >= 8 && dists[i - 1] < 90) {
        clusterEnd = dists[i - 1];
        break;
      }
    }
    const tolerance = options.tolerance ?? Math.max(32, Math.min(85, Math.ceil(clusterEnd * 1.4)));
    const softMax = tolerance * 1.9;

    // ── 3. Flood-fill dari tepi ──
    const isBg = new Uint8Array(w * h); // 1 = background terhubung tepi
    const visited = new Uint8Array(w * h);
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      const i = y * w + x;
      if (x < 0 || y < 0 || x >= w || y >= h || visited[i]) return;
      visited[i] = 1;
      const d = colorDist(rgbAt(x, y), bgColor);
      if (d <= tolerance) {
        isBg[i] = 1;
        stack.push(i);
      }
    };
    // Seeder: seluruh tepi
    for (let x = 0; x < w; x++) {
      push(x, 0);
      push(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      push(0, y);
      push(w - 1, y);
    }
    while (stack.length > 0) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i - x) / w;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    // ── 4. Terapkan alpha (feather pada zona transisi) ──
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = px(x, y);
        if (isBg[y * w + x]) {
          data[i + 3] = 0;
        } else {
          // Zona transisi: piksel subjek yang dekat background diberi alpha parsial
          const d = colorDist([data[i], data[i + 1], data[i + 2]], bgColor);
          if (d < softMax) {
            const a = ((d - tolerance) / (softMax - tolerance)) * 255;
            data[i + 3] = Math.min(255, Math.max(0, Math.round(a)));
          }
        }
      }
    }

    return await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } catch {
    return input; // graceful fallback
  }
}

/** Cek apakah sharp tersedia (untuk lazy generation yang aman). */
export function isSharpAvailable(): boolean {
  try {
    return typeof sharp === 'function';
  } catch {
    return false;
  }
}
