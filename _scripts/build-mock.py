import json, base64, datetime, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

d = json.load(open('card-prod.json'))
data = d['data']
m = data['member']
card = data['card']

def b64(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()

qr = data['qrCode']
lv = data['levelVisual'] or {}
strip_count = lv.get('stripCount', 1)
strip_color = lv.get('stripColor', '#facc15')
strips = ''.join(f'<div class="level-strip" style="background:{strip_color}"></div>' for _ in range(strip_count))

MONTHS_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

def fmt_date(s):
    dt = datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))
    return f'{dt.day} {MONTHS_ID[dt.month]} {dt.year}'

ttl = f"{m['tempatLahir']}, {fmt_date(m['tanggalLahir'])}"
signer_name = (card.get('signerName') or 'Koordinator Distrik')
signer_title = (card.get('signerTitle') or 'THS-THM')
import re
_distrik_raw = m.get('distrik') or 'THS-THM'
distrik = re.sub(r'^keuskupan\s*', '', _distrik_raw, flags=re.I).upper()

# Siluet: Jefry jenisKelamin L -> LAKI-LAKI (man-icon.png dari root repo)
man_b64 = b64('../man-icon.png')
woman_b64 = b64('../woman-icon.png')
silhouette_m = f'<img src="{man_b64}" alt="foto" style="width:130px;height:130px;object-fit:contain;opacity:0.9"/>'
silhouette_small = f'<img src="{man_b64}" alt="foto" style="width:100px;height:100px;object-fit:contain;opacity:0.9"/>'

# Jika hasil hapus-background (ala SIM) tersedia, tampilkan foto asli di mock
import os as _os
if _os.path.exists('jefry-bg-test.png'):
    foto_b64 = b64('jefry-bg-test.png')
    foto_m = f'<img src="{foto_b64}" alt="foto" class="face" style="background:transparent"/>'
    foto_small = f'<img src="{foto_b64}" alt="foto" class="face" style="background:transparent"/>'
else:
    foto_m = silhouette_m
    foto_small = silhouette_small

jk_letter = 'P' if (m.get('jenisKelamin') == 'P') else 'L'
def row(label, val, cls='value'):
    return f'<div class="info-row"><span class="label">{label}</span><span class="{cls}">{val}</span></div>'
info = (
    row('No. Anggota', m['nomorAnggota'].upper(), 'name')
    + '<div class="info-pair">'
    + row('Nama', m['namaLengkap'].upper())
    .replace('<div class="info-row">', '<div class="info-row info-pair-left">', 1)
    + f'<div class="jk-box"><span class="lbl">JK</span><span class="val">{jk_letter}</span></div>'
    + '</div>'
    + row('Tempat, Tanggal Lahir', ttl.upper())
    + row('Ranting', m['ranting'].upper())
    + row('Wilayah', m['wilayah'].upper())
)
rank_name = (m.get('tingkat') or '').upper()

back_rows = [
    ('TTL', ttl.upper()),
    ('DADAR', 'LARANTUKA, 1994'),
    ('Status', 'AKTIF'),
    ('VALID S/D', '11 AGUSTUS 2031'),
    ('Alamat', ('THS-THM, ' + (m.get('alamatDistrik') or 'Distrik')).upper()),
]
back_info = ''
for label, val in back_rows:
    back_info += f'<div class="row"><span class="lbl">{label}</span><span class="colon">:</span><span class="val">{val}</span></div>'

def font_b64(path):
    return 'data:font/ttf;base64,' + base64.b64encode(open(path, 'rb').read()).decode()

ocr_b64 = font_b64('../apps/mobile/assets/fonts/OCR A Extended.ttf')
open_sans_b64 = font_b64('OpenSans-Bold.ttf')
roboto_reg_b64 = font_b64('Roboto-Regular.ttf')
roboto_bold_b64 = font_b64('Roboto-Bold.ttf')

FONTS = f'''
  @font-face {{ font-family: 'OCR A Extended'; src: url({ocr_b64}) format('truetype'); }}
  @font-face {{ font-family: 'Open Sans'; src: url({open_sans_b64}) format('truetype'); font-weight: 700; }}
  @font-face {{ font-family: 'Roboto'; src: url({roboto_reg_b64}) format('truetype'); font-weight: 400; }}
  @font-face {{ font-family: 'Roboto'; src: url({roboto_bold_b64}) format('truetype'); font-weight: 700; }}
'''

CSS = '''
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Roboto', Arial, sans-serif; padding: 24px; background:#0f172a; color:#e2e8f0; }
  h2 { color:#7dd3fc; margin: 0 0 6px; }
  .sub { color:#94a3b8; font-size:14px; margin-bottom:20px; }
  .row { display:flex; gap:28px; flex-wrap:wrap; margin-bottom:28px; }
  .col { flex:1; min-width:420px; }
  .col h3 { color:#93c5fd; margin: 0 0 10px; font-size:15px; }
  .card { width: 856px; height: 540px; position: relative; border-radius: 28px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5); flex-shrink: 0; }
  .card.front { background: linear-gradient(135deg, #ecfeff, #fff, #dbeafe); border: 2px solid #e2e8f0; }
  .card.back { background: linear-gradient(135deg, #1e3a5f, #1e40af, #0891b2); border: 2px solid #1e3a5f; }
  .front .bg-circle1 { position: absolute; top: -80px; right: -80px; width: 320px; height: 320px; border-radius: 50%; background: rgba(6,182,212,0.15); }
  .front .bg-circle2 { position: absolute; bottom: -110px; left: -80px; width: 380px; height: 380px; border-radius: 50%; background: rgba(29,78,216,0.08); }
  .front .top-bar { position: absolute; top: 0; left: 0; right: 0; height: 104px; background: linear-gradient(135deg, #2563eb, #1d4ed8); }
  .front .bottom-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 96px; background: linear-gradient(315deg, #93c5fd, #dbeafe); }
  .guilloche { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .watermark { position: absolute; left: 128px; top: 166px; width: 600px; height: 207px; pointer-events: none; }
  .watermark img { width: 100%; height: 100%; object-fit: contain; opacity: 0.35; }
  .content { position: relative; z-index: 10; height: 100%; padding: 0; }
  .header-row { display: flex; align-items: center; gap: 14px; padding: 14px 24px; color: #fff; }
  .logo { width: 150px; height: 150px; border-radius: 50%; overflow: hidden; background: #fff; flex-shrink: 0; position: relative; }
  .logo img { width: 143px; height: 143px; object-fit: contain; }
  .logo .shimmer { position: absolute; inset: 0; background: linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%); }
  .header-text { line-height: 19px; font-family: 'Open Sans'; }
  .header-text .row1 { font-size: 16px; font-weight: 700; letter-spacing: 2px; }
  .header-text .row2 { font-size: 16px; font-weight: 700; letter-spacing: 1.1px; margin-top: 1px; }
  .header-text .org { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; margin-top: 1px; }
  .header-text .sub { font-size: 16px; font-weight: 700; margin-top: 1px; }
  .sig-wrap .shimmer { position: absolute; inset: -4px; border-radius: 12px; background: linear-gradient(135deg, rgba(34,211,238,0.2), rgba(255,255,255,0.3), rgba(252,211,77,0.2)); }
  .back .wm { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .back .wm img { width: 480px; height: 166px; object-fit: contain; opacity: 0.35; filter: invert(1); }
  /* Photo besar kiri — TANPA bingkai */
  .photo { position: absolute; left: 40px; top: 164px; width: 185px; height: 235px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  /* Photo kecil kanan atas — TANPA bingkai, dinaikkan; rank 12px di bawahnya */
  .photo-small { position: absolute; right: 40px; top: 154px; width: 130px; height: 150px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .rank-box { position: absolute; right: 40px; top: 316px; width: 130px; }
  .rank-name { font-size: 12px; font-weight: 700; color: #0f2b4a; text-align: center; letter-spacing: 1px; font-family: 'Roboto'; margin-bottom: 3px; }
  .level-strips { display: flex; flex-direction: column; gap: 3px; width: 100%; }
  .level-strip { height: 9px; width: 100%; border-radius: 3px; border: 1px solid rgba(0,0,0,0.25); }
  .info { position: absolute; left: 250px; top: 164px; right: 176px; z-index: 20; }
  /* Foto ala SIM — hanya wajah: 167% tinggi rata atas, di-center horizontal */
  .photo img.face, .photo-small img.face { position: absolute; top: 0; left: 50%; transform: translateX(-50%); height: 167%; width: auto; max-width: none; object-fit: cover; }
  /* Hologram / foil shimmer overlay — gradien diagonal tipis di area data anggota */
  .info .shimmer { position: absolute; inset: 0; border-radius: 12px; background: linear-gradient(135deg, rgba(34,211,238,0.1), rgba(255,255,255,0.2), rgba(252,211,77,0.1)); pointer-events: none; }
  .info-row { margin-bottom: 13px; }
  .info-row .label { display: block; font-size: 12px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Roboto'; }
  .info-row .name { display: block; font-size: 19px; font-weight: 700; color: #0f2b4a; letter-spacing: 1.2px; margin-top: 3px; font-family: 'OCR A Extended'; }
  .info-row .value { display: block; font-size: 15px; font-weight: 700; color: #111827; margin-top: 3px; line-height: 20px; font-family: 'OCR A Extended'; }
  .info-pair { display: flex; }
  .info-pair-left { min-width: 0; }
  .jk-box { margin-left: 40px; width: 44px; }
  .jk-box .lbl { display: block; font-size: 12px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Roboto'; }
  .jk-box .val { display: block; font-family: 'OCR A Extended'; font-size: 15px; font-weight: 700; color: #111827; margin-top: 3px; }
  .bottom-info { position: absolute; left: 40px; bottom: 14px; color: #111827; }
  .bottom-info .label { font-size: 13px; font-weight: 700; color: #1e3a5f; font-family: 'Roboto'; }
  .bottom-info .expiry { font-size: 16px; font-weight: 400; margin-top: 2px; font-family: 'Roboto'; }
  .signature { position: absolute; right: -8px; bottom: 14px; width: 400px; height: 146px; text-align: left; color: #111827; }
  .signature .sig-wrap { position: absolute; left: 0; top: 35px; width: 175px; height: 96px; }
  .signature .sig { position: absolute; left: -68px; top: 28px; width: 175px; height: 60px; font-size: 26px; font-family: cursive; transform: rotate(-8deg); color: #334155; display: flex; align-items: center; justify-content: center; }
  .signature .sig img { position: absolute; left: -68px; top: 28px; width: 175px; height: 60px; object-fit: contain; }
  .signature .stamp { position: absolute; left: -55px; top: 0; width: 110px; height: 110px; border-radius: 50%; border: 2px solid rgba(30,64,175,0.3); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; color: #1e40af; transform: rotate(-8deg); overflow: hidden; }
  .signature .stamp img { width: 100%; height: 100%; object-fit: cover; }
  .signature .title1 { position: absolute; left: 0; top: 35px; font-size: 13px; font-weight: 700; color: #111827; font-family: 'Roboto'; }
  .signature .title2 { position: absolute; left: 0; top: 52px; font-size: 12px; font-weight: 700; color: #111827; font-family: 'Roboto'; }
  .signature .title { position: absolute; left: 0; bottom: 17px; font-size: 14px; font-weight: 700; color: #111827; font-family: 'Roboto'; max-width: 380px; text-decoration: underline; }
  .signature .subtitle { position: absolute; left: 0; bottom: 0; font-size: 12px; font-weight: 600; color: #111827; font-family: 'Roboto'; max-width: 380px; }
  .back .title { position: absolute; left: 0; right: 0; text-align: center; top: 28px; color: #fff; }
  .back .title h2 { font-size: 28px; font-weight: 700; letter-spacing: 0.16em; font-family: 'Roboto'; }
  .back .title p { font-size: 15px; opacity: 0.9; margin-top: 4px; font-family: 'Roboto'; }
  .qr-box { position: absolute; left: 48px; top: 145px; width: 210px; height: 210px; background: #fff; border-radius: 16px; border: 4px solid #1e3a5f; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 16px; display: flex; align-items: center; justify-content: center; }
  .qr-box img { width: 100%; height: 100%; }
  .back-info { position: absolute; left: 300px; top: 145px; right: 48px; padding: 24px; color: #ffffff; }
  .back-info .row { display: flex; gap: 8px; font-size: 18px; margin-bottom: 12px; font-family: 'Roboto'; }
  .back-info .row .lbl { width: 105px; font-weight: 700; color: #ffffff; text-transform: uppercase; font-family: 'Roboto'; }
  .back-info .row .colon { width: 18px; font-weight: 700; color: #ffffff; opacity: 0.9; }
  .back-info .row .val { font-weight: 400; font-family: 'Roboto'; }
  .back-info .desc { font-size: 18px; line-height: 1.5; margin-bottom: 16px; font-family: 'Roboto'; }
  .back-footer { position: absolute; left: 48px; right: 48px; bottom: 32px; display: flex; align-items: flex-end; justify-content: space-between; color: #fff; font-size: 15px; font-family: 'Roboto'; }
  .back-footer .url { text-align: right; }
  .back-footer .url .u { font-size: 13px; opacity: 0.8; }
  .back-footer .url .v { font-size: 16px; font-weight: 700; }
'''

WATERMARK_PATHS = '''<path d="M28 20 L36 16 L44 20 L52 24 L60 34 L68 46 L74 60 L78 76 L80 94 L78 110 L72 124 L62 134 L52 138 L44 134 L40 124 L38 112 L34 98 L28 84 L24 68 L22 50 L24 34 Z"/><path d="M42 146 L60 140 L80 138 L100 136 L122 138 L142 142 L152 146 L148 152 L138 154 L120 156 L100 156 L80 156 L62 156 L48 154 Z"/><path d="M120 52 L140 44 L160 40 L180 44 L196 52 L206 64 L210 80 L206 98 L196 110 L180 116 L162 116 L148 110 L136 100 L128 88 L122 74 L118 62 Z"/><path d="M216 60 L230 50 L244 54 L252 66 L260 78 L268 92 L272 108 L268 122 L258 130 L248 126 L242 114 L238 100 L232 86 L224 72 Z"/><path d="M276 52 L288 46 L298 50 L302 62 L294 72 L282 70 L276 62 Z"/><path d="M286 84 L300 80 L314 84 L320 96 L314 108 L300 112 L288 106 L282 96 Z"/><path d="M330 66 L348 56 L366 52 L382 56 L392 64 L398 76 L396 90 L390 102 L376 112 L360 116 L344 114 L334 106 L328 94 L326 80 Z"/><path d="M156 146 L168 142 L180 144 L186 150 L178 156 L164 156 Z"/><path d="M186 146 L198 148 L208 150 L214 156 L206 160 L192 158 Z"/>'''

guilloche_front = '<svg class="guilloche" viewBox="0 0 856 540" aria-hidden="true"><defs><pattern id="g-front" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 Q4.5 0 9 9 T18 9" fill="none" stroke="rgba(29,78,216,0.3)" stroke-width="0.5"/></pattern></defs><rect x="16" y="16" width="824" height="508" rx="22" fill="none" stroke="url(#g-front)" stroke-width="14"/></svg>'
guilloche_back = '<svg class="guilloche" viewBox="0 0 856 540" aria-hidden="true"><defs><pattern id="g-back" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 9 Q4.5 0 9 9 T18 9" fill="none" stroke="rgba(191,219,254,0.4)" stroke-width="0.5"/></pattern></defs><rect x="16" y="16" width="824" height="508" rx="22" fill="none" stroke="url(#g-back)" stroke-width="14"/></svg>'

peta_b64 = b64('../peta indonesia.png')
wm_front = f'<div class="watermark"><img src="{peta_b64}" alt="peta"/></div>'
wm_back = f'<div class="wm"><img src="{peta_b64}" alt="peta"/></div>'

# Gunakan logo dari repo (bukan download)
logo = 'assets/logo.png'
if not os.path.exists(logo):
    logo = '../apps/mobile/assets/images/logo.png'
logo_b64 = b64(logo)

# TTD & stempel — cek apakah file download masih ada, kalau tidak gunakan teks placeholder
# ttd 2,5× (175×73) & ditebalkan via 3 lapis di posisi SAMA (bukan berbayang)
sig_img = ''
if os.path.exists('prod-signature.png'):
    sig_src = b64('prod-signature.png')
    layers = ''.join(
        f'<img src="{sig_src}" alt="ttd" style="position:absolute;left:0;top:0;width:175px;height:60px;object-fit:contain;opacity:0.7;filter:brightness(0.6) contrast(1.4);transform:rotate(-8deg)"/>'
        for _ in range(3)
    )
    sig_img = f'<div style="position:absolute;left:-68px;top:28px;width:175px;height:60px">{layers}</div>'
stamp_img = ''
if os.path.exists('prod-stamp.png'):
    stamp_img = f'<img src="{b64("prod-stamp.png")}" alt="stempel"/>'

front_card = f'''<div class="card front">
  <div class="bg-circle1"></div><div class="bg-circle2"></div>
  <div class="top-bar"></div><div class="bottom-bar"></div>
  {guilloche_front}
  {wm_front}
  <div class="content">
    <div class="header-row">
      <div class="logo"><img src="{logo_b64}" alt="THS-THM" /><div class="shimmer"></div></div>
      <div class="header-text">
        <div class="row1">KARTU TANDA ANGGOTA</div>
        <div class="row2">ORGANISASI PENCAK SILAT PENDIDIKAN</div>
        <div class="org">TUNGGAL HATI SEMINARI - TUNGGAL HATI MARIA</div>
        <div class="sub">DISTRIK KEUSKUPAN LARANTUKA</div>
      </div>
    </div>
    <div class="photo">{foto_m}</div>
    <div class="photo-small">{foto_small}</div>
    {f'<div class="rank-box"><div class="rank-name">{rank_name}</div><div class="level-strips">{strips}</div></div>' if strip_count > 0 else ''}
    <div class="info"><div class="shimmer"></div>{info}</div>
    <div class="bottom-info">
      <div class="label">Berlaku sampai</div>
      <div class="expiry">11 Agustus 2031</div>
    </div>
    <div class="signature">
      <div class="title1">KOORDINATORAT DISTRIK THS-THM</div>
      <div class="title2">KEUSKUPAN {distrik}</div>
      <div class="sig-wrap">
        <div class="shimmer"></div>
        <div class="stamp">{stamp_img or 'STEMPEL'}</div>
        {sig_img}
      </div>
      <div class="title">{signer_name}</div>
      <div class="subtitle">{signer_title}</div>
    </div>
  </div>
</div>'''

back_card = f'''<div class="card back">
  {guilloche_back}
  {wm_back}
  <div class="content">
    <div class="title">
      <h2>VERIFIKASI KARTU ANGGOTA</h2>
      <p>Scan QR untuk memeriksa keabsahan anggota</p>
    </div>
    <div class="qr-box"><img src="{qr}" alt="QR"/></div>
    <div class="back-info">
      <p class="desc">Halaman verifikasi publik hanya menampilkan data minimum untuk membuktikan keabsahan anggota.</p>
      {back_info}
    </div>
    <div class="back-footer">
      <div>Jika kartu ini ditemukan, harap menghubungi sekretariat THS-THM setempat.</div>
      <div class="url"><div class="u">URL Verifikasi</div><div class="v">/verify/member/token</div></div>
    </div>
  </div>
</div>'''

html = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Mock Preview KTA</title>
<style>{FONTS}{CSS}</style></head><body>
<h2>Mock Preview — Kartu Anggota Digital (KTA)</h2>
<div class="sub">Data Jefry Arianto Baba (produksi) · Foto 404 → siluet laki-laki (man-icon) · Peta Indonesia washout di background</div>
<div class="row">
  <div class="col"><h3>Sisi Depan</h3>{front_card}</div>
</div>
<div class="row">
  <div class="col"><h3>Sisi Belakang</h3>{back_card}</div>
</div>
</body></html>'''

open('mock-preview.html', 'w', encoding='utf-8').write(html)
print('OK — mock-preview.html', len(html) // 1024, 'KB')
