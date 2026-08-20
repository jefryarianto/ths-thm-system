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
        ocr: ['OCR A Extended', 'monospace'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['"Open Sans"', 'Roboto', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef7f0',
          100: '#d5ecd9',
          200: '#a8d8b3',
          300: '#6fbc84',
          400: '#3d9e5a',
          500: '#0B5C36',
          600: '#094d2e',
          700: '#073e25',
          800: '#052e1b',
          900: '#031f12',
        },
        gold: {
          50: '#fdf9ef',
          100: '#f9f0d4',
          200: '#f0dda5',
          300: '#e5c76e',
          400: '#d4a83c',
          500: '#C8A951',
          600: '#b08c32',
          700: '#8a6e28',
          800: '#66521e',
          900: '#433614',
        },
      },
    },
  },
  plugins: [],
};
