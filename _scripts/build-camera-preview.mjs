#!/usr/bin/env node
/**
 * GENERATOR preview interaktif layar kamera KTA (overlay oval wajah ala SIM).
 * Semua nilai overlay (oval, sudut, dimensi, tombol) ditarik dari
 * `packages/card-design/index.js` (CAMERA + cameraOverlayCss) — sumber tunggal.
 * Jalankan: node _scripts/build-camera-preview.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specUrl = pathToFileURL(path.join(__dirname, '..', 'packages', 'card-design', 'index.js')).href;
const spec = (await import(specUrl)).default;

const { CAMERA, cameraOverlayCss } = spec;
const b64 = (p, mime) => 'data:' + mime + ';base64,' + readFileSync(path.join(__dirname, p)).toString('base64');

const ASSETS = {
  fotoOrig: b64('../Jefry Arianto Baba.jpg', 'image/jpeg'),
  fotoBg: b64('final-bg-check.png', 'image/png'),
};

const html = `<!DOCTYPE html>
<!-- ⚠️ GENERATED FILE — jangan edit langsung. Ubah packages/card-design/index.js atau
     _scripts/build-camera-preview.mjs lalu jalankan: node _scripts/build-camera-preview.mjs -->
<html lang="id">
<head>
<meta charset="utf-8" />
<title>Preview Kamera KTA — Overlay Wajah (ala SIM)</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 28px 32px 48px; }
  h1 { font-size: 21px; margin: 0 0 4px; }
  p.sub { color: #94a3b8; margin: 0 0 20px; font-size: 14px; }
  p.sub code { background: #1e293b; padding: 1px 6px; border-radius: 6px; color: #7dd3fc; font-size: 12px; }
  .controls { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
  .controls .label { font-size: 13px; color: #cbd5e1; }
  .seg { display: inline-flex; background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 4px; gap: 4px; }
  .seg button { border: 0; background: transparent; color: #94a3b8; font-size: 13px; padding: 7px 14px; border-radius: 7px; cursor: pointer; font-weight: 600; }
  .seg button.active { background: #2563eb; color: #fff; }
  .layout { display: flex; gap: 36px; flex-wrap: wrap; align-items: flex-start; }
  .phone { width: 390px; background: #0b1220; border-radius: 42px; padding: 12px; border: 1px solid #334155; box-shadow: 0 18px 60px rgba(0,0,0,.5); }
  .screen { position: relative; width: 366px; height: 700px; border-radius: 30px; overflow: hidden; background: #000; }
  .cam-dot { position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 12px; height: 12px; border-radius: 50%; background: #1e293b; z-index: 30; border: 2px solid #0f172a; }
  .feed { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center top; transform: translateY(150px); }
  .flash-overlay { position: absolute; inset: 0; background: #fff; opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 25; }
  .flash-overlay.on { opacity: .35; }
  .hint-icon { color: #fff; font-size: 16px; }
  .btn { pointer-events: auto; cursor: pointer; border: 0; }
  .btn-icon { position: absolute; width: ${CAMERA.flash.size}px; height: ${CAMERA.flash.size}px; border-radius: ${CAMERA.flash.radius}px; background: ${CAMERA.flash.bg}; display: flex; align-items: center; justify-content: center; font-size: 20px; color: #fff; z-index: 20; }
  .flash-icon-on { position: absolute; top: ${CAMERA.flash.top}px; right: ${CAMERA.flash.right}px; }
  .close-icon { position: absolute; top: ${CAMERA.close.top}px; left: ${CAMERA.close.left}px; }
  .capture-btn { pointer-events: auto; }
  ${cameraOverlayCss()}
  /* hasil capture */
  .result { position: absolute; inset: 0; background: #0b1220; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 20px; }
  .result h3 { margin: 0; font-size: 16px; color: #86efac; display: flex; align-items: center; gap: 8px; }
  .pair { display: flex; gap: 14px; }
  .thumb { width: 148px; text-align: center; }
  .thumb .cap { font-size: 11px; color: #94a3b8; margin-top: 6px; }
  .thumb .box { width: 148px; height: 188px; border-radius: 10px; overflow: hidden; border: 1px solid #334155; display: flex; align-items: center; justify-content: center; background: #fff; }
  .thumb .box img { width: 100%; height: 100%; object-fit: cover; }
  .checker { background: repeating-conic-gradient(#cbd5e1 0% 25%, #e2e8f0 0% 50%) 50% / 16px 16px; }
  .result-note { font-size: 12px; color: #94a3b8; max-width: 300px; text-align: center; line-height: 1.6; }
  .result-note code { background: #1e293b; padding: 1px 6px; border-radius: 6px; color: #7dd3fc; }
  .row-btns { display: flex; gap: 10px; margin-top: 4px; }
  .mini-btn { padding: 9px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 0; }
  .mini-btn.primary { background: #2563eb; color: #fff; }
  .mini-btn.ghost { background: #1e293b; color: #cbd5e1; border: 1px solid #334155; }
  .side { max-width: 420px; }
  .side .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 16px 18px; margin-bottom: 14px; font-size: 13px; line-height: 1.7; color: #cbd5e1; }
  .side .card b { color: #f1f5f9; }
  .side .card code { background: #0f172a; padding: 1px 6px; border-radius: 6px; color: #7dd3fc; font-size: 12px; }
  .side h2 { font-size: 15px; margin: 0 0 10px; color: #e2e8f0; }
  .spec-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .spec-table td { padding: 5px 8px; border-bottom: 1px solid #334155; color: #94a3b8; }
  .spec-table td:last-child { color: #e2e8f0; text-align: right; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
  <h1>Layar Kamera KTA — overlay panduan wajah (ala SIM)</h1>
  <p class="sub">Simulasi interaktif layar <code>apps/mobile/src/screens/camera/photo.tsx</code> — posisikan wajah di dalam oval, tekan tombol capture, lalu lihat hasil foto <b>tanpa background</b> yang dipakai kartu.</p>

  <div class="controls">
    <span class="label">Sumber kamera:</span>
    <div class="seg" id="feedSeg">
      <button data-src="orig" class="active">Kamera (foto asli)</button>
      <button data-src="bg">Tanpa background (.bg.png)</button>
    </div>
    <span class="pill" style="display:inline-block;font-size:12px;color:#86efac;background:rgba(22,163,74,.15);border:1px solid rgba(34,197,94,.4);padding:4px 10px;border-radius:999px">oval = ${CAMERA.overlay.oval.w}×${CAMERA.overlay.oval.h} · bingkai ${CAMERA.overlay.corner.size}px · capture ${CAMERA.capture.size}px</span>
  </div>

  <div class="layout">
    <div class="phone">
      <div class="screen" id="screen">
        <div class="cam-dot"></div>
        <img id="feed" class="feed" src="${ASSETS.fotoOrig}" alt="camera feed" />

        <!-- overlay panduan wajah -->
        <div class="cam-overlay" id="camOverlay">
          <div class="cam-dim-top"></div>
          <div class="cam-dim-row">
            <div class="cam-dim-side"></div>
            <div class="cam-guide">
              <div class="cam-oval"></div>
              <div class="cam-corner tl"></div><div class="cam-corner tr"></div>
              <div class="cam-corner bl"></div><div class="cam-corner br"></div>
            </div>
            <div class="cam-dim-side"></div>
          </div>
          <div class="cam-dim-bottom"></div>
          <div class="cam-hint"><span class="hint-icon">&#128247;</span>${CAMERA.hint.text}</div>
        </div>

        <div class="flash-overlay" id="flashOverlay"></div>

        <button class="btn btn-icon flash-icon-on" id="flashBtn" title="Flash" aria-label="Flash">&#9889;</button>
        <button class="btn btn-icon close-icon" id="closeBtn" title="Tutup (kembali)" aria-label="Tutup">&#10005;</button>

        <div class="cam-bottom">
          <button class="btn capture-btn" id="captureBtn" aria-label="Ambil foto">
            <div class="cam-capture" id="captureRing">
              <div class="cam-capture-inner"></div>
            </div>
          </button>
          <div class="cam-uploading" id="uploading" style="display:none">Mengupload foto...</div>
        </div>

        <!-- hasil capture -->
        <div class="result" id="result" style="display:none">
          <h3>&#10003; Foto berhasil diambil &amp; diupload</h3>
          <div class="pair">
            <div class="thumb"><div class="box"><img id="resRaw" src="${ASSETS.fotoOrig}" alt="asli"/></div><div class="cap">Hasil kamera (raw)</div></div>
            <div class="thumb"><div class="box checker"><img id="resBg" src="${ASSETS.fotoBg}" alt="tanpa bg"/></div><div class="cap">Diproses API — <code>.bg.png</code></div></div>
          </div>
          <div class="result-note">Background solid dihapus otomatis oleh <code>POST /auth/me/photo</code>. Versi transparan inilah yang dipakai kartu digital &amp; PDF.</div>
          <div class="row-btns">
            <button class="mini-btn ghost" id="retakeBtn">&#8635; Ulangi</button>
          </div>
        </div>
      </div>
    </div>

    <div class="side">
      <h2>Interaksi</h2>
      <div class="card">
        <b>&#128247; Tombol capture</b> — menekan tombol memicu "Mengupload foto..." lalu menampilkan perbandingan <b>hasil kamera</b> vs <b>foto tanpa background</b> (cek pola kotak-kotak pada sisi kanan = area transparan).<br/>
        <b>&#9889; Flash</b> — toggle kilat (overlay terang).<br/>
        <b>&#10005; Tutup</b> — kembali ke tampilan kamera.<br/>
        <b>Toggle sumber</b> — ganti feed kamera: foto asli (background merah) atau hasil <code>.bg.png</code> transparan.
      </div>
      <h2>Overlay panduan (dari spec)</h2>
      <table class="spec-table">
        <tr><td>Oval wajah</td><td>${CAMERA.overlay.oval.w}×${CAMERA.overlay.oval.h}px · border ${CAMERA.overlay.oval.borderWidth}px · radius ${CAMERA.overlay.oval.radius}px</td></tr>
        <tr><td>Sudut bingkai (corner)</td><td>${CAMERA.overlay.corner.size}×${CAMERA.overlay.corner.size}px · ${CAMERA.overlay.corner.width}px · offset ${CAMERA.overlay.corner.offset}px</td></tr>
        <tr><td>Area gelap luar</td><td>atas ${CAMERA.overlay.dimTop} · samping ${CAMERA.overlay.dimSide} · bawah ${CAMERA.overlay.dimBottom} (flex)</td></tr>
        <tr><td>Hint</td><td>top ${CAMERA.hint.top}px · radius ${CAMERA.hint.radius}px</td></tr>
        <tr><td>Flash / Close</td><td>${CAMERA.flash.size}px · top ${CAMERA.flash.top}/${CAMERA.close.top}px</td></tr>
        <tr><td>Tombol capture</td><td>${CAMERA.capture.size}px · border ${CAMERA.capture.borderWidth}px · inner ${CAMERA.capture.inner}px</td></tr>
      </table>
      <div class="card">
        Di app asli, nilai-nilai ini diimpor dari <code>packages/card-design</code> (CAMERA) oleh <code>apps/mobile/src/screens/camera/photo.tsx</code> — jadi preview ini selalu mencerminkan layar sesungguhnya.
      </div>
    </div>
  </div>

<script>
  (function () {
    var feed = document.getElementById('feed');
    var seg = document.getElementById('feedSeg');
    var flashBtn = document.getElementById('flashBtn');
    var flashOv = document.getElementById('flashOverlay');
    var closeBtn = document.getElementById('closeBtn');
    var captureBtn = document.getElementById('captureBtn');
    var captureRing = document.getElementById('captureRing');
    var uploading = document.getElementById('uploading');
    var result = document.getElementById('result');
    var overlay = document.getElementById('camOverlay');
    var retakeBtn = document.getElementById('retakeBtn');
    var ORIG = ${JSON.stringify(ASSETS.fotoOrig)};
    var BG = ${JSON.stringify(ASSETS.fotoBg)};
    var live = true;

    function setFeed(src) { feed.src = src; }

    seg.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      Array.prototype.forEach.call(seg.querySelectorAll('button'), function (x) { x.classList.remove('active'); });
      b.classList.add('active');
      setFeed(b.dataset.src === 'bg' ? BG : ORIG);
    });

    flashBtn.addEventListener('click', function () {
      flashOv.classList.toggle('on');
    });

    closeBtn.addEventListener('click', function () {
      result.style.display = 'none';
      overlay.style.display = '';
      uploading.style.display = 'none';
      captureRing.style.display = '';
      live = true;
    });

    captureBtn.addEventListener('click', function () {
      if (!live) return;
      live = false;
      overlay.style.display = 'none';
      captureRing.style.display = 'none';
      uploading.style.display = '';
      setTimeout(function () {
        uploading.style.display = 'none';
        result.style.display = 'flex';
      }, 1200);
    });

    retakeBtn.addEventListener('click', function () {
      result.style.display = 'none';
      overlay.style.display = '';
      captureRing.style.display = '';
      live = true;
    });
  })();
</script>
</body>
</html>
`;

writeFileSync(path.join(__dirname, 'preview-camera-kta.html'), html);
console.log('ok — preview-camera-kta.html diperbarui dari spec (' + (html.length / 1024 / 1024).toFixed(2) + ' MB)');
