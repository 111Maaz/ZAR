import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Palette, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import type { Design } from '@/types';

export function DesignsListPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const navigate = useNavigate();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadDesigns() {
      try {
        // Owners use a database-owned query: their shop is derived from auth.uid(),
        // never from a client parameter. RLS remains the enforcement boundary.
        const response = isAdmin
          ? await supabase.from('designs').select('*').order('design_code', { ascending: true })
          : await supabase.rpc('get_my_assigned_designs');
        const { data, error } = response;
        if (error) throw error;
        setDesigns(data as Design[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load designs');
      } finally {
        setLoading(false);
      }
    }
    loadDesigns();
  }, [isAdmin]);

  const filtered = designs.filter(
    (d) =>
      d.design_name.toLowerCase().includes(search.toLowerCase()) ||
      d.design_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Designs"
        description={
          isAdmin
            ? 'Register and manage invitation designs deployed on Vercel'
            : 'Invitation designs assigned to your shop'
        }
        action={
          isAdmin && (
            <Link to="/designs/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add Design
              </Button>
            </Link>
          )
        }
      />

      <Card padding="none" className="mb-4">
        <div className="border-b border-gray-100 p-4">
          <Input
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No designs yet"
              description={
                isAdmin
                  ? 'Register your first invitation design after deploying it to Vercel.'
                  : 'No designs have been assigned to your shop yet.'
              }
              action={
                isAdmin && (
                  <Link to="/designs/new">
                    <Button>
                      <Plus className="h-4 w-4" />
                      Add Design
                    </Button>
                  </Link>
                )
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((design) => (
              <div
                key={design.id}
                onClick={() => navigate(`/designs/${design.id}`)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                    <Palette className="h-5 w-5 text-brand-600" />
                  </div>
                  <StatusBadge status={design.status} />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-gray-900">{design.design_name}</h3>
                <p className="mt-0.5 font-mono text-xs text-gray-500">{design.design_code}</p>
                {design.description && (
                  <p className="mt-2 line-clamp-2 text-xs text-gray-500">{design.description}</p>
                )}
                {design.production_url && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-brand-600">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{design.production_url}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
