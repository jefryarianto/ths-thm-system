export default function AuditLogsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-gray-500">Memuat audit log...</p>
      </div>
    </div>
  );
}
