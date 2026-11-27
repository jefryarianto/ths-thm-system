/* eslint-disable @typescript-eslint/no-require-imports */
import { buildStyledQrDataUrl } from './styled-qr';
import { KTA_LOGO_DATA_URL } from './kta-logo';

const jsQR = require('jsqr');
const sharp = require('sharp');

describe('buildStyledQrDataUrl', () => {
  it('renders a scannable QR carrying the exact verification URL', async () => {
    const verificationUrl = 'https://example.com/digital-card/verify/KTA-42';

    const dataUrl = await buildStyledQrDataUrl(verificationUrl, KTA_LOGO_DATA_URL);
    const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);

    expect(decoded?.data).toBe(verificationUrl);
  });
});
