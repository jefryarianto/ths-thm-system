import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchAnggota } from '@/lib/kta/api';
import { KtaAdminPreview } from '@/components/kta/KtaAdminPreview';

export const metadata: Metadata = {
  title: 'KTA Admin Preview',
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let anggota;
  try {
    anggota = await fetchAnggota(id);
  } catch {
    notFound();
  }

  if (!anggota) {
    notFound();
  }

  return <KtaAdminPreview anggota={anggota} />;
}
