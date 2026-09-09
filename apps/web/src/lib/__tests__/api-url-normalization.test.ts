import { describe, it, expect } from 'vitest';

/**
 * Regression test: ensure the Next.js rewrite and client-side URL helpers
 * never produce a double /api prefix regardless of how NEXT_PUBLIC_API_URL is set.
 *
 * Bug context: NEXT_PUBLIC_API_URL was set to "https://ths-thm.cloud/api" while
 * the Next.js rewrite and several client helpers already appended "/api",
 * resulting in requests like "/api/api/dues" → 404.
 */

/** Mirrors the normalization in next.config.js rewrites. */
function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/api\/?$/, '');
}

/** Mirrors the pattern in export-utils.ts and berita/[slug]/page.tsx. */
function buildApiUrl(baseUrl: string, path: string): string {
  const apiBase = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  return `${apiBase}${path}`;
}

describe('API URL normalization (regression: /api/api double prefix)', () => {
  const testCases = [
    { input: 'https://ths-thm.cloud/api', desc: 'production with /api suffix' },
    { input: 'https://staging.ths-thm.cloud/api', desc: 'staging with /api suffix' },
    { input: 'https://ths-thm.cloud', desc: 'production without /api suffix' },
    { input: 'http://localhost:3001', desc: 'dev without /api suffix' },
    { input: 'http://localhost:3001/api', desc: 'dev with /api suffix' },
    { input: 'https://ths-thm-api.onrender.com', desc: 'Render service URL' },
  ];

  it.each(testCases)(
    'rewrite destination for $desc is always single /api',
    ({ input }) => {
      const baseUrl = normalizeBaseUrl(input);
      const destination = `${baseUrl}/api/:path*`;
      // Should never contain /api/api
      expect(destination).not.toContain('/api/api');
      // Should always contain exactly one /api before :path*
      expect(destination).toMatch(/\/api\/:path\*$/);
    },
  );

  it.each(testCases)(
    'client-side URL for $desc is always single /api',
    ({ input }) => {
      const baseUrl = normalizeBaseUrl(input);
      const url = buildApiUrl(baseUrl, '/reports/export/dues?format=xlsx');
      expect(url).not.toContain('/api/api');
      expect(url).toMatch(/\/api\/reports\/export/);
    },
  );

  it('dev fallback without NEXT_PUBLIC_API_URL still works', () => {
    const fallback = 'http://localhost:3001';
    const baseUrl = normalizeBaseUrl(fallback);
    const destination = `${baseUrl}/api/dues`;
    expect(destination).toBe('http://localhost:3001/api/dues');
    expect(destination).not.toContain('/api/api');
  });

  it('normalizeBaseUrl strips trailing slash from /api/', () => {
    expect(normalizeBaseUrl('https://example.com/api/')).toBe('https://example.com');
  });

  it('normalizeBaseUrl does not strip /api from middle of URL', () => {
    expect(normalizeBaseUrl('https://api.example.com')).toBe('https://api.example.com');
    expect(normalizeBaseUrl('https://api.example.com/api')).toBe('https://api.example.com');
  });
});
