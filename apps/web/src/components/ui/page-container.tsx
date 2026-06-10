'use client';

interface PageContainerProps {
  children: React.ReactNode;
  /** Override the default spacing class */
  className?: string;
}

/**
 * Standard page wrapper for dashboard pages.
 * Provides consistent vertical spacing between sections (PageHeader, SummaryBar, SearchBar, DataTable, etc.)
 */
export default function PageContainer({ children, className = 'space-y-5' }: PageContainerProps) {
  return <div className={className}>{children}</div>;
}
