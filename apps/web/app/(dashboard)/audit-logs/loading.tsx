import { LogoSpinner } from '@/components/ui/logo-spinner';

export default function AuditLogsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <LogoSpinner size={64} message="Memuat audit log..." />
    </div>
  );
}
