import { supabase } from '@/lib/supabase';
import type { AdminProfile, CreateShopOwnerInput, UserRole } from '@/types';

export interface ShopOwnerCreateResult {
  adminProfile: AdminProfile | null;
  authUserCreated: boolean;
  authUserId?: string | null;
  method: 'signup' | 'reset_flow' | 'manual';
}

export async function createShopOwner(
  input: CreateShopOwnerInput
): Promise<ShopOwnerCreateResult> {
  const result: ShopOwnerCreateResult = {
    adminProfile: null,
    authUserCreated: false,
    method: 'reset_flow',
  };

  if (!input.password) throw new Error('A temporary password is required when creating a shop owner.');
  const { data, error } = await supabase.functions.invoke('create-shop-owner', { body: input });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  result.authUserCreated = true;
  result.authUserId = data.user_id;
  result.method = 'signup';
  return result;
}

export async function changeUserRole(
  profileId: string,
  userId: string,
  newRole: UserRole,
  currentRole: UserRole
): Promise<void> {
  const { error } = await supabase
    .from('admin_profiles')
    .update({ role: newRole })
    .eq('id', profileId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

}

export async function revokeShopOwnerAccess(
  profileId: string,
  userId: string,
  shopId: string,
  options: { clearShopId: boolean; demoteRole?: UserRole }
): Promise<void> {
  const patch: Record<string, unknown> = { access_status: 'disabled' };
  if (options.clearShopId) patch.shop_id = null;
  if (options.demoteRole) patch.role = options.demoteRole;

  const { error } = await supabase.from('admin_profiles').update(patch).eq('id', profileId);

  if (error) throw new Error(error.message);

}

export async function listAllAdminProfiles(): Promise<AdminProfile[]> {
  const { data, error } = await supabase.from('admin_profiles').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AdminProfile[]) ?? [];
}

export async function listShopOwnerProfiles(shopId: string): Promise<AdminProfile[]> {
  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AdminProfile[]) ?? [];
}
