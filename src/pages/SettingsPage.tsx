import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, KeyRound, LogOut, User, Mail, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, ErrorState } from '@/components/ui/States';
import type { AuthMFAEnrollResponse } from '@supabase/supabase-js';

export function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mfaStatus, setMfaStatus] = useState<'checking' | 'enabled' | 'disabled'>('checking');
  const [loading, setLoading] = useState(false);
  const [nameForm, setNameForm] = useState({ full_name: profile?.full_name || '' });

  const checkMFA = useCallback(async () => {
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      setMfaStatus(totpFactor?.status === 'verified' ? 'enabled' : 'disabled');
    } catch {
      setMfaStatus('disabled');
    }
  }, []);

  useEffect(() => {
    checkMFA();
  }, [checkMFA]);

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

  const handleSetupMFA = async () => {
    navigate('/setup-2fa');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
            {/* MFA Status */}
            <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
              {mfaStatus === 'enabled' ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success-600" />
              ) : (
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-600" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">Two-Factor Authentication</p>
                  {mfaStatus === 'checking' ? (
                    <span className="text-xs text-gray-400">Checking...</span>
                  ) : mfaStatus === 'enabled' ? (
                    <Badge variant="success">Enabled</Badge>
                  ) : (
                    <Badge variant="warning">Not enabled</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {mfaStatus === 'enabled'
                    ? 'Your account is protected with 2FA. You need your authenticator app to sign in.'
                    : 'Enable 2FA for an additional layer of security on your admin account.'}
                </p>
                {mfaStatus === 'disabled' && (
                  <Button size="sm" className="mt-3" onClick={handleSetupMFA}>
                    <KeyRound className="h-3.5 w-3.5" />
                    Set up 2FA
                  </Button>
                )}
              </div>
            </div>

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
    </div>
  );
}
