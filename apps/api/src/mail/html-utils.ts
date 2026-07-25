/**
 * Shared HTML & regex escaping utilities for the mail module.
 *
 * Both `email-templates.ts` and `mail.service.ts` need these, so they
 * live here as a single source of truth.
 */

/**
 * Escape basic HTML-special characters to prevent injection in rendered email content.
 *
 * Escapes: & < > " '
 * Handles: string, number, null, undefined
 */
export function escapeHtml(str: string | number | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape regex special characters so the string is treated as a literal
 * in a RegExp constructor. Prevents ReDoS and unexpected pattern matching.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
