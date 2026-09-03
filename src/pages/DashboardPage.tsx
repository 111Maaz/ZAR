import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, CheckCircle2, XCircle, Palette, Mail, Clock, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type { AuditLog } from '@/types';

interface Stats {
  totalShops: number;
  activeShops: number;
  disabledShops: number;
  totalDesigns: number;
  assignedDesigns: number;
  activeInvitations: number;
  expiredInvitations: number;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        if (isAdmin) {
          const [shopsRes, designsRes, invitationsRes, assignmentsRes, auditRes] = await Promise.all([
            supabase.from('shops').select('status'),
            supabase.from('designs').select('status'),
            supabase.from('invitations').select('status'),
            supabase.from('shop_design_assignments').select('status'),
            supabase
              .from('audit_logs')
              .select('*, shop:shops(shop_name), design:designs(design_name)')
              .order('created_at', { ascending: false })
              .limit(10),
          ]);

          const shops = shopsRes.data ?? [];
          const designs = designsRes.data ?? [];
          const invitations = invitationsRes.data ?? [];
          const assignments = assignmentsRes.data ?? [];

          setStats({
            totalShops: shops.length,
            activeShops: shops.filter((s) => s.status === 'active').length,
            disabledShops: shops.filter((s) => s.status === 'disabled').length,
            totalDesigns: designs.length,
            assignedDesigns: assignments.filter((a) => a.status === 'assigned').length,
            activeInvitations: invitations.filter((i) => i.status === 'active').length,
            expiredInvitations: invitations.filter((i) => i.status === 'expired').length,
          });
          setRecentActivity(auditRes.data as AuditLog[] ?? []);
        } else {
          // Shop owner dashboard
          const shopId = profile?.shop_id;
          if (!shopId) {
            setLoading(false);
            return;
          }
          const [invitationsRes, assignmentsRes] = await Promise.all([
            supabase.from('invitations').select('status').eq('shop_id', shopId),
            supabase.from('shop_design_assignments').select('status').eq('shop_id', shopId).eq('status', 'assigned'),
          ]);

          const invitations = invitationsRes.data ?? [];
          const assignments = assignmentsRes.data ?? [];

          setStats({
            totalShops: 1,
            activeShops: 1,
            disabledShops: 0,
            totalDesigns: assignments.length,
            assignedDesigns: assignments.length,
            activeInvitations: invitations.filter((i) => i.status === 'active').length,
            expiredInvitations: invitations.filter((i) => i.status === 'expired').length,
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAdmin, profile]);

  if (loading) return <LoadingState message="Loading dashboard..." />;
  if (error) return <ErrorState message={error} />;

  const adminCards = [
    { label: 'Total Shops', value: stats?.totalShops ?? 0, icon: Store, color: 'brand' },
    { label: 'Active Shops', value: stats?.activeShops ?? 0, icon: CheckCircle2, color: 'success' },
    { label: 'Disabled Shops', value: stats?.disabledShops ?? 0, icon: XCircle, color: 'error' },
    { label: 'Total Designs', value: stats?.totalDesigns ?? 0, icon: Palette, color: 'brand' },
    { label: 'Assigned Designs', value: stats?.assignedDesigns ?? 0, icon: CheckCircle2, color: 'success' },
    { label: 'Active Invitations', value: stats?.activeInvitations ?? 0, icon: Mail, color: 'success' },
    { label: 'Expired Invitations', value: stats?.expiredInvitations ?? 0, icon: Clock, color: 'warning' },
  ];

  const ownerCards = [
    { label: 'Assigned Designs', value: stats?.assignedDesigns ?? 0, icon: Palette, color: 'brand' },
    { label: 'Active Invitations', value: stats?.activeInvitations ?? 0, icon: Mail, color: 'success' },
    { label: 'Expired Invitations', value: stats?.expiredInvitations ?? 0, icon: Clock, color: 'warning' },
  ];

  const cards = isAdmin ? adminCards : ownerCards;

  const colorMap: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-success-50 text-success-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
  };

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          isAdmin
            ? 'Operational overview of the ZAR platform'
            : 'Overview of your shop and invitations'
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} padding="sm" className="animate-fade-in">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colorMap[card.color]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="truncate text-xs text-gray-500">{card.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
            </div>
            {recentActivity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Administrative actions will appear here once they start happening."
              />
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                      {(log.actor_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{log.actor_name || 'Unknown'}</span>{' '}
                        <span className="text-gray-500">{log.action}</span>
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                        {log.shop?.shop_name && <Badge variant="brand">{log.shop.shop_name}</Badge>}
                        {log.design?.design_name && <Badge variant="neutral">{log.design.design_name}</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {!isAdmin && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link to="/designs">
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50">
                  <Palette className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">View Designs</p>
                  <p className="text-sm text-gray-500">See your assigned invitation designs</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/invitations">
            <Card className="transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success-50">
                  <Mail className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Invitations</p>
                  <p className="text-sm text-gray-500">Manage your wedding invitations</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      )}
    </div>
  );
}
