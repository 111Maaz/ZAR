import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Ban, CheckCircle2, Mail, Phone, MapPin, MessageCircle, Building, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { logAuditEvent } from '@/lib/audit';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type { Shop, Design, ShopDesignAssignment, Invitation } from '@/types';

export function ShopDetailPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const { toast } = useToast();
  const [shop, setShop] = useState<Shop | null>(null);
  const [allDesigns, setAllDesigns] = useState<Design[]>([]);
  const [assignments, setAssignments] = useState<ShopDesignAssignment[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!shopId) return;
    try {
      const [shopRes, designsRes, assignmentsRes, invitationsRes] = await Promise.all([
        supabase.from('shops').select('*').eq('id', shopId).maybeSingle(),
        isAdmin ? supabase.from('designs').select('*').order('design_code') : supabase.from('designs').select('*').order('design_code'),
        supabase
          .from('shop_design_assignments')
          .select('*, design:designs(*)')
          .eq('shop_id', shopId),
        supabase
          .from('invitations')
          .select('*, design:designs(design_name, design_code)')
          .eq('shop_id', shopId)
          .order('created_at', { ascending: false }),
      ]);

      if (shopRes.error) throw shopRes.error;
      if (!shopRes.data) {
        setError('Shop not found');
        return;
      }

      setShop(shopRes.data as Shop);
      setAllDesigns((designsRes.data as Design[]) ?? []);
      setAssignments((assignmentsRes.data as ShopDesignAssignment[]) ?? []);
      setInvitations((invitationsRes.data as Invitation[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shop');
    } finally {
      setLoading(false);
    }
  }, [shopId, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async () => {
    if (!shop) return;
    setActionLoading(true);
    const newStatus = shop.status === 'active' ? 'disabled' : 'active';
    const { error } = await supabase.from('shops').update({ status: newStatus }).eq('id', shop.id);
    setActionLoading(false);
    setDisableOpen(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }

    await logAuditEvent({
      action: newStatus === 'disabled' ? 'Admin disabled Shop' : 'Admin reactivated Shop',
      shop_id: shop.id,
      metadata: { shop_name: shop.shop_name, previous_status: shop.status, new_status: newStatus },
    });

    toast(`Shop ${newStatus === 'active' ? 'reactivated' : 'disabled'} successfully.`, 'success');
    setShop({ ...shop, status: newStatus });
  };

  const handleToggleAssignment = async (designId: string, currentStatus: string | null) => {
    if (!shop) return;
    setActionLoading(true);

    try {
      if (currentStatus === null) {
        // Create new assignment
        const { error } = await supabase
          .from('shop_design_assignments')
          .insert({ shop_id: shop.id, design_id: designId, status: 'assigned' });
        if (error) throw error;
        await logAuditEvent({
          action: 'Admin assigned Design to Shop',
          shop_id: shop.id,
          design_id: designId,
          metadata: { shop_name: shop.shop_name },
        });
        toast('Design assigned successfully.', 'success');
      } else if (currentStatus === 'assigned') {
        // Restrict
        const { error } = await supabase
          .from('shop_design_assignments')
          .update({ status: 'restricted' })
          .eq('shop_id', shop.id)
          .eq('design_id', designId);
        if (error) throw error;
        await logAuditEvent({
          action: 'Admin restricted Design',
          shop_id: shop.id,
          design_id: designId,
          metadata: { shop_name: shop.shop_name },
        });
        toast('Design restricted.', 'warning');
      } else {
        // Re-assign
        const { error } = await supabase
          .from('shop_design_assignments')
          .update({ status: 'assigned' })
          .eq('shop_id', shop.id)
          .eq('design_id', designId);
        if (error) throw error;
        await logAuditEvent({
          action: 'Admin re-assigned Design to Shop',
          shop_id: shop.id,
          design_id: designId,
          metadata: { shop_name: shop.shop_name },
        });
        toast('Design re-assigned.', 'success');
      }
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update assignment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading shop..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/shops')} />;
  if (!shop) return <ErrorState message="Shop not found" />;

  const assignmentMap = new Map(assignments.map((a) => [a.design_id, a.status]));

  const invitationColumns = [
    {
      key: 'invitation_code',
      header: 'Code',
      render: (row: Invitation) => <span className="font-mono text-xs">{row.invitation_code}</span>,
    },
    {
      key: 'names',
      header: 'Couple',
      render: (row: Invitation) => (
        <span>{[row.groom_name, row.bride_name].filter(Boolean).join(' & ') || '—'}</span>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      hideOnMobile: true,
      render: (row: Invitation) => <span className="font-mono text-xs text-gray-500">{row.slug}</span>,
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
      <div className="mb-4">
        <Link to="/shops" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to shops
        </Link>
      </div>

      <PageHeader
        title={shop.shop_name}
        description={`Owner: ${shop.owner_name}`}
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant={shop.status === 'active' ? 'danger' : 'primary'}
                onClick={() => setDisableOpen(true)}
              >
                {shop.status === 'active' ? (
                  <>
                    <Ban className="h-4 w-4" />
                    Disable
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Reactivate
                  </>
                )}
              </Button>
            </div>
          )
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <StatusBadge status={shop.status} />
        <span className="text-sm text-gray-400">Created {new Date(shop.created_at).toLocaleDateString()}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Shop Information" />
          <div className="mt-4 space-y-3">
            <InfoRow icon={Building} label="Business Contact" value={shop.business_contact} />
            <InfoRow icon={Mail} label="Owner Email" value={shop.owner_email} />
            <InfoRow icon={Phone} label="Phone" value={shop.phone} />
            <InfoRow icon={MessageCircle} label="WhatsApp" value={shop.whatsapp} />
            <InfoRow icon={MapPin} label="Address" value={[shop.address, shop.city, shop.state, shop.country].filter(Boolean).join(', ')} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Database Configuration" />
          <div className="mt-4 space-y-3">
            <InfoRow label="Supabase Project URL" value={shop.supabase_project_url || 'Not configured'} />
            <InfoRow label="Anon Key" value={shop.supabase_anon_key ? 'Configured (hidden)' : 'Not configured'} />
            <div className="rounded-lg bg-warning-50 border border-warning-200 px-3 py-2 text-xs text-warning-700">
              Service-role keys are never stored in the dashboard. They must be supplied through secure server-side configuration.
            </div>
          </div>
        </Card>
      </div>

      {/* Assigned Designs */}
      <Card className="mt-6">
        <CardHeader
          title="Assigned Designs"
          subtitle="Manage which designs this shop can access"
          action={
            isAdmin && (
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                <Plus className="h-4 w-4" />
                Manage
              </Button>
            )
          }
        />
        <div className="mt-4">
          {allDesigns.length === 0 ? (
            <EmptyState title="No designs registered" description="Register designs first, then assign them to this shop." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allDesigns.map((design) => {
                const status = assignmentMap.get(design.id) ?? null;
                return (
                  <div
                    key={design.id}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                      status === 'assigned'
                        ? 'border-success-200 bg-success-50/50'
                        : status === 'restricted'
                        ? 'border-warning-200 bg-warning-50/50'
                        : 'border-gray-200 bg-gray-50/50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{design.design_name}</p>
                      <p className="text-xs text-gray-500">{design.design_code}</p>
                    </div>
                    {status === 'assigned' && <Badge variant="success">Assigned</Badge>}
                    {status === 'restricted' && <Badge variant="warning">Restricted</Badge>}
                    {status === null && <Badge variant="neutral">Not Assigned</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Invitations */}
      <Card className="mt-6" padding="none">
        <div className="border-b border-gray-100 p-5">
          <h3 className="text-base font-semibold text-gray-900">Invitation Overview</h3>
        </div>
        {invitations.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No invitations yet" description="Invitations created by this shop owner will appear here." />
          </div>
        ) : (
          <Table
            columns={invitationColumns}
            data={invitations}
            onRowClick={(row) => navigate(`/invitations/${row.id}`)}
          />
        )}
      </Card>

      {/* Disable/Reactivate Modal */}
      <Modal
        open={disableOpen}
        onClose={() => setDisableOpen(false)}
        title={shop.status === 'active' ? 'Disable Shop' : 'Reactivate Shop'}
        footer={
          <>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={shop.status === 'active' ? 'danger' : 'primary'}
              loading={actionLoading}
              onClick={handleToggleStatus}
            >
              {shop.status === 'active' ? 'Disable' : 'Reactivate'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          {shop.status === 'active'
            ? `Disabling "${shop.shop_name}" will prevent the shop owner from accessing the platform. Existing invitation URLs will continue to work. You can reactivate the shop at any time.`
            : `Reactivating "${shop.shop_name}" will restore the shop owner's access to the platform.`}
        </p>
      </Modal>

      {/* Assignment Management Modal */}
      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Manage Design Assignments"
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setAssignOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="space-y-2">
          {allDesigns.map((design) => {
            const status = assignmentMap.get(design.id) ?? null;
            return (
              <div
                key={design.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{design.design_name}</p>
                  <p className="text-xs text-gray-500">{design.design_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  {status === 'assigned' && <Badge variant="success">Assigned</Badge>}
                  {status === 'restricted' && <Badge variant="warning">Restricted</Badge>}
                  {status === null && <Badge variant="neutral">Not Assigned</Badge>}
                  <Button
                    size="sm"
                    variant={status === 'assigned' ? 'danger' : 'outline'}
                    loading={actionLoading}
                    onClick={() => handleToggleAssignment(design.id, status)}
                  >
                    {status === 'assigned' ? 'Restrict' : status === 'restricted' ? 'Re-assign' : 'Assign'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Edit Modal */}
      <EditShopModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        shop={shop}
        onSaved={() => {
          setEditOpen(false);
          loadData();
        }}
      />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: typeof Mail; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function EditShopModal({
  open,
  onClose,
  shop,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  shop: Shop;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    shop_name: shop.shop_name,
    owner_name: shop.owner_name,
    owner_email: shop.owner_email,
    phone: shop.phone || '',
    whatsapp: shop.whatsapp || '',
    address: shop.address || '',
    city: shop.city || '',
    state: shop.state || '',
    country: shop.country || '',
    business_contact: shop.business_contact || '',
    supabase_project_url: shop.supabase_project_url || '',
    supabase_anon_key: shop.supabase_anon_key || '',
  });

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('shops')
      .update({
        shop_name: form.shop_name.trim(),
        owner_name: form.owner_name.trim(),
        owner_email: form.owner_email.trim(),
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country.trim() || null,
        business_contact: form.business_contact.trim() || null,
        supabase_project_url: form.supabase_project_url.trim() || null,
        supabase_anon_key: form.supabase_anon_key.trim() || null,
      })
      .eq('id', shop.id);

    setLoading(false);

    if (error) {
      toast(error.message, 'error');
      return;
    }

    await logAuditEvent({
      action: 'Admin edited Shop',
      shop_id: shop.id,
      metadata: { shop_name: form.shop_name },
    });

    toast('Shop updated successfully.', 'success');
    onSaved();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Shop"
      size="lg"
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Shop Name"
            required
            value={form.shop_name}
            onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
          />
          <Input
            label="Owner Name"
            required
            value={form.owner_name}
            onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
          />
          <Input
            label="Owner Email"
            type="email"
            required
            value={form.owner_email}
            onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
          />
          <Input
            label="Business Contact"
            value={form.business_contact}
            onChange={(e) => setForm({ ...form, business_contact: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          />
          <Input
            label="City"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <Input
            label="State"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
          />
          <Input
            label="Country"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
          />
        </div>
        <Textarea
          label="Address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <div className="rounded-lg bg-warning-50 border border-warning-200 px-3 py-2 text-xs text-warning-700">
          Supabase configuration can be edited from the shop details page. Only public-safe anon keys are accepted here.
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Supabase Project URL"
            value={form.supabase_project_url}
            onChange={(e) => setForm({ ...form, supabase_project_url: e.target.value })}
          />
          <Input
            label="Supabase Anon Key"
            value={form.supabase_anon_key}
            onChange={(e) => setForm({ ...form, supabase_anon_key: e.target.value })}
          />
        </div>
      </div>
    </Modal>
  );
}
