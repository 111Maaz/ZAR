import { useEffect, useState } from 'react';
import { Search, ScrollText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import type { AuditLog } from '@/types';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  useEffect(() => {
    async function loadLogs() {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*, shop:shops(shop_name), design:designs(design_name)')
          .order('created_at', { ascending: false })
          .limit(200);
        if (error) throw error;
        setLogs((data as AuditLog[]) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const actions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.actor_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (log.invitation_code?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div>
      <PageHeader title="Audit Logs" description="Immutable record of administrative and shop owner actions" />

      <Card padding="none" className="mb-4">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by action, actor, or invitation code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="input-base sm:w-56"
          >
            <option value="all">All actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={8} cols={4} />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No audit logs"
              description="Administrative and shop owner actions will be recorded here."
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                  {(log.actor_name || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-gray-900">{log.actor_name || 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{log.actor_role || ''}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-gray-600">{log.action}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                    {log.shop?.shop_name && <Badge variant="brand">{log.shop.shop_name}</Badge>}
                    {log.design?.design_name && <Badge variant="neutral">{log.design.design_name}</Badge>}
                    {log.invitation_code && <Badge variant="info">{log.invitation_code}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Badge variant="neutral">{filtered.length} log entries</Badge>
      </div>
    </div>
  );
}
