/* eslint-disable @typescript-eslint/no-require-imports */
const { buildStyledQrSvg } = require('../../../common/utils/card-design');
const sharp = require('sharp');
import { KTA_LOGO_DATA_URL } from './kta-logo';

export async function buildStyledQrDataUrl(data: string, logoHref = KTA_LOGO_DATA_URL): Promise<string> {
  const svg = buildStyledQrSvg({ data, logoHref, size: 640 });
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}
