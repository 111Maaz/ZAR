import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function PageHeader({ title, description, action, compact }: PageHeaderProps) {
  return (
    <div className={`${compact ? 'mb-3' : 'mb-6'} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
      <div>
        <h1 className={`${compact ? 'text-lg' : 'text-xl sm:text-2xl'} font-bold tracking-tight text-gray-900`}>{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
