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

// Search robots matching user criteria
async function searchRobots(query: string) {
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  let dbQuery = supabaseAdmin
    .from('robots')
    .select('id, name, robot_type, brand, model, price, currency, payload_capacity, reach, condition, images, description, profiles!robots_seller_id_fkey(company_name, location)')
    .eq('status', 'available')
    .limit(10);

  // Try to filter by brand/type if mentioned
  const brands = ['fanuc', 'abb', 'kuka', 'yaskawa', 'universal robots', 'ur', 'mitsubishi', 'epson', 'staubli', 'kawasaki', 'doosan', 'omron'];
  const types = ['welding', 'palletizing', 'pick and place', 'pick & place', 'painting', 'assembly', 'machine tending', 'scara', 'delta', 'collaborative', 'cobot', 'articulated', '6-axis', '4-axis'];
  
  const matchedBrand = brands.find(b => query.toLowerCase().includes(b));
  const matchedType = types.find(t => query.toLowerCase().includes(t));
  
  if (matchedBrand) {
    dbQuery = dbQuery.ilike('brand', `%${matchedBrand}%`);
  }
  if (matchedType) {
    dbQuery = dbQuery.or(`robot_type.ilike.%${matchedType}%,description.ilike.%${matchedType}%,name.ilike.%${matchedType}%`);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error('Robot search error:', error.message);
    return [];
  }
  return data || [];
}

// Search spare parts
async function searchSpareParts(query: string) {
  const { data, error } = await supabaseAdmin
    .from('spare_parts')
    .select('id, name, part_number, brand, price, currency, condition, category, compatible_robots, profiles!spare_parts_seller_id_fkey(company_name, location)')
    .or(`name.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%`)
    .limit(5);

  if (error) {
    console.error('Spare parts search error:', error.message);
    return [];
  }
  return data || [];
}

// Search services/integrators
async function searchServices(query: string, location?: string) {
  let dbQuery = supabaseAdmin
    .from('services')
    .select('id, title, service_type, specializations, price_range, profiles!services_provider_id_fkey(company_name, location)')
    .limit(5);

  if (location) {
    dbQuery = dbQuery.ilike('profiles.location', `%${location}%`);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error('Services search error:', error.message);
    return [];
  }
  return data || [];
}

// Build context from DB results
function buildDatabaseContext(robots: any[], parts: any[], services: any[]): string {
  let context = '';
  
  if (robots.length > 0) {
    context += '\n\nAVAILABLE ROBOTS IN DATABASE:\n';
    robots.forEach((r, i) => {
      context += `${i + 1}. ${r.name || 'Unknown'} | Brand: ${r.brand || 'N/A'} | Model: ${r.model || 'N/A'} | Type: ${r.robot_type || 'N/A'} | Payload: ${r.payload_capacity || 'N/A'} kg | Reach: ${r.reach || 'N/A'} mm | Price: ${r.price ? `${r.currency || 'INR'} ${r.price}` : 'Contact for price'} | Condition: ${r.condition || 'N/A'} | Seller: ${r.profiles?.company_name || 'N/A'} (${r.profiles?.location || 'India'})\n`;
    });
  }
  
  if (parts.length > 0) {
    context += '\n\nAVAILABLE SPARE PARTS IN DATABASE:\n';
    parts.forEach((p, i) => {
      context += `${i + 1}. ${p.name || 'Unknown'} | Brand: ${p.brand || 'N/A'} | Part#: ${p.part_number || 'N/A'} | Category: ${p.category || 'N/A'} | Price: ${p.price ? `${p.currency || 'INR'} ${p.price}` : 'Contact for price'} | Compatible: ${Array.isArray(p.compatible_robots) ? p.compatible_robots.join(', ') : 'N/A'} | Seller: ${p.profiles?.company_name || 'N/A'} (${p.profiles?.location || 'India'})\n`;
    });
  }
  
  if (services.length > 0) {
    context += '\n\nAVAILABLE SERVICE PROVIDERS / INTEGRATORS:\n';
    services.forEach((s, i) => {
      context += `${i + 1}. ${s.title || 'Unknown'} | Type: ${s.service_type || 'N/A'} | Specializations: ${Array.isArray(s.specializations) ? s.specializations.join(', ') : 'N/A'} | Price: ${s.price_range || 'N/A'} | Provider: ${s.profiles?.company_name || 'N/A'} (${s.profiles?.location || 'India'})\n`;
    });
  }
  
  if (!context) {
    context = '\n\nNO MATCHING RESULTS FOUND IN DATABASE.';
  }
  
  return context;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, userQuery } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error('Messages array required');

    const latestQuery = userQuery || messages[messages.length - 1]?.content || '';

    // Search database in parallel
    const [robots, parts, services] = await Promise.all([
      searchRobots(latestQuery),
      searchSpareParts(latestQuery),
      searchServices(latestQuery),
    ]);

    const dbContext = buildDatabaseContext(robots, parts, services);

    const systemPrompt = `You are the RobotVerse AI Assistant — a specialist in industrial robots, end-of-arm tools (EOAT), spare parts, and system integrators for the Indian market.

RULES:
- ONLY use the database results provided below. Do NOT make up data.
- Keep responses SHORT (6-8 lines max), visual, and easy to scan.
- Use emoji bullets (🔹) for sections.
- If no exact match found, say "No exact match found. Here are closest options:" and suggest alternatives from the data.
- If no data at all, say you couldn't find matches and suggest the user try different keywords or browse the marketplace.
- Always mention seller location when available.
- Prices in INR unless specified otherwise.
- For EOAT suggestions, you can recommend general tool types (grippers, welding torches, etc.) based on the application.

RESPONSE FORMAT:
🔹 **Recommended Robots**
- Model: [Name] | Payload: XX kg | Reach: XXX mm | Price: ₹XX

🔹 **Suggested EOAT** (if relevant)
- [Tool type recommendation]

🔹 **Spare Parts** (if relevant)
- [Part Name] | [Price]

🔹 **System Integrators** (if found)
- [Company Name] – [Location]

Only include sections that have data. Skip empty sections.

DATABASE RESULTS:${dbContext}`;

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY is not configured');

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-6), // Last 6 messages for context
        ],
        temperature: 0.5,
        max_tokens: 800,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('DeepSeek error:', response.status, errText);
      throw new Error(`AI service error (${response.status})`);
    }

    // Stream the response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
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
