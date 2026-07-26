/**
 * Fix Breadcrumbs that were incorrectly placed inside helper functions
 * (DetailSkeleton, InfoPreview) instead of the main component's return.
 * These 3 files have the Breadcrumbs suffix in the wrong scope.
 */

const fs = require('fs');

const fixes = [
  {
    path: 'apps/web/app/(dashboard)/members/[id]/page.tsx',
    // Remove suffix line from InfoPreview
    removeFromHelper: '<Breadcrumbs suffix={{ href: \'#\', label: member?.namaLengkap || \'Detail\' }} />\n',
    // The main component may or may not have a plain <Breadcrumbs /> — we'll check
    suffixExpr: '{ href: \'#\', label: member?.namaLengkap || \'Detail\' }',
  },
  {
    path: 'apps/web/app/(dashboard)/activities/[id]/page.tsx',
    removeFromHelper: '<Breadcrumbs suffix={{ href: \'#\', label: activity?.nama || \'Detail\' }} />\n      <div className="h-5',
    replaceHelperWith: '<div className="h-5',
    suffixExpr: '{ href: \'#\', label: activity?.nama || \'Detail\' }',
  },
  {
    path: 'apps/web/app/(dashboard)/org-documents/[id]/page.tsx',
    removeFromHelper: '<Breadcrumbs suffix={{ href: \'#\', label: doc?.judul || \'Detail\' }} />\n      <div className="h-5',
    replaceHelperWith: '<div className="h-5',
    suffixExpr: '{ href: \'#\', label: doc?.judul || \'Detail\' }',
  },
];

for (const fix of fixes) {
  let content = fs.readFileSync(fix.path, 'utf-8');
  
  // Remove Breadcrumbs from helper
  if (fix.replaceHelperWith) {
    content = content.replace(fix.removeFromHelper, fix.replaceHelperWith);
  } else {
    content = content.replace(fix.removeFromHelper, '');
  }
  
  // Check if there's a plain <Breadcrumbs /> in the main component
  if (content.includes('<Breadcrumbs />')) {
    content = content.replace('<Breadcrumbs />', `<Breadcrumbs suffix={${fix.suffixExpr}} />`);
  }
  
  fs.writeFileSync(fix.path, content, 'utf-8');
  console.log(`Fixed: ${fix.path}`);
}
