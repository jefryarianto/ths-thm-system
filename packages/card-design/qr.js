const QRCode = require('qrcode');

const QR_STYLE = {
  errorCorrectionLevel: 'H',
  quietZone: 4,
  foreground: '#143B76',
  background: '#ffffff',
  bodyRadius: 0.22,
  eyeFrameRadius: 1.4,
  eyeBallRadius: 1.1,
  logoRatio: 0.2,
  haloRatio: 0.3,
};

const round = (value) => Number(value.toFixed(3));
const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

function inFinder(x, y, size) {
  return (
    (y <= 6 && (x <= 6 || x >= size - 7)) || (y >= size - 7 && x <= 6)
  );
}

function eyeMarkup(x, y) {
  return [
    `<g class="qr-eye" transform="translate(${x} ${y})">`,
    `<rect width="7" height="7" rx="${QR_STYLE.eyeFrameRadius}" fill="${QR_STYLE.foreground}"/>`,
    `<rect x="1" y="1" width="5" height="5" rx="${round(QR_STYLE.eyeFrameRadius - 0.4)}" fill="${QR_STYLE.background}"/>`,
    `<rect x="2" y="2" width="3" height="3" rx="${QR_STYLE.eyeBallRadius}" fill="${QR_STYLE.foreground}"/>`,
    `</g>`,
  ].join('');
}

function buildQrMarkup(input) {
  const { data, logoHref } = input;
  const qr = QRCode.create(String(data), {
    errorCorrectionLevel: QR_STYLE.errorCorrectionLevel,
  });
  const size = qr.modules.size;
  const bits = qr.modules.data;
  const parts = [];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!bits[y * size + x] || inFinder(x, y, size)) continue;
      parts.push(
        `<rect class="qr-module" x="${x}" y="${y}" width="1" height="1" rx="${QR_STYLE.bodyRadius}" fill="${QR_STYLE.foreground}"/>`,
      );
    }
  }

  parts.push(eyeMarkup(0, 0));
  parts.push(eyeMarkup(size - 7, 0));
  parts.push(eyeMarkup(0, size - 7));

  if (logoHref) {
    const haloDiameter = round(size * QR_STYLE.haloRatio);
    const logoDiameter = round(size * QR_STYLE.logoRatio);
    const center = size / 2;
    parts.push(
      `<g class="qr-logo">`,
      `<circle cx="${center}" cy="${center}" r="${round(haloDiameter / 2)}" fill="${QR_STYLE.background}"/>`,
      `<image class="qr-logo-image" href="${escapeXml(logoHref)}" x="${round(center - logoDiameter / 2)}" y="${round(center - logoDiameter / 2)}" width="${logoDiameter}" height="${logoDiameter}" preserveAspectRatio="xMidYMid meet"/>`,
      `</g>`,
    );
  }

  const viewBox = `-${QR_STYLE.quietZone} -${QR_STYLE.quietZone} ${size + QR_STYLE.quietZone * 2} ${size + QR_STYLE.quietZone * 2}`;
  return { markup: parts.join(''), viewBox };
}

function buildStyledQrSvg(input) {
  const { size = 512 } = input;
  const { markup, viewBox } = buildQrMarkup(input);
  const quiet = QR_STYLE.quietZone * 2;
  const extent = Number(viewBox.split(' ')[2]);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">`,
    `<rect x="-${QR_STYLE.quietZone}" y="-${QR_STYLE.quietZone}" width="${extent}" height="${extent}" fill="${QR_STYLE.background}"/>`,
    markup,
    `</svg>`,
  ].join('');
}

module.exports = {
  QR_STYLE,
  buildQrMarkup,
  buildStyledQrSvg,
};
