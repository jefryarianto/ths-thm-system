const { PALETTES } = require('@ths-thm/card-design');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
        ocr: ['OCR A Extended', 'monospace'],
      },
      colors: {
        navy: PALETTES.navy,
        gold: PALETTES.gold,
        /* ── Legacy aliases for backward compat ── */
        /* ── Legacy aliases for backward compat ── */
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#b6c5d8',
          300: '#8da2b9',
          400: '#627d98',
          500: '#1A2E40',
          600: '#173352',
          700: '#1A2E40',
          800: '#102a43',
          900: '#0a1929',
        },
        accent: {
          50: '#fdf9ef',
          100: '#f9f0d4',
          200: '#f0dda5',
          300: '#e5c76e',
          400: '#D4AF37',
          500: '#D4AF37',
          600: '#c9a22e',
          700: '#a67c1e',
          800: '#7d5e17',
          900: '#5a4312',
        },
      },
      boxShadow: {
        'elegant': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'elegant-md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'elegant-lg': '0 10px 15px -3px rgb(0 0 0 / 0.06), 0 4px 6px -4px rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
