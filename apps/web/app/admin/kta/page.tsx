import { Metadata } from 'next';
import { AnggotaSearch } from '@/components/kta/AnggotaSearch';
import { PermissionGuard } from '@/components/auth/permission-guard';

export const metadata: Metadata = {
  title: 'Cari Anggota - KTA Admin',
};

export default function KtaAdminSearchPage() {
  return (
    <PermissionGuard module="members" minRole="admin_ranting">
      <main className="container mx-auto p-6 max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Kartu Tanda Anggota (KTA)</h1>
          <p className="text-sm text-gray-500">Cari anggota untuk melihat pratinjau, unduh, atau cetak KTA</p>
        </header>
        <AnggotaSearch />
      </main>
    </PermissionGuard>
  );
}
