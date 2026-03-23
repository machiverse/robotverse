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

// Intent mapping for semantic understanding
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

  const location = INDIAN_CITIES.find(c => q.includes(c)) || null;

  return {
    intents: matchedIntents.length > 0 ? matchedIntents : ['general'],
    keywords: allKeywords.length > 0 ? allKeywords : [q],
    location,
  };
}

// ─── SEARCH FUNCTIONS ───────────────────────────────────────────

async function searchRobots(query: string, location: string | null) {
  const q = query.toLowerCase();
  const brands = ['fanuc', 'abb', 'kuka', 'yaskawa', 'universal robots', 'ur', 'mitsubishi', 'epson', 'staubli', 'kawasaki', 'doosan', 'omron', 'nachi', 'comau', 'denso', 'techman', 'franka', 'igus'];
  const types = ['welding', 'palletizing', 'pick and place', 'pick & place', 'painting', 'assembly', 'machine tending', 'scara', 'delta', 'collaborative', 'cobot', 'articulated', '6-axis', '4-axis', 'cartesian', 'gantry', 'mobile', 'agv', 'amr'];

  let dbQuery = supabaseAdmin
    .from('robots')
    .select('id, name, robot_type, brand, model, price, currency, payload_capacity, reach, condition, images, description, location, state, availability, applications, seller_id')
    .eq('availability', 'available')
    .limit(10);
...
  if (robots.length > 0) {
    context += '\n📦 AVAILABLE ROBOTS:\n';
    robots.forEach((r, i) => {
      context += `${i + 1}. ${r.name || 'Unknown'} | Brand: ${r.brand || 'N/A'} | Model: ${r.model || 'N/A'} | Type: ${r.robot_type || 'N/A'} | Payload: ${r.payload_capacity || 'N/A'} kg | Reach: ${r.reach || 'N/A'} mm | Price: ${r.price ? `₹${Number(r.price).toLocaleString('en-IN')}` : 'Contact for price'} | Condition: ${r.condition || 'N/A'} | Applications: ${r.applications || 'N/A'} | 📍 ${r.location || r.state || 'India'}\n`;
    });
  }

  if (parts.length > 0) {
    context += '\n🔧 SPARE PARTS / EOAT:\n';
    parts.forEach((p, i) => {
      context += `${i + 1}. ${p.name || 'Unknown'} | Brand: ${p.brand || 'N/A'} | Part#: ${p.part_number || 'N/A'} | Category: ${p.main_category || p.category || 'N/A'} > ${p.sub_category || 'N/A'} | Price: ${p.price ? `₹${Number(p.price).toLocaleString('en-IN')}` : 'Contact for price'} | Condition: ${p.condition || 'N/A'} | Compatible: ${Array.isArray(p.compatible_robots) ? p.compatible_robots.join(', ') : 'N/A'} | 📍 ${p.location || p.state || 'India'}\n`;
    });
  }

  if (services.length > 0) {
    context += '\n🏭 SYSTEM INTEGRATORS / SERVICE PROVIDERS:\n';
    services.forEach((s, i) => {
      context += `${i + 1}. ${s.name || 'Unknown'} | Type: ${s.service_type || 'N/A'} | Specializations: ${Array.isArray(s.specializations) ? s.specializations.join(', ') : 'N/A'} | Price: ${s.price_range || 'N/A'} | 📍 ${s.location || 'India'} | Coverage: ${s.coverage || 'N/A'}\n`;
    });
  }

  if (logistics.length > 0) {
    context += '\n🚚 LOGISTICS SERVICES:\n';
    logistics.forEach((l, i) => {
      context += `${i + 1}. ${l.service_name || 'Unknown'} | Type: ${l.service_type || 'N/A'} | Base Price: ${l.base_price ? `₹${Number(l.base_price).toLocaleString('en-IN')}` : 'N/A'} | Max Weight: ${l.max_weight_kg || 'N/A'} kg | Delivery: ${l.delivery_time_hours || 'N/A'} hrs | Transport: ${Array.isArray(l.transport_modes) ? l.transport_modes.join(', ') : 'N/A'} | Insurance: ${l.insurance_included ? 'Yes' : 'No'} | Tracking: ${l.tracking_available ? 'Yes' : 'No'} | Coverage: ${Array.isArray(l.coverage_areas) ? l.coverage_areas.join(', ') : 'N/A'}\n`;
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

// ─── MAIN HANDLER ───────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userQuery } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error('Messages array required');

    const latestQuery = userQuery || messages[messages.length - 1]?.content || '';
    const { intents, location } = identifyIntent(latestQuery);

    // Determine which tables to search based on intent
    const searchLogisticsFlag = intents.includes('logistics') || intents.includes('general');
    const searchFinanceFlag = intents.includes('finance') || intents.includes('general');

    // Run all searches in parallel across ALL tables
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
2. Structure responses in clean, professional sections with clear headings and bullet points. Only include sections with actual data.

FORMAT EACH SECTION LIKE THIS:

### 🤖 Robots Found

| # | Robot | Brand | Payload | Reach | Price | Condition | Location |
|---|-------|-------|---------|-------|-------|-----------|----------|
| 1 | Name  | Brand | XX kg   | XX mm | ₹XX  | Used/New  | City     |

**Key Highlights:**
- Point 1 about the best match and why
- Point 2 about alternatives

### 🔧 Spare Parts & EOAT

- **[Part Name]** — Brand: [X] | Category: [X] | Price: ₹XX | Compatible: [Robots]

### 🏭 Service Providers

- **[Company Name]** — [Specialization] | 📍 [Location] | Coverage: [X]

### 🚚 Logistics

- **[Service]** — Type: [X] | ₹XX base | Delivery: XX hrs

### 💰 Financing

- **[Product/Scheme]** — Interest: X%-X% | ₹X–₹X | Tenure: X months

### 👥 Verified Sellers

- **[Company]** — [Roles] | 📍 [Location]

### 📰 Related Articles

- **"[Title]"** — [Brief excerpt]

3. Skip empty sections entirely — don't show "No results" for each.
4. Start with a one-line summary answering the user's question directly.
5. Use **bold** for product names and key specs. Use bullet points (not numbered lists) for details.
6. End with a brief "💡 **Recommendation:**" section with 2-3 actionable next steps.
7. If no exact match → suggest closest alternatives + recommend posting a requirement.
8. If query is vague → ask a focused clarification question with options.
9. For comparisons → use markdown tables for side-by-side specs.
10. Prices in ₹ (INR). Prioritize Indian suppliers.
11. Keep responses structured but concise — max 25 lines.
12. For general queries, describe available categories and invite exploration.
13. Never return completely empty — always provide something useful.
14. Use horizontal rules (---) between major sections for visual separation.

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
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI Gateway error:', response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
