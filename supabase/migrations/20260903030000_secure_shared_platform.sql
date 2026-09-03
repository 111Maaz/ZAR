/* ZAR V2 shared-project hardening. Run after the earlier migrations. */

-- Shops never receive Supabase credentials: all tenants use this one project.
ALTER TABLE public.shops DROP COLUMN IF EXISTS supabase_project_url;
ALTER TABLE public.shops DROP COLUMN IF EXISTS supabase_anon_key;
ALTER TABLE public.admin_profiles ADD COLUMN IF NOT EXISTS access_status text NOT NULL DEFAULT 'active'
  CHECK (access_status IN ('active', 'disabled'));

ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS public_url text;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
-- A prior partial execution may already have created this trigger. PostgreSQL
-- cannot change a referenced column's type until the dependent trigger is gone.
DROP TRIGGER IF EXISTS sync_invitation_detail ON public.invitations;
ALTER TABLE public.invitations ALTER COLUMN start_date TYPE timestamptz USING start_date::timestamptz;
ALTER TABLE public.invitations ALTER COLUMN end_date TYPE timestamptz USING end_date::timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_slug_unique ON public.invitations (lower(slug));

-- The detailed tables share the fields common to every supported design.  JSON content
-- retains design-only fields without allowing a caller to select a relation dynamically.
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['design_01_invitations','design_02_invitations','design_03_invitations','design_04_invitations','design_05_invitations'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS invitation_data jsonb NOT NULL DEFAULT ''{}''::jsonb', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS public_url text', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS start_date timestamptz', tbl);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS end_date timestamptz', tbl);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT shop_id FROM public.admin_profiles
  WHERE user_id = auth.uid() AND role = 'shop_owner' AND access_status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.guard_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.shop_id IS DISTINCT FROM OLD.shop_id OR NEW.access_status IS DISTINCT FROM OLD.access_status) THEN
    RAISE EXCEPTION 'Only an admin can alter platform access';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_update ON public.admin_profiles;
CREATE TRIGGER guard_profile_update BEFORE UPDATE ON public.admin_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_update();

CREATE OR REPLACE FUNCTION public.guard_invitation_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE production_base text;
BEGIN
  PERFORM public.require_active_actor();
  IF TG_OP = 'INSERT' THEN NEW.created_by := auth.uid(); END IF;
  IF TG_OP = 'UPDATE' AND NEW.invitation_code IS DISTINCT FROM OLD.invitation_code THEN
    RAISE EXCEPTION 'Invitation code is system-generated and immutable';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    SELECT production_url INTO production_base FROM public.designs WHERE id=NEW.design_id;
    NEW.public_url := rtrim(production_base, '/') || '/' || NEW.slug;
  END IF;
  NEW.updated_by := auth.uid();
  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.shop_design_assignments a JOIN public.designs d ON d.id=a.design_id
    WHERE a.shop_id=NEW.shop_id AND a.design_id=NEW.design_id AND a.status='assigned' AND d.status='active'
  ) THEN RAISE EXCEPTION 'Design is not assigned to this shop'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_invitation_write ON public.invitations;
CREATE TRIGGER guard_invitation_write BEFORE INSERT OR UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION public.guard_invitation_write();

CREATE OR REPLACE FUNCTION public.sync_invitation_detail()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE code text; target text;
BEGIN
  SELECT design_code INTO code FROM public.designs WHERE id=NEW.design_id;
  target := CASE code WHEN 'design_01' THEN 'design_01_invitations' WHEN 'design_02' THEN 'design_02_invitations'
    WHEN 'design_03' THEN 'design_03_invitations' WHEN 'design_04' THEN 'design_04_invitations' WHEN 'design_05' THEN 'design_05_invitations' END;
  IF target IS NOT NULL THEN
    EXECUTE format('UPDATE public.%I SET slug=$1, public_url=$2, start_date=$3, end_date=$4 WHERE central_invitation_id=$5', target)
      USING NEW.slug, NEW.public_url, NEW.start_date, NEW.end_date, NEW.id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_invitation_detail ON public.invitations;
CREATE TRIGGER sync_invitation_detail AFTER UPDATE OF slug, public_url, start_date, end_date ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.sync_invitation_detail();

CREATE OR REPLACE FUNCTION public.require_active_actor()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid() AND access_status = 'active'
  ) THEN RAISE EXCEPTION 'Account is disabled or has no platform profile'; END IF;
END $$;

-- Database-owned audit entries. Browser supplied actor fields are never trusted.
CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.admin_profiles; action_name text; target_shop uuid; target_design uuid; target_code text; row_data jsonb;
BEGIN
  row_data := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  SELECT * INTO p FROM public.admin_profiles WHERE user_id = auth.uid();
  IF TG_OP = 'INSERT' THEN action_name := 'Created ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN action_name := 'Removed ' || TG_TABLE_NAME;
  ELSE action_name := 'Updated ' || TG_TABLE_NAME; END IF;
  IF TG_TABLE_NAME = 'shops' THEN target_shop := (row_data->>'id')::uuid;
  ELSIF TG_TABLE_NAME = 'designs' THEN target_design := (row_data->>'id')::uuid;
  ELSIF TG_TABLE_NAME = 'shop_design_assignments' THEN target_shop := (row_data->>'shop_id')::uuid; target_design := (row_data->>'design_id')::uuid;
  ELSIF TG_TABLE_NAME = 'invitations' THEN target_shop := (row_data->>'shop_id')::uuid; target_design := (row_data->>'design_id')::uuid; target_code := row_data->>'invitation_code';
  ELSIF TG_TABLE_NAME = 'admin_profiles' THEN target_shop := (row_data->>'shop_id')::uuid; END IF;
  INSERT INTO public.audit_logs(actor_id,actor_name,actor_role,action,shop_id,design_id,invitation_code,metadata)
  VALUES(auth.uid(), COALESCE(p.full_name,'System'), p.role, action_name, target_shop, target_design, target_code,
    jsonb_build_object('table',TG_TABLE_NAME,'operation',TG_OP));
  RETURN COALESCE(NEW, OLD);
END $$;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['shops','admin_profiles','designs','shop_design_assignments','invitations'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I',t,t);
    EXECUTE format('CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()',t,t);
  END LOOP;
END $$;

-- Do not permit direct audit inserts, including forged actor information.
DROP POLICY IF EXISTS "audit_logs_insert_any_authenticated" ON public.audit_logs;

DROP POLICY IF EXISTS "designs_select_admin_or_assigned" ON public.designs;
CREATE POLICY "designs_select_admin_or_assigned" ON public.designs FOR SELECT TO authenticated USING (
  public.is_admin() OR (status = 'active' AND EXISTS (
    SELECT 1 FROM public.shop_design_assignments sda WHERE sda.design_id=designs.id
    AND sda.shop_id=public.current_shop_id() AND sda.status='assigned')));

CREATE OR REPLACE FUNCTION public.get_my_assigned_designs()
RETURNS SETOF public.designs LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT d.*
  FROM public.designs d
  JOIN public.shop_design_assignments a ON a.design_id = d.id
  JOIN public.shops s ON s.id = a.shop_id
  WHERE a.shop_id = public.current_shop_id()
    AND a.status = 'assigned'
    AND d.status = 'active'
    AND s.status = 'active'
  ORDER BY d.design_code
$$;
REVOKE ALL ON FUNCTION public.get_my_assigned_designs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_assigned_designs() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_invitation(p_design_id uuid, p_slug text, p_content jsonb,
  p_start_date timestamptz DEFAULT NULL, p_end_date timestamptz DEFAULT NULL, p_status text DEFAULT 'draft')
RETURNS public.invitations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.designs; inv public.invitations; sid uuid; code text; final_slug text; target text; public_link text;
BEGIN
  PERFORM public.require_active_actor();
  SELECT shop_id INTO sid FROM public.admin_profiles WHERE user_id=auth.uid();
  IF public.is_admin() THEN sid := NULLIF(p_content->>'shop_id','')::uuid; END IF;
  IF sid IS NULL THEN RAISE EXCEPTION 'A shop is required'; END IF;
  SELECT * INTO d FROM public.designs WHERE id=p_design_id AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Design is not active'; END IF;
  IF NOT public.is_admin() AND NOT EXISTS (SELECT 1 FROM public.shop_design_assignments WHERE shop_id=sid AND design_id=p_design_id AND status='assigned') THEN
    RAISE EXCEPTION 'Design is not assigned to this shop'; END IF;
  IF d.design_code NOT IN ('design_01','design_02','design_03','design_04','design_05') THEN RAISE EXCEPTION 'Unsupported design code'; END IF;
  final_slug := lower(regexp_replace(coalesce(nullif(trim(p_slug),''), concat_ws('-',p_content->>'groom_name',p_content->>'bride_name')), '[^a-zA-Z0-9]+','-','g'));
  final_slug := trim(both '-' from final_slug);
  IF final_slug = '' OR final_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN RAISE EXCEPTION 'Invalid slug'; END IF;
  code := 'ZAR-' || to_char(now(),'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  public_link := rtrim(d.production_url,'/') || '/' || final_slug;
  INSERT INTO public.invitations(shop_id,design_id,groom_name,bride_name,slug,invitation_code,public_url,start_date,end_date,status,created_by,updated_by)
  VALUES(sid,p_design_id,p_content->>'groom_name',p_content->>'bride_name',final_slug,code,public_link,p_start_date,p_end_date,CASE WHEN p_status IN ('draft','active') THEN p_status ELSE 'draft' END,auth.uid(),auth.uid()) RETURNING * INTO inv;
  target := CASE d.design_code WHEN 'design_01' THEN 'design_01_invitations' WHEN 'design_02' THEN 'design_02_invitations' WHEN 'design_03' THEN 'design_03_invitations' WHEN 'design_04' THEN 'design_04_invitations' WHEN 'design_05' THEN 'design_05_invitations' END;
  p_content := jsonb_set(p_content, '{qr_url}', to_jsonb(public_link));
  EXECUTE format('INSERT INTO public.%I (central_invitation_id,slug,invitation_code,groom_name,bride_name,invitation_data,public_url,start_date,end_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',target)
    USING inv.id,final_slug,code,p_content->>'groom_name',p_content->>'bride_name',p_content,public_link,p_start_date,p_end_date;
  RETURN inv;
END $$;

REVOKE ALL ON FUNCTION public.create_invitation(uuid,text,jsonb,timestamptz,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_invitation(uuid,text,jsonb,timestamptz,timestamptz,text) TO authenticated;

-- Public lookup never falls through to a different slug. Content is returned only while live.
CREATE OR REPLACE FUNCTION public.get_public_invitation(p_slug text)
RETURNS TABLE(invitation_id uuid, public_url text, status text, shop_id uuid, is_live boolean) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id,i.public_url,i.status,i.shop_id,
   (i.status='active' AND (i.start_date IS NULL OR i.start_date<=now()) AND (i.end_date IS NULL OR i.end_date>=now()))
  FROM public.invitations i WHERE lower(i.slug)=lower(p_slug) LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_public_invitation(text) TO anon, authenticated;
