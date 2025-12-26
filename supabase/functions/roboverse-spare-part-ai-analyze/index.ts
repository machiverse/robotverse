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

async function getSparePartDetails(sparePartId: string) {
  const { data, error } = await supabaseAdmin
    .from('spare_parts')
    .select(`
      *,
      profiles!spare_parts_seller_id_fkey (location, company_name, full_name, mobile_number, email)
    `)
    .eq('id', sparePartId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch spare part details: ${error.message}`);
  if (!data) throw new Error('Spare part not found');
  return data;
}

async function getMarketEcosystem(compatibleRobots: string[], _category: string) {
  const [robotsRes, servicesRes, logisticsRes, financeRes] = await Promise.all([
    supabaseAdmin
      .from('robots')
      .select('*, profiles!robots_seller_id_fkey(*)')
      .limit(5),
    supabaseAdmin
      .from('services')
      .select('*, profiles!services_provider_id_fkey(*)')
      .or(`service_type.eq.maintenance,service_type.eq.repair`)
      .limit(10),
    supabaseAdmin.from('profiles').select('*').eq('account_type', 'logistics').limit(5),
    supabaseAdmin.from('profiles').select('*').eq('account_type', 'finance').limit(5),
  ]);

  return {
    robots: robotsRes.data || [],
    services: servicesRes.data || [],
    logistics: logisticsRes.data || [],
    finance: financeRes.data || [],
  };
}

interface SparePartData {
  name: string;
  part_number?: string;
  brand?: string;
  model?: string;
  main_category?: string;
  sub_category?: string;
  price?: number;
  currency?: string;
  condition?: string;
  location?: string;
  compatible_robots?: string[];
  description?: string;
  specifications?: Record<string, unknown>;
  is_international?: boolean;
  profiles?: {
    location?: string;
    company_name?: string;
  };
}

interface MarketData {
  robots: unknown[];
  services: unknown[];
  logistics: unknown[];
  finance: unknown[];
}

function buildAnalysisPrompt(sparePart: SparePartData, marketData: MarketData): string {
  const location = sparePart.profiles?.location || sparePart.location || 'Not specified';
  
  return `Analyze this industrial robot spare part and provide comprehensive market insights for the **Indian market**:

SPARE PART DETAILS:
- Name: ${sparePart.name}
- Part Number: ${sparePart.part_number || 'Not specified'}
- Brand: ${sparePart.brand || 'Not specified'}
- Model: ${sparePart.model || 'Not specified'}
- Category: ${sparePart.main_category || 'Not specified'} / ${sparePart.sub_category || 'General'}
- Price: ${sparePart.price ? `${sparePart.currency || 'INR'} ${sparePart.price}` : 'Price on request'}
- Condition: ${sparePart.condition || 'Not specified'}
- Location: ${location}
- Compatible Robots: ${sparePart.compatible_robots?.join(', ') || 'Universal/Multiple brands'}
- Seller: ${sparePart.profiles?.company_name || 'Not specified'}
- Description: ${sparePart.description || 'No description provided'}
- Specifications: ${sparePart.specifications ? JSON.stringify(sparePart.specifications) : 'Not available'}
- International: ${sparePart.is_international ? 'Yes' : 'No'}

MARKET ECOSYSTEM:
- Compatible Robots: ${marketData.robots.length}
- Service Providers: ${marketData.services.length}
- Logistics Providers: ${marketData.logistics.length}
- Finance Providers: ${marketData.finance.length}

Provide detailed analysis covering:
1. Market Position & Pricing (India-wide trends, competitiveness, fair market value)
2. Compatibility Assessment (Which robot brands/models, universal applicability)
3. Quality & Reliability (Brand reputation, expected lifespan, warranty considerations)
4. Supply Chain Analysis (Availability in India, lead times, alternative suppliers)
5. Cost Analysis (Total cost including shipping/duty, comparison with alternatives)
6. Applications & Use Cases (Which industries, maintenance schedules, failure rates)
7. Purchase Recommendations (Best time to buy, negotiation tips, bulk discounts)
8. Risk Assessment (Obsolescence, counterfeit risks, return policies)

Format as structured, actionable insights for decision-making.`;
}

async function getAiAnalysis(prompt: string): Promise<string> {
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a senior industrial spare parts specialist and market analyst specializing in the Indian robotics spare parts market. Provide detailed, actionable insights for procurement decisions.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`DeepSeek API failed with status ${response.status}: ${errorBody}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}

function extractSection(analysis: string, sectionType: string): string {
  const patterns: Record<string, RegExp> = {
    pricing: /(?:pricing|price|cost|value)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    compatibility: /(?:compatibility|compatible|fit|works with)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    quality: /(?:quality|reliability|durability|brand)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    applications: /(?:applications|use cases|industries|usage)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i
  };
  const match = analysis.match(patterns[sectionType]);
  return match ? match[0].trim() : '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { sparePartId } = await req.json();
    if (!sparePartId) throw new Error('Spare part ID is required.');

    console.log('Fetching spare part details for:', sparePartId);
    const sparePart = await getSparePartDetails(sparePartId);
    
    const marketData = await getMarketEcosystem(
      sparePart.compatible_robots || [],
      sparePart.main_category || 'general'
    );

    console.log('Building analysis prompt...');
    const prompt = buildAnalysisPrompt(sparePart, marketData);
    const analysisContent = await getAiAnalysis(prompt);

    const structuredAnalysis = {
      summary: analysisContent,
      pricing: extractSection(analysisContent, 'pricing'),
      compatibility: extractSection(analysisContent, 'compatibility'),
      quality: extractSection(analysisContent, 'quality'),
      applications: extractSection(analysisContent, 'applications'),
      timestamp: new Date().toISOString()
    };

    const marketEcosystem = {
      robots: { compatible: marketData.robots.slice(0, 5) },
      services: { providers: marketData.services.slice(0, 5) },
      logistics: { providers: marketData.logistics.slice(0, 3) },
      finance: { providers: marketData.finance.slice(0, 3) }
    };

    return new Response(JSON.stringify({
      success: true,
      sparePart: {
        ...sparePart,
        marketInsights: {
          priceRange: sparePart.price ? `${sparePart.currency || 'INR'} ${sparePart.price}` : 'Contact for pricing',
          location: sparePart.profiles?.location || sparePart.location || '',
          sellerInfo: sparePart.profiles
        }
      },
      analysis: structuredAnalysis,
      marketEcosystem
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: unknown) {
    console.error('Error in roboverse-spare-part-ai-analyze:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('required') || errorMessage.includes('not found') ? 400 : 500;
    return new Response(
      JSON.stringify({ error: errorMessage }), 
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});