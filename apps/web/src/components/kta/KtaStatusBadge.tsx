import { getKtaStatusColor, getKtaStatusLabel } from './constants';

interface KtaStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES: Record<NonNullable<KtaStatusBadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-[11px]',
  lg: 'px-2.5 py-1 text-sm',
};

export function KtaStatusBadge({ status, size = 'md' }: KtaStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full ${getKtaStatusColor(status)} ${SIZES[size]}`}
    >
      {getKtaStatusLabel(status)}
    </span>
  );
}
