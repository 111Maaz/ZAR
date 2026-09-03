import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, LogOut, User, Mail, Lock, AlertTriangle, UserMinus, Shield, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState, TableSkeleton } from '@/components/ui/States';
import { listAllAdminProfiles, changeUserRole, revokeShopOwnerAccess } from '@/services/userService';
import type { AdminProfile, UserRole, Shop } from '@/types';

interface AdminProfileWithShop extends AdminProfile {
  shop?: Shop | null;
}

export function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';

  const [loading, setLoading] = useState(false);
  const [nameForm, setNameForm] = useState({ full_name: profile?.full_name || '' });

  const [allProfiles, setAllProfiles] = useState<AdminProfileWithShop[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');

  const [roleConfirmOpen, setRoleConfirmOpen] = useState(false);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<AdminProfileWithShop | null>(null);
  const [pendingRole, setPendingRole] = useState<UserRole>('shop_owner');
  const [actionLoading, setActionLoading] = useState(false);

  const loadUserManagement = useCallback(async () => {
    if (!isAdmin) return;
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const [profilesRes, shopsRes] = await Promise.all([
        listAllAdminProfiles(),
        supabase.from('shops').select('id, shop_name'),
      ]);
      const shopLookup = new Map<string, Shop>();
      ((shopsRes.data ?? []) as Shop[]).forEach((s) => shopLookup.set(s.id, s));
      const enriched: AdminProfileWithShop[] = profilesRes.map((p) => ({
        ...p,
        shop: p.shop_id ? shopLookup.get(p.shop_id) ?? null : null,
      }));
      setAllProfiles(enriched);
    } catch (err) {
      setProfilesError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setProfilesLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadUserManagement();
    }
  }, [isAdmin, loadUserManagement]);

  const handleUpdateName = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('admin_profiles')
      .update({ full_name: nameForm.full_name.trim() })
      .eq('user_id', user!.id);
    setLoading(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    await refreshProfile();
    toast('Profile updated successfully.', 'success');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleRequestRoleChange = (p: AdminProfileWithShop, newRole: UserRole) => {
    setSelectedProfile(p);
    setPendingRole(newRole);
    setRoleConfirmOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedProfile) return;
    setActionLoading(true);
    try {
      await changeUserRole(selectedProfile.id, selectedProfile.user_id, pendingRole, selectedProfile.role);
      toast(`Role changed to ${pendingRole}.`, 'success');
      await loadUserManagement();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to change role', 'error');
    } finally {
      setActionLoading(false);
      setRoleConfirmOpen(false);
      setSelectedProfile(null);
    }
  };

  const handleRequestRevoke = (p: AdminProfileWithShop) => {
    setSelectedProfile(p);
    setRevokeConfirmOpen(true);
  };

  const handleConfirmRevoke = async () => {
    if (!selectedProfile) return;
    setActionLoading(true);
    try {
      await revokeShopOwnerAccess(selectedProfile.id, selectedProfile.user_id, selectedProfile.shop_id ?? '', {
        clearShopId: true,
      });
      toast('Shop owner access revoked.', 'warning');
      await loadUserManagement();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to revoke access', 'error');
    } finally {
      setActionLoading(false);
      setRevokeConfirmOpen(false);
      setSelectedProfile(null);
    }
  };

  if (!profile) return <LoadingState message="Loading settings..." />;

  return (
    <div>
      <PageHeader title="Settings" description="Manage your admin account and security settings" />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Account Information */}
        <Card>
          <CardHeader title="Account Information" />
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Display Name</p>
                <Input
                  value={nameForm.full_name}
                  onChange={(e) => setNameForm({ full_name: e.target.value })}
                  className="mt-1"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-900">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Role</p>
                <div className="mt-0.5">
                  <Badge variant={profile.role === 'admin' ? 'brand' : 'neutral'}>
                    {profile.role === 'admin' ? 'Administrator' : 'Shop Owner'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button onClick={handleUpdateName} loading={loading} size="sm">
              Save Changes
            </Button>
          </div>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader title="Security" />
          <div className="mt-4 space-y-4">
            {/* Password Recovery */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Password Recovery</p>
                <p className="mt-1 text-xs text-gray-500">
                  If you've forgotten your password, you can request a recovery link via email.
                </p>
                <a href="/forgot-password">
                  <Button size="sm" variant="outline" className="mt-3">
                    Reset password
                  </Button>
                </a>
              </div>
            </div>

            {/* Session Controls */}
            <div className="flex items-start gap-3 rounded-lg border border-error-200 bg-error-50/50 p-3">
              <LogOut className="mt-0.5 h-5 w-5 shrink-0 text-error-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-error-800">Sign Out</p>
                <p className="mt-1 text-xs text-error-600">
                  End your current session and return to the login page.
                </p>
                <Button size="sm" variant="danger" className="mt-3" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* User Management (Admin only) */}
      {isAdmin && (
        <Card className="mt-6">
          <CardHeader
            title="User Management"
            subtitle="Manage platform-wide admin and shop-owner user accounts"
            action={
              <Button size="sm" variant="outline" onClick={loadUserManagement}>
                Refresh
              </Button>
            }
          />
          <div className="mt-4">
            {profilesLoading ? (
              <div className="p-4">
                <TableSkeleton rows={5} cols={4} />
              </div>
            ) : profilesError ? (
              <div className="p-4">
                <ErrorState message={profilesError} onRetry={loadUserManagement} />
              </div>
            ) : allProfiles.length === 0 ? (
              <EmptyState
                title="No user profiles"
                description="Admin and shop-owner profiles will appear here once they sign in or are created."
              />
            ) : (
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                {allProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                        {(p.full_name || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{p.full_name || 'Unnamed User'}</p>
                        <p className="text-xs text-gray-500">
                          User ID: <span className="font-mono">{p.user_id.slice(0, 12)}…</span>
                        </p>
                      </div>
                      <Badge variant={p.role === 'admin' ? 'brand' : 'neutral'}>
                        {p.role === 'admin' ? 'Administrator' : 'Shop Owner'}
                      </Badge>
                      {p.shop && (
                        <Link to={`/shops/${p.shop_id}`} className="hidden items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-200 sm:inline-flex">
                          <Store className="h-3 w-3" />
                          {p.shop.shop_name}
                        </Link>
                      )}
                      {!p.shop_id && p.role === 'shop_owner' && (
                        <span className="hidden items-center gap-1 rounded-full bg-warning-100 px-2.5 py-0.5 text-xs font-medium text-warning-700 sm:inline-flex">
                          <AlertTriangle className="h-3 w-3" />
                          No shop assigned
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRequestRoleChange(p, p.role === 'admin' ? 'shop_owner' : 'admin')
                        }
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {p.role === 'admin' ? 'Demote to Owner' : 'Promote to Admin'}
                      </Button>
                      {p.role === 'shop_owner' && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRequestRevoke(p)}
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          Revoke Access
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Role Change Confirmation Modal */}
      <Modal
        open={roleConfirmOpen}
        onClose={() => setRoleConfirmOpen(false)}
        title={pendingRole === 'admin' ? 'Promote to Administrator' : 'Demote to Shop Owner'}
        footer={
          <>
            <Button variant="outline" onClick={() => setRoleConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={pendingRole === 'admin' ? 'danger' : 'primary'}
              loading={actionLoading}
              onClick={handleConfirmRoleChange}
            >
              Confirm {pendingRole === 'admin' ? 'Promote' : 'Demote'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to change the role of{' '}
          <strong>{selectedProfile?.full_name || 'this user'}</strong> from{' '}
          <strong>{selectedProfile?.role}</strong> to{' '}
          <strong>{pendingRole}</strong>?
          {pendingRole === 'admin' && (
            <span className="mt-2 block rounded-lg border border-error-200 bg-error-50 p-2 text-xs text-error-700">
              Warning: Promoting a user to admin grants access to all shops, designs, invitations, and audit logs across the platform.
            </span>
          )}
        </p>
      </Modal>

      {/* Revoke Access Confirmation Modal */}
      <Modal
        open={revokeConfirmOpen}
        onClose={() => setRevokeConfirmOpen(false)}
        title="Revoke Shop Owner Access"
        footer={
          <>
            <Button variant="outline" onClick={() => setRevokeConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={actionLoading} onClick={handleConfirmRevoke}>
              Revoke Access
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Are you sure you want to revoke shop-owner access for{' '}
          <strong>{selectedProfile?.full_name || 'this user'}</strong>?
          Their shop assignment will be cleared (shop_id set to null).
          They will no longer be able to manage invitations for their previously assigned shop.
        </p>
      </Modal>
    </div>
  );
}
