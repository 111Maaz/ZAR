import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: actor }, error: actorError } = await callerClient.auth.getUser();
    if (actorError || !actor) throw new Error('Unauthenticated');
    const { data: actorProfile } = await callerClient.from('admin_profiles')
      .select('role, full_name, access_status').eq('user_id', actor.id).maybeSingle();
    if (!actorProfile || actorProfile.role !== 'admin' || actorProfile.access_status !== 'active') {
      return new Response(JSON.stringify({ error: 'Admin access is required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { email, password, full_name, shop_id } = await request.json();
    if (!email || !password || !full_name || !shop_id) throw new Error('email, password, full_name, and shop_id are required');
    if (typeof password !== 'string' || password.length < 8) throw new Error('Password must contain at least 8 characters');

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: shop } = await admin.from('shops').select('id').eq('id', shop_id).eq('status', 'active').maybeSingle();
    if (!shop) throw new Error('Selected shop is not active');
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: String(email).trim().toLowerCase(), password, email_confirm: true, user_metadata: { full_name: String(full_name).trim() },
    });
    if (createError || !created.user) throw new Error(createError?.message ?? 'Could not create user');
    const { error: profileError } = await admin.from('admin_profiles').insert({
      user_id: created.user.id, role: 'shop_owner', full_name: String(full_name).trim(), shop_id, access_status: 'active',
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }
    await admin.from('audit_logs').insert({
      actor_id: actor.id, actor_name: actorProfile.full_name, actor_role: actorProfile.role,
      action: 'Created shop owner account', shop_id,
      metadata: { created_user_id: created.user.id, email: String(email).trim().toLowerCase() },
    });
    return new Response(JSON.stringify({ user_id: created.user.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
