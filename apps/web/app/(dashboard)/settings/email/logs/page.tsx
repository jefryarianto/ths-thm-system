'use client';

import { PermissionGuard } from '@/components/auth/permission-guard';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import PageContainer from '@/components/ui/page-container';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import EmailLogsTab from '../email-logs-tab';

export default function EmailLogsPage() {
  return (
    <PermissionGuard module="settings" action="view">
      <PageContainer>
        <Breadcrumbs />
        <div className="space-y-6 max-w-7xl">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Mail size={24} className="text-blue-600" />
                Riwayat Email
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Audit isi email yang dikirim sistem — klik baris untuk melihat detail
              </p>
            </div>
            <Link
              href="/settings/email"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition flex-shrink-0"
            >
              <ArrowLeft size={14} /> Email Admin
            </Link>
          </div>

          <EmailLogsTab />
        </div>
      </PageContainer>
    </PermissionGuard>
  );
}
