import Link from 'next/link';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/button';
import { Edit, Trash, Plus } from 'lucide-react';
import axios from 'axios';

export default function MemberListPage() {
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    if (!data.length) setLoading(true);
    try {
      const res = await axios.get('/api/members', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setData(res.data.data || res.data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus anggota ini?')) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/members/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      await fetchData();
    } catch (e) {
      alert('Gagal menghapus');
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <div>Gagal memuat data</div>;
  if (loading) return <div>Memuat...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daftar Anggota</h1>
        <Link href="/admin/members/create">
          <Button variant="primary"><Plus className="mr-2 h-4 w-4"/>Tambah Anggota</Button>
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((member: any) => (
          <div key={member.id} className="relative rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col space-y-0 p-4">
              <h3 className="text-lg font-medium leading-none tracking-tight">{member.namaLengkap}</h3>
              <p className="text-sm text-muted-foreground">{member.nomorAnggota}</p>
            </div>
            <div className="p-4 pt-0">
              <p>Status: {member.statusData}</p>
            </div>
            <div className="absolute top-2 right-2 flex space-x-1">
              <Link href={`/admin/members/${member.id}/edit`}>
                <Button size="sm" variant="ghost"><Edit className="h-3 w-3"/></Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(member.id)} disabled={deleting}>
                <Trash className="h-3 w-3"/>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}