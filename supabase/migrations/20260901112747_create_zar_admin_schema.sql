/*
# ZAR V2 Central Admin Dashboard — Core Schema

Creates all tables first, then helper functions, then RLS policies.
Tables: shops, admin_profiles, designs, shop_design_assignments, invitations, audit_logs.
Admins manage all platform data; shop owners see only their own shop's data.
No service-role keys stored. No delete on shops/designs. Audit logs are immutable.
*/

-- ============================================================
-- TABLES (created first, before functions/policies reference them)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  owner_email text NOT NULL UNIQUE,
  phone text,
  whatsapp text,
  address text,
  city text,
  state text,
  country text,
  business_contact text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  supabase_project_url text,
  supabase_anon_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'shop_owner')),
  full_name text NOT NULL DEFAULT '',
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.designs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  design_code text NOT NULL UNIQUE,
  design_name text NOT NULL,
  description text,
  production_url text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_design_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  design_id uuid NOT NULL REFERENCES public.designs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'restricted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, design_id)
);

CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  design_id uuid REFERENCES public.designs(id) ON DELETE SET NULL,
  groom_name text,
  bride_name text,
  slug text NOT NULL,
  invitation_code text NOT NULL UNIQUE,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  actor_role text,
  action text NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  design_id uuid REFERENCES public.designs(id) ON DELETE SET NULL,
  invitation_code text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- HELPER FUNCTIONS (after tables exist)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_shop_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT shop_id FROM public.admin_profiles
  WHERE user_id = auth.uid()
  AND role = 'shop_owner'
  LIMIT 1;
$$;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_design_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: SHOPS
-- ============================================================

DROP POLICY IF EXISTS "shops_select_admin_or_owner" ON public.shops;
CREATE POLICY "shops_select_admin_or_owner" ON public.shops
  FOR SELECT TO authenticated
  USING (public.is_admin() OR id = public.current_shop_id());

DROP POLICY IF EXISTS "shops_insert_admin_only" ON public.shops;
CREATE POLICY "shops_insert_admin_only" ON public.shops
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "shops_update_admin_only" ON public.shops;
CREATE POLICY "shops_update_admin_only" ON public.shops
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- RLS POLICIES: ADMIN_PROFILES
-- ============================================================

DROP POLICY IF EXISTS "admin_profiles_select_own_or_admin" ON public.admin_profiles;
CREATE POLICY "admin_profiles_select_own_or_admin" ON public.admin_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "admin_profiles_insert_admin_only" ON public.admin_profiles;
CREATE POLICY "admin_profiles_insert_admin_only" ON public.admin_profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_profiles_update_own_or_admin" ON public.admin_profiles;
CREATE POLICY "admin_profiles_update_own_or_admin" ON public.admin_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- ============================================================
-- RLS POLICIES: DESIGNS
-- ============================================================

DROP POLICY IF EXISTS "designs_select_admin_or_assigned" ON public.designs;
CREATE POLICY "designs_select_admin_or_assigned" ON public.designs
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.shop_design_assignments sda
      WHERE sda.design_id = designs.id
      AND sda.shop_id = public.current_shop_id()
      AND sda.status = 'assigned'
    )
  );

DROP POLICY IF EXISTS "designs_insert_admin_only" ON public.designs;
CREATE POLICY "designs_insert_admin_only" ON public.designs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "designs_update_admin_only" ON public.designs;
CREATE POLICY "designs_update_admin_only" ON public.designs
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- RLS POLICIES: SHOP_DESIGN_ASSIGNMENTS
-- ============================================================

DROP POLICY IF EXISTS "assignments_select_admin_or_owner" ON public.shop_design_assignments;
CREATE POLICY "assignments_select_admin_or_owner" ON public.shop_design_assignments
  FOR SELECT TO authenticated
  USING (public.is_admin() OR shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "assignments_insert_admin_only" ON public.shop_design_assignments;
CREATE POLICY "assignments_insert_admin_only" ON public.shop_design_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "assignments_update_admin_only" ON public.shop_design_assignments;
CREATE POLICY "assignments_update_admin_only" ON public.shop_design_assignments
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "assignments_delete_admin_only" ON public.shop_design_assignments;
CREATE POLICY "assignments_delete_admin_only" ON public.shop_design_assignments
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- RLS POLICIES: INVITATIONS
-- ============================================================

DROP POLICY IF EXISTS "invitations_select_admin_or_owner" ON public.invitations;
CREATE POLICY "invitations_select_admin_or_owner" ON public.invitations
  FOR SELECT TO authenticated
  USING (public.is_admin() OR shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "invitations_insert_owner_or_admin" ON public.invitations;
CREATE POLICY "invitations_insert_owner_or_admin" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR shop_id = public.current_shop_id());

DROP POLICY IF EXISTS "invitations_update_owner_or_admin" ON public.invitations;
CREATE POLICY "invitations_update_owner_or_admin" ON public.invitations
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR shop_id = public.current_shop_id())
  WITH CHECK (public.is_admin() OR shop_id = public.current_shop_id());

-- ============================================================
-- RLS POLICIES: AUDIT_LOGS
-- ============================================================

DROP POLICY IF EXISTS "audit_logs_select_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin_only" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_any_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_any_authenticated" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_shops_status ON public.shops(status);
CREATE INDEX IF NOT EXISTS idx_designs_status ON public.designs(status);
CREATE INDEX IF NOT EXISTS idx_designs_code ON public.designs(design_code);
CREATE INDEX IF NOT EXISTS idx_assignments_shop ON public.shop_design_assignments(shop_id);
CREATE INDEX IF NOT EXISTS idx_assignments_design ON public.shop_design_assignments(design_id);
CREATE INDEX IF NOT EXISTS idx_invitations_shop ON public.invitations(shop_id);
CREATE INDEX IF NOT EXISTS idx_invitations_design ON public.invitations(design_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_shop ON public.audit_logs(shop_id);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_user ON public.admin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_profiles_role ON public.admin_profiles(role);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_shops_updated ON public.shops;
CREATE TRIGGER trigger_shops_updated BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_designs_updated ON public.designs;
CREATE TRIGGER trigger_designs_updated BEFORE UPDATE ON public.designs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_assignments_updated ON public.shop_design_assignments;
CREATE TRIGGER trigger_assignments_updated BEFORE UPDATE ON public.shop_design_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_invitations_updated ON public.invitations;
CREATE TRIGGER trigger_invitations_updated BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_admin_profiles_updated ON public.admin_profiles;
CREATE TRIGGER trigger_admin_profiles_updated BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
