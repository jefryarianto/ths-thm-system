'use client';

import { FileText } from 'lucide-react';
import { EMAIL_TEMPLATES } from './shared';

export default function EmailTemplatesTab() {
  const total = EMAIL_TEMPLATES.reduce((c, g) => c + g.items.length, 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Direktori Template Email</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Semua {total} template email yang terintegrasi di sistem THS-THM.
      </p>
      {EMAIL_TEMPLATES.map((group) => (
        <div key={group.category} className="mb-6 last:mb-0">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
            {group.category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.items.map((tpl) => (
              <div key={tpl.name} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition cursor-default">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 flex-shrink-0">
                  <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{tpl.label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-mono truncate">{tpl.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Trigger: {tpl.trigger}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">{tpl.params}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
