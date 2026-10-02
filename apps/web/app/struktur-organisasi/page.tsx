'use client';

import { Suspense } from 'react';
import StrukturOrganisasiContent from './content';
import { LogoSpinner } from '@/components/ui/logo-spinner';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <LogoSpinner size={72} message="Memuat struktur organisasi..." />
    </div>
  );
}

export default function StrukturOrganisasiPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <StrukturOrganisasiContent />
    </Suspense>
  );
}
