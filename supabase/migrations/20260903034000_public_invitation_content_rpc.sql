/*
  Public design sites resolve only an exact slug. This function never exposes
  draft, archived, future, or expired wedding content.
*/
CREATE OR REPLACE FUNCTION public.get_public_invitation_content(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invitations;
  d public.designs;
  shop public.shops;
  target text;
  detail jsonb;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RETURN jsonb_build_object('state', 'not_found');
  END IF;

  SELECT * INTO inv
  FROM public.invitations
  WHERE lower(slug) = lower(p_slug)
  LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('state', 'not_found'); END IF;

  SELECT * INTO shop FROM public.shops WHERE id = inv.shop_id;

  IF inv.status <> 'active'
     OR shop.status <> 'active'
     OR (inv.start_date IS NOT NULL AND inv.start_date > now())
     OR (inv.end_date IS NOT NULL AND inv.end_date < now()) THEN
    RETURN jsonb_build_object(
      'state', 'fallback',
      'shop', jsonb_build_object(
        'name', shop.shop_name,
        'phone', shop.phone,
        'whatsapp', shop.whatsapp,
        'address', shop.address,
        'city', shop.city,
        'business_contact', shop.business_contact
      )
    );
  END IF;

  SELECT * INTO d FROM public.designs WHERE id = inv.design_id AND status = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('state', 'fallback', 'shop', jsonb_build_object('name', shop.shop_name)); END IF;

  target := CASE d.design_code
    WHEN 'design_01' THEN 'design_01_invitations'
    WHEN 'design_02' THEN 'design_02_invitations'
    WHEN 'design_03' THEN 'design_03_invitations'
    WHEN 'design_04' THEN 'design_04_invitations'
    WHEN 'design_05' THEN 'design_05_invitations'
    ELSE NULL
  END;
  IF target IS NULL THEN RETURN jsonb_build_object('state', 'not_found'); END IF;

  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE t.central_invitation_id = $1', target)
    INTO detail USING inv.id;
  IF detail IS NULL THEN RETURN jsonb_build_object('state', 'not_found'); END IF;

  RETURN jsonb_build_object(
    'state', 'live',
    'invitation', jsonb_build_object(
      'id', inv.id,
      'slug', inv.slug,
      'invitation_code', inv.invitation_code,
      'public_url', inv.public_url,
      'start_date', inv.start_date,
      'end_date', inv.end_date,
      'groom_name', inv.groom_name,
      'bride_name', inv.bride_name,
      'design_code', d.design_code
    ),
    'shop', jsonb_build_object(
      'name', shop.shop_name,
      'phone', shop.phone,
      'whatsapp', shop.whatsapp,
      'address', shop.address,
      'city', shop.city,
      'business_contact', shop.business_contact
    ),
    'detail', detail,
    'content', detail->'invitation_data'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_invitation_content(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invitation_content(text) TO anon, authenticated;
