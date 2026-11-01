export interface KaskusRank {
  title: string;
  badgeClass: string;
}

/**
 * Pangkat komunitas terinspirasi Kaskus (Newbie -> Aktivis -> Pendekar -> Sesepuh).
 */
export function getKaskusRank(postCount = 0): KaskusRank {
  if (postCount >= 100) {
    return {
      title: 'Sesepuh Forum',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    };
  }
  if (postCount >= 50) {
    return {
      title: 'Pendekar Forum',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    };
  }
  if (postCount >= 10) {
    return {
      title: 'Aktivis Forum',
      badgeClass: 'bg-primary-container text-primary-on-container',
    };
  }
  return {
    title: 'Anggota Baru',
    badgeClass: 'bg-surface-variant text-muted border border-border',
  };
}
