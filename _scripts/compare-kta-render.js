#!/usr/bin/env node
/**
 * Perbandingan render kartu KTA dari API (buildMemberCardPdf → PDF → PNG)
 * dengan spec `packages/card-design` (sumber tunggal) & preview HTML.
 *
 * 1. Generate PDF halaman depan memakai foto tanpa background (final-bg-check.png).
 * 2. Rasterisasi halaman 1 → PNG (≈300 DPI; pdf-poppler `scale` = sisi terpanjang px).
 * 3. Parse stream PDF dengan interpreter ringan (q/Q/cm/Do + clip): posisi absolut
 *    gambar foto dibandingkan dengan spec (koordinat top-left seperti desain).
 * 4. Analisis piksel PNG: siluet ter-center di kotak spec & tidak ada blok
 *    background merah (foto tanpa background menyatu dengan kartu).
 *
 * Jalankan: node _scripts/compare-kta-render.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const DIST = path.join(root, 'apps', 'api', 'dist');

const { buildMemberCardPdf } = require(path.join(DIST, 'modules', 'documents', 'pdf-templates', 'member-card'));
const ReactPDF = require('@react-pdf/renderer');
const pdfPoppler = require('pdf-poppler');
const spec = require(path.join(root, 'packages', 'card-design'));

const { CARD, FRONT, photoCrop } = spec;

// ── Data anggota (sama dgn preview: Jefry Arianto Baba) ──
const MEMBER = {
  namaLengkap: 'Jefry Arianto Baba',
  nomorAnggota: 'LRT-0103-001-1994',
  tempatLahir: 'Oebafok',
  tanggalLahir: '1983-07-06',
  jenisKelamin: 'L',
  tingkat: 'Muda',
  tempatDadar: 'Lekunik',
  tahunDadar: '1994',
  ranting: 'San Juan Lebao',
  wilayah: 'Wilayah Larantuka & Solor',
  distrik: 'Keuskupan Larantuka',
  alamatDistrik: 'Lebao',
  statusKeanggotaan: 'aktif',
};

const photoDataUrl = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'final-bg-check.png')).toString('base64');

const props = {
  member: MEMBER,
  cardConfig: {
    nomorDokumen: 'KTA-LRT-0103-001-1994',
    qrDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    verificationUrl: 'https://ths-thm.cloud/verify/demo',
    signers: [{ signerName: 'Yoseph Pehan Betan', signerTitle: 'Koordinator Distrik' }],
    signerName: 'Yoseph Pehan Betan',
    signerTitle: 'Koordinator Distrik',
  },
  photoDataUrl,
  signatureDataUrl: null,
  stampDataUrl: null,
  levelVisual: null,
};

// Ekspektasi spec (koordinat desain top-left), lalu flip ke koordinat PDF native
// (y_native = 540 − y_topLeft) karena interpreter mengakumulasi matrix native.
const cropBig = photoCrop(FRONT.photo.big.w, FRONT.photo.big.h);
const cropSmall = photoCrop(FRONT.photo.small.w, FRONT.photo.small.h);
const flipY = (r) => ({ x0: r.x0, y0: CARD.H - r.y1, x1: r.x1, y1: CARD.H - r.y0 });
const expectBig = {
  name: 'foto besar',
  slot: flipY({ x0: FRONT.photo.big.left, y0: FRONT.photo.big.top, x1: FRONT.photo.big.left + FRONT.photo.big.w, y1: FRONT.photo.big.top + FRONT.photo.big.h }),
  img: flipY({
    x0: FRONT.photo.big.left + cropBig.left,
    y0: FRONT.photo.big.top,
    x1: FRONT.photo.big.left + cropBig.left + cropBig.w,
    y1: FRONT.photo.big.top + cropBig.h,
  }),
};
const expectSmall = {
  name: 'foto kecil',
  slot: flipY({ x0: CARD.W - FRONT.photo.small.right - FRONT.photo.small.w, y0: FRONT.photo.small.top, x1: CARD.W - FRONT.photo.small.right, y1: FRONT.photo.small.top + FRONT.photo.small.h }),
  img: flipY({
    x0: CARD.W - FRONT.photo.small.right - FRONT.photo.small.w + cropSmall.left,
    y0: FRONT.photo.small.top,
    x1: CARD.W - FRONT.photo.small.right - FRONT.photo.small.w + cropSmall.left + cropSmall.w,
    y1: FRONT.photo.small.top + cropSmall.h,
  }),
};

// ── 1. Generate PDF (2 halaman; halaman 1 = depan) ──
(async () => {
  const pdfDoc = buildMemberCardPdf(props, { combined: false });
  const pdfBuffer = await ReactPDF.renderToBuffer(pdfDoc);
  const pdfPath = path.join(__dirname, 'kta-compare.pdf');
  fs.writeFileSync(pdfPath, pdfBuffer);
  console.log('1) PDF tersimpan:', pdfPath, `(${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

  // ── 2. Rasterisasi halaman 1 → PNG ──
  // Catatan: pdf-poppler `scale` = panjang sisi TERPANJANG dalam piksel (bukan DPI);
  // 3567 ≈ 300 DPI untuk kartu 856pt (856/72×300).
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kta-compare-'));
  const pdfInputPath = path.join(tmpDir, 'input.pdf');
  fs.writeFileSync(pdfInputPath, pdfBuffer);
  await pdfPoppler.convert(pdfInputPath, {
    format: 'png', out_dir: tmpDir, out_prefix: 'page', page: 1, scale: 3567,
  });
  const pngBuffer = fs.readFileSync(path.join(tmpDir, 'page-1.png'));
  const pngPath = path.join(__dirname, 'kta-front-pdf.png');
  fs.writeFileSync(pngPath, pngBuffer);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  console.log('2) PNG halaman depan tersimpan:', pngPath);

  // ── 3. Parse stream PDF (interpreter ringan) — posisi absolut gambar + clip ──
  const report = parsePdf(pdfBuffer);
  console.log('\n3) Gambar foto (posisi absolut, top-left):');
  report.draws
    .filter((d) => d.name === 'I2')
    .forEach((d) => {
      const r = d.rect;
      console.log(
        `   ${d.name} ${d.sizeW.toFixed(1)}×${d.sizeH.toFixed(1)} @ (${r.x0.toFixed(1)}, ${r.y0.toFixed(1)})–(${r.x1.toFixed(1)}, ${r.y1.toFixed(1)})` +
          ` | clip: ${d.clips.map((c) => `(${c.x0.toFixed(0)},${c.y0.toFixed(0)},${c.x1.toFixed(0)},${c.y1.toFixed(0)})`).join(' + ') || '—'}`,
      );
    });

  const rectNear = (r, e, tol) => Math.abs(r.x0 - e.x0) <= tol && Math.abs(r.y0 - e.y0) <= tol && Math.abs(r.x1 - e.x1) <= tol && Math.abs(r.y1 - e.y1) <= tol;
  const slotClipped = (d, e) => d.clips.some((c) => rectNear(c, e.slot, 1));
  const imgMatched = (d, e) => rectNear(d.rect, e.img, 1.5) && d.sizeW > 0;
  const bigDraw = report.draws.find((d) => d.name === 'I2' && d.sizeW > 250);
  const smallDraw = report.draws.find((d) => d.name === 'I2' && d.sizeW <= 250);
  const checks = [
    ['foto besar: posisi & ukuran = spec', !!bigDraw && imgMatched(bigDraw, expectBig)],
    ['foto besar: ter-clip ke kotak spec', !!bigDraw && slotClipped(bigDraw, expectBig)],
    ['foto kecil: posisi & ukuran = spec', !!smallDraw && imgMatched(smallDraw, expectSmall)],
    ['foto kecil: ter-clip ke kotak spec', !!smallDraw && slotClipped(smallDraw, expectSmall)],
  ];

  // ── 4. Analisis piksel PNG ──
  const sharp = require('sharp');
  const meta = await sharp(pngBuffer).metadata();
  const scale = meta.width / CARD.W;
  console.log(`\n4) PNG: ${meta.width}×${meta.height}px (scale ${scale.toFixed(3)} px/unit desain)`);

  const { data, info } = await sharp(pngBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = (x, y) => (y * info.width + x) * 4;

  // Region kotak foto besar dalam piksel
  const box = {
    x0: Math.round(expectBig.slot.x0 * scale),
    x1: Math.round(expectBig.slot.x1 * scale),
    y0: Math.round(expectBig.slot.y0 * scale),
    y1: Math.round(expectBig.slot.y1 * scale),
  };

  let redPx = 0;
  let personPx = 0;
  let darkMinX = Infinity, darkMaxX = -Infinity, darkMinY = Infinity, darkMaxY = -Infinity;
  const LUM_CUTOFF = 0.72 * 255; // siluet = piksel lebih gelap dari kartu terang
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const i = px(x, y);
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Background merah pasfoto asli ≈ blok besar (r tinggi, g/b rendah); baju merah subjek tersebar (<2%)
      if (r > 170 && g < 120 && b < 120 && r - g > 60) redPx++;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < LUM_CUTOFF) {
        personPx++;
        if (x < darkMinX) darkMinX = x;
        if (x > darkMaxX) darkMaxX = x;
        if (y < darkMinY) darkMinY = y;
        if (y > darkMaxY) darkMaxY = y;
      }
    }
  }

  const boxW = box.x1 - box.x0, boxH = box.y1 - box.y0;
  const boxCenterX = (box.x0 + box.x1) / 2;
  const bboxCenterX = (darkMinX + darkMaxX) / 2;
  const centerDelta = bboxCenterX - boxCenterX;
  const filledRatio = personPx / (boxW * boxH);
  const redRatio = redPx / (boxW * boxH);

  console.log(`   Kotak foto besar (spec → px): x ${box.x0}-${box.x1}, y ${box.y0}-${box.y1}`);
  console.log(`   Rasio piksel merah di kotak: ${(redRatio * 100).toFixed(2)}% (${redPx} px) — <5% = tanpa bg, blok bg merah ≈ 30%+`);
  console.log(`   BBox siluet: x ${darkMinX}-${darkMaxX} (center Δ${centerDelta.toFixed(1)}px vs kotak), y ${darkMinY}-${darkMaxY}`);
  console.log(`   Rasio isi kotak: ${(filledRatio * 100).toFixed(1)}%`);

  checks.push(
    ['background merah hilang di kotak foto', redRatio < 0.05],
    ['siluet ter-center di kotak (±6px)', Math.abs(centerDelta) <= 6],
    ['siluet mengisi kotak (20–75%)', filledRatio > 0.2 && filledRatio < 0.75],
  );

  console.log('\n=== RINGKASAN ===');
  checks.forEach(([name, ok]) => console.log(`  ${ok ? '✅' : '❌'} ${name}`));
  const allOk = checks.every(([, ok]) => ok);

  // ── 5. Halaman perbandingan visual (PDF PNG + overlay spec) ──
  buildCompareHtml(pngBuffer, scale, { box, bbox: { darkMinX, darkMaxX, darkMinY, darkMaxY }, checks, allOk });
  console.log('\nHalaman perbandingan: _scripts/compare-card-photo.html');
  process.exit(allOk ? 0 : 1);
})().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});

// ── Interpreter content-stream PDF ringan ──
// Menelusuri q/Q/cm/Do + path clip (re & m/l/c) dengan transformasi kumulatif,
// sehingga posisi gambar absolut (top-left, setelah flip halaman) bisa dibandingkan dgn spec.
function parsePdf(buf) {
  const s = buf.toString('latin1');
  const draws = [];
  const reObj = /(\d+) 0 obj([\s\S]*?)endobj/g;
  let m;
  while ((m = reObj.exec(s))) {
    const body = m[2];
    const sm = body.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!sm) continue;
    let data;
    try {
      data = zlib.inflateSync(Buffer.from(sm[1], 'latin1')).toString('latin1');
    } catch {
      data = sm[1];
    }
    interpretStream(data, draws);
  }
  return { draws };
}

function interpretStream(data, draws) {
  const tokens = data.split(/\s+/).filter(Boolean);
  const ctmStack = [[1, 0, 0, 1, 0, 0]]; // [a,b,c,d,e,f]
  const clipStack = [[]];
  let bbox = null; // bbox path berjalan (user space)
  let pendingName = null;
  const cur = { x: 0, y: 0 };

  const addPoint = (x, y) => {
    if (!bbox) bbox = { x0: x, y0: y, x1: x, y1: y };
    else {
      if (x < bbox.x0) bbox.x0 = x;
      if (y < bbox.y0) bbox.y0 = y;
      if (x > bbox.x1) bbox.x1 = x;
      if (y > bbox.y1) bbox.y1 = y;
    }
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/^-?[\d.]+$/.test(t)) {
      // kumpulkan angka sampai token non-angka berikutnya (perintah)
      const args = [];
      while (i < tokens.length && /^-?[\d.]+$/.test(tokens[i])) args.push(+tokens[i++]);
      const cmd = tokens[i++];
      switch (cmd) {
        case 'cm': {
          const [a, b, c, d, e, f] = args;
          const [A, B, C, D, E, F] = ctmStack[ctmStack.length - 1];
          ctmStack[ctmStack.length - 1] = [
            A * a + C * b, B * a + D * b,
            A * c + C * d, B * c + D * d,
            A * e + C * f + E, B * e + D * f + F,
          ];
          break;
        }
        case 're': {
          const [x, y, w, h] = args;
          bbox = { x0: x, y0: y, x1: x + w, y1: y + h };
          break;
        }
        case 'm': addPoint(args[0], args[1]); cur.x = args[0]; cur.y = args[1]; break;
        case 'l': addPoint(args[0], args[1]); cur.x = args[0]; cur.y = args[1]; break;
        case 'c': addPoint(args[4], args[5]); cur.x = args[4]; cur.y = args[5]; break;
        case 'v': addPoint(args[2], args[3]); cur.x = args[2]; cur.y = args[3]; break;
        case 'y': addPoint(args[2], args[3]); cur.x = args[2]; cur.y = args[3]; break;
        case 'W':
          if (bbox) clipStack[clipStack.length - 1].push(transformRect(bbox, ctmStack[ctmStack.length - 1]));
          break;
        case 'n': bbox = null; break;
        default:
          // abaikan perintah lain (f, S, s, B, BT/ET, Tf, TJ, dsb)
          if (cmd.startsWith('/')) pendingName = cmd.slice(1);
          break;
      }
      continue;
    }
    // token non-angka (tanpa argumen angka di depannya)
    switch (t) {
      case 'q':
        ctmStack.push(ctmStack[ctmStack.length - 1].slice());
        clipStack.push(clipStack[clipStack.length - 1].slice());
        bbox = null;
        break;
      case 'Q':
        ctmStack.pop();
        clipStack.pop();
        bbox = null;
        break;
      case 'W':
        // clip memakai path SAAT INI — `h` (tutup path) TIDAK menghapus bbox, hanya `n`/path baru
        if (bbox) clipStack[clipStack.length - 1].push(transformRect(bbox, ctmStack[ctmStack.length - 1]));
        break;
      case 'h': break; // tutup path — path tetap berlaku utk W
      case 'n': bbox = null; break;
      case 'Do': {
        if (pendingName) {
          const [a, b, c, d, e, f] = ctmStack[ctmStack.length - 1];
          const x0 = Math.min(e, e + a);
          const x1 = Math.max(e, e + a);
          const y0 = Math.min(f, f + d);
          const y1 = Math.max(f, f + d);
          draws.push({
            name: pendingName,
            rect: { x0, y0, x1, y1 },
            sizeW: Math.abs(a),
            sizeH: Math.abs(d),
            clips: clipStack[clipStack.length - 1].slice(),
          });
        }
        break;
      }
      default:
        if (t.startsWith('/')) pendingName = t.slice(1);
        break;
    }
    i++;
  }
}

function transformRect(r, m) {
  const [a, b, c, d, e, f] = m;
  const pts = [
    [r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1],
  ].map(([x, y]) => [a * x + c * y + e, b * x + d * y + f]);
  return {
    x0: Math.min(...pts.map((p) => p[0])),
    x1: Math.max(...pts.map((p) => p[0])),
    y0: Math.min(...pts.map((p) => p[1])),
    y1: Math.max(...pts.map((p) => p[1])),
  };
}

function buildCompareHtml(pngBuffer, scale, r) {
  const b64 = pngBuffer.toString('base64');
  const imgW = 856 * scale;
  const imgH = 540 * scale;
  const pct = (v) => ((v / imgW) * 100).toFixed(2);
  const pctY = (v) => ((v / imgH) * 100).toFixed(2);
  const box = r.box;
  const html = `<!DOCTYPE html>
<!-- ⚠️ GENERATED oleh _scripts/compare-kta-render.js — jangan edit langsung -->
<html lang="id"><head><meta charset="utf-8"/>
<title>Perbandingan Render PDF KTA vs Spec</title>
<style>
  body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 28px 32px 48px; }
  h1 { font-size: 21px; margin: 0 0 4px; }
  p.sub { color: #94a3b8; margin: 0 0 18px; font-size: 14px; }
  .badge { display: inline-block; font-size: 13px; font-weight: 700; padding: 5px 12px; border-radius: 999px; margin-bottom: 16px; }
  .badge.ok { color: #86efac; background: rgba(22,163,74,.15); border: 1px solid rgba(34,197,94,.4); }
  .badge.fail { color: #fca5a5; background: rgba(220,38,38,.15); border: 1px solid rgba(248,113,113,.4); }
  .frame { position: relative; width: min(856px, 100%); border-radius: 18px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 12px 40px rgba(0,0,0,.4); background: #fff; }
  .frame img { display: block; width: 100%; height: auto; }
  .ov { position: absolute; pointer-events: none; }
  .ov.box { border: 3px solid rgba(239,68,68,.85); }
  .ov.bbox { border: 2px dashed rgba(34,211,238,.9); }
  .ov.label { color: #fff; font-size: 12px; font-weight: 700; background: rgba(0,0,0,.65); padding: 2px 8px; border-radius: 6px; white-space: nowrap; }
  .checks { margin-top: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; max-width: 856px; }
  .chk { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px 12px; font-size: 13px; }
  .chk b { color: #f1f5f9; }
  .legend { display: flex; gap: 18px; margin-top: 14px; flex-wrap: wrap; font-size: 12px; color: #94a3b8; }
  .legend i { display: inline-block; width: 18px; height: 3px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
</style></head><body>
  <h1>Render PDF KTA (API) vs Spec — posisi foto tanpa background</h1>
  <p class="sub">Halaman depan kartu dirender langsung oleh <code>buildMemberCardPdf</code> (dist API) dari foto <code>final-bg-check.png</code>, lalu di-rasterisasi ≈300 DPI. Garis <b style="color:#ef4444">merah</b> = kotak foto dari spec; garis <b style="color:#22d3ee">putus-putus cyan</b> = bounding box siluet hasil deteksi piksel.</p>
  <div class="badge ${r.allOk ? 'ok' : 'fail'}">${r.allOk ? '✅ SEMUA COCOK DENGAN SPEC' : '❌ ADA KETIDAKSESUAIAN'}</div>
  <div class="frame">
    <img src="data:image/png;base64,${b64}" alt="PDF render" />
    <div class="ov box" style="left:${pct(box.x0)}%;top:${pctY(box.y0)}%;width:${pct(box.x1 - box.x0)}%;height:${pctY(box.y1 - box.y0)}%"></div>
    <div class="ov bbox" style="left:${pct(r.bbox.darkMinX)}%;top:${pctY(r.bbox.darkMinY)}%;width:${pct(r.bbox.darkMaxX - r.bbox.darkMinX)}%;height:${pctY(r.bbox.darkMaxY - r.bbox.darkMinY)}%"></div>
    <div class="ov label" style="left:${pct(box.x0)}%;top:${pctY(box.y0 - 26)}%">kotak foto spec (${expectBig.slot.x0},${expectBig.slot.y0},${expectBig.slot.x1 - expectBig.slot.x0},${expectBig.slot.y1 - expectBig.slot.y0})</div>
  </div>
  <div class="legend">
    <span><i style="background:#ef4444"></i> kotak foto dari spec</span>
    <span><i style="background:#22d3ee"></i> bounding box siluet (deteksi piksel PNG)</span>
    <span>keduanya sejajar = posisi foto identik</span>
  </div>
  <div class="checks">
    ${r.checks.map(([name, ok]) => `<div class="chk">${ok ? '✅' : '❌'} <b>${name}</b></div>`).join('')}
  </div>
</body></html>`;
  fs.writeFileSync(path.join(__dirname, 'compare-card-photo.html'), html);
}
