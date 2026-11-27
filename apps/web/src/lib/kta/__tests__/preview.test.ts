import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCardPreviewHtml, previewDigitalCardImage } from '@/lib/kta/preview';

describe('buildCardPreviewHtml', () => {
  it('renders both card sides from the same API image and prints CR80 pages', () => {
    const html = buildCardPreviewHtml('blob:card');

    expect(html.match(/<img src="blob:card"/g)).toHaveLength(2);
    expect(html).toContain('@page { size: 85.6mm 53.98mm; margin: 0 }');
    expect(html).toContain('top: -53.98mm');
    expect(html).toContain('window.print()');
  });
});

describe('previewDigitalCardImage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    const tokens = new Map([['accessToken', 'test-token']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => tokens.get(key) ?? null,
      setItem: (key: string, value: string) => tokens.set(key, value),
    });
  });

  it('fetches the unwatermarked image endpoint and writes it to a new window', async () => {
    const blob = new Blob(['card'], { type: 'image/png' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:card');
    const write = vi.fn();
    const close = vi.fn();
    const addEventListener = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: { write, close },
      focus: vi.fn(),
      addEventListener,
    } as unknown as Window);

    await previewDigitalCardImage('member-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/members/member-1/digital-card/image');
    expect(url).not.toContain('watermark');
    expect(init.headers.Authorization).toBe('Bearer test-token');
    expect(write).toHaveBeenCalledWith(expect.stringContaining('blob:card'));
    expect(close).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });
});
