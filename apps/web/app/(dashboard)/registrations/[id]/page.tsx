'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/api-client';
import { ArrowLeft, User } from 'lucide-react';
import { StatusBadge } from '@/components/members/constants';

import Breadcrumbs from '@/components/ui/breadcrumbs';

interface RegistrationDetail {
  id: string;
  namaLengkap: string;
  jenisKelamin: 'L' | 'P';
  tempatLahir: string | null;
  tanggalLahir: string | null;
  alamat: string | null;
  noHp: string | null;
  email: string | null;
  status: string;
  catatan: string | null;
  createdAt: string;
}

export default function RegistrationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [reg, setReg] = useState<RegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/registrations/${id}`).then(({ data }) => {
      setReg(data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const handleApprove = async () => {
    try { await apiClient.post(`/registrations/${id}/approve`); router.push('/registrations'); }
    catch { alert('Gagal menyetujui'); }
  };

  const handleReject = async () => {
    const catatan = prompt('Alasan penolakan:');
    if (!catatan) return;
    try { await apiClient.post(`/registrations/${id}/reject`, { catatan }); router.push('/registrations'); }
    catch { alert('Gagal menolak'); }
  };

  if (loading) return <div className="p-8 text-sm text-gray-500">Memuat...</div>;
  if (!reg) return <div className="p-8 text-sm text-red-500">Pendaftaran tidak ditemukan</div>;

  return (
      <PermissionGuard module="registrations" action="view">
        <Breadcrumbs suffix={{ href: '#', label: reg?.namaLengkap || 'Detail' }} />
        <div className="max-w-2xl mx-auto space-y-6">
              <Link href="/registrations" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition">
                <ArrowLeft size={16} /> Kembali
              </Link>
        
              <div className="bg-white dark:bg-gray-800 rounded-2xl border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <User size={24} className="text-blue-500" />
                  <div>
                    <h1 className="text-lg font-semibold">{reg.namaLengkap}</h1>
                    <StatusBadge status={reg.status} />
                  </div>
                </div>
        
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Jenis Kelamin</span><p className="font-medium">{reg.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p></div>
                  <div><span className="text-gray-500">Tempat Lahir</span><p className="font-medium">{reg.tempatLahir || '-'}</p></div>
                  <div><span className="text-gray-500">Tanggal Lahir</span><p className="font-medium">{reg.tanggalLahir ? new Date(reg.tanggalLahir).toLocaleDateString('id-ID') : '-'}</p></div>
                  <div><span className="text-gray-500">Email</span><p className="font-medium">{reg.email || '-'}</p></div>
                  <div><span className="text-gray-500">No. HP</span><p className="font-medium">{reg.noHp || '-'}</p></div>
                  <div className="col-span-2"><span className="text-gray-500">Alamat</span><p className="font-medium">{reg.alamat || '-'}</p></div>
                  {reg.catatan && <div className="col-span-2"><span className="text-gray-500">Catatan</span><p className="font-medium">{reg.catatan}</p></div>}
                </div>
        
                {reg.status === 'pending' && (
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                    <button onClick={handleReject} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50">Tolak</button>
                    <button onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Setujui</button>
                  </div>
                )}
              </div>
            </div>
      </PermissionGuard>
    );
}
