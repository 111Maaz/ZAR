import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import type { Invitation } from '@/types';

export function InvitationsListPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    async function loadInvitations() {
      try {
        let query = supabase
          .from('invitations')
          .select('*, shop:shops(shop_name), design:designs(design_name, design_code)')
          .order('created_at', { ascending: false });

        if (!isAdmin && profile?.shop_id) {
          query = query.eq('shop_id', profile.shop_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setInvitations((data as Invitation[]) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitations');
      } finally {
        setLoading(false);
      }
    }
    loadInvitations();
  }, [isAdmin, profile]);

  const filtered = invitations.filter((inv) => {
    const matchesSearch =
      inv.slug.toLowerCase().includes(search.toLowerCase()) ||
      inv.invitation_code.toLowerCase().includes(search.toLowerCase()) ||
      (inv.groom_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (inv.bride_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'invitation_code',
      header: 'Code',
      render: (row: Invitation) => <span className="font-mono text-xs text-gray-700">{row.invitation_code}</span>,
    },
    {
      key: 'names',
      header: 'Couple',
      render: (row: Invitation) => (
        <span className="text-gray-900">{[row.groom_name, row.bride_name].filter(Boolean).join(' & ') || '—'}</span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      hideOnMobile: true,
      render: (row: Invitation) => <span className="font-mono text-xs text-gray-500">{row.slug}</span>,
    },
    {
      key: 'shop',
      header: 'Shop',
      hideOnMobile: true,
      render: (row: Invitation) => <span className="text-gray-600">{row.shop?.shop_name || '—'}</span>,
    },
    {
      key: 'design',
      header: 'Design',
      hideOnMobile: true,
      render: (row: Invitation) => <span className="text-gray-600">{row.design?.design_name || '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Invitation) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invitations"
        description={
          isAdmin
            ? 'Administrative overview of all invitations across all shops'
            : 'Overview of your shop\'s invitations'
        }
        action={
          (isAdmin || profile?.shop_id) && (
            <Link to="/invitations/new">
              <Button>
                <Plus className="h-4 w-4" />
                New Invitation
              </Button>
            </Link>
          )
        }
      />

      <Card padding="none" className="mb-4">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by code, slug, or couple name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-base sm:w-40"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No invitations yet"
              description="Invitations created by shop owners will appear here."
            />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filtered}
            onRowClick={(row) => navigate(`/invitations/${row.id}`)}
          />
        )}
      </Card>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Badge variant="neutral">{filtered.length} invitations</Badge>
      </div>
    </div>
  );
}
