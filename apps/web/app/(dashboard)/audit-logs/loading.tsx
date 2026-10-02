import { BreathableLogo } from '@/components/ui/breathable-logo';

export default function AuditLogsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <BreathableLogo size={64} message="Memuat audit log..." />
    </div>
  );
}
