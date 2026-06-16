interface InfoRowProps {
  label: string;
  value?: string | null;
}

export default function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex">
      <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-gray-800 dark:text-gray-200">{value || '-'}</span>
    </div>
  );
}
