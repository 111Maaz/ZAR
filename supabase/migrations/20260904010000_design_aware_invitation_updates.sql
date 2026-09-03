/* Design-aware edits: the browser supplies no table or suffix. */
CREATE OR REPLACE FUNCTION public.sync_invitation_detail()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE suffix text; target text;
BEGIN
  SELECT right(design_code, 2) INTO suffix FROM public.designs WHERE id = NEW.design_id;
  target := CASE suffix WHEN '01' THEN 'design_01_invitations' WHEN '02' THEN 'design_02_invitations'
    WHEN '03' THEN 'design_03_invitations' WHEN '04' THEN 'design_04_invitations' WHEN '05' THEN 'design_05_invitations' END;
  IF target IS NOT NULL THEN
    EXECUTE format('UPDATE public.%1$I SET slug_%2$s=$1, public_url=$2, start_date=$3, end_date=$4 WHERE central_invitation_id=$5', target, suffix)
      USING NEW.slug, NEW.public_url, NEW.start_date, NEW.end_date, NEW.id;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.update_invitation_content(
  p_invitation_id uuid,
  p_slug text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_status text,
  p_content jsonb
) RETURNS public.invitations
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invitations; d public.designs; target text; suffix text; public_link text; detail_status text;
BEGIN
  PERFORM public.require_active_actor();
  SELECT * INTO inv FROM public.invitations WHERE id=p_invitation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation not found'; END IF;
  IF NOT public.is_admin() AND inv.shop_id <> public.current_shop_id() THEN RAISE EXCEPTION 'Invitation access denied'; END IF;
  SELECT * INTO d FROM public.designs WHERE id=inv.design_id;
  IF NOT FOUND OR d.design_code NOT IN ('design_01','design_02','design_03','design_04','design_05') THEN RAISE EXCEPTION 'Unsupported design'; END IF;
  suffix := right(d.design_code, 2);
  target := 'design_' || suffix || '_invitations';
  IF p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Invalid slug'; END IF;
  IF p_end_date IS NOT NULL AND p_start_date IS NOT NULL AND p_end_date <= p_start_date THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  public_link := rtrim(d.production_url, '/') || '/' || p_slug;
  UPDATE public.invitations SET
    slug=p_slug, public_url=public_link, start_date=p_start_date, end_date=p_end_date,
    status=CASE WHEN p_status IN ('draft','active','archived','expired') THEN p_status ELSE inv.status END,
    groom_name=coalesce(p_content->>'groom_name', groom_name), bride_name=coalesce(p_content->>'bride_name', bride_name)
  WHERE id=inv.id RETURNING * INTO inv;
  detail_status := CASE WHEN inv.status='active' THEN 'published' WHEN inv.status='archived' THEN 'archived' ELSE 'draft' END;
  EXECUTE format(
    'UPDATE public.%1$I SET invitation_data=coalesce(invitation_data,''{}''::jsonb) || $1,
      slug_%2$s=$2, public_url=$3, start_date=$4, end_date=$5, status_%2$s=$6,
      groom_name_%2$s=coalesce($1->>''groom_name'', groom_name_%2$s), bride_name_%2$s=coalesce($1->>''bride_name'', bride_name_%2$s),
      groom_photo_url_%2$s=nullif($1->>''groom_photo_url'', ''''), bride_photo_url_%2$s=nullif($1->>''bride_photo_url'', ''''),
      education_%2$s=concat_ws('' | '', nullif($1->>''groom_qualification'', ''''), nullif($1->>''bride_qualification'', '''')),
      occupation_%2$s=concat_ws('' | '', nullif($1->>''groom_occupation'', ''''), nullif($1->>''bride_occupation'', '''')),
      events_%2$s=coalesce($1->''events'', events_%2$s), memories_gallery_%2$s=coalesce($1->''gallery'', memories_gallery_%2$s),
      social_links_%2$s=coalesce($1->''social_links'', social_links_%2$s), qr_center_text_%2$s=coalesce(nullif($1->>''qr_text'', ''''), qr_center_text_%2$s),
      wedding_date_%2$s=nullif($1->>''wedding_date'', '''')::timestamptz, updated_by_%2$s=auth.uid()
     WHERE central_invitation_id=$7', target, suffix
  ) USING p_content, p_slug, public_link, p_start_date, p_end_date, detail_status, inv.id;
  RETURN inv;
END $$;

REVOKE ALL ON FUNCTION public.update_invitation_content(uuid,text,timestamptz,timestamptz,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_invitation_content(uuid,text,timestamptz,timestamptz,text,jsonb) TO authenticated;
