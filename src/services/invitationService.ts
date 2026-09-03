import { supabase } from '@/lib/supabase';
import { resolveDesignTarget } from '@/lib/designMapping';
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
  return { invitation, designContent: designContent as DesignSpecificInvitation };
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
      designContent: (designData as DesignSpecificInvitation) ?? null,
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
  const target = resolveDesignTarget(designCode);

  const { error: centralError } = await supabase
    .from('invitations')
    .update({
      ...(input.slug !== undefined && { slug: input.slug }),
      ...(input.invitation_code !== undefined && { invitation_code: input.invitation_code }),
      ...(input.groom_name !== undefined && { groom_name: input.groom_name }),
      ...(input.bride_name !== undefined && { bride_name: input.bride_name }),
      ...(input.start_date !== undefined && { start_date: input.start_date }),
      ...(input.end_date !== undefined && { end_date: input.end_date }),
      ...(input.status !== undefined && { status: input.status }),
    })
    .eq('id', invitationId);

  if (centralError) throw new Error(centralError.message);

  const content = input.content ?? {};
  const hasContent = Object.keys(content).length > 0;
  const hasIdentifiers = input.slug !== undefined || input.invitation_code !== undefined;

  if (hasContent || hasIdentifiers) {
    const designPatch: Record<string, unknown> = {};

    if (input.slug !== undefined) designPatch.slug = input.slug;
    if (input.invitation_code !== undefined) designPatch.invitation_code = input.invitation_code;

    if (content.groom_name !== undefined) designPatch.groom_name = content.groom_name;
    if (content.bride_name !== undefined) designPatch.bride_name = content.bride_name;
    if (content.groom_photo_url !== undefined) designPatch.groom_photo_url = content.groom_photo_url;
    if (content.bride_photo_url !== undefined) designPatch.bride_photo_url = content.bride_photo_url;
    if (content.groom_qualification !== undefined) designPatch.groom_qualification = content.groom_qualification;
    if (content.bride_qualification !== undefined) designPatch.bride_qualification = content.bride_qualification;
    if (content.groom_occupation !== undefined) designPatch.groom_occupation = content.groom_occupation;
    if (content.bride_occupation !== undefined) designPatch.bride_occupation = content.bride_occupation;
    if (content.invocation !== undefined) designPatch.invocation = content.invocation;
    if (content.venue !== undefined) designPatch.venue = content.venue;
    if (content.wedding_date !== undefined) designPatch.wedding_date = content.wedding_date;
    if (content.start_time !== undefined) designPatch.start_time = content.start_time;
    if (content.end_time !== undefined) designPatch.end_time = content.end_time;
    if (content.events !== undefined) designPatch.events = content.events;
    if (content.gallery !== undefined) designPatch.gallery = content.gallery;
    if (content.social_links !== undefined) designPatch.social_links = content.social_links;
    if (content.qr_text !== undefined) designPatch.qr_text = content.qr_text;

    const { error: designError } = await supabase
      .from(target.table)
      .update(designPatch)
      .eq('central_invitation_id', invitationId);

    if (designError) throw new Error(designError.message);
  }

}

export async function updateInvitationStatus(
  invitationId: string,
  invitation: Invitation,
  newStatus: import('@/types').InvitationStatus
): Promise<void> {
  const designCode = invitation.design?.design_code ?? '';
  await updateInvitation(invitationId, designCode, { status: newStatus });
}
