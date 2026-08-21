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
        sans: ['"Inter"', '"Open Sans"', 'Roboto', 'system-ui', 'sans-serif'],
        ocr: ['OCR A Extended', 'monospace'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      },
      colors: {
        primary: {
          50: '#e8eef6',
          100: '#c5d4e9',
          200: '#9db7d8',
          300: '#7499c7',
          400: '#5682ba',
          500: '#1B3A5C',
          600: '#173352',
          700: '#112845',
          800: '#0D1F33',
          900: '#081524',
        },
        accent: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#2196F3',
          600: '#1E88E5',
          700: '#1976D2',
          800: '#1565C0',
          900: '#0D47A1',
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
