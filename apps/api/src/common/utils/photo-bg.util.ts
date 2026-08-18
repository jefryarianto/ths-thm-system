/**
 * Util penghapus background foto pasfoto (ala SIM).
 *
 * Pipeline:
 * 1. Normalisasi orientasi: hormati EXIF; jika hasilnya landscape (w > h),
 *    putar 90° ke potret — pasfoto selalu potret, foto landscape dari kamera
 *    depan adalah kesalahan orientasi yang bikin wajah "distorsi" di kartu.
 * 2. Downscale: max edge 1200px (lebih cepat, noise lebih sedikit).
 * 3. Model background GRADIEN: warna background diestimasi per-piksel via
 *    interpolasi bilinear dari warna tepi (atas/bawah atau kiri/kanan, arah
 *    gradien dominan). Mengatasi vignette/pencahayaan tidak merata yang sering
 *    membuat background lama tersisa atau subjek ikut terhapus.
 * 4. Flood-fill dari tepi dengan toleransi konservatif (hanya area yang
 *    terhubung ke tepi & cocok dengan model background yang dihapus).
 * 5. Proteksi subjek: erosi 1px pada mask background + feather pada zona
 *    transisi, supaya rambut/bahu tidak terpotong.
 * 6. STANDARISASI: subjek dipotong dari bbox-nya lalu diletakkan di kanvas
 *    pasfoto 900×1200 (3:4 potret) — kepala di atas, bahu di bawah, ala SIM.
 *    Semua renderer kartu (mobile/web/PDF) memotong 60% atas kanvas ini,
 *    sehingga wajah SELALU berada di area yang terlihat, apa pun framing foto
 *    aslinya (mis. wajah di tengah frame karena overlay oval).
 *
 * Output: PNG 900×1200 dengan background transparan.
 * Fallback: jika sharp tidak tersedia / gagal, kembalikan input apa adanya.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');

/** Kanvas pasfoto standar 3:4 potret. */
const PASFOTO_W = 900;
const PASFOTO_H = 1200;

export interface RemovePhotoBgOptions {
  /** Toleransi warna (jarak euclidean RGB). Default: adaptif dari sebaran tepi. */
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

function lerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Hapus background foto pasfoto → PNG transparan 900×1200 (kanvas pasfoto 3:4).
 * Fallback: jika sharp tidak tersedia / gagal, kembalikan input apa adanya.
 */
export async function removePhotoBackground(
  input: Buffer,
  options: RemovePhotoBgOptions = {},
): Promise<Buffer> {
  try {
    // ── 0. Orientasi: EXIF rotate; landscape → potret (pasfoto selalu potret) ──
    const rotatedMeta = await sharp(input).rotate().metadata();
    let w = rotatedMeta.width || 0;
    let h = rotatedMeta.height || 0;
    if (!w || !h) return input;
    let extraRotation = 0;
    if (w > h) {
      extraRotation = 90;
      [w, h] = [h, w];
    }

    // ── 1. Downscale: max edge 1200px ──
    const maxEdge = 1200;
    let rw = w;
    let rh = h;
    if (Math.max(w, h) > maxEdge) {
      const k = maxEdge / Math.max(w, h);
      rw = Math.round(w * k);
      rh = Math.round(h * k);
    }

    let pipe = sharp(input).rotate();
    if (extraRotation) pipe = pipe.rotate(extraRotation);
    pipe = pipe.resize(rw, rh, { fit: 'inside' }).ensureAlpha();
    const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
    w = info.width;
    h = info.height;
    const px = (x: number, y: number) => (y * w + x) * 4;
    const rgbAt = (x: number, y: number): [number, number, number] => [
      data[px(x, y)],
      data[px(x, y) + 1],
      data[px(x, y) + 2],
    ];

    // ── 2. Model background gradien dari warna tepi (tahan kontaminasi subjek) ──
    // Sampel SELURUH tepi, lalu untuk tiap tepi cluster background dipisahkan dari
    // subjek via GAP TERBESAR pada urutan jarak dari warna bg dasar. Ini menangani
    // dua kasus ekstrem sekaligus:
    //   • subjek menyentuh tepi (bahu di bawah bingkai) — cluster bg tetap terambil;
    //   • subjek memenuhi frame (pasfoto close-up) — strip bg tipis tetap terambil.
    // Warna bg dasar = bucket terpadat dari kuantisasi warna seluruh tepi.
    const strip = 4;
    const step = Math.max(1, Math.floor((w + h) / 250));
    const topSamples: Array<[number, number, number]> = [];
    const bottomSamples: Array<[number, number, number]> = [];
    const leftSamples: Array<[number, number, number]> = [];
    const rightSamples: Array<[number, number, number]> = [];
    for (let x = strip; x < w - strip; x += step) {
      topSamples.push(rgbAt(x, strip));
      bottomSamples.push(rgbAt(x, h - 1 - strip));
    }
    for (let y = strip; y < h - strip; y += step) {
      leftSamples.push(rgbAt(strip, y));
      rightSamples.push(rgbAt(w - 1 - strip, y));
    }
    if (topSamples.length === 0) return input;

    const med = (arr: Array<[number, number, number]>): [number, number, number] => [
      median(arr.map((c) => c[0])),
      median(arr.map((c) => c[1])),
      median(arr.map((c) => c[2])),
    ];
    const allBorder = [...topSamples, ...bottomSamples, ...leftSamples, ...rightSamples];
    const BUCKET = 24;
    const qkey = (c: [number, number, number]) =>
      (Math.floor(c[0] / BUCKET) << 10) | (Math.floor(c[1] / BUCKET) << 5) | Math.floor(c[2] / BUCKET);
    const bucketCount = new Map<number, number>();
    for (const c of allBorder) {
      const k = qkey(c);
      bucketCount.set(k, (bucketCount.get(k) || 0) + 1);
    }
    let bestKey = -1;
    let bestCount = 0;
    bucketCount.forEach((cnt, k) => {
      if (cnt > bestCount) {
        bestCount = cnt;
        bestKey = k;
      }
    });
    const bgBase = med(allBorder.filter((c) => qkey(c) === bestKey));

    /** Warna bg satu tepi: cluster terdepan sebelum gap terbesar yang signifikan. */
    const edgeColor = (samples: Array<[number, number, number]>): {
      col: [number, number, number];
      bgSamples: Array<[number, number, number]>;
    } => {
      if (samples.length === 0) return { col: bgBase, bgSamples: [] };
      const withDist = samples
        .map((c) => ({ c, d: colorDist(c, bgBase) }))
        .sort((a, b) => a.d - b.d);
      let splitAt = withDist.length;
      let bestGap = -1;
      let bestIdx = -1;
      for (let i = 1; i < withDist.length; i++) {
        const gap = withDist[i].d - withDist[i - 1].d;
        if (gap > bestGap) {
          bestGap = gap;
          bestIdx = i;
        }
      }
      if (
        bestGap >= Math.max(8, withDist[bestIdx - 1].d * 0.08) &&
        bestIdx >= Math.ceil(withDist.length * 0.12)
      ) {
        splitAt = bestIdx;
      }
      const cluster = withDist.slice(0, splitAt);
      const col = med(cluster.map((s) => s.c));
      // Sanity: warna tepi harus mirip bg global — bila tepi itu penuh subjek,
      // fallback ke bgBase (jangan cemari model).
      if (colorDist(col, bgBase) > 110) {
        return { col: bgBase, bgSamples: [] };
      }
      return { col, bgSamples: cluster.map((s) => s.c) };
    };
    const topEdge = edgeColor(topSamples);
    const bottomEdge = edgeColor(bottomSamples);
    const leftEdge = edgeColor(leftSamples);
    const rightEdge = edgeColor(rightSamples);
    const topCol = topEdge.col;
    const bottomCol = bottomEdge.col;
    const leftCol = leftEdge.col;
    const rightCol = rightEdge.col;
    // Arah gradien dominan (vertikal vs horizontal) menentukan interpolasi.
    const useVertical = colorDist(topCol, bottomCol) >= colorDist(leftCol, rightCol);
    const bgAt = (x: number, y: number): [number, number, number] => {
      const t = useVertical ? y / Math.max(1, h - 1) : x / Math.max(1, w - 1);
      return useVertical ? lerp(topCol, bottomCol, t) : lerp(leftCol, rightCol, t);
    };

    // ── 3. Toleransi adaptif konservatif dari sebaran warna bg di tepi ──
    const edgeDists: number[] = [];
    const edgeList: Array<[Array<[number, number, number]>, string, number, Array<[number, number, number]>]> = [
      [topSamples, 'x', strip, topEdge.bgSamples],
      [bottomSamples, 'x', h - 1 - strip, bottomEdge.bgSamples],
      [leftSamples, 'y', strip, leftEdge.bgSamples],
      [rightSamples, 'y', w - 1 - strip, rightEdge.bgSamples],
    ];
    for (const [col, xs, ys, bgCluster] of edgeList) {
      for (let i = 0; i < col.length; i++) {
        const x = xs === 'x' ? strip + i * step : ys;
        const y = xs === 'x' ? ys : strip + i * step;
        const c = col[i];
        // Sampel anggota cluster bg → ukur noise background (bukan subjek)
        if (bgCluster.some((b) => b[0] === c[0] && b[1] === c[1] && b[2] === c[2])) {
          edgeDists.push(colorDist(c, bgAt(x, y)));
        }
      }
    }
    const spread = edgeDists.length ? median(edgeDists.sort((a, b) => a - b)) : 16;
    // Konservatif: jangan pernah terlalu agresif (subjek tidak boleh ikut terhapus).
    const tolerance = options.tolerance ?? Math.max(26, Math.min(45, Math.round(spread * 2.2)));
    const softMax = tolerance * 1.8;

    // ── 4. Flood-fill dari tepi: piksel bg yang terhubung ke tepi ──
    const isBg = new Uint8Array(w * h);
    const visited = new Uint8Array(w * h);
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = y * w + x;
      if (visited[i]) return;
      visited[i] = 1;
      const d = colorDist(rgbAt(x, y), bgAt(x, y));
      if (d <= tolerance) {
        isBg[i] = 1;
        stack.push(i);
      }
    };
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

    // ── 5. Erosi 1px (lindungi tepi subjek) + feather ──
    const erodedBg = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!isBg[i]) continue;
        const n =
          isBg[i - 1] && isBg[i + 1] && isBg[i - w] && isBg[i + w] &&
          isBg[i - w - 1] && isBg[i - w + 1] && isBg[i + w - 1] && isBg[i + w + 1];
        if (n) erodedBg[i] = 1;
      }
    }
    // Terapkan alpha: bg → 0; rim erosi → transparan tipis; transisi → parsial; subjek → 255
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = px(x, y);
        if (erodedBg[y * w + x]) {
          data[i + 3] = 0;
        } else if (isBg[y * w + x]) {
          // Rim yang dierosi: tepi lembut antara bg dan subjek
          data[i + 3] = 40;
        } else {
          const d = colorDist([data[i], data[i + 1], data[i + 2]], bgAt(x, y));
          if (d < softMax) {
            const a = ((d - tolerance) / (softMax - tolerance)) * 255;
            data[i + 3] = Math.min(255, Math.max(0, Math.round(a)));
          }
        }
      }
    }

    // ── 6. Standarisasi ke kanvas pasfoto 900×1200 (kepala atas, bahu bawah) ──
    return await composePasfoto(data, w, h, input);
  } catch {
    return input; // graceful fallback
  }
}

/**
 * Potong subjek (bbox dari alpha) lalu letakkan di kanvas pasfoto 900×1200.
 * Posisi ala SIM: kepala di 9% tinggi kanvas, subjek mengisi ~62% tinggi.
 */
async function composePasfoto(
  data: Buffer,
  w: number,
  h: number,
  fallbackInput: Buffer,
): Promise<Buffer> {
  // Bbox subjek: piksel dengan alpha > 40
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 40) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return fallbackInput; // tidak ada subjek terdeteksi

  // Margin 6% + clamp ke batas gambar
  const mw = Math.max(2, Math.round((maxX - minX + 1) * 0.06));
  const mh = Math.max(2, Math.round((maxY - minY + 1) * 0.06));
  const bx0 = Math.max(0, minX - mw);
  const by0 = Math.max(0, minY - mh);
  const bx1 = Math.min(w - 1, maxX + mw);
  const by1 = Math.min(h - 1, maxY + mh);
  const subW = bx1 - bx0 + 1;
  const subH = by1 - by0 + 1;

  // Crop raw ke bbox
  const sub = Buffer.alloc(subW * subH * 4);
  for (let y = 0; y < subH; y++) {
    for (let x = 0; x < subW; x++) {
      const si = ((by0 + y) * w + (bx0 + x)) * 4;
      const di = (y * subW + x) * 4;
      sub[di] = data[si];
      sub[di + 1] = data[si + 1];
      sub[di + 2] = data[si + 2];
      sub[di + 3] = data[si + 3];
    }
  }

  // Skala agar subjek mengisi ~62% tinggi kanvas (≤ 86% lebar)
  const targetH = PASFOTO_H * 0.62;
  const targetW = PASFOTO_W * 0.86;
  let scale = Math.min(targetH / subH, targetW / subW);
  scale = Math.min(scale, 2); // hindari upscale berlebihan
  const outW = Math.max(1, Math.round(subW * scale));
  const outH = Math.max(1, Math.round(subH * scale));

  const scaled = await sharp(sub, { raw: { width: subW, height: subH, channels: 4 } })
    .resize(outW, outH, { fit: 'fill' })
    .png()
    .toBuffer();

  const left = Math.round((PASFOTO_W - outW) / 2);
  const top = Math.round(PASFOTO_H * 0.09);

  return await sharp({
    create: {
      width: PASFOTO_W,
      height: PASFOTO_H,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: scaled, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Cek apakah sharp tersedia (untuk lazy generation yang aman). */
export function isSharpAvailable(): boolean {
  try {
    return typeof sharp === 'function';
  } catch {
    return false;
  }
}
