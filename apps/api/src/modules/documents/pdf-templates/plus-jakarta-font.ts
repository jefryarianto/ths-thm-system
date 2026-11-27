import { readFileSync } from 'fs';
import { join } from 'path';

const fontDataUrl = (file: string): string => {
  const buffer = readFileSync(join(__dirname, '../../../assets/fonts', file));
  return `data:font/ttf;base64,${buffer.toString('base64')}`;
};

export const PLUS_JAKARTA_FONT_DATA_URLS = Object.freeze({
  regular: fontDataUrl('PlusJakartaSans-Regular.ttf'),
  semiBold: fontDataUrl('PlusJakartaSans-SemiBold.ttf'),
  bold: fontDataUrl('PlusJakartaSans-Bold.ttf'),
});

export const PLUS_JAKARTA_FONT_CSS = [
  `@font-face{font-family:'Plus Jakarta Sans';src:url('${PLUS_JAKARTA_FONT_DATA_URLS.regular}') format('truetype');font-weight:400;font-style:normal}`,
  `@font-face{font-family:'Plus Jakarta Sans';src:url('${PLUS_JAKARTA_FONT_DATA_URLS.semiBold}') format('truetype');font-weight:600;font-style:normal}`,
  `@font-face{font-family:'Plus Jakarta Sans';src:url('${PLUS_JAKARTA_FONT_DATA_URLS.bold}') format('truetype');font-weight:700;font-style:normal}`,
].join('');
