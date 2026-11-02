'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './KtaPreview.module.css';

export type Tingkat = 'PRATAMA' | 'TAMTAMA' | 'MUDA' | 'MADYA' | 'UTAMA';
/** Semua tanggal berupa teks tampilan, bukan Date; contoh: 6 JULI 1983. */
export type MemberKta = {
  nomorAnggota: string; namaLengkap: string; jenisKelamin: 'L' | 'P'; ranting: string;
  fotoUrl: string; qrImageUrl: string; tingkat: Tingkat;
  tempatLahir: string; tanggalLahir: string; pekerjaan?: string; status?: string;
  pelantikanTanggal?: string; pelantikanTahun?: string; alamat: string;
  tanggalTerbit?: string; tanggalBerlakuSampai?: string;
  namaKoordinator: string; tandaTanganUrl?: string;
};

type Fit = { lines: string[]; pt: number; widthMm: number; ok: boolean };
type Layout = { fields: Record<string, Fit>; warnings: string[] };
const up = (v?: string) => (v ?? '').trim().toLocaleUpperCase('id-ID');
const PX_PER_MM = 96 / 25.4;
const normalise = (v: string) => v.trim().replace(/\s+/g, ' ');
const noData = (v?: string) => up(v) || '[BELUM DIISI]';

function widthMm(ctx: CanvasRenderingContext2D, value: string, pt: number, bold = false) {
  ctx.font = `${bold ? '700' : '400'} ${pt * 96 / 72}px KtaDejaVu`;
  return ctx.measureText(value).width / PX_PER_MM;
}
function single(ctx: CanvasRenderingContext2D, value: string, width: number, max: number, min: number, bold = false): Fit {
  const text = normalise(value);
  for (let t = Math.round(max * 10); t >= Math.round(min * 10); t--) {
    const pt = t / 10, w = widthMm(ctx, text, pt, bold);
    if (w <= width) return { lines: [text], pt, widthMm: w, ok: true };
  }
  return { lines: [text], pt: min, widthMm: widthMm(ctx, text, min, bold), ok: false };
}
function wrap(ctx: CanvasRenderingContext2D, value: string, width: number, maxLines: number, max: number, min: number, bold = false): Fit {
  const text = normalise(value);
  for (let t = Math.round(max * 10); t >= Math.round(min * 10); t--) {
    const pt = t / 10; const lines: string[] = []; let line = '';
    for (const word of text.split(' ')) {
      const add = line ? `${line} ${word}` : word;
      if (widthMm(ctx, add, pt, bold) <= width) { line = add; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const ch of word) {
        if (line && widthMm(ctx, line + ch, pt, bold) > width) { lines.push(line); line = ch; }
        else line += ch;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines && lines.every(x => widthMm(ctx, x, pt, bold) <= width))
      return { lines, pt, widthMm: Math.max(0, ...lines.map(x => widthMm(ctx, x, pt, bold))), ok: true };
  }
  // Tampilkan keseluruhan teks di luar area jika terlalu panjang; jangan potong diam-diam.
  return { lines: [text], pt: min, widthMm: widthMm(ctx, text, min, bold), ok: false };
}
function calculate(ctx: CanvasRenderingContext2D, m: MemberKta): Layout {
  const pelantikan = up(m.pelantikanTanggal) || up(m.pelantikanTahun) || '[TANGGAL / TAHUN BELUM DIISI]';
  const fields: Record<string, Fit> = {
    nomor: single(ctx, up(m.nomorAnggota), 22.7, 5.1, 3.8, true),
    depanNama: single(ctx, up(m.namaLengkap), 30.7, 5.1, 3.8, true),
    ranting: wrap(ctx, up(m.ranting), 30.7, 3, 5.1, 3.8, true),
    belakangNama: single(ctx, up(m.namaLengkap), 39, 5.3, 4),
    lahir: single(ctx, `${up(m.tempatLahir)}, ${up(m.tanggalLahir)}`, 52, 5.3, 4),
    pekerjaan: single(ctx, noData(m.pekerjaan), 52, 5.3, 4),
    status: single(ctx, noData(m.status), 52, 5.3, 4),
    pelantikan: single(ctx, pelantikan, 52, 5.3, 4),
    alamat: wrap(ctx, up(m.alamat), 52, 3, 5.3, 4),
    berlaku: single(ctx, `BERLAKU S.D. ${up(m.tanggalBerlakuSampai) || '[TGGL_EXPIRE]'}`, 41, 4, 4),
    terbit: single(ctx, `TANGGAL TERBIT : ${up(m.tanggalTerbit) || '...............'}`, 39, 5, 5),
    koordinator: single(ctx, up(m.namaKoordinator), 33.1, 5, 4),
  };
  const warnings = Object.entries(fields).filter(([, f]) => !f.ok).map(([name]) => `Teks ${name} terlalu panjang untuk area aman.`);
  const missing = (['nomorAnggota','namaLengkap','ranting','fotoUrl','qrImageUrl','tempatLahir','tanggalLahir','alamat','namaKoordinator'] as const)
    .filter(k => !m[k]?.trim());
  missing.forEach(k => warnings.push(`Data ${k} belum diisi.`));
  if (!['L','P'].includes(m.jenisKelamin)) warnings.push('Jenis kelamin harus L atau P.');
  if (!['PRATAMA','TAMTAMA','MUDA','MADYA','UTAMA'].includes(m.tingkat)) warnings.push('Tingkat tidak valid.');
  return { fields, warnings };
}

function Txt({ x, y, value, pt, bold = false, align }: { x: number; y: number; value: string; pt: number; bold?: boolean; align?: 'right' }) {
  return <span className={styles.text} style={{ left: `${x + 2}mm`, top: `${2 + 53.98 - y}mm`, fontSize: `${pt}pt`, fontWeight: bold ? 700 : 400, transform: align === 'right' ? 'translate(-100%,-0.85em)' : 'translateY(-0.85em)' }}>{value}</span>;
}
function Lines({ fit, x, y, leading, bold }: { fit: Fit; x: number; y: number; leading: number; bold?: boolean }) {
  return <>{fit.lines.map((line, index) => <Txt key={index} x={x} y={y - leading * index} value={line} pt={fit.pt} bold={bold} />)}</>;
}
const rank: Record<Tingkat, { count: number; color: string }> = {
  PRATAMA: { count: 1, color: '#1256ad' }, TAMTAMA: { count: 2, color: '#1256ad' },
  MUDA: { count: 1, color: '#e7b600' }, MADYA: { count: 2, color: '#e7b600' }, UTAMA: { count: 3, color: '#e7b600' },
};

function Artwork({ side, m, layout, assets }: { side: 'depan' | 'belakang'; m: MemberKta; layout: Layout; assets: string }) {
  const f = layout.fields;
  const r = rank[m.tingkat] || rank.MUDA;
  return <div className={styles.artwork} style={{ backgroundImage: `url("${assets}/${side}.svg")` }}>
    {side === 'depan' ? <>
      {/* Area foto 20 x 30 mm. Sumber foto asli harus disediakan oleh aplikasi. */}
      <img className={styles.photo} src={m.fotoUrl} alt="Foto anggota" />
      <Lines fit={f.nomor} x={28.1} y={32.6} leading={2.5} bold />
      <Txt x={52} y={32.6} value={m.jenisKelamin} pt={5.2} bold />
      <Lines fit={f.depanNama} x={28.1} y={26} leading={2.5} bold />
      <Lines fit={f.ranting} x={28.1} y={19.1} leading={2.5} bold />
      {Array.from({ length: r.count }, (_, i) => <div key={i} className={styles.stripe} style={{ backgroundColor: r.color, top: `${2 + 53.98 - (32.5 + i * 2)}mm` }} />)}
      <img className={styles.qr} src={m.qrImageUrl} alt="QR verifikasi anggota" />
      <Lines fit={f.berlaku} x={4.4} y={5.1} leading={2.5} />
      <Txt x={81.477} y={5.1} value="Pindai QR untuk validasi keabsahan anggota" pt={4} align="right" />
    </> : <>
      <Lines fit={f.belakangNama} x={29.2} y={41.4} leading={2.4} />
      <Txt x={29.2 + f.belakangNama.widthMm + 9} y={41.4} value={m.jenisKelamin} pt={5.3} />
      <Lines fit={f.lahir} x={29.2} y={37.4} leading={2.4} />
      <Lines fit={f.pekerjaan} x={29.2} y={33.4} leading={2.4} />
      <Lines fit={f.status} x={29.2} y={29.4} leading={2.4} />
      <Lines fit={f.pelantikan} x={29.2} y={25.4} leading={2.4} />
      <Lines fit={f.alamat} x={29.2} y={21.4} leading={2.4} />
      <Lines fit={f.terbit} x={4.4} y={3.5} leading={2.4} />
      {m.tandaTanganUrl && <img className={styles.signature} src={m.tandaTanganUrl} alt="Tanda tangan koordinator" />}
      <div className={styles.signatureLine} style={{ width: `${f.koordinator.widthMm}mm` }} />
      <Lines fit={f.koordinator} x={48.1} y={3.5} leading={2.4} />
    </>}
  </div>;
}

export function KtaPreview({ member, assetsBasePath = '/kta' }: { member: MemberKta; assetsBasePath?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [assetError, setAssetError] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const data = useMemo(() => JSON.stringify(member), [member]);
  useEffect(() => {
    let active = true; setLayout(null); setAssetError(false);
    (async () => {
      try {
        await Promise.all([document.fonts.load('400 12px KtaDejaVu'), document.fonts.load('700 12px KtaDejaVu')]);
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) throw new Error('Canvas tidak tersedia');
        if (active) setLayout(calculate(ctx, JSON.parse(data) as MemberKta));
      } catch { if (active) setLayout({ fields: {}, warnings: ['Font atau pengukuran teks gagal dimuat.'] }); }
    })();
    return () => { active = false; };
  }, [data]);
  useEffect(() => {
    let active = true; setAssetsReady(false); setAssetError(false);
    const files = [`${assetsBasePath}/depan.svg`, `${assetsBasePath}/belakang.svg`, member.fotoUrl, member.qrImageUrl, ...(member.tandaTanganUrl ? [member.tandaTanganUrl] : [])];
    Promise.all(files.map(src => new Promise<void>((resolve, reject) => {
      if (!src) return reject(new Error('URL kosong'));
      const img = new Image(); img.onload = () => resolve(); img.onerror = () => reject(new Error(`Aset gagal: ${src}`)); img.src = src;
    }))).then(() => { if (active) setAssetsReady(true); }).catch(() => { if (active) setAssetError(true); });
    return () => { active = false; };
  }, [data, assetsBasePath, member.fotoUrl, member.qrImageUrl, member.tandaTanganUrl]);
  useEffect(() => {
    if (!container.current) return;
    const el = container.current;
    const update = () => setScale(Math.min(1, el.clientWidth / (85.6 * PX_PER_MM)));
    update(); const ro = new ResizeObserver(update); ro.observe(el); return () => ro.disconnect();
  }, []);
  const warnings = [...(layout?.warnings ?? []), ...(assetError ? ['Foto atau QR gagal dimuat. Periksa URL dan akses aset.'] : [])];
  const ready = !!layout && !!layout.fields.nomor;
  const canPrint = ready && assetsReady && warnings.length === 0;
  return <div className={styles.root} ref={container} data-kta-ready={canPrint ? 'true' : 'false'}>
    <div className={styles.controls}>
      <button type="button" disabled={!canPrint} onClick={() => window.print()}>Cetak / Simpan PDF</button>
      {warnings.length > 0 && <ul role="alert">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
      {(!ready || (!assetsReady && !assetError)) && <p>Menyiapkan kartu dan memuat aset…</p>}
    </div>
    {ready && <div className={styles.cards} onErrorCapture={() => setAssetError(true)}>
      {(['depan', 'belakang'] as const).map(side => <section className={styles.sheet} key={side} style={{ height: `${53.98 * scale}mm` }} aria-label={`KTA ${side}`}>
        <div className={styles.stage} style={{ transform: `scale(${scale})` }}><Artwork side={side} m={member} layout={layout!} assets={assetsBasePath} /></div>
      </section>)}
    </div>}
  </div>;
}
