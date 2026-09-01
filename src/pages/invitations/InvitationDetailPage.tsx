import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, Users, Hash, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import type { Invitation } from '@/types';

export function InvitationDetailPage() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!invitationId) return;
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*, shop:shops(*), design:designs(*)')
        .eq('id', invitationId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setError('Invitation not found');
        return;
      }
      setInvitation(data as Invitation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  }, [invitationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingState message="Loading invitation..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/invitations')} />;
  if (!invitation) return <ErrorState message="Invitation not found" />;

  const coupleName = [invitation.groom_name, invitation.bride_name].filter(Boolean).join(' & ') || 'Unnamed invitation';

  return (
    <div>
      <div className="mb-4">
        <Link to="/invitations" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to invitations
        </Link>
      </div>

      <PageHeader title={coupleName} description={`Code: ${invitation.invitation_code}`} />

      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={invitation.status} />
        <span className="text-sm text-gray-400">Created {new Date(invitation.created_at).toLocaleDateString()}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Invitation Details" />
          <div className="mt-4 space-y-4">
            <DetailRow icon={Users} label="Couple" value={coupleName} />
            <DetailRow icon={Hash} label="Slug" value={invitation.slug} mono />
            <DetailRow icon={Hash} label="Invitation Code" value={invitation.invitation_code} mono />
            <DetailRow
              icon={Calendar}
              label="Start Date"
              value={invitation.start_date ? new Date(invitation.start_date).toLocaleDateString() : '—'}
            />
            <DetailRow
              icon={Calendar}
              label="End Date"
              value={invitation.end_date ? new Date(invitation.end_date).toLocaleDateString() : '—'}
            />
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Shop" />
            <div className="mt-4">
              {invitation.shop ? (
                <Link
                  to={`/shops/${invitation.shop.id}`}
                  className="text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  {invitation.shop.shop_name}
                </Link>
              ) : (
                <p className="text-sm text-gray-500">Shop not found</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Design" />
            <div className="mt-4 space-y-2">
              {invitation.design ? (
                <>
                  <div>
                    <p className="text-xs text-gray-500">Design Name</p>
                    <Link
                      to={`/designs/${invitation.design.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {invitation.design.design_name}
                    </Link>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Design Code</p>
                    <p className="font-mono text-sm text-gray-900">{invitation.design.design_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Production URL</p>
                    <a
                      href={invitation.design.production_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {invitation.design.production_url}
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Design not found</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, mono }: { icon: typeof Mail; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className={`text-sm text-gray-900 break-words ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

