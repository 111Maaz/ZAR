import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import type { Shop } from '@/types';

export function ShopsListPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadShops() {
      try {
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setShops(data as Shop[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load shops');
      } finally {
        setLoading(false);
      }
    }
    loadShops();
  }, []);

  const filtered = shops.filter(
    (s) =>
      s.shop_name.toLowerCase().includes(search.toLowerCase()) ||
      s.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      s.owner_email.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'shop_name',
      header: 'Shop',
      render: (row: Shop) => (
        <div>
          <p className="font-medium text-gray-900">{row.shop_name}</p>
          <p className="text-xs text-gray-500">{row.owner_name}</p>
        </div>
      ),
    },
    {
      key: 'owner_email',
      header: 'Email',
      hideOnMobile: true,
    },
    {
      key: 'city',
      header: 'Location',
      hideOnMobile: true,
      render: (row: Shop) => (
        <span className="text-gray-600">
          {[row.city, row.state, row.country].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: Shop) => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      hideOnMobile: true,
      render: (row: Shop) => (
        <span className="text-gray-500">{new Date(row.created_at).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Shops"
        description="Manage shop owner accounts and their configurations"
        action={
          isAdmin && (
            <Link to="/shops/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add Shop
              </Button>
            </Link>
          )
        }
      />

      <Card padding="none" className="mb-4">
        <div className="border-b border-gray-100 p-4">
          <Input
            placeholder="Search by shop name, owner, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No shops yet"
              description="Add your first shop owner to get started."
              action={
                isAdmin && (
                  <Link to="/shops/new">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Add Shop
                    </Button>
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <Table columns={columns} data={filtered} onRowClick={(row) => navigate(`/shops/${row.id}`)} />
        )}
      </Card>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Badge variant="neutral">{filtered.length} shops</Badge>
      </div>
    </div>
  );
}
