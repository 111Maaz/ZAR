import type { ReactNode } from 'react';
import { Inbox, AlertTriangle, Loader2 } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <Inbox className="h-6 w-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-error-200 bg-error-50/50 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-100">
        <AlertTriangle className="h-6 w-6 text-error-500" />
      </div>
      <h3 className="text-sm font-semibold text-error-800">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-error-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg border border-error-300 bg-white px-4 py-2 text-sm font-medium text-error-700 transition-colors hover:bg-error-50"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      {message && <p className="mt-3 text-sm text-gray-500">{message}</p>}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((__, j) => (
            <div key={j} className="h-4 flex-1 animate-pulse rounded bg-gray-100" style={{ animationDelay: `${i * 100 + j * 50}ms` }} />
          ))}
        </div>
      ))}
    </div>
  );
}
