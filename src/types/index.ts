export type ShopStatus = 'active' | 'disabled';
export type DesignStatus = 'active' | 'inactive';
export type AssignmentStatus = 'assigned' | 'restricted';
export type InvitationStatus = 'draft' | 'active' | 'expired' | 'archived';
export type UserRole = 'admin' | 'shop_owner';

export interface DesignMappingEntry {
  table: string;
  suffix: string;
}

export interface InvitationEvent {
  id?: string;
  title: string;
  date?: string;
  time?: string;
  /** Human-readable event venue, separate from the wedding's main venue. */
  venue_name?: string;
  /** Street/locality/address for this particular event. */
  location?: string;
  city?: string;
  maps_url?: string;
  description?: string;
}

export interface GalleryItem {
  id?: string;
  url: string;
  caption?: string;
}

export interface SocialLinks {
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface InvitationContact {
  name?: string;
  /** Store the number in international format, e.g. 919876543210. */
  phone?: string;
  /** Derived by the dashboard; the public design can use this directly. */
  whatsapp_url?: string;
}

export interface DesignInvitationContent {
  groom_parents?: string | null;
  bride_parents?: string | null;
  relatives?: string | null;
  venue_name?: string | null;
  venue_address?: string | null;
  city?: string | null;
  maps_url?: string | null;
  venue_image_url?: string | null;
  music_url?: string | null;
  music_enabled?: boolean;
  groom_name?: string | null;
  bride_name?: string | null;
  groom_photo_url?: string | null;
  bride_photo_url?: string | null;
  groom_qualification?: string | null;
  bride_qualification?: string | null;
  groom_occupation?: string | null;
  bride_occupation?: string | null;
  invocation?: string | null;
  venue?: string | null;
  wedding_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  events?: InvitationEvent[];
  gallery?: GalleryItem[];
  social_links?: SocialLinks;
  contacts?: InvitationContact[];
  qr_text?: string | null;
}

export interface DesignSpecificInvitation {
  id: string;
  central_invitation_id: string;
  slug: string;
  invitation_code?: string;
  groom_name?: string | null;
  bride_name?: string | null;
  groom_photo_url?: string | null;
  bride_photo_url?: string | null;
  groom_qualification?: string | null;
  bride_qualification?: string | null;
  groom_occupation?: string | null;
  bride_occupation?: string | null;
  invocation?: string | null;
  venue?: string | null;
  wedding_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  events?: InvitationEvent[] | null;
  gallery?: GalleryItem[] | null;
  social_links?: SocialLinks | null;
  qr_text?: string | null;
  invitation_data?: DesignInvitationContent | null;
  created_at: string;
  updated_at: string;
}

export interface CreateInvitationInput {
  shop_id: string;
  design_id: string;
  design_code: string;
  slug: string;
  invitation_code?: string;
  groom_name?: string | null;
  bride_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: InvitationStatus;
  content: DesignInvitationContent;
}

export interface UpdateInvitationInput {
  slug?: string;
  invitation_code?: string;
  groom_name?: string | null;
  bride_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: InvitationStatus;
  content?: Partial<DesignInvitationContent>;
}

export interface CreateShopOwnerInput {
  email: string;
  full_name: string;
  password?: string;
  shop_id: string;
}

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
  created_at: string;
  updated_at: string;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  role: UserRole;
  full_name: string;
  shop_id: string | null;
  access_status?: 'active' | 'disabled';
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
  public_url?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
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
