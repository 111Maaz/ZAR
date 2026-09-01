import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Pencil, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { logAuditEvent } from '@/lib/audit';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type { Design, ShopDesignAssignment } from '@/types';

export function DesignDetailPage() {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { toast } = useToast();
  const [design, setDesign] = useState<Design | null>(null);
  const [assignments, setAssignments] = useState<ShopDesignAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!designId) return;
    try {
      const [designRes, assignmentsRes] = await Promise.all([
        supabase.from('designs').select('*').eq('id', designId).maybeSingle(),
        isAdmin
          ? supabase
              .from('shop_design_assignments')
              .select('*, shop:shops(id, shop_name, owner_name, status)')
              .eq('design_id', designId)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (designRes.error) throw designRes.error;
      if (!designRes.data) {
        setError('Design not found');
        return;
      }

      setDesign(designRes.data as Design);
      setAssignments((assignmentsRes.data as ShopDesignAssignment[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load design');
    } finally {
      setLoading(false);
    }
  }, [designId, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingState message="Loading design..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/designs')} />;
  if (!design) return <ErrorState message="Design not found" />;

  return (
    <div>
      <div className="mb-4">
        <Link to="/designs" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to designs
        </Link>
      </div>

      <PageHeader
        title={design.design_name}
        description={`Code: ${design.design_code}`}
        action={
          isAdmin && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={design.status} />
        <span className="text-sm text-gray-400">Created {new Date(design.created_at).toLocaleDateString()}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Design Details" />
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500">Design Code</p>
              <p className="font-mono text-sm text-gray-900">{design.design_code}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Production URL</p>
              <a
                href={design.production_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {design.production_url}
              </a>
            </div>
            {design.description && (
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-900">{design.description}</p>
              </div>
            )}
          </div>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader title="Shop Assignments" subtitle="Shops with access to this design" />
            <div className="mt-4">
              {assignments.length === 0 ? (
                <EmptyState title="Not assigned to any shop" description="Assign this design to shops from the shop detail page." />
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-gray-400" />
                        <button
                          onClick={() => navigate(`/shops/${a.shop?.id}`)}
                          className="text-sm font-medium text-gray-900 hover:text-brand-600"
                        >
                          {a.shop?.shop_name}
                        </button>
                      </div>
                      {a.status === 'assigned' ? (
                        <Badge variant="success">Assigned</Badge>
                      ) : (
                        <Badge variant="warning">Restricted</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <EditDesignModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        design={design}
        onSaved={() => {
          setEditOpen(false);
          loadData();
        }}
      />
    </div>
  );
}

function EditDesignModal({
  open,
  onClose,
  design,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  design: Design;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    design_name: design.design_name,
    production_url: design.production_url,
    description: design.description || '',
    status: design.status,
  });

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('designs')
      .update({
        design_name: form.design_name.trim(),
        production_url: form.production_url.trim(),
        description: form.description.trim() || null,
        status: form.status,
      })
      .eq('id', design.id);

    setLoading(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }

    await logAuditEvent({
      action: 'Admin edited Design',
      design_id: design.id,
      metadata: { design_name: form.design_name },
    });

    toast('Design updated successfully.', 'success');
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Design"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={handleSave}>
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Design Name"
          required
          value={form.design_name}
          onChange={(e) => setForm({ ...form, design_name: e.target.value })}
        />
        <Input
          label="Production URL"
          required
          value={form.production_url}
          onChange={(e) => setForm({ ...form, production_url: e.target.value })}
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div>
          <label className="label-base">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
            className="input-base"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
