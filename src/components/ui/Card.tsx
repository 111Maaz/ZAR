import type { ReactNode, ElementType } from 'react';
import { isValidElement, createElement } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${paddingClasses[padding]} ${className ?? ''}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: ElementType | ReactNode }) {
  const renderedIcon = icon
    ? isValidElement(icon)
      ? (icon as ReactNode)
      : createElement(icon as ElementType, { className: 'h-5 w-5' })
    : null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
      <div className="flex items-start gap-2.5">
        {renderedIcon && <div className="mt-0.5 shrink-0 text-brand-600">{renderedIcon}</div>}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
