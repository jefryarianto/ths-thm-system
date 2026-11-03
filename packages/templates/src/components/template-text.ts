/**
 * Fill template text with variables.
 * Placeholder format: {{variable_name}} (spaces inside braces allowed).
 * Unknown/empty placeholders are left as-is for preview identification.
 */
export function fillTemplateText(
  text: string,
  vars: Record<string, string | number | undefined | null>,
): string {
  return String(text).replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value !== undefined && value !== null && value !== '' ? String(value) : match;
  });
}