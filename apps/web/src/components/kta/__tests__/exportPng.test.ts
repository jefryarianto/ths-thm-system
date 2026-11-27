import { afterEach, describe, expect, it, vi } from 'vitest';
import { cardPngDataUrl } from '@/components/kta/exportPng';

describe('cardPngDataUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.mocked(fetch).mockReset();
  });

  it('embeds Plus Jakarta Sans font assets when rasterizing the SVG', async () => {
    vi.mocked(fetch).mockImplementation(async () => ({
      ok: true,
      blob: async () => new Blob(['font'], { type: 'font/ttf' }),
    }) as Response);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    });
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        Promise.resolve().then(() => this.onload?.());
      }
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage() {},
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['png'], { type: 'image/png' }));
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    await cardPngDataUrl(svg, '/kta');

    const fetched = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(fetched).toContain('/kta/fonts/PlusJakartaSans-Regular.ttf');
    expect(fetched).toContain('/kta/fonts/PlusJakartaSans-SemiBold.ttf');
    expect(fetched).toContain('/kta/fonts/PlusJakartaSans-Bold.ttf');
  });
});
