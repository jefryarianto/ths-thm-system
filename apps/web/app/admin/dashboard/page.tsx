import { Users, BarChart2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
      <Link href="/admin/members/list">
        <div className="hover:shadow-lg transition-shadow cursor-pointer rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="text-sm font-medium leading-none tracking-tight">Daftar Anggota</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <p className="text-2xl font-bold">Manajemen CRUD anggota</p>
          </div>
        </div>
      </Link>
      <Link href="/admin/members/incomplete">
        <div className="hover:shadow-lg transition-shadow cursor-pointer rounded-lg border bg-yellow-50 shadow-sm">
          <div className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
            <h3 className="text-sm font-medium leading-none tracking-tight">Data Tidak Lengkap</h3>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="p-6 pt-0">
            <p className="text-2xl font-bold">Notifikasi & perbaikan</p>
          </div>
        </div>
      </Link>
    </div>
  );
}
