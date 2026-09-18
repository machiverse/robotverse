// RobotVerse Public REST API v1
// Auth: `x-api-key: rv_live_...` header (or `Authorization: Bearer rv_live_...`)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Fields to strip from responses (contact info policy)
const CONTACT_FIELDS = ['email', 'mobile_number', 'phone', 'whatsapp', 'contact_email', 'contact_phone'];

function stripContact<T extends Record<string, unknown>>(row: T | null): T | null {
  if (!row) return row;
  const clone: Record<string, unknown> = { ...row };
  for (const f of CONTACT_FIELDS) delete clone[f];
  return clone as T;
}

function stripContactList<T extends Record<string, unknown>>(rows: T[] | null): T[] {
  return (rows ?? []).map((r) => stripContact(r) as T);
}

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extra },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface ApiKeyRow {
  id: string;
  user_id: string | null;
  scopes: string[];
  is_partner: boolean;
  rate_limit_per_hour: number;
  revoked_at: string | null;
}

async function authenticate(req: Request, admin: ReturnType<typeof createClient>): Promise<
  { ok: true; key: ApiKeyRow } | { ok: false; res: Response }
> {
  const raw =
    req.headers.get('x-api-key') ||
    (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!raw || !raw.startsWith('rv_')) {
    return { ok: false, res: json({ error: 'Missing or invalid API key. Send `x-api-key: rv_live_...`.' }, 401) };
  }
  const hash = await sha256Hex(raw);
  const { data: key, error } = await admin
    .from('api_keys')
    .select('id,user_id,scopes,is_partner,rate_limit_per_hour,revoked_at')
    .eq('key_hash', hash)
    .maybeSingle();
  if (error || !key) return { ok: false, res: json({ error: 'Invalid API key' }, 401) };
  if (key.revoked_at) return { ok: false, res: json({ error: 'API key revoked' }, 401) };

  // Rate limit check (rolling hour bucket)
  const bucket = new Date();
  bucket.setMinutes(0, 0, 0);
  const bucketIso = bucket.toISOString();
  const { data: usage } = await admin
    .from('api_key_usage')
    .select('request_count')
    .eq('api_key_id', key.id)
    .eq('hour_bucket', bucketIso)
    .maybeSingle();
  const current = usage?.request_count ?? 0;
  if (current >= key.rate_limit_per_hour) {
    return {
      ok: false,
      res: json({ error: 'Rate limit exceeded', limit: key.rate_limit_per_hour }, 429, {
        'X-RateLimit-Limit': String(key.rate_limit_per_hour),
        'X-RateLimit-Remaining': '0',
      }),
    };
  }
  // upsert count (best effort, non-blocking failure)
  await admin.from('api_key_usage').upsert(
    { api_key_id: key.id, hour_bucket: bucketIso, request_count: current + 1 },
    { onConflict: 'api_key_id,hour_bucket' },
  );
  await admin.from('api_keys').update({ last_used_at: new Date().toISOString(), request_count: (0) }).eq('id', key.id);
  return { ok: true, key: key as ApiKeyRow };
}

function requireScope(key: ApiKeyRow, scope: string): Response | null {
  if (!key.scopes.includes(scope) && !key.scopes.includes('*')) {
    return json({ error: `Missing required scope: ${scope}` }, 403);
  }
  return null;
}

function paginate(url: URL) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 100);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
  return { limit, offset };
}


// Moderation: the API uses the service role and bypasses RLS, so it applies the
// same suppression the database applies to browsers — content owned by an account
// whose profiles.account_status is not 'active' is treated as not found / excluded.
let _supCache: { at: number; list: string[] } | null = null;
async function suppressedIds(admin: any): Promise<string[]> {
  if (_supCache && Date.now() - _supCache.at < 60_000) return _supCache.list;
  try {
    const { data } = await admin.from('profiles').select('user_id').neq('account_status', 'active');
    const list = (data ?? []).map((r: any) => r.user_id).filter(Boolean);
    _supCache = { at: Date.now(), list };
    return list;
  } catch (_e) { return []; }
}
const supFilter = (list: string[]) => `(${list.join(',') || '00000000-0000-0000-0000-000000000000'})`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const url = new URL(req.url);
  // strip function base: /functions/v1/api-v1
  const path = url.pathname.replace(/^.*\/api-v1/, '') || '/';
  const segs = path.split('/').filter(Boolean);

  // Public introspection
  if (req.method === 'GET' && (path === '/' || path === '/v1')) {
    return json({
      name: 'RobotVerse REST API',
      version: 'v1',
      docs: 'https://robotverse.in/api-docs',
      auth: 'Send header `x-api-key: rv_live_...`',
      endpoints: [
        'GET /v1/robots', 'GET /v1/robots/:id',
        'GET /v1/parts', 'GET /v1/parts/:id',
        'GET /v1/services', 'GET /v1/services/:id',
        'GET /v1/sellers/:id',
        'GET /v1/categories', 'GET /v1/manufacturers',
        'GET /v1/search?q=&type=',
        'POST /v1/unlock',
        'POST /v1/leads', 'POST /v1/quotes',
        'POST/PATCH/DELETE /v1/robots (write scope)',
        'GET/POST/DELETE /v1/webhooks',
      ],
    });
  }

  const auth = await authenticate(req, admin);
  if (!auth.ok) return auth.res;
  const key = auth.key;

  try {
    // versioned prefix optional
    const clean = segs[0] === 'v1' ? segs.slice(1) : segs;
    const [resource, id, sub] = clean;

    // ----- READ: robots -----
    if (resource === 'robots' && req.method === 'GET') {
      const err = requireScope(key, 'read'); if (err) return err;
      if (id) {
        const { data, error } = await admin.from('robots').select('*').eq('id', id).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data || (await suppressedIds(admin)).includes(data.seller_id)) return json({ error: 'Not found' }, 404);
        return json({ data: stripContact(data) });
      }
      const { limit, offset } = paginate(url);
      let q = admin.from('robots').select('*', { count: 'exact' }).not('seller_id', 'in', supFilter(await suppressedIds(admin)));
      const brand = url.searchParams.get('brand');
      const type = url.searchParams.get('type') || url.searchParams.get('robot_type');
      const search = url.searchParams.get('search');
      const location = url.searchParams.get('location');
      if (brand) q = q.ilike('brand', `%${brand}%`);
      if (type) q = q.eq('robot_type', type);
      if (location) q = q.ilike('location', `%${location}%`);
      if (search) q = q.or(`name.ilike.%${search}%,model.ilike.%${search}%,brand.ilike.%${search}%`);
      const { data, error, count } = await q.range(offset, offset + limit - 1).order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ data: stripContactList(data ?? []), pagination: { limit, offset, total: count ?? 0 } });
    }

    // ----- READ: parts -----
    if (resource === 'parts' && req.method === 'GET') {
      const err = requireScope(key, 'read'); if (err) return err;
      if (id) {
        const { data, error } = await admin.from('spare_parts').select('*').eq('id', id).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data || (await suppressedIds(admin)).includes(data.seller_id)) return json({ error: 'Not found' }, 404);
        return json({ data: stripContact(data) });
      }
      const { limit, offset } = paginate(url);
      let q = admin.from('spare_parts').select('*', { count: 'exact' }).not('seller_id', 'in', supFilter(await suppressedIds(admin)));
      const brand = url.searchParams.get('brand');
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      if (brand) q = q.ilike('brand', `%${brand}%`);
      if (category) q = q.ilike('category', `%${category}%`);
      if (search) q = q.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
      const { data, error, count } = await q.range(offset, offset + limit - 1).order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ data: stripContactList(data ?? []), pagination: { limit, offset, total: count ?? 0 } });
    }

    // ----- READ: services -----
    if (resource === 'services' && req.method === 'GET') {
      const err = requireScope(key, 'read'); if (err) return err;
      if (id) {
        const { data, error } = await admin.from('services').select('*').eq('id', id).maybeSingle();
        if (error) return json({ error: error.message }, 400);
        if (!data || (await suppressedIds(admin)).includes(data.provider_id)) return json({ error: 'Not found' }, 404);
        return json({ data: stripContact(data) });
      }
      const { limit, offset } = paginate(url);
      let q = admin.from('services').select('*', { count: 'exact' }).not('provider_id', 'in', supFilter(await suppressedIds(admin)));
      const category = url.searchParams.get('category');
      const location = url.searchParams.get('location');
      if (category) q = q.ilike('category', `%${category}%`);
      if (location) q = q.ilike('location', `%${location}%`);
      const { data, error, count } = await q.range(offset, offset + limit - 1).order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ data: stripContactList(data ?? []), pagination: { limit, offset, total: count ?? 0 } });
    }

    // ----- READ: sellers (public profile only, contacts stripped) -----
    if (resource === 'sellers' && req.method === 'GET' && id) {
      const err = requireScope(key, 'read'); if (err) return err;
      const { data, error } = await admin.rpc('get_public_provider_profile', { provider_user_id: id });
      if (error) return json({ error: error.message }, 400);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return json({ error: 'Not found' }, 404);
      return json({ data: stripContact(row) });
    }

    // ----- READ: categories -----
    if (resource === 'categories' && req.method === 'GET') {
      const err = requireScope(key, 'read'); if (err) return err;
      const [robotTypes, partCats, serviceCats] = await Promise.all([
        admin.from('robots').select('robot_type').not('robot_type', 'is', null),
        admin.from('spare_parts').select('category').not('category', 'is', null),
        admin.from('service_categories').select('*'),
      ]);
      const uniq = (arr: unknown[], key: string) => Array.from(new Set((arr as Record<string, string>[]).map((r) => r[key]).filter(Boolean)));
      return json({
        data: {
          robot_types: uniq(robotTypes.data ?? [], 'robot_type'),
          spare_part_categories: uniq(partCats.data ?? [], 'category'),
          service_categories: serviceCats.data ?? [],
        },
      });
    }

    // ----- READ: manufacturers/brands -----
    if (resource === 'manufacturers' && req.method === 'GET') {
      const err = requireScope(key, 'read'); if (err) return err;
      const [robots, parts] = await Promise.all([
        admin.from('robots').select('brand').not('brand', 'is', null),
        admin.from('spare_parts').select('brand').not('brand', 'is', null),
      ]);
      const brands = new Set<string>();
      (robots.data ?? []).forEach((r: any) => r.brand && brands.add(r.brand));
      (parts.data ?? []).forEach((r: any) => r.brand && brands.add(r.brand));
      return json({ data: Array.from(brands).sort() });
    }

    // ----- SEARCH -----
    if (resource === 'search' && req.method === 'GET') {
      const err = requireScope(key, 'read'); if (err) return err;
      const q = url.searchParams.get('q') || '';
      const type = url.searchParams.get('type') || 'all';
      const { limit } = paginate(url);
      if (!q) return json({ error: 'Query parameter `q` is required' }, 400);
      const results: Record<string, unknown[]> = {};
      const like = `%${q}%`;
      if (type === 'all' || type === 'robots') {
        const { data } = await admin.from('robots').select('id,name,brand,model,price,currency,robot_type,images,location').not('seller_id', 'in', supFilter(await suppressedIds(admin))).or(`name.ilike.${like},brand.ilike.${like},model.ilike.${like}`).limit(limit);
        results.robots = stripContactList(data ?? []);
      }
      if (type === 'all' || type === 'parts') {
        const { data } = await admin.from('spare_parts').select('id,name,brand,category,price,part_number,images').not('seller_id', 'in', supFilter(await suppressedIds(admin))).or(`name.ilike.${like},brand.ilike.${like},part_number.ilike.${like}`).limit(limit);
        results.parts = stripContactList(data ?? []);
      }
      if (type === 'all' || type === 'services') {
        const { data } = await admin.from('services').select('id,name,category,description,location,price').not('provider_id', 'in', supFilter(await suppressedIds(admin))).or(`name.ilike.${like},description.ilike.${like}`).limit(limit);
        results.services = stripContactList(data ?? []);
      }
      return json({ data: results });
    }

    // ----- UNLOCK: contact reveal (spends seller credits, tied to API key owner) -----
    if (resource === 'unlock' && req.method === 'POST') {
      const err = requireScope(key, 'unlock'); if (err) return err;
      if (!key.user_id) return json({ error: 'Unlock requires user-owned API key' }, 403);
      const body = await req.json().catch(() => ({}));
      const { listing_type, listing_id } = body as { listing_type?: string; listing_id?: string };
      if (!listing_type || !listing_id) return json({ error: '`listing_type` and `listing_id` required' }, 400);

      // Resolve seller_id for the listing
      const table = listing_type === 'robot' ? 'robots' : listing_type === 'part' ? 'spare_parts' : listing_type === 'service' ? 'services' : null;
      if (!table) return json({ error: 'listing_type must be robot|part|service' }, 400);
      const sellerCol = table === 'services' ? 'provider_id' : 'seller_id';
      const { data: listing, error: lerr } = await admin.from(table).select(`id, ${sellerCol}`).eq('id', listing_id).maybeSingle();
      if (lerr || !listing) return json({ error: 'Listing not found' }, 404);
      const sellerId = (listing as any)[sellerCol];

      // Spend credits via existing RPC (uses caller's balance = API key owner)
      const itemType = table === 'robots' ? 'robots' : 'spare_parts';
      const { data: ok, error: unlockErr } = await admin.rpc('unlock_buyer_with_credits', {
        p_seller_id: key.user_id,
        p_lead_id: listing_id,
        p_item_type: itemType,
      });
      if (unlockErr) return json({ error: unlockErr.message }, 400);
      if (!ok) return json({ error: 'Insufficient credits' }, 402);

      // Fetch seller contact
      const { data: seller } = await admin.from('profiles').select('user_id, full_name, company_name, email, mobile_number, phone, location').eq('user_id', sellerId).neq('account_status', 'blocked').maybeSingle();
      // Record in unlocked_contacts
      await admin.from('unlocked_contacts').insert({
        user_id: key.user_id,
        contact_user_id: sellerId,
        item_id: listing_id,
        item_type: itemType,
      } as any);
      return json({ data: { seller, unlocked_at: new Date().toISOString() } });
    }

    // ----- LEADS -----
    if (resource === 'leads' && req.method === 'POST') {
      const err = requireScope(key, 'write'); if (err) return err;
      const body = await req.json().catch(() => ({}));
      const required = ['seller_id', 'buyer_name', 'item_type', 'item_id', 'item_name'];
      for (const f of required) if (!body[f]) return json({ error: `Missing field: ${f}` }, 400);
      const { data, error } = await admin.from('seller_leads').insert({
        seller_id: body.seller_id,
        buyer_id: key.user_id,
        buyer_name: body.buyer_name,
        buyer_email: body.buyer_email ?? null,
        buyer_phone: body.buyer_phone ?? null,
        buyer_company: body.buyer_company ?? null,
        item_id: body.item_id,
        item_type: body.item_type,
        item_name: body.item_name,
        message: body.message ?? null,
        source: 'api',
        status: 'new',
      } as any).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data }, 201);
    }

    // ----- QUOTES -----
    if (resource === 'quotes' && req.method === 'POST') {
      const err = requireScope(key, 'write'); if (err) return err;
      const body = await req.json().catch(() => ({}));
      const required = ['seller_id', 'item_id', 'item_type', 'buyer_name'];
      for (const f of required) if (!body[f]) return json({ error: `Missing field: ${f}` }, 400);
      const { data, error } = await admin.from('user_product_requests').insert({
        user_id: key.user_id,
        product_type: body.item_type,
        product_name: body.item_name ?? 'API quote request',
        product_id: body.item_id,
        seller_id: body.seller_id,
        contact_name: body.buyer_name,
        contact_email: body.buyer_email ?? null,
        contact_phone: body.buyer_phone ?? null,
        message: body.message ?? null,
        quantity: body.quantity ?? 1,
        status: 'pending',
      } as any).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data }, 201);
    }

    // ----- WRITE: robots (create/update/delete) -----
    if (resource === 'robots' && req.method === 'POST') {
      const err = requireScope(key, 'write'); if (err) return err;
      if (!key.user_id) return json({ error: 'Write requires user-owned API key' }, 403);
      const body = await req.json().catch(() => ({}));
      const payload = { ...body, seller_id: key.user_id };
      const { data, error } = await admin.from('robots').insert(payload).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data: stripContact(data) }, 201);
    }
    if (resource === 'robots' && req.method === 'PATCH' && id) {
      const err = requireScope(key, 'write'); if (err) return err;
      if (!key.user_id) return json({ error: 'Write requires user-owned API key' }, 403);
      const body = await req.json().catch(() => ({}));
      const { data, error } = await admin.from('robots').update(body).eq('id', id).eq('seller_id', key.user_id).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ data: stripContact(data) });
    }
    if (resource === 'robots' && req.method === 'DELETE' && id) {
      const err = requireScope(key, 'write'); if (err) return err;
      if (!key.user_id) return json({ error: 'Write requires user-owned API key' }, 403);
      const { error } = await admin.from('robots').delete().eq('id', id).eq('seller_id', key.user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ data: { deleted: true } });
    }

    // ----- WEBHOOKS -----
    if (resource === 'webhooks') {
      const err = requireScope(key, 'webhooks'); if (err) return err;
      if (req.method === 'GET') {
        const { data, error } = await admin.from('api_webhooks').select('id,url,events,is_active,last_delivered_at,failure_count,created_at').eq('api_key_id', key.id);
        if (error) return json({ error: error.message }, 400);
        return json({ data });
      }
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        if (!body.url || !Array.isArray(body.events)) return json({ error: '`url` and `events[]` required' }, 400);
        const secret = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
        const { data, error } = await admin.from('api_webhooks').insert({
          api_key_id: key.id, url: body.url, events: body.events, secret,
        } as any).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ data: { ...data, signing_secret: secret, note: 'Store this secret — it will not be shown again.' } }, 201);
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await admin.from('api_webhooks').delete().eq('id', id).eq('api_key_id', key.id);
        if (error) return json({ error: error.message }, 400);
        return json({ data: { deleted: true } });
      }
    }

    return json({ error: 'Unknown endpoint', path, method: req.method }, 404);
  } catch (e) {
    console.error('api-v1 error', e);
    return json({ error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});
