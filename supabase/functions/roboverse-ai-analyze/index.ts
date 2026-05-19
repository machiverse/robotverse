// supabase/functions/roboverse-ai-analyze/index.ts

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- CONFIGURATION ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase admin client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// --- DATA FETCHING HELPERS ---
async function getRobotDetails(robotId: string) {
  const { data, error } = await supabaseAdmin
    .from('robots')
    .select(`
      *,
      profiles!robots_seller_id_fkey (location, company_name, full_name, mobile_number, email)
    `)
    .eq('id', robotId)
    .single();

  if (error) throw new Error(`Failed to fetch robot details: ${error.message}`);
  return data;
}

async function getMarketEcosystem(robotType: string) {
  const [sparePartsRes, servicesRes, logisticsRes, financeRes] = await Promise.all([
    supabaseAdmin
      .from('spare_parts')
      .select('*, profiles!spare_parts_seller_id_fkey(*)')
      .or(`compatible_robots.cs.{${robotType}},compatible_robots.is.null`)
      .limit(10),
    supabaseAdmin
      .from('services')
      .select('*, profiles!services_provider_id_fkey(*)')
      .or(`specializations.cs.{${robotType}},specializations.is.null,service_type.eq.maintenance,service_type.eq.installation`)
      .limit(10),
    supabaseAdmin.from('profiles').select('*').eq('account_type', 'logistics').not('logistics_type', 'is', null).limit(8),
    supabaseAdmin.from('profiles').select('*').eq('account_type', 'finance').contains('financing_for', ['robots']).limit(8),
  ]);

  if (sparePartsRes.error) throw new Error(`Spare parts query failed: ${sparePartsRes.error.message}`);
  if (servicesRes.error) throw new Error(`Services query failed: ${servicesRes.error.message}`);
  if (logisticsRes.error) throw new Error(`Logistics query failed: ${logisticsRes.error.message}`);
  if (financeRes.error) throw new Error(`Finance query failed: ${financeRes.error.message}`);

  return {
    spareParts: sparePartsRes.data || [],
    services: servicesRes.data || [],
    logistics: logisticsRes.data || [],
    finance: financeRes.data || [],
  };
}

interface SparePartProfile {
  company_name?: string;
  location?: string;
}

interface ServiceProfile {
  company_name?: string;
  location?: string;
}

interface MarketDataItem {
  profiles?: SparePartProfile | ServiceProfile;
}

// --- PROMPT GENERATION ---
function buildAnalysisPrompt(robot: Record<string, unknown>, marketData: { sortedSpareParts: MarketDataItem[]; sortedServices: MarketDataItem[] }): string {
  const { sortedSpareParts, sortedServices } = marketData;
  const profiles = robot.profiles as { location?: string; company_name?: string } | undefined;
  const robotLocation = profiles?.location || 'Not specified';

  return `Analyze this industrial robot and provide comprehensive market insights for the **Indian market** (general, not city-specific):

ROBOT DETAILS:
- Name: ${robot.name}
- Type: ${robot.robot_type}
- Model: ${robot.model || 'Not specified'}
- Price: ${robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Price on request'}
- Location: ${robotLocation}
- Seller: ${profiles?.company_name || 'Not specified'}
- Description: ${robot.description || 'No description provided'}
- Technical Specs: ${robot.technical_specifications ? JSON.stringify(robot.technical_specifications) : 'Not available'}

MARKET ECOSYSTEM (Sample Indian Suppliers & Services):
- Spare Parts Suppliers: ${sortedSpareParts.length}
- Service Providers: ${sortedServices.length}

SAMPLE SUPPLIERS:
Spare Parts: ${sortedSpareParts.map((p) => `${p.profiles?.company_name} (${p.profiles?.location || 'India'})`).join(', ') || 'None found'}
Services: ${sortedServices.map((s) => `${s.profiles?.company_name} (${s.profiles?.location || 'India'})`).join(', ') || 'None found'}

Provide detailed analysis covering:
1. Market Position & Value Assessment (India-wide trends, competitiveness, demand)
2. Industry Applications & ROI (Best Indian industry use cases, payback period)
3. Technical Assessment (Strengths, limitations, maintenance)
4. Supply Chain Analysis (Parts availability, service network nationwide)
5. Implementation Strategy (Installation, training, challenges)
6. Financial Recommendations (Indian financing options, government schemes like PLI)
7. Risk Assessment (Obsolescence, vendor dependency)
8. General Indian Market Insights (Economic trends, adoption rates)

Format as structured, actionable insights for decision-making.`;
}

// --- AI CALL ---
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
        { role: 'system', content: 'You are a senior industrial robotics consultant and market analyst specializing in the Indian robotics market. Provide detailed, actionable insights for procurement decisions, considering market conditions, regulations, and business economics in India.' },
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

// --- SECTION EXTRACTOR ---
function extractSection(analysis: string, sectionType: string): string {
  const patterns: Record<string, RegExp> = {
    suitability: /(?:suitability|suitable|fit|appropriate|value)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    technical: /(?:technical|specifications|performance|capabilities)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    government: /(?:government|schemes|subsidies|incentives|pli|policy)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    industries: /(?:industries|applications|sectors|use cases)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i
  };
  const match = analysis.match(patterns[sectionType]);
  return match ? match[0].trim() : '';
}

// --- MAIN FUNCTION ---
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  {
    const _authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: _userData, error: _userErr } = await _authClient.auth.getUser();
    if (_userErr || !_userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  }


  try {
    const { robotId } = await req.json();
    if (!robotId) throw new Error('Robot ID is required.');

    // CHECK CACHE
    const { data: existingAnalysis, error: fetchError } = await supabaseAdmin
      .from('robot_ai_analysis')
      .select('*')
      .eq('robot_id', robotId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`DB error: ${fetchError.message}`);
    }

    const robot = await getRobotDetails(robotId);
    const marketData = await getMarketEcosystem(robot.robot_type);

    // General sorting (no location proximity)
    const sortedSpareParts = (marketData.spareParts || []).slice(0, 5);
    const sortedServices = (marketData.services || []).slice(0, 5);
    const sortedLogistics = (marketData.logistics || []).slice(0, 3);
    const sortedFinance = (marketData.finance || []).slice(0, 3);

    const sortedData = { sortedSpareParts, sortedServices, sortedLogistics, sortedFinance };

    // If cached -> return directly
    if (existingAnalysis) {
      return new Response(JSON.stringify({
        success: true,
        cached: true,
        robot: {
          ...robot,
          marketInsights: {
            priceRange: robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Contact for pricing',
            location: robot.profiles?.location || '',
            sellerInfo: robot.profiles
          }
        },
        analysis: existingAnalysis.analysis_data,
        marketEcosystem: {
          spareParts: { suppliers: sortedSpareParts },
          services: { providers: sortedServices },
          logistics: { providers: sortedLogistics },
          finance: { providers: sortedFinance }
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // NEW AI ANALYSIS
    const prompt = buildAnalysisPrompt(robot, sortedData);
    const analysisContent = await getAiAnalysis(prompt);

    const structuredAnalysis = {
      summary: analysisContent,
      suitability: extractSection(analysisContent, 'suitability'),
      technicalInsights: extractSection(analysisContent, 'technical'),
      governmentSchemes: extractSection(analysisContent, 'government'),
      suggestedIndustries: extractSection(analysisContent, 'industries'),
      timestamp: new Date().toISOString()
    };

    const marketEcosystem = {
      spareParts: { suppliers: sortedSpareParts },
      services: { providers: sortedServices },
      logistics: { providers: sortedLogistics },
      finance: { providers: sortedFinance }
    };

    // STORE
    await supabaseAdmin
      .from('robot_ai_analysis')
      .upsert({
        robot_id: robotId,
        analysis_data: structuredAnalysis,
        recommendations: marketEcosystem,
        updated_at: new Date().toISOString()
      }, { onConflict: 'robot_id' });

    return new Response(JSON.stringify({
      success: true,
      cached: false,
      robot: {
        ...robot,
        marketInsights: {
          priceRange: robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Contact for pricing',
          location: robot.profiles?.location || '',
          sellerInfo: robot.profiles
        }
      },
      analysis: structuredAnalysis,
      marketEcosystem
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error: unknown) {
    console.error('Error in roboverse-ai-analyze:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const status = errorMessage.includes('Authentication') || errorMessage.includes('required') ? 400 : 500;
    return new Response(JSON.stringify({ error: errorMessage }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});