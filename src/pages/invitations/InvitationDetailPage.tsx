import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Users,
  Hash,
  Mail,
  Pencil,
  Save,
  X,
  CheckCircle2,
  Archive,
  FileText,
  Image,
  PartyPopper,
  MessageSquare,
  QrCode,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { getInvitationWithContent, updateInvitation, updateInvitationStatus } from '@/services/invitationService';
import { isSupportedDesignCode } from '@/lib/designMapping';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/States';
import type { Invitation, DesignSpecificInvitation, InvitationStatus, InvitationEvent, GalleryItem, SocialLinks, DesignInvitationContent } from '@/types';

const SOCIAL_KEYS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://twitter.com/...' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@...' },
  { key: 'website', label: 'Website', placeholder: 'https://...' },
];

const uid = () => Math.random().toString(36).slice(2, 10);

export function InvitationDetailPage() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [designContent, setDesignContent] = useState<DesignSpecificInvitation | null>(null);
  const [designCodeSupported, setDesignCodeSupported] = useState(true);

  const [form, setForm] = useState<{
    groom_name: string;
    bride_name: string;
    slug: string;
    invitation_code: string;
    start_date: string;
    end_date: string;
    groom_photo_url: string;
    bride_photo_url: string;
    groom_qualification: string;
    bride_qualification: string;
    groom_occupation: string;
    bride_occupation: string;
    wedding_date: string;
    start_time: string;
    end_time: string;
    invocation: string;
    venue: string;
    qr_text: string;
    events: InvitationEvent[];
    gallery: GalleryItem[];
    socials: SocialLinks;
  }>({
    groom_name: '',
    bride_name: '',
    slug: '',
    invitation_code: '',
    start_date: '',
    end_date: '',
    groom_photo_url: '',
    bride_photo_url: '',
    groom_qualification: '',
    bride_qualification: '',
    groom_occupation: '',
    bride_occupation: '',
    wedding_date: '',
    start_time: '',
    end_time: '',
    invocation: '',
    venue: '',
    qr_text: '',
    events: [],
    gallery: [],
    socials: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const canEdit = isAdmin || (!!profile?.shop_id && invitation?.shop_id === profile.shop_id);

  const hydrateForm = useCallback((inv: Invitation, dc: DesignSpecificInvitation | null) => {
    setForm({
      groom_name: inv.groom_name ?? dc?.groom_name ?? '',
      bride_name: inv.bride_name ?? dc?.bride_name ?? '',
      slug: inv.slug,
      invitation_code: inv.invitation_code,
      start_date: inv.start_date?.slice(0, 10) ?? '',
      end_date: inv.end_date?.slice(0, 10) ?? '',
      groom_photo_url: dc?.groom_photo_url ?? '',
      bride_photo_url: dc?.bride_photo_url ?? '',
      groom_qualification: dc?.groom_qualification ?? '',
      bride_qualification: dc?.bride_qualification ?? '',
      groom_occupation: dc?.groom_occupation ?? '',
      bride_occupation: dc?.bride_occupation ?? '',
      wedding_date: dc?.wedding_date ? new Date(dc.wedding_date).toISOString().slice(0, 10) : '',
      start_time: dc?.start_time ?? '',
      end_time: dc?.end_time ?? '',
      invocation: dc?.invocation ?? '',
      venue: dc?.venue ?? '',
      qr_text: dc?.qr_text ?? '',
      events: (dc?.events as InvitationEvent[] | null)?.map((e, i) => ({ ...e, id: e.id ?? uid() + String(i) })) ?? [],
      gallery: (dc?.gallery as GalleryItem[] | null)?.map((g, i) => ({ ...g, id: g.id ?? uid() + String(i) })) ?? [],
      socials: (dc?.social_links as SocialLinks | null) ?? {},
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!invitationId) return;
    setLoading(true);
    try {
      const result = await getInvitationWithContent(invitationId);
      if (!result) {
        setError('Invitation not found');
        return;
      }
      setInvitation(result.invitation);
      setDesignContent(result.designContent);
      const dcode = result.invitation.design?.design_code;
      setDesignCodeSupported(!dcode || isSupportedDesignCode(dcode));
      hydrateForm(result.invitation, result.designContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  }, [invitationId, hydrateForm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key as string]: '' }));
  };

  const updateSocial = (key: keyof SocialLinks, value: string) => {
    setForm((p) => ({ ...p, socials: { ...p.socials, [key]: value || undefined } }));
  };

  const addEvent = () => updateForm('events', [...form.events, { id: uid(), title: '', date: '', time: '', location: '' }]);
  const removeEvent = (id: string) => updateForm('events', form.events.filter((e) => e.id !== id));
  const updateEvent = (id: string, patch: Partial<InvitationEvent>) =>
    updateForm(
      'events',
      form.events.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );

  const addGallery = () => updateForm('gallery', [...form.gallery, { id: uid(), url: '', caption: '' }]);
  const removeGallery = (id: string) => updateForm('gallery', form.gallery.filter((g) => g.id !== id));
  const updateGallery = (id: string, patch: Partial<GalleryItem>) =>
    updateForm(
      'gallery',
      form.gallery.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.slug.trim()) e.slug = 'Slug is required';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) e.slug = 'Use lowercase letters, numbers, and hyphens only';
    if (!form.invitation_code.trim()) e.invitation_code = 'Invitation code is required';
    if (!form.groom_name.trim() && !form.bride_name.trim())
      e.groom_name = 'At least one name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!invitation || !invitation.design?.design_code) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const content: Partial<DesignInvitationContent> = {
        groom_name: form.groom_name.trim() || null,
        bride_name: form.bride_name.trim() || null,
        groom_photo_url: form.groom_photo_url.trim() || null,
        bride_photo_url: form.bride_photo_url.trim() || null,
        groom_qualification: form.groom_qualification.trim() || null,
        bride_qualification: form.bride_qualification.trim() || null,
        groom_occupation: form.groom_occupation.trim() || null,
        bride_occupation: form.bride_occupation.trim() || null,
        invocation: form.invocation.trim() || null,
        venue: form.venue.trim() || null,
        wedding_date: form.wedding_date || null,
        start_time: form.start_time.trim() || null,
        end_time: form.end_time.trim() || null,
        // Strip client-side list-key IDs before submitting to DB
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        events: form.events.map(({ id: _id, ...rest }) => rest),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        gallery: form.gallery.map(({ id: _id, ...rest }) => rest),
        social_links: Object.fromEntries(
          Object.entries(form.socials).filter(([, v]) => v && v.trim())
        ) as SocialLinks,
        qr_text: form.qr_text.trim() || null,
      };

      await updateInvitation(invitation.id, invitation.design.design_code, {
        slug: form.slug.trim(),
        invitation_code: form.invitation_code.trim(),
        groom_name: form.groom_name.trim() || null,
        bride_name: form.bride_name.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        content,
      });

      toast('Invitation saved successfully.', 'success');
      setEditing(false);
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save invitation';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: InvitationStatus) => {
    if (!invitation) return;
    setSaving(true);
    try {
      await updateInvitationStatus(invitation.id, invitation, newStatus);
      toast(`Invitation status updated to ${newStatus}.`, 'success');
      await loadData();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Loading invitation..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/invitations')} />;
  if (!invitation) return <ErrorState message="Invitation not found" />;

  const coupleName = [invitation.groom_name, invitation.bride_name].filter(Boolean).join(' & ') || 'Unnamed invitation';
  const designCode = invitation.design?.design_code ?? '';
  const currentStatus = invitation.status;

  return (
    <div>
      <div className="mb-4">
        <Link to="/invitations" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to invitations
        </Link>
      </div>

      <PageHeader
        title={coupleName}
        description={`Code: ${invitation.invitation_code}`}
        action={
          canEdit &&
          designCodeSupported && (
            editing ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditing(false); hydrateForm(invitation, designContent); }}>
                  <X className="h-4 w-4" />
                  Discard
                </Button>
                <Button onClick={() => (document.getElementById('inv-edit-form') as HTMLFormElement | null)?.requestSubmit()} loading={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit Invitation
              </Button>
            )
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={currentStatus} />
        <span className="text-sm text-gray-400">Created {new Date(invitation.created_at).toLocaleDateString()}</span>
        {!designCodeSupported && (
          <Badge variant="warning">
            <AlertTriangle className="mr-1 inline h-3 w-3" /> Design code not editable ({designCode})
          </Badge>
        )}
      </div>

      {/* Status Actions (Always visible) */}
      {canEdit && designCodeSupported && (
        <Card className="mb-4">
          <CardHeader title="Status Actions" subtitle="Control the invitation lifecycle." />
          <div className="mt-4 flex flex-wrap gap-2">
            {currentStatus !== 'active' && (
              <Button variant="primary" onClick={() => handleStatusChange('active')} loading={saving}>
                <CheckCircle2 className="h-4 w-4" />
                Publish
              </Button>
            )}
            {currentStatus !== 'draft' && (
              <Button variant="outline" onClick={() => handleStatusChange('draft')} loading={saving}>
                <FileText className="h-4 w-4" />
                Save as Draft
              </Button>
            )}
            {currentStatus !== 'archived' && currentStatus !== 'expired' && (
              <Button variant="danger" onClick={() => handleStatusChange('archived')} loading={saving}>
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
        </Card>
      )}

      <form id="inv-edit-form" onSubmit={handleSave}>
        {/* Identity & Meta */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Invitation Details" />
            <div className="mt-4 space-y-4">
              <DetailRow icon={Users} label="Couple" value={editing ? (
                <div className="space-y-2 w-full">
                  <Input label="Groom Name" value={form.groom_name} onChange={(e) => updateForm('groom_name', e.target.value)} error={errors.groom_name} />
                  <Input label="Bride Name" value={form.bride_name} onChange={(e) => updateForm('bride_name', e.target.value)} />
                </div>
              ) : coupleName} />
              <DetailRow icon={Hash} label="Slug" mono value={editing ? (
                <Input className="w-full" value={form.slug} onChange={(e) => updateForm('slug', e.target.value.toLowerCase())} error={errors.slug} />
              ) : invitation.slug} />
              <DetailRow icon={Hash} label="Invitation Code" mono value={invitation.invitation_code} />
              <DetailRow
                icon={Calendar}
                label="Start Date"
                value={editing ? <Input type="date" className="w-full" value={form.start_date} onChange={(e) => updateForm('start_date', e.target.value)} /> : (invitation.start_date ? new Date(invitation.start_date).toLocaleDateString() : '—')}
              />
              <DetailRow
                icon={Calendar}
                label="End Date"
                value={editing ? <Input type="date" className="w-full" value={form.end_date} onChange={(e) => updateForm('end_date', e.target.value)} /> : (invitation.end_date ? new Date(invitation.end_date).toLocaleDateString() : '—')}
              />
              <DetailRow
                icon={Calendar}
                label="Wedding Date"
                value={editing ? <Input type="date" className="w-full" value={form.wedding_date} onChange={(e) => updateForm('wedding_date', e.target.value)} /> : (designContent?.wedding_date ? new Date(designContent.wedding_date).toLocaleDateString() : '—')}
              />
              <DetailRow
                label="Start / End Time"
                value={editing ? (
                  <div className="grid w-full grid-cols-2 gap-2">
                    <Input type="time" value={form.start_time} onChange={(e) => updateForm('start_time', e.target.value)} />
                    <Input type="time" value={form.end_time} onChange={(e) => updateForm('end_time', e.target.value)} />
                  </div>
                ) : (
                  <span>{[designContent?.start_time, designContent?.end_time].filter(Boolean).join(' — ') || '—'}</span>
                )}
              />
            </div>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Shop" />
              <div className="mt-4">
                {invitation.shop ? (
                  isAdmin ? (
                    <Link
                      to={`/shops/${invitation.shop.id}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {invitation.shop.shop_name}
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-900">{invitation.shop.shop_name}</p>
                  )
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

        {/* Editable content sections (only when editing + design supported) */}
        {editing && designCodeSupported && (
          <>
            <Card className="mt-4">
              <CardHeader title="Couple Details" subtitle="Photos, qualification, occupation." icon={Users} />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-4 rounded-lg border border-brand-100 bg-brand-50/30 p-4">
                  <h4 className="text-sm font-semibold text-brand-700">Groom</h4>
                  <Input label="Photo URL" icon={Image} value={form.groom_photo_url} onChange={(e) => updateForm('groom_photo_url', e.target.value)} />
                  <Input label="Qualification" value={form.groom_qualification} onChange={(e) => updateForm('groom_qualification', e.target.value)} />
                  <Input label="Occupation" value={form.groom_occupation} onChange={(e) => updateForm('groom_occupation', e.target.value)} />
                </div>
                <div className="space-y-4 rounded-lg border border-pink-100 bg-pink-50/30 p-4">
                  <h4 className="text-sm font-semibold text-pink-700">Bride</h4>
                  <Input label="Photo URL" icon={Image} value={form.bride_photo_url} onChange={(e) => updateForm('bride_photo_url', e.target.value)} />
                  <Input label="Qualification" value={form.bride_qualification} onChange={(e) => updateForm('bride_qualification', e.target.value)} />
                  <Input label="Occupation" value={form.bride_occupation} onChange={(e) => updateForm('bride_occupation', e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="mt-4">
              <CardHeader title="Invitation Text & Venue" />
              <div className="mt-4 space-y-4">
                <Textarea label="Invocation / Blessing" rows={4} value={form.invocation} onChange={(e) => updateForm('invocation', e.target.value)} />
                <Input label="Venue" value={form.venue} onChange={(e) => updateForm('venue', e.target.value)} />
                <div>
                  <label className="label-base flex items-center gap-1.5"><QrCode className="h-4 w-4 text-gray-400" /> QR Text / RSVP Link</label>
                  <Textarea rows={2} value={form.qr_text} onChange={(e) => updateForm('qr_text', e.target.value)} />
                </div>
              </div>
            </Card>

            <Card className="mt-4">
              <CardHeader
                title="Events"
                icon={PartyPopper}
                action={<Button size="sm" variant="outline" type="button" onClick={addEvent}><Plus className="h-4 w-4" /> Add Event</Button>}
              />
              <div className="mt-4 space-y-3">
                {form.events.length === 0 ? (
                  <p className="text-sm text-gray-500">No events added yet.</p>
                ) : (
                  form.events.map((ev, idx) => (
                    <div key={ev.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h5 className="text-xs font-semibold text-gray-500">Event #{idx + 1}</h5>
                        <button type="button" onClick={() => removeEvent(ev.id!)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-error-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input label="Title" value={ev.title} onChange={(e) => updateEvent(ev.id!, { title: e.target.value })} />
                        <Input label="Location" value={ev.location || ''} onChange={(e) => updateEvent(ev.id!, { location: e.target.value })} />
                        <Input label="Date" type="date" value={ev.date || ''} onChange={(e) => updateEvent(ev.id!, { date: e.target.value })} />
                        <Input label="Time" type="time" value={ev.time || ''} onChange={(e) => updateEvent(ev.id!, { time: e.target.value })} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="mt-4">
              <CardHeader
                title="Gallery"
                icon={Image}
                action={<Button size="sm" variant="outline" type="button" onClick={addGallery}><Plus className="h-4 w-4" /> Add Photo</Button>}
              />
              <div className="mt-4 space-y-3">
                {form.gallery.length === 0 ? (
                  <p className="text-sm text-gray-500">No gallery photos added yet.</p>
                ) : (
                  form.gallery.map((g, idx) => (
                    <div key={g.id} className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500">Photo #{idx + 1}</p>
                        <Input icon={Image} placeholder="Public photo URL" value={g.url} onChange={(e) => updateGallery(g.id!, { url: e.target.value })} />
                        <Input placeholder="Caption (optional)" value={g.caption || ''} onChange={(e) => updateGallery(g.id!, { caption: e.target.value })} />
                      </div>
                      <button type="button" onClick={() => removeGallery(g.id!)} className="self-start rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-error-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="mt-4">
              <CardHeader title="Social Links" icon={MessageSquare} />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {SOCIAL_KEYS.map((s) => (
                  <Input
                    key={s.key}
                    label={s.label}
                    value={form.socials[s.key] || ''}
                    onChange={(e) => updateSocial(s.key, e.target.value)}
                    placeholder={s.placeholder}
                  />
                ))}
              </div>
            </Card>
          </>
        )}
      </form>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: typeof Mail;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  const isNode = typeof value === 'object' && value !== null;
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        {isNode ? (
          <div className={`${mono ? 'font-mono' : ''} text-sm text-gray-900`}>{value}</div>
        ) : (
          <p className={`text-sm text-gray-900 break-words ${mono ? 'font-mono' : ''}`}>{String(value ?? '—')}</p>
        )}
      </div>
    </div>
  );
}
