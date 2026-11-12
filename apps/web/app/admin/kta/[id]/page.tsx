import { Metadata } from 'next';
import { KtaAdminLoader } from './KtaAdminLoader';
import { PermissionGuard } from '@/components/auth/permission-guard';

export const metadata: Metadata = {
  title: 'KTA Admin Preview',
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PermissionGuard module="members" minRole="admin_ranting">
      <KtaAdminLoader id={id} />
    </PermissionGuard>
  );
}
