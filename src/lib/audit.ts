import { supabase } from '@/lib/supabase';
import type { AuditLogInput } from '@/types';

export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('admin_profiles')
      .select('role, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: profile?.full_name || user.email || 'Unknown',
      actor_role: profile?.role || 'admin',
      action: input.action,
      shop_id: input.shop_id || null,
      design_id: input.design_id || null,
      invitation_code: input.invitation_code || null,
      metadata: input.metadata || {},
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
