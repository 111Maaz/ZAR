import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-50 text-success-700 border-success-200',
  warning: 'bg-warning-50 text-warning-700 border-warning-200',
  error: 'bg-error-50 text-error-700 border-error-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  brand: 'bg-brand-50 text-brand-700 border-brand-200',
};

export function Badge({
  variant = 'neutral',
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className ?? ''}`}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    active: 'success',
    disabled: 'error',
    inactive: 'neutral',
    assigned: 'success',
    restricted: 'warning',
    draft: 'neutral',
    expired: 'error',
  };
  const variant = variantMap[status] ?? 'neutral';
  return (
    <Badge variant={variant}>
      <span className="capitalize">{status}</span>
    </Badge>
  );
}
