interface CeritaHistoriPanelProps {
  modeBukti?: string | null;
  ceritaHistori?: string | null;
}

const MODE_LABELS: Record<string, string> = {
  cerita: 'Cerita',
  unggah: 'Unggah',
};

export function CeritaHistoriPanel({ modeBukti, ceritaHistori }: CeritaHistoriPanelProps) {
  if (!modeBukti && !ceritaHistori) return null;

  return (
    <section
      aria-label="Riwayat pembuktian klaim"
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6"
    >
      {ceritaHistori && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          Cerita Histori Keanggotaan
        </h3>
      )}
      {modeBukti && (
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
          Mode Pembuktian: {MODE_LABELS[modeBukti] || modeBukti}
        </p>
      )}
      {ceritaHistori && (
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ceritaHistori}</p>
      )}
    </section>
  );
}
