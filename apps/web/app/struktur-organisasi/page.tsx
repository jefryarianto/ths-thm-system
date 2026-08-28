'use client';

import { Suspense } from 'react';
import StrukturOrganisasiContent from './content';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-800 border-t-transparent" />
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
