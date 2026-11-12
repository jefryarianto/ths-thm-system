export const DISTRICT_FALLBACK = 'THS-THM';

export function normalizeDistrict(name?: string | null): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return DISTRICT_FALLBACK;
  return trimmed.replace(/^keuskupan\s*/i, '').trim().toUpperCase() || DISTRICT_FALLBACK;
}
