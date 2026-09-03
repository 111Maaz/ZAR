import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization) throw new Error('Missing authorization header');
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user: actor }, error: actorError } = await caller.auth.getUser();
    if (actorError || !actor) throw new Error('Unauthenticated');
    const { data: profile } = await caller.from('admin_profiles').select('role, full_name, access_status').eq('user_id', actor.id).maybeSingle();
    if (!profile || profile.role !== 'admin' || profile.access_status !== 'active') throw new Error('Admin access is required');

    const body = await request.json();
    const required = ['shop_name', 'owner_name', 'owner_email', 'password'];
    if (required.some((key) => !String(body[key] ?? '').trim())) throw new Error('Shop name, owner name, email, and password are required');
    if (String(body.password).length < 8) throw new Error('Password must contain at least 8 characters');
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const shopPayload = {
      shop_name: String(body.shop_name).trim(), owner_name: String(body.owner_name).trim(), owner_email: String(body.owner_email).trim().toLowerCase(),
      phone: body.phone?.trim() || null, whatsapp: body.whatsapp?.trim() || null, address: body.address?.trim() || null,
      city: body.city?.trim() || null, state: body.state?.trim() || null, country: body.country?.trim() || null,
      business_contact: body.business_contact?.trim() || null, status: 'active',
    };
    const { data: shop, error: shopError } = await admin.from('shops').insert(shopPayload).select().single();
    if (shopError || !shop) throw new Error(shopError?.message ?? 'Could not create shop');
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email: shopPayload.owner_email, password: body.password, email_confirm: true, user_metadata: { full_name: shopPayload.owner_name },
    });
    if (userError || !created.user) { await admin.from('shops').delete().eq('id', shop.id); throw new Error(userError?.message ?? 'Could not create shop owner login'); }
    const { error: profileError } = await admin.from('admin_profiles').insert({ user_id: created.user.id, role: 'shop_owner', full_name: shopPayload.owner_name, shop_id: shop.id, access_status: 'active' });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      await admin.from('shops').delete().eq('id', shop.id);
      throw new Error(profileError.message);
    }
    await admin.from('audit_logs').insert({ actor_id: actor.id, actor_name: profile.full_name, actor_role: profile.role, action: 'Created shop and shop owner account', shop_id: shop.id, metadata: { owner_user_id: created.user.id, owner_email: shopPayload.owner_email } });
    return new Response(JSON.stringify({ shop }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
