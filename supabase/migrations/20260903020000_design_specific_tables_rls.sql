/*
# ZAR V2 — Design-Specific Invitation Tables

Creates public.design_01_invitations through public.design_05_invitations.
Shares a unified content schema with central_invitation_id linking to public.invitations.
RLS mirrors central invitations: admins manage all, shop owners manage their shop's rows.
*/

CREATE TABLE IF NOT EXISTS public.design_01_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  central_invitation_id uuid NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  groom_name text,
  bride_name text,
  groom_photo_url text,
  bride_photo_url text,
  groom_qualification text,
  bride_qualification text,
  groom_occupation text,
  bride_occupation text,
  invocation text,
  venue text,
  wedding_date timestamptz,
  start_time text,
  end_time text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  qr_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.design_02_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  central_invitation_id uuid NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  groom_name text,
  bride_name text,
  groom_photo_url text,
  bride_photo_url text,
  groom_qualification text,
  bride_qualification text,
  groom_occupation text,
  bride_occupation text,
  invocation text,
  venue text,
  wedding_date timestamptz,
  start_time text,
  end_time text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  qr_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.design_03_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  central_invitation_id uuid NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  groom_name text,
  bride_name text,
  groom_photo_url text,
  bride_photo_url text,
  groom_qualification text,
  bride_qualification text,
  groom_occupation text,
  bride_occupation text,
  invocation text,
  venue text,
  wedding_date timestamptz,
  start_time text,
  end_time text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  qr_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.design_04_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  central_invitation_id uuid NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  groom_name text,
  bride_name text,
  groom_photo_url text,
  bride_photo_url text,
  groom_qualification text,
  bride_qualification text,
  groom_occupation text,
  bride_occupation text,
  invocation text,
  venue text,
  wedding_date timestamptz,
  start_time text,
  end_time text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  qr_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.design_05_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  central_invitation_id uuid NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  groom_name text,
  bride_name text,
  groom_photo_url text,
  bride_photo_url text,
  groom_qualification text,
  bride_qualification text,
  groom_occupation text,
  bride_occupation text,
  invocation text,
  venue text,
  wedding_date timestamptz,
  start_time text,
  end_time text,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  qr_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.design_01_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_02_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_03_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_04_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_05_invitations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['design_01_invitations','design_02_invitations','design_03_invitations','design_04_invitations','design_05_invitations'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format($sql$
      DROP POLICY IF EXISTS %I_select_admin_or_owner ON public.%I;
      CREATE POLICY %I_select_admin_or_owner ON public.%I
        FOR SELECT TO authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.invitations i
            WHERE i.id = public.%I.central_invitation_id
            AND i.shop_id = public.current_shop_id()
          )
        );
    $sql$, tbl || '_select_admin_or_owner', tbl, tbl || '_select_admin_or_owner', tbl, tbl);

    EXECUTE format($sql$
      DROP POLICY IF EXISTS %I_insert_admin_or_owner ON public.%I;
      CREATE POLICY %I_insert_admin_or_owner ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.invitations i
            WHERE i.id = public.%I.central_invitation_id
            AND i.shop_id = public.current_shop_id()
          )
        );
    $sql$, tbl || '_insert_admin_or_owner', tbl, tbl || '_insert_admin_or_owner', tbl, tbl);

    EXECUTE format($sql$
      DROP POLICY IF EXISTS %I_update_admin_or_owner ON public.%I;
      CREATE POLICY %I_update_admin_or_owner ON public.%I
        FOR UPDATE TO authenticated
        USING (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.invitations i
            WHERE i.id = public.%I.central_invitation_id
            AND i.shop_id = public.current_shop_id()
          )
        )
        WITH CHECK (
          public.is_admin()
          OR EXISTS (
            SELECT 1 FROM public.invitations i
            WHERE i.id = public.%I.central_invitation_id
            AND i.shop_id = public.current_shop_id()
          )
        );
    $sql$, tbl || '_update_admin_or_owner', tbl, tbl || '_update_admin_or_owner', tbl, tbl, tbl);

    EXECUTE format($sql$
      DROP TRIGGER IF EXISTS trigger_%I_updated ON public.%I;
      CREATE TRIGGER trigger_%I_updated BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    $sql$, tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_design_01_inv_central ON public.design_01_invitations(central_invitation_id);
CREATE INDEX IF NOT EXISTS idx_design_02_inv_central ON public.design_02_invitations(central_invitation_id);
CREATE INDEX IF NOT EXISTS idx_design_03_inv_central ON public.design_03_invitations(central_invitation_id);
CREATE INDEX IF NOT EXISTS idx_design_04_inv_central ON public.design_04_invitations(central_invitation_id);
CREATE INDEX IF NOT EXISTS idx_design_05_inv_central ON public.design_05_invitations(central_invitation_id);
CREATE INDEX IF NOT EXISTS idx_design_01_inv_code ON public.design_01_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_design_02_inv_code ON public.design_02_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_design_03_inv_code ON public.design_03_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_design_04_inv_code ON public.design_04_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_design_05_inv_code ON public.design_05_invitations(invitation_code);
