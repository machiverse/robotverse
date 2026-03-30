import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const INTENT_MAP: Record<string, string[]> = {
  welding: ['welding', 'arc welding', 'mig', 'tig', 'spot welding', 'weld'],
  palletizing: ['palletizing', 'palletizer', 'pallet', 'stacking'],
  'pick and place': ['pick and place', 'pick & place', 'pick-and-place', 'delta', 'scara'],
  painting: ['painting', 'spray', 'coating', 'paint'],
  assembly: ['assembly', 'screw', 'fastening', 'collaborative', 'cobot'],
  'machine tending': ['machine tending', 'cnc', 'loading', 'unloading'],
  maintenance: ['maintenance', 'repair', 'service', 'engineer', 'amc', 'breakdown'],
  inspection: ['inspection', 'vision', 'quality', 'testing'],
  packaging: ['packaging', 'packing', 'carton', 'box'],
  grinding: ['grinding', 'polishing', 'deburring', 'finishing'],
  logistics: ['logistics', 'shipping', 'transport', 'delivery', 'freight', 'cargo'],
  finance: ['finance', 'loan', 'emi', 'leasing', 'funding', 'subsidy', 'scheme'],
  spare: ['spare', 'part', 'component', 'eoat', 'gripper', 'sensor', 'controller', 'teach pendant'],
};

const INDIAN_CITIES = ['chennai', 'bangalore', 'bengaluru', 'mumbai', 'pune', 'delhi', 'hyderabad', 'ahmedabad', 'coimbatore', 'noida', 'gurgaon', 'gurugram', 'kolkata', 'jaipur', 'lucknow', 'surat', 'indore', 'nagpur', 'vadodara', 'bhopal', 'visakhapatnam', 'kochi', 'thiruvananthapuram', 'chandigarh', 'ludhiana', 'rajkot', 'madurai', 'nashik', 'aurangabad', 'faridabad'];

function identifyIntent(query: string): { intents: string[]; keywords: string[]; location: string | null } {
  const q = query.toLowerCase();
  const matchedIntents: string[] = [];
  const allKeywords: string[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_MAP)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        matchedIntents.push(intent);
        allKeywords.push(...keywords);
        break;
      }
    }
  }

  const location = INDIAN_CITIES.find((c) => q.includes(c)) || null;

  return {
    intents: matchedIntents.length > 0 ? matchedIntents : ['general'],
    keywords: allKeywords.length > 0 ? allKeywords : [q],
    location,
  };
}

async function searchRobots(query: string, location: string | null) {
  const q = query.toLowerCase();
  const brands = ['fanuc', 'abb', 'kuka', 'yaskawa', 'universal robots', 'ur', 'mitsubishi', 'epson', 'staubli', 'kawasaki', 'doosan', 'omron', 'nachi', 'comau', 'denso', 'techman', 'franka', 'igus'];
  const types = ['welding', 'palletizing', 'pick and place', 'pick & place', 'painting', 'assembly', 'machine tending', 'scara', 'delta', 'collaborative', 'cobot', 'articulated', '6-axis', '4-axis', 'cartesian', 'gantry', 'mobile', 'agv', 'amr'];

  let dbQuery = supabaseAdmin
    .from('robots')
    .select('id, name, robot_type, brand, model, price, currency, payload_capacity, reach, condition, images, description, location, state, availability, applications, seller_id')
    .eq('availability', 'available')
    .limit(10);

  const matchedBrand = brands.find((b) => q.includes(b));
  const matchedType = types.find((t) => q.includes(t));

  if (matchedBrand) dbQuery = dbQuery.ilike('brand', `%${matchedBrand}%`);
  if (matchedType) dbQuery = dbQuery.or(`robot_type.ilike.%${matchedType}%,description.ilike.%${matchedType}%,name.ilike.%${matchedType}%`);
  if (location) dbQuery = dbQuery.or(`location.ilike.%${location}%,state.ilike.%${location}%`);

  const payloadMatch = q.match(/(\d+)\s*kg/);
  if (payloadMatch) {
    const payload = parseInt(payloadMatch[1]);
    dbQuery = dbQuery.lte('payload_capacity', payload + 15).gte('payload_capacity', Math.max(0, payload - 10));
  }

  const priceMatch = q.match(/(\d+)\s*lakh/);
  if (priceMatch) {
    const budget = parseInt(priceMatch[1]) * 100000;
    dbQuery = dbQuery.lte('price', budget);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error('Robot search error:', error.message);
    return [];
  }

  return data || [];
}

async function searchSpareParts(query: string, location: string | null) {
  const q = query.toLowerCase();
  const searchTerms = q.split(/\s+/).filter((t) => t.length > 2);

  let dbQuery = supabaseAdmin
    .from('spare_parts')
    .select('id, name, part_number, brand, price, currency, condition, category, main_category, sub_category, compatible_robots, location, state, description, seller_id')
    .limit(8);

  const orFilters = searchTerms
    .map((term) => `name.ilike.%${term}%,brand.ilike.%${term}%,category.ilike.%${term}%,main_category.ilike.%${term}%,sub_category.ilike.%${term}%,description.ilike.%${term}%`)
    .join(',');

  if (orFilters) dbQuery = dbQuery.or(orFilters);
  if (location) dbQuery = dbQuery.or(`location.ilike.%${location}%,state.ilike.%${location}%`);

  const { data, error } = await dbQuery;
  if (error) {
    console.error('Spare parts search error:', error.message);
    return [];
  }

  return data || [];
}

async function searchServices(query: string, location: string | null) {
  const q = query.toLowerCase();
  const searchTerms = q.split(/\s+/).filter((t) => t.length > 2);

  let dbQuery = supabaseAdmin
    .from('services')
    .select('id, name, service_type, specializations, price_range, location, coverage, description, provider_id')
    .limit(8);

  if (searchTerms.length > 0) {
    const orFilters = searchTerms
      .map((term) => `name.ilike.%${term}%,service_type.ilike.%${term}%,description.ilike.%${term}%`)
      .join(',');
    dbQuery = dbQuery.or(orFilters);
  }

  if (location) dbQuery = dbQuery.ilike('location', `%${location}%`);

  const { data, error } = await dbQuery;
  if (error) {
    console.error('Services search error:', error.message);
    return [];
  }

  return data || [];
}

async function searchLogistics(_query: string, _location: string | null) {
  const { data, error } = await supabaseAdmin
    .from('logistics_services')
    .select('id, provider_id, service_name, service_type, description, coverage_areas, base_price, max_weight_kg, delivery_time_hours, transport_modes, special_handling, insurance_included, tracking_available, is_active')
    .eq('is_active', true)
    .limit(5);

  if (error) {
    console.error('Logistics search error:', error.message);
    return [];
  }

  return data || [];
}

async function searchFinance(_query: string) {
  const { data: loanProducts, error: lpErr } = await supabaseAdmin
    .from('loan_products')
    .select('id, provider_id, product_name, loan_type, description, min_amount, max_amount, min_interest_rate, max_interest_rate, min_tenure_months, max_tenure_months, processing_fee_percentage, collateral_required, quick_approval, is_active')
    .eq('is_active', true)
    .limit(5);

  const { data: loanSchemes, error: lsErr } = await supabaseAdmin
    .from('loan_schemes')
    .select('id, provider_id, scheme_name, scheme_type, description, interest_rate_min, interest_rate_max, max_amount, features, is_government_scheme, is_active')
    .eq('is_active', true)
    .limit(5);

  if (lpErr) console.error('Loan products search error:', lpErr.message);
  if (lsErr) console.error('Loan schemes search error:', lsErr.message);

  return {
    loanProducts: loanProducts || [],
    loanSchemes: loanSchemes || [],
  };
}

async function searchSellers(_query: string, location: string | null) {
  let dbQuery = supabaseAdmin
    .from('profiles')
    .select('user_id, full_name, company_name, location, city, user_type, account_type, user_roles, service_categories')
    .eq('registration_complete', true)
    .in('account_type', ['seller', 'logistics', 'finance'])
    .limit(10);

  if (location) dbQuery = dbQuery.or(`location.ilike.%${location}%,city.ilike.%${location}%`);

  const { data, error } = await dbQuery;
  if (error) {
    console.error('Sellers search error:', error.message);
    return [];
  }

  return data || [];
}

async function searchBlogs(query: string) {
  const q = query.toLowerCase();
  const searchTerms = q.split(/\s+/).filter((t) => t.length > 3);
  if (searchTerms.length === 0) return [];

  const orFilters = searchTerms.map((t) => `title.ilike.%${t}%,content.ilike.%${t}%`).join(',');
  const { data, error } = await supabaseAdmin
    .from('blogs')
    .select('id, title, excerpt, tags, created_at')
    .eq('status', 'published')
    .or(orFilters)
    .limit(3);

  if (error) {
    console.error('Blogs search error:', error.message);
    return [];
  }

  return data || [];
}

async function getMarketStats() {
  const [robotsRes, partsRes, servicesRes, sellersRes] = await Promise.all([
    supabaseAdmin.from('robots').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('spare_parts').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('services').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }).eq('registration_complete', true),
  ]);

  return {
    totalRobots: robotsRes.count || 0,
    totalParts: partsRes.count || 0,
    totalServices: servicesRes.count || 0,
    totalSellers: sellersRes.count || 0,
  };
}

function buildDatabaseContext(
  robots: any[],
  parts: any[],
  services: any[],
  logistics: any[],
  finance: { loanProducts: any[]; loanSchemes: any[] },
  sellers: any[],
  blogs: any[],
  stats: any,
): string {
  let context = `\n\nMARKETPLACE STATS: ${stats.totalRobots} robots, ${stats.totalParts} spare parts, ${stats.totalServices} services, ${stats.totalSellers} registered sellers/providers\n`;

  if (robots.length > 0) {
    context += '\n📦 AVAILABLE ROBOTS:\n';
    robots.forEach((r, i) => {
      context += `${i + 1}. [ID:${r.id}] ${r.name || 'Unknown'} | Brand: ${r.brand || 'N/A'} | Model: ${r.model || 'N/A'} | Type: ${r.robot_type || 'N/A'} | Payload: ${r.payload_capacity || 'N/A'} kg | Reach: ${r.reach || 'N/A'} mm | Price: ${r.price ? `₹${Number(r.price).toLocaleString('en-IN')}` : 'Contact for price'} | Condition: ${r.condition || 'N/A'} | Applications: ${r.applications || 'N/A'} | 📍 ${r.location || r.state || 'India'}\n`;
    });
  }

  if (parts.length > 0) {
    context += '\n🔧 SPARE PARTS / EOAT:\n';
    parts.forEach((p, i) => {
      context += `${i + 1}. [ID:${p.id}] ${p.name || 'Unknown'} | Brand: ${p.brand || 'N/A'} | Part#: ${p.part_number || 'N/A'} | Category: ${p.main_category || p.category || 'N/A'} > ${p.sub_category || 'N/A'} | Price: ${p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : 'Contact for price'} | Condition: ${p.condition || 'N/A'} | Compatible: ${Array.isArray(p.compatible_robots) ? p.compatible_robots.join(', ') : 'N/A'} | 📍 ${p.location || p.state || 'India'}\n`;
    });
  }

  if (services.length > 0) {
    context += '\n🏭 SYSTEM INTEGRATORS / SERVICE PROVIDERS:\n';
    services.forEach((s, i) => {
      context += `${i + 1}. [ID:${s.id}] ${s.name || 'Unknown'} | Type: ${s.service_type || 'N/A'} | Specializations: ${Array.isArray(s.specializations) ? s.specializations.join(', ') : 'N/A'} | Price: ${s.price_range || 'N/A'} | 📍 ${s.location || 'India'} | Coverage: ${s.coverage || 'N/A'}\n`;
    });
  }

  if (logistics.length > 0) {
    context += '\n🚚 LOGISTICS SERVICES:\n';
    logistics.forEach((l, i) => {
      context += `${i + 1}. [ID:${l.id}] ${l.service_name || 'Unknown'} | Type: ${l.service_type || 'N/A'} | Base Price: ${l.base_price ? `₹${Number(l.base_price).toLocaleString('en-IN')}` : 'N/A'} | Max Weight: ${l.max_weight_kg || 'N/A'} kg | Delivery: ${l.delivery_time_hours || 'N/A'} hrs | Transport: ${Array.isArray(l.transport_modes) ? l.transport_modes.join(', ') : 'N/A'} | Insurance: ${l.insurance_included ? 'Yes' : 'No'} | Tracking: ${l.tracking_available ? 'Yes' : 'No'} | Coverage: ${Array.isArray(l.coverage_areas) ? l.coverage_areas.join(', ') : 'N/A'}\n`;
    });
  }

  if (finance.loanProducts.length > 0 || finance.loanSchemes.length > 0) {
    context += '\n💰 FINANCING OPTIONS:\n';
    finance.loanProducts.forEach((lp, i) => {
      context += `${i + 1}. [Loan] ${lp.product_name || 'Unknown'} | Type: ${Array.isArray(lp.loan_type) ? lp.loan_type.join(', ') : 'N/A'} | Amount: ₹${lp.min_amount ? Number(lp.min_amount).toLocaleString('en-IN') : '?'} - ₹${lp.max_amount ? Number(lp.max_amount).toLocaleString('en-IN') : '?'} | Interest: ${lp.min_interest_rate || '?'}% - ${lp.max_interest_rate || '?'}% | Tenure: ${lp.min_tenure_months || '?'} - ${lp.max_tenure_months || '?'} months | Quick Approval: ${lp.quick_approval ? 'Yes' : 'No'} | Collateral: ${lp.collateral_required ? 'Required' : 'Not required'}\n`;
    });
    finance.loanSchemes.forEach((ls, i) => {
      context += `${i + 1}. [Scheme] ${ls.scheme_name || 'Unknown'} | Type: ${ls.scheme_type || 'N/A'} | Interest: ${ls.interest_rate_min || '?'}% - ${ls.interest_rate_max || '?'}% | Max Amount: ₹${ls.max_amount ? Number(ls.max_amount).toLocaleString('en-IN') : '?'} | Govt: ${ls.is_government_scheme ? 'Yes' : 'No'} | Features: ${Array.isArray(ls.features) ? ls.features.join(', ') : 'N/A'}\n`;
    });
  }

  if (sellers.length > 0) {
    context += '\n👥 REGISTERED SELLERS / PROVIDERS:\n';
    sellers.forEach((s, i) => {
      const roles = Array.isArray(s.user_roles) ? s.user_roles.join(', ') : s.user_type || 'N/A';
      context += `${i + 1}. ${s.company_name || s.full_name || 'Unknown'} | Roles: ${roles} | 📍 ${s.city || s.location || 'India'}\n`;
    });
  }

  if (blogs.length > 0) {
    context += '\n📰 RELATED ARTICLES:\n';
    blogs.forEach((b, i) => {
      context += `${i + 1}. "${b.title}" | Tags: ${Array.isArray(b.tags) ? b.tags.join(', ') : 'N/A'} | ${b.excerpt ? b.excerpt.slice(0, 80) + '...' : ''}\n`;
    });
  }

  if (robots.length === 0 && parts.length === 0 && services.length === 0 && logistics.length === 0 && finance.loanProducts.length === 0 && sellers.length === 0) {
    context += '\nNO EXACT MATCHES FOUND IN DATABASE. Suggest closest alternatives based on marketplace stats.';
  }

  return context;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userQuery } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error('Messages array required');

    const latestQuery = userQuery || messages[messages.length - 1]?.content || '';
    const { intents, location } = identifyIntent(latestQuery);

    const searchLogisticsFlag = intents.includes('logistics') || intents.includes('general');
    const searchFinanceFlag = intents.includes('finance') || intents.includes('general');

    const [robots, parts, services, logistics, finance, sellers, blogs, stats] = await Promise.all([
      searchRobots(latestQuery, location),
      searchSpareParts(latestQuery, location),
      searchServices(latestQuery, location),
      searchLogisticsFlag ? searchLogistics(latestQuery, location) : Promise.resolve([]),
      searchFinanceFlag ? searchFinance(latestQuery) : Promise.resolve({ loanProducts: [], loanSchemes: [] }),
      searchSellers(latestQuery, location),
      searchBlogs(latestQuery),
      getMarketStats(),
    ]);

    const dbContext = buildDatabaseContext(robots, parts, services, logistics, finance, sellers, blogs, stats);

    const systemPrompt = `You are the RobotVerse AI Assistant — a smart industrial automation consultant and marketplace search engine for www.robotverse.in, India's leading industrial robotics marketplace.

IDENTIFIED INTENTS: ${intents.join(', ')}
LOCATION HINT: ${location || 'Not specified'}

YOUR CAPABILITIES:
You have FULL ACCESS to analyze ALL tables in the RobotVerse database:
- 🤖 Robots (${stats.totalRobots} listings) - Industrial, collaborative, mobile robots
- 🔧 Spare Parts & EOAT (${stats.totalParts} items) - Components, grippers, sensors, controllers
- 🏭 Services (${stats.totalServices} providers) - System integrators, maintenance, repair
- 🚚 Logistics - Shipping, transport, freight for robotics equipment
- 💰 Finance - Loans, EMI options, government schemes for robot purchases
- 👥 Sellers & Providers (${stats.totalSellers} registered) - Verified marketplace sellers
- 📰 Knowledge Base - Articles, guides, industry insights

RESPONSE RULES:
1. ONLY use the database results provided below. Do NOT fabricate listings or companies.
2. **NEVER use tables.** Present ALL data as neat **numbered bullet points** with bold labels.
3. Skip empty sections entirely — don't show "No results" for each section.
4. Show **maximum 5 items** per section. If fewer are available, show what's there.
5. Prioritize results nearest to the user's location and best price first.
6. Start with a brief one-line summary answering the user's question.

MANDATORY SECTION ORDER (follow strictly, skip section if no data):

> 📊 **Summary:** [One sentence answering the query with count of results found]

---

### 🤖 Top Matching Robots

1. **[Robot Name]**
   - 🏭 **Brand:** [Brand] | **Model:** [Model]
   - ⚙️ **Type:** [Type] | **Payload:** [XX] kg | **Reach:** [XX] mm
   - 💰 **Price:** ₹[X,XX,XXX] | **Condition:** [New/Used]
   - 📍 **Location:** [City, State]
   - 🔧 **Applications:** [Applications]
   - 🔗 [View Details →](/robots/[ID])

2. **[Next Robot]** ...

---

### 🔧 EOAT & Spare Parts

1. **[Part Name]**
   - 🏷️ **Brand:** [Brand] | **Part#:** [Number]
   - 📦 **Category:** [Main > Sub]
   - 💰 **Price:** ₹[XX,XXX] | **Condition:** [New/Used]
   - 🔗 **Compatible With:** [Robot models]
   - 📍 **Location:** [City]
   - 🔗 [View Details →](/parts/[ID])

---

### 🏭 System Integrators & Software Programmers

1. **[Company/Service Name]**
   - 🛠️ **Specialization:** [Type]
   - 💰 **Price Range:** [Range]
   - 📍 **Location:** [City] | **Coverage:** [Area]
   - 🔗 [View Details →](/services/[ID])

---

### 🚚 Logistics Services

1. **[Service Name]**
   - 🚛 **Type:** [Type] | **Max Weight:** [XX] kg
   - 💰 **Base Price:** ₹[XX,XXX]
   - 📍 **Coverage:** [Areas]
   - 🔗 [View Details →](/logistics/[ID])

---

### 💰 Financing & Loan Options

1. **[Product/Scheme Name]**
   - 📊 **Type:** [Loan Type] | **Interest:** [X%-Y%]
   - 💵 **Amount:** ₹[Min] - ₹[Max]
   - 📋 **Tenure:** [X-Y] months
   - 🔗 [View Details →](/financing/[ID])

---

### 👥 Verified Sellers & Providers

1. **[Company Name]**
   - 🏢 **Role:** [Roles]
   - 📍 **Location:** [City]

---

### 💡 Recommendation & Best Match

- 🏆 **Best Match:** [Which product/service is the best fit and WHY — consider user's location proximity and price]
- 📍 **Nearest to You:** [Highlight the closest option to user's area]
- 💰 **Best Price:** [Highlight the most affordable option]
- ➡️ **Next Step:** [What user should do — e.g. "Request a quote on RobotVerse", "Compare these models"]
- 💡 **Pro Tip:** [Industry insight or cost-saving advice]

---

ADDITIONAL RULES:
- Use **bold** for all product names, key specs, and important values.
- Use emojis as visual markers for each data point.
- Always include horizontal rules (---) between sections for visual separation.
- If no exact match → suggest closest alternatives + recommend posting a requirement on RobotVerse.
- If query is vague → ask a focused clarification question with 3-4 bullet-point options.
- Prices always in ₹ (INR) with Indian number formatting.
- Never return completely empty — always provide something useful.
- Keep it professional, scannable, and visually clean with consistent formatting.

DATABASE RESULTS:${dbContext}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      })),
    ];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: aiMessages,
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI service error (${response.status})`);
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content;
    if (!textContent) throw new Error('No response generated from AI');

    return new Response(JSON.stringify({
      content: textContent,
      intents,
      stats,
      resultCounts: {
        robots: robots.length,
        spareParts: parts.length,
        services: services.length,
        logistics: logistics.length,
        loanProducts: finance.loanProducts.length,
        loanSchemes: finance.loanSchemes.length,
        sellers: sellers.length,
        blogs: blogs.length,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('AI Assistant error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});