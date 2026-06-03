import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BarChart2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="grid gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
      <Link href="/admin/members/list">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daftar Anggota</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Manajemen CRUD anggota</p>
          </CardContent>
        </Card>
      </Link>
      <Link href="/admin/members/incomplete">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Tidak Lengkap</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">Notifikasi & perbaikan</p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
