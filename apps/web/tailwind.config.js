const { PALETTES } = require('@ths-thm/card-design');

/* ════════════════════════════════════════════════════════════════════
   THS-THM GLOBAL DESIGN TOKENS
   ════════════════════════════════════════════════════════════════════
   Semua warna komponen WAJIB memakai token semantic di bawah ini.
   Dilarang hard-code warna Tailwind default (blue-*, gray-*, dst.)
   di halaman/komponen baru. Palet `navy`/`gold` HANYA untuk template
   kartu/dokumen PDF (@ths-thm/card-design), bukan untuk UI aplikasi.

   Semantic scale (50/100/200/300/400/500/600/700/800/900/950):
   - primary   : #072AC8 — aksi utama, link aktif, fokus
   - secondary : #06154F — aksi sekunder, permukaan beraksen navy
   - info      : #2B63E6 — informasi
   - link      : #1E5BFF — tautan (utility `link` saja)
   - success   : #1B7F4B — sukses / aktif
   - warning   : #8A6200 — peringatan / pending
   - error     : #BA1A1A — error / destruktif
   Var-flip tokens (lihat app/globals.css untuk nilai light & dark):
   - background, surface, surface-variant, border, text, muted
   ════════════════════════════════════════════════════════════════════ */

function scale(hexes) {
  const keys = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const out = {};
  keys.forEach((k, i) => {
    if (hexes[i]) out[k] = hexes[i];
  });
  return out;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      /* ── Typography scale ── */
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        ocr: ['OCR A Extended', 'monospace'],
      },
      fontSize: {
        // Skala tipografi kanonis (mengganti text-[10px]/[11px] arbitrer)
        '2xs': ['0.6875rem', { lineHeight: '1rem' }], // 11px
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.02em' }],
      },
      /* ── Color tokens ── */
      colors: {
        // Brand lama (KHUSUS template kartu & dokumen PDF — jangan dipakai di UI)
        navy: PALETTES.navy,
        gold: PALETTES.gold,
        // ── Semantic tokens ──
        primary: {
          ...scale([
            '#EEF2FF', '#DDE4FF', '#BCC8FA', '#8FA0EF', '#3D5BE0', '#072AC8',
            '#0625B2', '#051C8A', '#041668', '#030F4A', '#020930',
          ]),
          // Primary Container #DDE4FF — var-flip agar tetap terbaca di mode gelap
          container: 'rgb(var(--primary-container) / <alpha-value>)',
          // Teks di atas Primary Container (pasangan kontras)
          'on-container': 'rgb(var(--on-primary-container) / <alpha-value>)',
        },
        secondary: scale([
          '#EEF1F8', '#D8DEED', '#AEB8D2', '#7A87B0', '#3F5487', '#06154F',
          '#051345', '#041038', '#06154F', '#030B28', '#02061A',
        ]),
        info: scale([
          '#EBF1FE', '#D3E1FD', '#A6C1FA', '#6E93F2', '#2B63E6', '#2B63E6',
          '#244FC0', '#1D3F9A', '#16307A', '#102158', '#0A1536',
        ]),
        link: {
          DEFAULT: '#1E5BFF',
          light: '#5B87FF',
          dark: '#1747C7',
        },
        success: scale([
          '#EBF7F0', '#D2EDDE', '#A4DABC', '#6CC295', '#3FA372', '#1B7F4B',
          '#176B3F', '#125733', '#0E4227', '#092C1B', '#05170F',
        ]),
        warning: scale([
          '#FBF5E4', '#F6E9C3', '#E9CF7E', '#DCB447', '#B98B15', '#8A6200',
          '#755300', '#5F4300', '#483200', '#312100', '#1B1200',
        ]),
        error: scale([
          '#FBEDED', '#F5D6D6', '#E8A5A5', '#D96F6F', '#C94141', '#BA1A1A',
          '#9E1616', '#821212', '#650E0E', '#470909', '#2B0505',
        ]),
        // ── Var-flip tokens: DEFAULT dari CSS variable (auto light/dark,
        //    mendukung alpha modifier), skala angka = warna statis eksplisit.
        //    Nilai variable di app/globals.css.
        background: {
          DEFAULT: 'rgb(var(--background) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          variant: 'rgb(var(--surface-variant) / <alpha-value>)',
          50: '#F8F9FC', 100: '#F1F3F8', 200: '#E2E6F0', 300: '#8DA2B9', 400: '#627D98',
          500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#141B2A', 950: '#0A0F1B',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          50: '#F1F3F8', 100: '#E2E6F0', 200: '#D3DAE8', 300: '#8DA2B9', 400: '#627D98',
          500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#141B2A', 950: '#0A0F1B',
        },
        text: {
          DEFAULT: 'rgb(var(--text) / <alpha-value>)',
          50: '#F8F9FC', 100: '#E3E2E9', 200: '#B6C5D8', 300: '#8DA2B9', 400: '#627D98',
          500: '#486581', 600: '#33415C', 700: '#1E2B45', 800: '#0D1830', 900: '#080B12', 950: '#04060C',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          50: '#F8F9FC', 100: '#E9EBF3', 200: '#C4CBE0', 300: '#9AA5C0', 400: '#74809E',
          500: '#5B6B8C', 600: '#486581', 700: '#33415C', 800: '#1E2B45', 900: '#141D33', 950: '#0A0F1F',
        },
      },
      /* ── Radius scale ──
         kontrol (input/button sm) = lg · kartu/panel = xl · modal = xl · pill = full */
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      /* ── Elevation (satu keluarga shadow) ── */
      boxShadow: {
        elegant: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'elegant-md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'elegant-lg': '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
