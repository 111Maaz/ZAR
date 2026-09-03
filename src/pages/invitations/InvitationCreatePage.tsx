import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, X, Calendar, Users, Link2, Image, PartyPopper, MessageSquare, QrCode, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isSupportedDesignCode } from '@/lib/designMapping';
import { createInvitation } from '@/services/invitationService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import type {
  Shop,
  Design,
  InvitationStatus,
  InvitationEvent,
  GalleryItem,
  SocialLinks,
  DesignInvitationContent,
} from '@/types';

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
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function InvitationCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const ownerShopId = profile?.shop_id ?? null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [shops, setShops] = useState<Shop[]>([]);
  const [allDesigns, setAllDesigns] = useState<Design[]>([]);

  const [form, setForm] = useState<{
    shop_id: string;
    design_id: string;
    slug: string;
    invitation_code: string;
    start_date: string;
    end_date: string;
    status: InvitationStatus;
    groom_name: string;
    bride_name: string;
    groom_photo_url: string;
    bride_photo_url: string;
    groom_qualification: string;
    bride_qualification: string;
    groom_occupation: string;
    bride_occupation: string;
    groom_parents: string;
    bride_parents: string;
    relatives: string;
    wedding_date: string;
    start_time: string;
    end_time: string;
    invocation: string;
    venue: string;
    venue_name: string;
    venue_address: string;
    city: string;
    maps_url: string;
    venue_image_url: string;
    music_url: string;
    music_enabled: boolean;
    qr_text: string;
    events: InvitationEvent[];
    gallery: GalleryItem[];
    socials: SocialLinks;
  }>({
    shop_id: ownerShopId ?? '',
    design_id: '',
    slug: '',
    invitation_code: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    groom_name: '',
    bride_name: '',
    groom_photo_url: '',
    bride_photo_url: '',
    groom_qualification: '',
    bride_qualification: '',
    groom_occupation: '',
    bride_occupation: '',
    groom_parents: '',
    bride_parents: '',
    relatives: '',
    wedding_date: '',
    start_time: '',
    end_time: '',
    invocation: '',
    venue: '',
    venue_name: '',
    venue_address: '',
    city: '',
    maps_url: '',
    venue_image_url: '',
    music_url: '',
    music_enabled: false,
    qr_text: '',
    events: [],
    gallery: [],
    socials: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugCustomized, setSlugCustomized] = useState(false);

  useEffect(() => {
    if (!slugCustomized) setForm((current) => ({ ...current, slug: slugify(`${current.groom_name} ${current.bride_name}`) }));
  }, [form.groom_name, form.bride_name, slugCustomized]);

  useEffect(() => {
    async function loadRefs() {
      try {
        const shopsPromise = isAdmin
          ? supabase.from('shops').select('id, shop_name, status').eq('status', 'active').order('shop_name')
          : ownerShopId
          ? supabase.from('shops').select('id, shop_name, status').eq('id', ownerShopId).limit(1)
          : Promise.resolve({ data: [], error: null });

        const designsPromise = isAdmin
          ? supabase.from('designs').select('id, design_code, design_name, status').eq('status', 'active').order('design_code')
          : ownerShopId
          ? supabase
              .from('designs')
              .select('id, design_code, design_name, status, shop_design_assignments!inner(shop_id, status)')
              .eq('shop_design_assignments.shop_id', ownerShopId)
              .eq('shop_design_assignments.status', 'assigned')
              .eq('status', 'active')
              .order('design_code')
          : Promise.resolve({ data: [], error: null });

        const [shopsRes, designsRes] = await Promise.all([shopsPromise, designsPromise]);
        if (shopsRes.error) throw shopsRes.error;
        if (designsRes.error) throw designsRes.error;

        setShops((shopsRes.data as Shop[]) ?? []);
        setAllDesigns((designsRes.data as Design[]) ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load references');
      } finally {
        setLoading(false);
      }
    }
    loadRefs();
  }, [isAdmin, ownerShopId]);

  const assignedDesigns = useMemo(() => {
    if (isAdmin) return allDesigns;
    return allDesigns.filter((d) => {
      const row = d as Design & { shop_design_assignments?: unknown[] };
      return !Array.isArray(row.shop_design_assignments) || row.shop_design_assignments.length > 0;
    });
  }, [allDesigns, isAdmin]);

  const selectedDesign = useMemo(() => allDesigns.find((d) => d.id === form.design_id) ?? null, [allDesigns, form.design_id]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key as string]: '' }));
  };

  const updateSocial = (key: keyof SocialLinks, value: string) => {
    setForm((p) => ({ ...p, socials: { ...p.socials, [key]: value || undefined } }));
  };

  const addEvent = () => update('events', [...form.events, { id: uid(), title: '', date: '', time: '', location: '' }]);
  const removeEvent = (id: string) => update('events', form.events.filter((e) => e.id !== id));
  const updateEvent = (id: string, patch: Partial<InvitationEvent>) =>
    update(
      'events',
      form.events.map((e) => (e.id === id ? { ...e, ...patch } : e))
    );

  const addGallery = () => update('gallery', [...form.gallery, { id: uid(), url: '', caption: '' }]);
  const removeGallery = (id: string) => update('gallery', form.gallery.filter((g) => g.id !== id));
  const updateGallery = (id: string, patch: Partial<GalleryItem>) =>
    update(
      'gallery',
      form.gallery.map((g) => (g.id === id ? { ...g, ...patch } : g))
    );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.shop_id) e.shop_id = 'Shop is required';
    if (!form.design_id) e.design_id = 'Design is required';
    else if (selectedDesign && !isSupportedDesignCode(selectedDesign.design_code))
      e.design_id = `Design code "${selectedDesign.design_code}" is not in the supported mapping (design_01..design_05).`;
    if (!form.slug.trim()) e.slug = 'Slug is required';
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) e.slug = 'Use lowercase letters, numbers, and hyphens only';
    if (!form.groom_name.trim() && !form.bride_name.trim())
      e.groom_name = 'At least one of groom name or bride name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!selectedDesign || !validate()) return;
    setSubmitting(true);
    try {
      const content: DesignInvitationContent = {
        groom_name: form.groom_name.trim() || null,
        bride_name: form.bride_name.trim() || null,
        groom_photo_url: form.groom_photo_url.trim() || null,
        bride_photo_url: form.bride_photo_url.trim() || null,
        groom_qualification: form.groom_qualification.trim() || null,
        bride_qualification: form.bride_qualification.trim() || null,
        groom_occupation: form.groom_occupation.trim() || null,
        bride_occupation: form.bride_occupation.trim() || null,
        groom_parents: form.groom_parents.trim() || null,
        bride_parents: form.bride_parents.trim() || null,
        relatives: form.relatives.trim() || null,
        invocation: form.invocation.trim() || null,
        venue: form.venue.trim() || null,
        venue_name: form.venue_name.trim() || null,
        venue_address: form.venue_address.trim() || null,
        city: form.city.trim() || null,
        maps_url: form.maps_url.trim() || null,
        venue_image_url: form.venue_image_url.trim() || null,
        music_url: form.music_url.trim() || null,
        music_enabled: form.music_enabled,
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

      const result = await createInvitation({
        shop_id: form.shop_id,
        design_id: form.design_id,
        design_code: selectedDesign.design_code,
        slug: form.slug.trim(),
        groom_name: form.groom_name.trim() || null,
        bride_name: form.bride_name.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        content,
      });

      toast('Invitation created successfully.', 'success');
      navigate(`/invitations/${result.invitation.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create invitation';
      if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('slug') || msg.includes('invitation_code')) {
        if (msg.toLowerCase().includes('slug')) setErrors((p) => ({ ...p, slug: 'This slug is already in use' }));
        else setErrors((p) => ({ ...p, invitation_code: 'This invitation code already exists' }));
      } else {
        toast(msg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading invitation creator..." />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/invitations')} />;

  if (!ownerShopId && !isAdmin) {
    return (
      <div>
        <div className="mb-4">
          <Link to="/invitations" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" />
            Back to invitations
          </Link>
        </div>
        <EmptyState title="Cannot create invitation" description="Your account is not linked to a shop. Contact an administrator." />
      </div>
    );
  }

  if (assignedDesigns.length === 0) {
    return (
      <div>
        <div className="mb-4">
          <Link to="/invitations" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
            <ArrowLeft className="h-4 w-4" />
            Back to invitations
          </Link>
        </div>
        <EmptyState
          title="No designs available"
          description={
            isAdmin
              ? 'There are no active designs. Create at least one design first, then assign it to a shop.'
              : 'No designs have been assigned to your shop yet. Contact an administrator.'
          }
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/invitations" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-4 w-4" />
          Back to invitations
        </Link>
      </div>

      <PageHeader
        title="Create Invitation"
        description="Fill out the invitation details below. All content is saved to both the central registry and the design-specific table."
      />

      <form onSubmit={handleSubmit}>
        {/* Identity & Routing */}
        <Card className="mb-4">
          <CardHeader
            title="Identity & Routing"
            subtitle="Choose the shop (admin only), design, and identity fields that appear across both tables."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {isAdmin ? (
              <div>
                <label className="label-base">Shop *</label>
                <select
                  value={form.shop_id}
                  onChange={(e) => update('shop_id', e.target.value)}
                  className="input-base"
                >
                  <option value="">Select a shop...</option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shop_name}
                    </option>
                  ))}
                </select>
                {errors.shop_id && <p className="mt-1 text-xs text-error-600">{errors.shop_id}</p>}
              </div>
            ) : (
              <div>
                <label className="label-base">Shop</label>
                <div className="input-base flex items-center justify-between opacity-80">
                  <span>{shops[0]?.shop_name || 'Your shop'}</span>
                  <Badge variant="neutral">Locked</Badge>
                </div>
              </div>
            )}
            <div>
              <label className="label-base">Design *</label>
              <select
                value={form.design_id}
                onChange={(e) => update('design_id', e.target.value)}
                className="input-base"
              >
                <option value="">Select an assigned design...</option>
                {assignedDesigns.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.design_name} ({d.design_code})
                  </option>
                ))}
              </select>
              {selectedDesign && !isSupportedDesignCode(selectedDesign.design_code) && (
                <p className="mt-1 text-xs text-error-600">
                  Design code "{selectedDesign.design_code}" is not in the supported mapping.
                </p>
              )}
              {errors.design_id && <p className="mt-1 text-xs text-error-600">{errors.design_id}</p>}
            </div>
            <Input
              label="Slug *"
              icon={Link2}
              value={form.slug}
              onChange={(e) => { setSlugCustomized(true); update('slug', e.target.value.toLowerCase()); }}
              error={errors.slug}
              placeholder="e.g. john-and-jane-2026"
              hint="Used in the public invitation URL. Lowercase letters, numbers, hyphens only."
            />
            <div className="input-base flex flex-col justify-center bg-gray-50 text-sm text-gray-600"><span className="font-medium text-gray-700">Invitation code</span><span className="mt-1 text-xs">Generated securely when the invitation is created.</span></div>
            <Input label="Invitation Start" icon={Calendar} type="datetime-local" value={form.start_date} onChange={(e) => update('start_date', e.target.value)} />
            <Input label="Invitation End" icon={Calendar} type="datetime-local" value={form.end_date} onChange={(e) => update('end_date', e.target.value)} />
            <Input label="Wedding Date" icon={Calendar} type="date" value={form.wedding_date} onChange={(e) => update('wedding_date', e.target.value)} />
            <Input label="Start Time" type="time" value={form.start_time} onChange={(e) => update('start_time', e.target.value)} />
            <Input label="End Time" type="time" value={form.end_time} onChange={(e) => update('end_time', e.target.value)} />
            <div>
              <label className="label-base">Initial Status</label>
              <select
                value={form.status}
                onChange={(e) => update('status', e.target.value as InvitationStatus)}
                className="input-base"
              >
                <option value="draft">Draft</option>
                <option value="active">Publish (Active)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Couple Details */}
        <Card className="mb-4">
          <CardHeader title="Couple Details" subtitle="Displayed prominently on the invitation. At least one name required." icon={Users} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-4 rounded-lg border border-brand-100 bg-brand-50/30 p-4">
              <h4 className="text-sm font-semibold text-brand-700">Groom</h4>
              <Input label="Full Name" value={form.groom_name} onChange={(e) => update('groom_name', e.target.value)} error={errors.groom_name} placeholder="Groom's full name" />
              <Input label="Photo URL" icon={Image} value={form.groom_photo_url} onChange={(e) => update('groom_photo_url', e.target.value)} placeholder="https://..." />
              <Input label="Qualification" value={form.groom_qualification} onChange={(e) => update('groom_qualification', e.target.value)} placeholder="e.g. B.Tech, MBA" />
              <Input label="Occupation" value={form.groom_occupation} onChange={(e) => update('groom_occupation', e.target.value)} placeholder="e.g. Software Engineer" />
              <Input label="Parents" value={form.groom_parents} onChange={(e) => update('groom_parents', e.target.value)} placeholder="Parents' names" />
            </div>
            <div className="space-y-4 rounded-lg border border-pink-100 bg-pink-50/30 p-4">
              <h4 className="text-sm font-semibold text-pink-700">Bride</h4>
              <Input label="Full Name" value={form.bride_name} onChange={(e) => update('bride_name', e.target.value)} placeholder="Bride's full name" />
              <Input label="Photo URL" icon={Image} value={form.bride_photo_url} onChange={(e) => update('bride_photo_url', e.target.value)} placeholder="https://..." />
              <Input label="Qualification" value={form.bride_qualification} onChange={(e) => update('bride_qualification', e.target.value)} placeholder="e.g. MBBS, PhD" />
              <Input label="Occupation" value={form.bride_occupation} onChange={(e) => update('bride_occupation', e.target.value)} placeholder="e.g. Doctor" />
              <Input label="Parents" value={form.bride_parents} onChange={(e) => update('bride_parents', e.target.value)} placeholder="Parents' names" />
            </div>
          </div>
        </Card>

        {/* Invitation Text & Venue */}
        <Card className="mb-4">
          <CardHeader title="Invitation Text & Venue" subtitle="Main content and venue details." />
          <div className="mt-4 space-y-4">
            <Textarea label="Invocation / Blessing" value={form.invocation} onChange={(e) => update('invocation', e.target.value)} rows={4} placeholder="With the blessings of..." />
            <Textarea label="Relatives" value={form.relatives} onChange={(e) => update('relatives', e.target.value)} rows={2} placeholder="Relatives and family acknowledgements" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Venue Name" value={form.venue_name} onChange={(e) => update('venue_name', e.target.value)} placeholder="Venue name" />
              <Input label="Venue Image URL" value={form.venue_image_url} onChange={(e) => update('venue_image_url', e.target.value)} placeholder="https://..." />
              <Input label="Venue Address" value={form.venue_address} onChange={(e) => update('venue_address', e.target.value)} placeholder="Full venue address" />
              <Input label="City" value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="City" />
              <Input label="Maps URL" value={form.maps_url} onChange={(e) => update('maps_url', e.target.value)} placeholder="https://maps..." />
              <Input label="Music URL" value={form.music_url} onChange={(e) => update('music_url', e.target.value)} placeholder="https://..." />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.music_enabled} onChange={(e) => update('music_enabled', e.target.checked)} /> Enable invitation music</label>
            <Input label="Legacy / Full Venue Text" value={form.venue} onChange={(e) => update('venue', e.target.value)} placeholder="Optional design-specific venue text" />
            <div>
              <label className="label-base flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-gray-400" /> QR Text / RSVP Link
              </label>
              <Textarea value={form.qr_text} onChange={(e) => update('qr_text', e.target.value)} rows={2} placeholder="Text encoded in the QR code, e.g. an RSVP URL." />
            </div>
          </div>
        </Card>

        {/* Events */}
        <Card className="mb-4">
          <CardHeader
            title="Events"
            subtitle="Add related events (Mehndi, Sangeet, Reception, etc.)."
            icon={PartyPopper}
            action={
              <Button size="sm" variant="outline" type="button" onClick={addEvent}>
                <Plus className="h-4 w-4" />
                Add Event
              </Button>
            }
          />
          <div className="mt-4 space-y-3">
            {form.events.length === 0 ? (
              <EmptyState compact title="No events yet" description="Add ceremony and reception events as needed." />
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
                    <Input label="Title" value={ev.title} onChange={(e) => updateEvent(ev.id!, { title: e.target.value })} placeholder="e.g. Reception" />
                    <Input label="Location" value={ev.location || ''} onChange={(e) => updateEvent(ev.id!, { location: e.target.value })} placeholder="Venue name" />
                    <Input label="Date" type="date" value={ev.date || ''} onChange={(e) => updateEvent(ev.id!, { date: e.target.value })} />
                    <Input label="Time" type="time" value={ev.time || ''} onChange={(e) => updateEvent(ev.id!, { time: e.target.value })} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Gallery */}
        <Card className="mb-4">
          <CardHeader
            title="Gallery"
            subtitle="Couple photos to display on the invitation."
            icon={Image}
            action={
              <Button size="sm" variant="outline" type="button" onClick={addGallery}>
                <Plus className="h-4 w-4" />
                Add Photo
              </Button>
            }
          />
          <div className="mt-4 space-y-3">
            {form.gallery.length === 0 ? (
              <EmptyState compact title="No photos yet" description="Upload to your storage provider and paste the public URLs here." />
            ) : (
              form.gallery.map((g, idx) => (
                <div key={g.id} className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500">Photo #{idx + 1}</p>
                    <Input placeholder="Public photo URL (https://...)" icon={Image} value={g.url} onChange={(e) => updateGallery(g.id!, { url: e.target.value })} />
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

        {/* Social Links */}
        <Card className="mb-4">
          <CardHeader title="Social Links & Hashtags" subtitle="Link social profiles or provide a hashtag the guests can use." icon={MessageSquare} />
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

        {/* Summary & Submit */}
        <Card className="mb-6">
          <CardHeader title="Submission Summary" icon={CheckCircle2} subtitle="Double-check before creating. The central row and design-specific row will be created together atomically." />
          <div className="mt-4 grid gap-2 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-2">
            <SummaryRow label="Shop" value={shops.find((s) => s.id === form.shop_id)?.shop_name || '(not selected)'} />
            <SummaryRow label="Design" value={selectedDesign ? `${selectedDesign.design_name} (${selectedDesign.design_code})` : '(not selected)'} />
            <SummaryRow label="Slug" mono value={form.slug || '(empty)'} />
            <SummaryRow label="Code" mono value={form.invitation_code || '(empty)'} />
            <SummaryRow label="Status" value={<StatusBadge status={form.status} />} />
            <SummaryRow label="Events" value={`${form.events.length} event(s)`} />
            <SummaryRow label="Gallery" value={`${form.gallery.length} photo(s)`} />
            <SummaryRow label="Socials" value={`${Object.values(form.socials).filter(Boolean).length} link(s)`} />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link to="/invitations">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={submitting}>
            {submitting ? 'Creating...' : 'Create Invitation'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-right text-gray-900 ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}
