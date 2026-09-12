/**
 * Shared utility for calculating member data completeness.
 *
 * Only checks fields the **mobile user** can edit. Admin-set fields
 * (jenisKelamin, tempatDadar, tahunDadar, tingkat) are excluded because
 * the user has no way to fill them, so they should NOT trigger "incomplete".
 *
 * This ensures consistent `statusData` across:
 *  - auth.service.ts   (triggerProfileApproval on mobile profile update)
 *  - members.service.ts (recalculateMissingFields after admin/CSV update)
 *  - members-workflow.service.ts (validate)
 *  - notifications.service.ts (cleanupStaleIncompleteNotifications)
 */

/** Fields the mobile user can fill, in Prisma model key names. */
const MOBILE_EDITABLE_FIELDS = [
  'namaLengkap',
  'tempatLahir',
  'tanggalLahir',
  'alamat',
  'noHp',
  'email',
] as const;

/** Prisma model key → missing-fields array key. */
const FIELD_KEY_MAP: Record<string, string> = {
  namaLengkap: 'nama_lengkap',
  tempatLahir: 'tempat_lahir',
  tanggalLahir: 'tanggal_lahir',
  alamat: 'alamat',
  noHp: 'no_hp',
  email: 'email',
};

/**
 * Return a list of missing field keys (e.g. `['no_hp', 'alamat']`)
 * based on the mobile-editable fields only.
 *
 * @param member - Any object with the relevant fields (Prisma result or plain).
 *                Null, undefined, empty string, and whitespace-only strings
 *                are all treated as "missing".
 */
export function calculateMissingFields(
  member: Record<string, unknown>,
): string[] {
  const missing: string[] = [];
  for (const field of MOBILE_EDITABLE_FIELDS) {
    const value = member[field];
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(FIELD_KEY_MAP[field]);
    }
  }
  return missing;
}

/**
 * Returns `'complete'` or `'incomplete'` based on mobile-editable fields.
 */
export function calculateStatusData(
  member: Record<string, unknown>,
): 'complete' | 'incomplete' {
  return calculateMissingFields(member).length === 0 ? 'complete' : 'incomplete';
}