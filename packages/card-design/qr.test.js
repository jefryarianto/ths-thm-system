const assert = require('node:assert/strict');
const { test } = require('node:test');
const { buildQrMarkup } = require('./qr');

test('buildQrMarkup draws custom eyes, logo, quiet zone, and no body modules in finders', () => {
  const { markup, viewBox } = buildQrMarkup({
    data: 'https://example.com/verify/1',
    logoHref: 'logo.png',
  });

  assert.match(viewBox, /^-4 -4 /);
  assert.equal((markup.match(/class="qr-eye"/g) || []).length, 3);
  assert.match(markup, /<image[^>]+href="logo\.png"/);

  const modules = Array.from(
    markup.matchAll(/<rect class="qr-module" x="(\d+)" y="(\d+)"/g),
  ).map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
  const size = Number(viewBox.split(' ')[2]) - 8;
  const insideFinder = ({ x, y }) =>
    (y <= 6 && (x <= 6 || x >= size - 7)) || (y >= size - 7 && x <= 6);

  assert.ok(modules.length > 0);
  assert.equal(modules.filter(insideFinder).length, 0);
});
