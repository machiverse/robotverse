// Manages API key issuance for RobotVerse users.
// Users can only REQUEST a key; an admin must approve it before it is generated.
//
// Actions (POST body):
//   { action: 'create', name, scopes[], is_partner?, partner_name?, rate_limit_per_hour? }
//     -> creates a PENDING request (no key generated yet)
//   { action: 'approve', id }                (admin only)  -> generates the key
//   { action: 'reject', id, reason? }        (admin only)
//   { action: 'reveal', id }                 (owner)       -> returns the plaintext ONCE
//   { action: 'revoke', id }                 (owner or admin)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } });
  const { data: isAdmin } = await userClient.rpc('is_admin');

  try {
    const body = await req.json();
    const { action } = body;

    // ── Create a pending request (any authenticated user) ───────────────────
    if (action === 'create') {
      const { name, scopes, is_partner, partner_name, rate_limit_per_hour } = body;
      if (!name || typeof name !== 'string') return json({ error: 'Name required' }, 400);

      const validScopes = ['read', 'write', 'unlock', 'webhooks'];
      const finalScopes = Array.isArray(scopes) && scopes.length
        ? scopes.filter((s: string) => validScopes.includes(s))
        : ['read'];

      const wantsPartner = !!is_partner;
      // Non-admins may request a partner key but the admin decides on approval.
      const requestedRate = Number.isFinite(rate_limit_per_hour) ? Number(rate_limit_per_hour) : (wantsPartner ? 10000 : 1000);

      const { data, error } = await admin.from('api_keys').insert({
        user_id: user.id,
        name,
        scopes: finalScopes,
        is_partner: wantsPartner,
        partner_name: wantsPartner ? (partner_name || null) : null,
        rate_limit_per_hour: requestedRate,
        status: 'pending',
        // key_prefix / key_hash intentionally NULL until approval
      }).select('id, name, scopes, status, is_partner, partner_name, rate_limit_per_hour, created_at').single();

      if (error) return json({ error: error.message }, 400);
      return json({
        data: {
          ...data,
          note: 'Your API key request has been submitted. An admin must approve it before the key is issued.',
        },
      }, 201);
    }

    // ── Approve (admin only) — generates the key now ────────────────────────
    if (action === 'approve') {
      if (!isAdmin) return json({ error: 'Admin access required' }, 403);
      const { id } = body;
      if (!id) return json({ error: 'id required' }, 400);

      const { data: existing, error: fetchErr } = await admin.from('api_keys')
        .select('id, status').eq('id', id).single();
      if (fetchErr || !existing) return json({ error: fetchErr?.message || 'Not found' }, 404);
      if (existing.status !== 'pending') return json({ error: `Request is already ${existing.status}` }, 400);

      const key = randomKey();
      const hash = await sha256Hex(key);
      const prefix = key.slice(0, 16);

      const { error: updErr } = await admin.from('api_keys').update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        key_prefix: prefix,
        key_hash: hash,
        plaintext_key: key, // one-time reveal window for the requesting user
        rejection_reason: null,
      }).eq('id', id);

      if (updErr) return json({ error: updErr.message }, 400);
      return json({ data: { approved: true } });
    }

    // ── Reject (admin only) ─────────────────────────────────────────────────
    if (action === 'reject') {
      if (!isAdmin) return json({ error: 'Admin access required' }, 403);
      const { id, reason } = body;
      if (!id) return json({ error: 'id required' }, 400);

      const { error } = await admin.from('api_keys').update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        rejection_reason: reason || null,
      }).eq('id', id).eq('status', 'pending');
      if (error) return json({ error: error.message }, 400);
      return json({ data: { rejected: true } });
    }

    // ── Reveal the plaintext key once (owner only) ──────────────────────────
    if (action === 'reveal') {
      const { id } = body;
      if (!id) return json({ error: 'id required' }, 400);

      const { data: row, error: rowErr } = await admin.from('api_keys')
        .select('id, user_id, status, plaintext_key')
        .eq('id', id).single();
      if (rowErr || !row) return json({ error: rowErr?.message || 'Not found' }, 404);
      if (row.user_id !== user.id) return json({ error: 'Forbidden' }, 403);
      if (row.status !== 'approved') return json({ error: 'Key is not approved yet' }, 400);
      if (!row.plaintext_key) return json({ error: 'This key has already been revealed. It cannot be shown again.' }, 400);

      const plaintext = row.plaintext_key;
      await admin.from('api_keys').update({ plaintext_key: null }).eq('id', id);
      return json({ data: { api_key: plaintext, note: 'Copy this key now — it will not be shown again.' } });
    }

    // ── Revoke (owner or admin) ─────────────────────────────────────────────
    if (action === 'revoke') {
      const { id } = body;
      if (!id) return json({ error: 'id required' }, 400);
      const query = admin.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', id);
      const { error } = isAdmin ? await query : await query.eq('user_id', user.id);
      if (error) return json({ error: error.message }, 400);
      return json({ data: { revoked: true } });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error' }, 500);
  }
});
