'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

interface OrgSettings {
  nama: string;
  alamat?: string;
  noTelp?: string;
  email?: string;
  website?: string;
}

interface Period {
  id: string;
  nama?: string;
  periode?: string;
  isActive: boolean;
}

interface Signature {
  id: string;
  nama?: string;
  namaLengkap?: string;
  jabatan: string;
  isActive: boolean;
}

interface Stamp {
  nama?: string;
  label?: string;
  url?: string;
}

export default function SettingsPage() {
  const [org, setOrg] = useState<OrgSettings | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [orgRes, periodsRes, sigRes, stampRes] = await Promise.all([
          apiClient.get('/settings'),
          apiClient.get('/settings/periods'),
          apiClient.get('/settings/signatures'),
          apiClient.get('/settings/stamp'),
        ]);
        setOrg(orgRes.data.data);
        setPeriods(periodsRes.data.data || []);
        setSignatures(sigRes.data.data || []);
        setStamp(stampRes.data.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Memuat pengaturan...</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Pengaturan Sistem</h1>

      <div className="grid grid-cols-2 gap-6">
        <SectionCard title="Informasi Organisasi">
          {org ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="Nama" value={org.nama} />
              <InfoRow label="Alamat" value={org.alamat} />
              <InfoRow label="No. Telepon" value={org.noTelp} />
              <InfoRow label="Email" value={org.email} />
              <InfoRow label="Website" value={org.website} />
            </div>
          ) : (              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada data</p>
          )}
        </SectionCard>

        <SectionCard title="Stempel">
          {stamp ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="Nama" value={stamp.nama || stamp.label} />
              {stamp.url && (
                <div className="mt-2">
                  <img src={stamp.url} alt="Stempel" className="h-24 border rounded" />
                </div>
              )}
            </div>
          ) : (              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada stempel</p>
          )}
        </SectionCard>

        <SectionCard title="Daftar Periode">
          {periods.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1.5 font-medium text-gray-500">Periode</th>
                  <th className="py-1.5 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1.5">{p.nama || p.periode}</td>
                    <td className="py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {p.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada periode</p>
          )}
        </SectionCard>

        <SectionCard title="Daftar Tanda Tangan">
          {signatures.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-1.5 font-medium text-gray-500">Nama</th>
                  <th className="py-1.5 font-medium text-gray-500">Jabatan</th>
                  <th className="py-1.5 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-1.5">{s.nama || s.namaLengkap}</td>
                    <td className="py-1.5">{s.jabatan}</td>
                    <td className="py-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {s.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (              <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada tanda tangan</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="font-medium text-gray-800 dark:text-gray-200 mb-3">{title}</h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex">
      <span className="text-gray-500 dark:text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-gray-800 dark:text-gray-200">{value || '-'}</span>
    </div>
  );
}
