interface InfoRowProps {
  label: string;
  value?: string | null;
}

export default function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex">
      <span className="text-muted w-28 shrink-0">{label}</span>
      <span className="text-text">{value || '-'}</span>
    </div>
  );
}
