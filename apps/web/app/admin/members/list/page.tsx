import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Plus } from 'lucide-react';
import axios from 'axios';

// Simple fetcher using auth token from localStorage
const fetcher = (url: string) =>
  axios.get(url, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.data);

export default function MemberListPage() {
  const { data, error, mutate } = useSWR('/api/members', fetcher);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus anggota ini?')) return;
    setLoading(true);
    try {
      await axios.delete(`/api/members/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      mutate();
    } catch (e) {
      alert('Gagal menghapus');
    } finally {
      setLoading(false);
    }
  };

  if (error) return <div>Gagal memuat data</div>;
  if (!data) return <div>Memuat...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daftar Anggota</h1>
        <Link href="/admin/members/create">
          <Button variant="default"><Plus className="mr-2 h-4 w-4"/>Tambah Anggota</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.data.map((member: any) => (
          <Card key={member.id} className="relative">
            <CardHeader className="flex flex-col space-y-0 p-4">
              <CardTitle className="text-lg font-medium">{member.namaLengkap}</CardTitle>
              <p className="text-sm text-muted-foreground">{member.nomorAnggota}</p>
            </CardHeader>
            <CardContent className="p-4">
              <p>Status: {member.statusData}</p>
            </CardContent>
            <div className="absolute top-2 right-2 flex space-x-1">
              <Link href={`/admin/members/${member.id}/edit`}>
                <Button size="sm" variant="ghost"><Edit className="h-3 w-3"/></Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(member.id)} disabled={loading}>
                <Trash className="h-3 w-3"/>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
