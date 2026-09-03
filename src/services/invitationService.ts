import { supabase } from '@/lib/supabase';
import { isSupportedDesignCode, resolveDesignTarget } from '@/lib/designMapping';
import type {
  CreateInvitationInput,
  UpdateInvitationInput,
  Invitation,
  DesignSpecificInvitation,
} from '@/types';

export interface InvitationWithContent {
  invitation: Invitation;
  designContent: DesignSpecificInvitation | null;
}

// Older design tables have suffixed columns (for example `events_01`), while
// the shared creation/update RPCs persist the complete design payload in
// `invitation_data`. Normalize that payload here so every design gets the same
// edit experience without letting a client choose a table or suffix.
function normalizeDesignContent(row: unknown): DesignSpecificInvitation | null {
  if (!row || typeof row !== 'object') return null;

  const raw = row as Record<string, unknown>;
  const payload = (
    raw.invitation_data && typeof raw.invitation_data === 'object'
      ? raw.invitation_data
      : {}
  ) as Record<string, unknown>;

  return {
    ...raw,
    invitation_data: payload,
    groom_name: payload.groom_name ?? raw.groom_name,
    bride_name: payload.bride_name ?? raw.bride_name,
    groom_photo_url: payload.groom_photo_url ?? raw.groom_photo_url,
    bride_photo_url: payload.bride_photo_url ?? raw.bride_photo_url,
    groom_qualification: payload.groom_qualification ?? raw.groom_qualification,
    bride_qualification: payload.bride_qualification ?? raw.bride_qualification,
    groom_occupation: payload.groom_occupation ?? raw.groom_occupation,
    bride_occupation: payload.bride_occupation ?? raw.bride_occupation,
    invocation: payload.invocation ?? raw.invocation,
    venue: payload.venue ?? raw.venue,
    wedding_date: payload.wedding_date ?? raw.wedding_date,
    start_time: payload.start_time ?? raw.start_time,
    end_time: payload.end_time ?? raw.end_time,
    events: payload.events ?? raw.events,
    gallery: payload.gallery ?? raw.gallery,
    social_links: payload.social_links ?? raw.social_links,
    qr_text: payload.qr_text ?? raw.qr_text,
  } as unknown as DesignSpecificInvitation;
}

export async function createInvitation(input: CreateInvitationInput): Promise<InvitationWithContent> {
  // Routing, code generation, slug uniqueness, the central row, detail row, and audit
  // record are one SECURITY DEFINER transaction. No browser-selected relation is used.
  const { data, error } = await supabase.rpc('create_invitation', {
    p_design_id: input.design_id,
    p_slug: input.slug || null,
    p_content: { ...input.content, shop_id: input.shop_id },
    p_start_date: input.start_date ?? null,
    p_end_date: input.end_date ?? null,
    p_status: input.status ?? 'draft',
  });
  if (error || !data) throw new Error(error?.message ?? 'Failed to create invitation.');
  const invitation = data as Invitation;
  const target = resolveDesignTarget(input.design_code);
  const { data: designContent, error: detailError } = await supabase
    .from(target.table).select('*').eq('central_invitation_id', invitation.id).single();
  if (detailError) throw new Error(detailError.message);
  return { invitation, designContent: normalizeDesignContent(designContent) };
}

export async function getInvitationWithContent(
  invitationId: string
): Promise<InvitationWithContent | null> {
  const { data: invitationData, error: invitationError } = await supabase
    .from('invitations')
    .select('*, shop:shops(*), design:designs(*)')
    .eq('id', invitationId)
    .maybeSingle();

  if (invitationError) throw new Error(invitationError.message);
  if (!invitationData) return null;

  const invitation = invitationData as Invitation;

  const designCode = invitation.design?.design_code;
  if (!designCode) {
    return { invitation, designContent: null };
  }

  try {
    const target = resolveDesignTarget(designCode);
    const { data: designData } = await supabase
      .from(target.table)
      .select('*')
      .eq('central_invitation_id', invitationId)
      .maybeSingle();

    return {
      invitation,
      designContent: normalizeDesignContent(designData),
    };
  } catch {
    return { invitation, designContent: null };
  }
}

export async function updateInvitation(
  invitationId: string,
  designCode: string,
  input: UpdateInvitationInput
): Promise<void> {
  // The server resolves the fixed design mapping. Clients never name a table or suffix.
  if (!isSupportedDesignCode(designCode)) throw new Error('Unsupported design code.');
  const { error } = await supabase.rpc('update_invitation_content', {
    p_invitation_id: invitationId,
    p_slug: input.slug,
    p_start_date: input.start_date,
    p_end_date: input.end_date,
    // Supabase omits `undefined` RPC arguments. Pass null so PostgREST can
    // resolve the six-argument function when an ordinary edit keeps status.
    p_status: input.status ?? null,
    p_content: input.content ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function updateInvitationStatus(
  invitationId: string,
  invitation: Invitation,
  newStatus: import('@/types').InvitationStatus
): Promise<void> {
  const designCode = invitation.design?.design_code ?? '';
  await updateInvitation(invitationId, designCode, {
    slug: invitation.slug,
    start_date: invitation.start_date,
    end_date: invitation.end_date,
    status: newStatus,
  });
}
