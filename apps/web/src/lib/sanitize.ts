/**
 * Client-side HTML sanitizer using DOMPurify (lightweight, no build step).
 * Falls back to basic stripping if DOMPurify is not available.
 *
 * Usage:
 *   import { sanitizeHtml } from '@/lib/sanitize';
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(untrustedHtml) }} />
 *
 * DOMPurify is loaded dynamically from CDN to avoid bundling issues.
 */

// Allowed tags and attributes for content from CMS/rich-text editors
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'div', 'span',
];

const ALLOWED_ATTRS = {
  'a': ['href', 'title', 'target', 'rel'],
  'img': ['src', 'alt', 'title', 'width', 'height', 'loading'],
  'table': ['class'],
  'th': ['scope'],
  'td': ['colspan', 'rowspan'],
  '*': ['class', 'id', 'style'],
};

let dompurifyInstance: { sanitize: (dirty: string, config?: object) => string } | null = null;
let loadPromise: Promise<void> | null = null;

async function loadDOMPurify(): Promise<void> {
  if (typeof window === 'undefined') return; // SSR - skip
  if (dompurifyInstance) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      // Load DOMPurify from CDN (ESM)
      // @ts-expect-error -- dimuat dari URL CDN saat runtime; tidak ada deklarasi tipe lokal
      const mod = await import('https://cdn.jsdelivr.net/npm/dompurify@3.1.0/dist/purify.es.mjs');
      const purifier = mod.default as unknown as {
        sanitize: (dirty: string, config?: object) => string;
        (target: Window): { sanitize: (dirty: string, config?: object) => string };
      };
      // Configure for server-side rendering fallback
      if (typeof window !== 'undefined' && !purifier.sanitize.toString().includes('window')) {
        dompurifyInstance = purifier(window);
      } else {
        dompurifyInstance = purifier;
      }
    } catch (e) {
      console.warn('[sanitize] DOMPurify failed to load, using fallback', e);
      dompurifyInstance = {
        sanitize: (dirty: string) => fallbackSanitize(dirty),
      };
    }
  })();

  return loadPromise;
}

/**
 * Fallback sanitizer - basic but better than nothing.
 * Strips script, iframe, style, and event handlers.
 */
function fallbackSanitize(html: string): string {
  return html
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove style tags
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove on* event handlers
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"')
    // Remove data: URLs that could execute (keep images)
    .replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, 'src=""');
}

/**
 * Sanitize HTML content for safe rendering.
 * Loads DOMPurify on first call (async), subsequent calls are sync.
 */
export async function sanitizeHtml(html: string): Promise<string> {
  if (!html || typeof html !== 'string') return '';
  await loadDOMPurify();
  if (dompurifyInstance) {
    return dompurifyInstance.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTRS,
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false,
    });
  }
  return fallbackSanitize(html);
}

/**
 * Synchronous fallback for cases where async is not possible.
 * Uses basic stripping - NOT as secure as DOMPurify.
 */
export function sanitizeHtmlSync(html: string): string {
  if (!html || typeof html !== 'string') return '';
  // Try DOMPurify if already loaded
  if (dompurifyInstance) {
    return dompurifyInstance.sanitize(html, {
      ALLOWED_TAGS,
      ALLOWED_ATTR: ALLOWED_ATTRS,
      KEEP_CONTENT: true,
    });
  }
  return fallbackSanitize(html);
}
