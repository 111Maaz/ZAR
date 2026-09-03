import { useEffect, useState, useMemo } from 'react';
import { Store, Shield, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import { Modal } from '@/components/ui/Modal';
import type { AuditLog, Shop } from '@/types';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedShopIds, setSelectedShopIds] = useState<Set<string>>(new Set());
  const [shopPickerOpen, setShopPickerOpen] = useState(false);

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

  useEffect(() => {
    async function loadShops() {
      try {
        const { data, error } = await supabase.from('shops').select('id, shop_name').order('shop_name');
        if (error) throw error;
        setShops((data as Shop[]) ?? []);
      } catch (err) {
        console.error('Failed to load shops for filter:', err);
      } finally {
        setShopsLoading(false);
      }
    }
    loadShops();
  }, []);

  const actions = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);
  const actorRoles = useMemo(() => Array.from(new Set(logs.map((l) => l.actor_role).filter(Boolean))).sort(), [logs]);
  const selectedShopNames = useMemo(
    () => shops.filter((s) => selectedShopIds.has(s.id)).map((s) => s.shop_name),
    [shops, selectedShopIds]
  );

  const toggleShop = (shopId: string) => {
    setSelectedShopIds((prev) => {
      const next = new Set(prev);
      if (next.has(shopId)) next.delete(shopId);
      else next.add(shopId);
      return next;
    });
  };

  const clearShopFilter = () => setSelectedShopIds(new Set());

  const filtered = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.actor_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (log.invitation_code?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesRole = roleFilter === 'all' || log.actor_role === roleFilter;
    const matchesShop = selectedShopIds.size === 0 || (log.shop_id && selectedShopIds.has(log.shop_id));
    return matchesSearch && matchesAction && matchesRole && matchesShop;
  });

  return (
    <div>
      <PageHeader title="Audit Logs" description="Immutable record of administrative and shop owner actions" />

      <Card padding="none" className="mb-4">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="input-base sm:w-44"
              >
                <option value="all">All roles</option>
                {actorRoles.filter(Boolean).map((role) => (
                  <option key={role as string} value={role as string}>
                    {role === 'admin' ? 'Administrator' : role === 'shop_owner' ? 'Shop Owner' : role}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-gray-400" />
              <Button variant="outline" size="sm" onClick={() => setShopPickerOpen(true)}>
                Shops
                {selectedShopIds.size > 0 && (
                  <Badge variant="brand" className="ml-2">
                    {selectedShopIds.size}
                  </Badge>
                )}
              </Button>
              {selectedShopIds.size > 0 && (
                <button
                  onClick={clearShopFilter}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-3 w-3" /> Clear shops
                </button>
              )}
            </div>
            {selectedShopNames.length > 0 && (
              <div className="flex flex-wrap gap-1 w-full">
                {selectedShopNames.map((name) => (
                  <Badge key={name} variant="neutral" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
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

      {/* Shop Filter Picker Modal */}
      <Modal
        open={shopPickerOpen}
        onClose={() => setShopPickerOpen(false)}
        title="Filter by Shop"
        footer={
          <Button variant="outline" onClick={() => setShopPickerOpen(false)}>
            Done
          </Button>
        }
      >
        {shopsLoading ? (
          <div className="py-4">
            <TableSkeleton rows={5} cols={1} />
          </div>
        ) : shops.length === 0 ? (
          <EmptyState title="No shops" description="No shop records found in the database." />
        ) : (
          <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
            {shops.map((shop) => {
              const checked = selectedShopIds.has(shop.id);
              return (
                <label
                  key={shop.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    checked ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    checked={checked}
                    onChange={() => toggleShop(shop.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{shop.shop_name}</p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
        {selectedShopIds.size > 0 && (
          <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">{selectedShopIds.size} shop(s) selected</span>
            <button
              onClick={clearShopFilter}
              className="inline-flex items-center gap-1 text-xs font-medium text-error-600 hover:text-error-700"
            >
              <X className="h-3 w-3" /> Clear selection
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
