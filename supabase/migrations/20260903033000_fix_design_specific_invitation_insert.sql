/*
  The deployed design tables use fixed suffix columns (for example slug_01),
  rather than the generic columns assumed by the initial dashboard migration.
  This replaces create_invitation with fixed allow-listed suffix routing.
*/
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_design_id uuid,
  p_slug text,
  p_content jsonb,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_status text DEFAULT 'draft'
)
RETURNS public.invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d public.designs;
  inv public.invitations;
  sid uuid;
  code text;
  final_slug text;
  target text;
  suffix text;
  public_link text;
  detail_start timestamptz;
  detail_end timestamptz;
  detail_status text;
  wedding_at timestamptz;
BEGIN
  PERFORM public.require_active_actor();

  SELECT shop_id INTO sid FROM public.admin_profiles WHERE user_id = auth.uid();
  IF public.is_admin() THEN sid := NULLIF(p_content->>'shop_id', '')::uuid; END IF;
  IF sid IS NULL THEN RAISE EXCEPTION 'A shop is required'; END IF;

  SELECT * INTO d FROM public.designs WHERE id = p_design_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Design is not active'; END IF;
  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.shop_design_assignments
    WHERE shop_id = sid AND design_id = p_design_id AND status = 'assigned'
  ) THEN RAISE EXCEPTION 'Design is not assigned to this shop'; END IF;

  target := CASE d.design_code
    WHEN 'design_01' THEN 'design_01_invitations'
    WHEN 'design_02' THEN 'design_02_invitations'
    WHEN 'design_03' THEN 'design_03_invitations'
    WHEN 'design_04' THEN 'design_04_invitations'
    WHEN 'design_05' THEN 'design_05_invitations'
    ELSE NULL
  END;
  suffix := right(d.design_code, 2);
  IF target IS NULL THEN RAISE EXCEPTION 'Unsupported design code'; END IF;

  final_slug := lower(regexp_replace(
    coalesce(nullif(trim(p_slug), ''), concat_ws('-', p_content->>'groom_name', p_content->>'bride_name')),
    '[^a-zA-Z0-9]+', '-', 'g'
  ));
  final_slug := trim(both '-' from final_slug);
  IF final_slug = '' OR final_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Invalid slug'; END IF;

  detail_start := coalesce(p_start_date, now());
  detail_end := coalesce(p_end_date, detail_start + interval '365 days');
  IF detail_end <= detail_start THEN RAISE EXCEPTION 'Invitation end time must be after the start time'; END IF;
  wedding_at := nullif(p_content->>'wedding_date', '')::timestamptz;
  detail_status := CASE WHEN p_status = 'active' THEN 'published' ELSE 'draft' END;
  code := 'ZAR-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  public_link := rtrim(d.production_url, '/') || '/' || final_slug;
  p_content := jsonb_set(p_content, '{qr_url}', to_jsonb(public_link));

  INSERT INTO public.invitations (
    shop_id, design_id, groom_name, bride_name, slug, invitation_code,
    public_url, start_date, end_date, status, created_by, updated_by
  ) VALUES (
    sid, p_design_id, p_content->>'groom_name', p_content->>'bride_name', final_slug, code,
    public_link, p_start_date, p_end_date,
    CASE WHEN p_status IN ('draft', 'active') THEN p_status ELSE 'draft' END,
    auth.uid(), auth.uid()
  ) RETURNING * INTO inv;

  EXECUTE format(
    'INSERT INTO public.%1$I (
      central_invitation_id, invitation_data, public_url, start_date, end_date,
      slug_%2$s, invitation_code_%2$s, status_%2$s, active_from_%2$s, active_until_%2$s,
      groom_name_%2$s, bride_name_%2$s, groom_photo_url_%2$s, bride_photo_url_%2$s,
      parents_%2$s, education_%2$s, occupation_%2$s, relatives_%2$s,
      venue_name_%2$s, venue_address_%2$s, venue_city_%2$s, venue_maps_url_%2$s, venue_image_url_%2$s,
      events_%2$s, couple_photos_%2$s, memories_gallery_%2$s, social_links_%2$s,
      qr_center_text_%2$s, created_by_%2$s, updated_by_%2$s, wedding_date_%2$s, music_enabled_%2$s
    ) VALUES (
      $1,$2,$3,$4,$5, $6,$7,$8,$9,$10, $11,$12,$13,$14, $15,$16,$17,$18,
      $19,$20,$21,$22,$23, $24,$25,$26,$27, $28,$29,$30,$31,$32
    )',
    target, suffix
  ) USING
    inv.id, p_content, public_link, p_start_date, p_end_date,
    final_slug, code, detail_status, detail_start, detail_end,
    coalesce(p_content->>'groom_name', ''), coalesce(p_content->>'bride_name', ''),
    nullif(p_content->>'groom_photo_url', ''), nullif(p_content->>'bride_photo_url', ''),
    jsonb_build_object('groom', coalesce(p_content->>'groom_parents', ''), 'bride', coalesce(p_content->>'bride_parents', '')),
    concat_ws(' | ', nullif(p_content->>'groom_qualification', ''), nullif(p_content->>'bride_qualification', '')),
    concat_ws(' | ', nullif(p_content->>'groom_occupation', ''), nullif(p_content->>'bride_occupation', '')),
    jsonb_build_object('text', coalesce(p_content->>'relatives', '')),
    coalesce(nullif(p_content->>'venue_name', ''), ''),
    coalesce(nullif(p_content->>'venue_address', ''), ''),
    coalesce(nullif(p_content->>'city', ''), ''),
    coalesce(nullif(p_content->>'maps_url', ''), ''), nullif(p_content->>'venue_image_url', ''),
    coalesce(p_content->'events', '[]'::jsonb),
    jsonb_build_array(nullif(p_content->>'groom_photo_url', ''), nullif(p_content->>'bride_photo_url', '')),
    coalesce(p_content->'gallery', '[]'::jsonb), coalesce(p_content->'social_links', '{}'::jsonb),
    coalesce(nullif(p_content->>'qr_text', ''), 'Groom & Bride Invites'), auth.uid(), auth.uid(), wedding_at,
    coalesce((p_content->>'music_enabled')::boolean, false);

  RETURN inv;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invitation(uuid,text,jsonb,timestamptz,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invitation(uuid,text,jsonb,timestamptz,timestamptz,text) TO authenticated;
