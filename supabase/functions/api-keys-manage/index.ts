// Manages API key issuance for RobotVerse users.
// POST { action: 'create', name, scopes[], rate_limit_per_hour?, is_partner?, partner_name? }
//   -> returns full key ONCE (rv_live_...)
// POST { action: 'revoke', id }
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const raw = Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 40);
  return `rv_live_${raw}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const { name, scopes, rate_limit_per_hour, is_partner, partner_name } = body;
      if (!name) return new Response(JSON.stringify({ error: 'Name required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      let finalPartner = false;
      let finalRate = 1000;
      if (is_partner) {
        const { data: isAdmin } = await userClient.rpc('is_admin');
        if (!isAdmin) return new Response(JSON.stringify({ error: 'Only admins can create partner keys' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        finalPartner = true;
        finalRate = rate_limit_per_hour || 10000;
      }
      const key = randomKey();
      const hash = await sha256Hex(key);
      const prefix = key.slice(0, 16);
      const validScopes = ['read', 'write', 'unlock', 'webhooks'];
      const finalScopes = Array.isArray(scopes) && scopes.length
        ? scopes.filter((s: string) => validScopes.includes(s))
        : ['read'];
      const { data, error } = await admin.from('api_keys').insert({
        user_id: user.id,
        name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: finalScopes,
        is_partner: finalPartner,
        partner_name: finalPartner ? (partner_name || null) : null,
        rate_limit_per_hour: finalRate,
      }).select().single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ data: { ...data, api_key: key, note: 'Copy this key now — it will not be shown again.' } }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'revoke') {
      const { id } = body;
      if (!id) return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: isAdmin } = await userClient.rpc('is_admin');
      const query = admin.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
      const { error } = isAdmin ? await query : await query.eq('user_id', user.id);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ data: { revoked: true } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
