export type ShopStatus = 'active' | 'disabled';
export type DesignStatus = 'active' | 'inactive';
export type AssignmentStatus = 'assigned' | 'restricted';
export type InvitationStatus = 'draft' | 'active' | 'expired';
export type UserRole = 'admin' | 'shop_owner';

export interface Shop {
  id: string;
  shop_name: string;
  owner_name: string;
  owner_email: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  business_contact: string | null;
  status: ShopStatus;
  supabase_project_url: string | null;
  supabase_anon_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Design {
  id: string;
  design_code: string;
  design_name: string;
  description: string | null;
  production_url: string;
  status: DesignStatus;
  created_at: string;
  updated_at: string;
}

export interface ShopDesignAssignment {
  id: string;
  shop_id: string;
  design_id: string;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  design?: Design;
  shop?: Shop;
}

export interface Invitation {
  id: string;
  shop_id: string;
  design_id: string | null;
  groom_name: string | null;
  bride_name: string | null;
  slug: string;
  invitation_code: string;
  start_date: string | null;
  end_date: string | null;
  status: InvitationStatus;
  created_at: string;
  updated_at: string;
  shop?: Shop;
  design?: Design;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  shop_id: string | null;
  design_id: string | null;
  invitation_code: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  shop?: Shop;
  design?: Design;
}

export interface AuditLogInput {
  action: string;
  shop_id?: string | null;
  design_id?: string | null;
  invitation_code?: string | null;
  metadata?: Record<string, unknown>;
}
