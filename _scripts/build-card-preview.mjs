#!/usr/bin/env node
/**
 * GENERATOR preview kartu KTA — satu-satunya cara mengubah `_scripts/preview-kta-card.html`.
 *
 * Semua nilai layout (posisi, ukuran, warna, dekorasi SVG, CSS) ditarik dari
 * `packages/card-design/index.js` (sumber tunggal desain) + aset base64.
 * Jalankan: node _scripts/build-card-preview.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specUrl = pathToFileURL(path.join(__dirname, '..', 'packages', 'card-design', 'index.js')).href;
const spec = (await import(specUrl)).default;

const { CARD, COLORS, FRONT, BACK, LEVELS, getLevelVisual, photoCrop, fmt, decorFrontSvg, decorBackSvg, guillocheSvg, cardCss } = spec;

const b64 = (p, mime) => 'data:' + mime + ';base64,' + readFileSync(path.join(__dirname, p)).toString('base64');

const ASSETS = {
  logo: b64('../apps/mobile/assets/images/logo.png', 'image/png'),
  peta: b64('../apps/mobile/assets/images/peta-indonesia.png', 'image/png'),
  fotoBg: b64('final-bg-check.png', 'image/png'),
  fotoOrig: b64('../Jefry Arianto Baba.jpg', 'image/jpeg'),
};

// ── Data demo (Jefry Arianto Baba — data asli dari DB staging) ──
const DEMO = {
  nomorAnggota: 'LRT-0103-001-1994',
  namaLengkap: 'Jefry Arianto Baba',
  jenisKelamin: 'L',
  tempatLahir: 'Oebafok',
  tanggalLahir: '1983-07-06',
  tempatDadar: 'Lekunik',
  tahunDadar: '1994',
  tingkat: 'Muda',
  ranting: 'San Juan Lebao',
  wilayah: 'Wilayah Larantuka & Solor',
  distrik: 'Keuskupan Larantuka',
  status: 'aktif',
  signerName: 'Yoseph Pehan Betan',
  signerTitle: 'Koordinator Distrik',
};

const lv = getLevelVisual(DEMO.tingkat, null);
const distrik = DEMO.distrik.replace(/^keuskupan\s*/i, '').toUpperCase();
const ttl = fmt.ttl(DEMO.tempatLahir, DEMO.tanggalLahir);
const dadar = fmt.dadar(DEMO.tempatDadar, DEMO.tahunDadar);
const validUntil = fmt.validUntilText();

// QR dekoratif (pola deterministik + finder pattern) — hanya untuk preview statis
function qrMarkup() {
  const n = 29;
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const cells = [];
  for (let y = 0; y < n; y++) { cells[y] = []; for (let x = 0; x < n; x++) cells[y][x] = rnd() < 0.46; }
  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      cells[oy + y][ox + x] = edge || core;
    }
  };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  let html = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (cells[y][x]) html += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg width="100%" height="100%" viewBox="0 0 29 29" shape-rendering="crispEdges">${html}</svg>`;
}

// Face-crop foto (kepala + bahu) — kalkulasi sama di semua renderer
const cropBig = photoCrop(FRONT.photo.big.w, FRONT.photo.big.h);
const cropSmall = photoCrop(FRONT.photo.small.w, FRONT.photo.small.h);

const frontMarkup = `
<div class="card front" id="cardFront">
  <div class="bg-circle1"></div><div class="bg-circle2"></div>
  ${decorFrontSvg()}
  ${guillocheSvg('front')}
  <div class="watermark front" style="-webkit-mask-image:url('${ASSETS.peta}');mask-image:url('${ASSETS.peta}')"></div>
  <div class="header-row">
    <div class="logo"><img src="${ASSETS.logo}" alt="logo"/></div>
    <div class="header-text">
      <div class="r1">KARTU TANDA ANGGOTA</div>
      <div class="r2">ORGANISASI PENCAK SILAT PENDIDIKAN</div>
      <div class="r3">TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</div>
      <div>DISTRIK KEUSKUPAN ${distrik}</div>
    </div>
  </div>
  <div class="photo-slot photo-big"><img id="cardPhoto" src="${ASSETS.fotoBg}" style="left:${cropBig.left}px;top:${cropBig.top}px;width:${cropBig.w}px;height:${cropBig.h}px" alt="foto"/></div>
  <div class="photo-slot photo-small"><img id="cardPhotoSmall" src="${ASSETS.fotoBg}" style="left:${cropSmall.left}px;top:${cropSmall.top}px;width:${cropSmall.w}px;height:${cropSmall.h}px" alt="foto"/></div>
  ${lv.stripCount > 0 ? `
  <div class="rank-box">
    <div class="rank-name">${DEMO.tingkat.toUpperCase()}</div>
    <div class="rank-strips">${Array.from({ length: lv.stripCount }).map(() => `<div class="rank-strip" style="background:${lv.color}"></div>`).join('')}</div>
  </div>` : ''}
  <div class="info">
    <div class="info-row"><div class="info-label">No. Anggota</div><div class="info-value strong">${DEMO.nomorAnggota.toUpperCase()}</div></div>
    <div class="info-pair">
      <div class="info-row info-pair-left"><div class="info-label">Nama</div><div class="info-value">${DEMO.namaLengkap.toUpperCase()}</div></div>
      <div class="jk-box"><div class="info-label">JK</div><div class="info-value">${DEMO.jenisKelamin === 'P' ? 'P' : 'L'}</div></div>
    </div>
    <div class="info-row"><div class="info-label">Tempat, Tanggal Lahir</div><div class="info-value">${ttl.toUpperCase()}</div></div>
    <div class="info-row"><div class="info-label">Ranting</div><div class="info-value">${DEMO.ranting.toUpperCase()}</div></div>
    <div class="info-row"><div class="info-label">Wilayah</div><div class="info-value">${DEMO.wilayah.toUpperCase()}</div></div>
  </div>
  <div class="bottom-info">
    <div class="bottom-label">Berlaku sampai</div>
    <div class="bottom-value">${validUntil}</div>
  </div>
  <div class="signer">
    <div class="sig-title1">KOORDINATORAT DISTRIK THS-THM</div>
    <div class="sig-title2">KEUSKUPAN ${distrik}</div>
    <div class="sig-wrap">
      <div class="stamp">STEMPEL</div>
      <div class="sig-text">ttd</div>
    </div>
    <div class="signer-row">
      <div class="signer-name">${DEMO.signerName.toUpperCase()}</div>
      <div class="signer-title">${DEMO.signerTitle.toUpperCase()}</div>
    </div>
  </div>
</div>`;

const backMarkup = `
<div class="card back">
  ${decorBackSvg()}
  ${guillocheSvg('back')}
  <div class="watermark back" style="-webkit-mask-image:url('${ASSETS.peta}');mask-image:url('${ASSETS.peta}')"></div>
  <div class="back-title">
    <div class="t">VERIFIKASI KARTU ANGGOTA</div>
    <div class="s">Scan QR untuk memeriksa keabsahan anggota</div>
  </div>
  <div class="qr-box">${qrMarkup()}</div>
  <div class="back-info">
    <div class="back-desc">Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.</div>
    <div class="back-row"><span class="lbl">TTL</span><span class="colon">:</span><span class="val">${ttl.toUpperCase()}</span></div>
    <div class="back-row"><span class="lbl">DADAR</span><span class="colon">:</span><span class="val">${dadar.toUpperCase()}</span></div>
    <div class="back-row"><span class="lbl">STATUS</span><span class="colon">:</span><span class="val">${(DEMO.status === 'aktif' ? 'AKTIF' : 'NONAKTIF')}</span></div>
    <div class="back-row"><span class="lbl">VALID S/D</span><span class="colon">:</span><span class="val">${validUntil.toUpperCase()}</span></div>
    <div class="back-row"><span class="lbl">ALAMAT</span><span class="colon">:</span><span class="val">THS-THM, ${distrik}</span></div>
  </div>
  <div class="back-footer">
    <div class="footer-text">Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.</div>
    <div class="footer-url"><div class="u">URL Verifikasi</div><div class="v">/verify/member/token</div></div>
  </div>
</div>`;

const html = `<!DOCTYPE html>
<!-- ⚠️ GENERATED FILE — jangan edit langsung. Ubah packages/card-design/index.js atau
     _scripts/build-card-preview.mjs lalu jalankan: node _scripts/build-card-preview.mjs -->
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Preview KTA — Foto Tanpa Background (ala SIM)</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 28px 32px 48px; }
  h1 { font-size: 21px; margin: 0 0 4px; }
  p.sub { color: #94a3b8; margin: 0 0 20px; font-size: 14px; }
  p.sub code, .pill code { background: #1e293b; padding: 1px 6px; border-radius: 6px; color: #7dd3fc; font-size: 12px; }
  .controls { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
  .controls .label { font-size: 13px; color: #cbd5e1; }
  .seg { display: inline-flex; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 4px; gap: 4px; }
  .seg button { border: 0; background: transparent; color: #94a3b8; font-size: 13px; padding: 7px 14px; border-radius: 7px; cursor: pointer; font-weight: 600; }
  .seg button.active { background: #2563eb; color: #fff; }
  .pill { display: inline-block; font-size: 12px; color: #86efac; background: rgba(22,163,74,.15); border: 1px solid rgba(34,197,94,.4); padding: 4px 10px; border-radius: 999px; }
  .cards { display: flex; gap: 28px; flex-wrap: wrap; align-items: flex-start; }
  .card-col h3 { font-size: 14px; margin: 0 0 10px; color: #cbd5e1; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .card-col h3 .tag { font-size: 11px; color: #93c5fd; background: rgba(37,99,235,.18); border: 1px solid rgba(96,165,250,.35); padding: 2px 8px; border-radius: 999px; font-weight: 600; }
  .frame { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 14px; box-shadow: 0 12px 40px rgba(0,0,0,.4); }
  .scaled { transform: scale(.72); transform-origin: top left; }
  .legend { display: flex; gap: 18px; margin-top: 14px; flex-wrap: wrap; }
  .legend div { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #94a3b8; }
  .swatch { width: 14px; height: 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,.25); }
  .note { margin-top: 22px; max-width: 900px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px 18px; font-size: 13px; line-height: 1.65; color: #cbd5e1; }
  .note b { color: #f1f5f9; }
  .note code { background: #0f172a; padding: 1px 6px; border-radius: 6px; color: #7dd3fc; font-size: 12px; }
  ${cardCss()}
</style>
</head>
<body>
  <h1>Kartu Tanda Anggota (KTA) — preview hasil akhir</h1>
  <p class="sub">Depan &amp; belakang kartu CR80 (${CARD.W}×${CARD.H}) memakai <b>foto tanpa background</b> (<code>&lt;file&gt;.bg.png</code>) di posisi wajah ala SIM. Toggle untuk membandingkan dengan foto asli ber-background merah.</p>

  <div class="controls">
    <span class="label">Sumber foto di kartu:</span>
    <div class="seg" id="seg">
      <button data-src="bg" class="active">✓ Tanpa background (.bg.png)</button>
      <button data-src="orig">Foto asli (merah)</button>
    </div>
    <span class="pill">kiri: 60% atas pasfoto (kepala + bahu)</span>
  </div>

  <div class="cards">
    <div class="card-col">
      <h3>Depan <span class="tag">KARTU TANDA ANGGOTA</span></h3>
      <div class="frame"><div class="scaled">${frontMarkup}</div></div>
    </div>
    <div class="card-col">
      <h3>Belakang <span class="tag">VERIFIKASI QR</span></h3>
      <div class="frame"><div class="scaled">${backMarkup}</div></div>
    </div>
  </div>

  <div class="legend">
    <div><span class="swatch" style="background:repeating-conic-gradient(#94a3b8 0% 25%, #64748b 0% 50%)"></span> area transparan (background dihapus)</div>
    <div><span class="swatch" style="background:${COLORS.front.bg}"></span> background kartu terlihat di belakang foto</div>
  </div>

  <div class="note">
    <b>Bagaimana ini bekerja:</b> foto yang diunggah lewat kamera/upload otomatis dibuatkan versi <code>&lt;file&gt;.bg.png</code> (background solid merah/biru/hijau dihapus via flood-fill dari tepi, PNG transparan). Kartu digital &amp; PDF memakai versi ini — jadi di kartu yang tampak hanya wajah &amp; bahu, tanpa kotak merah. Klik <b>"Foto asli (merah)"</b> di atas untuk melihat bedanya.
  </div>

<script>
  (function () {
    var seg = document.getElementById('seg');
    var big = document.getElementById('cardPhoto');
    var small = document.getElementById('cardPhotoSmall');
    var bg = ${JSON.stringify(ASSETS.fotoBg)};
    var orig = ${JSON.stringify(ASSETS.fotoOrig)};
    seg.addEventListener('click', function (e) {
      var btn = e.target.closest('button'); if (!btn) return;
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var src = btn.dataset.src === 'bg' ? bg : orig;
      big.src = src; small.src = src;
    });
  })();
</script>
</body>
</html>
`;

writeFileSync(path.join(__dirname, 'preview-kta-card.html'), html);
console.log('ok — preview-kta-card.html diperbarui dari spec (' + (html.length / 1024 / 1024).toFixed(2) + ' MB)');
