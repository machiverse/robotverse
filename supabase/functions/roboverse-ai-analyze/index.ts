// supabase/functions/roboverse-ai-analyze/index.ts

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- CONFIGURATION & HEADERS ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- CLIENT INITIALIZATION ---
// EFFICIENCY & SECURITY: The Supabase client is created only ONCE when the function boots.
// It uses the secure SERVICE_ROLE_KEY, not the public anon key.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// --- UTILITY & HELPER FUNCTIONS ---

/**
 * Calculates a simple proximity score between two location strings.
 * For professional use, consider a database function with PostGIS for geo-queries.
 */
function getLocationProximity(location1: string, location2: string): number {
  if (!location1 || !location2) return 0;
  const loc1 = location1.toLowerCase();
  const loc2 = location2.toLowerCase();
  if (loc1 === loc2) return 100;
  const commonWords = loc1.split(' ').filter(word => loc2.includes(word));
  return commonWords.length > 0 ? 80 : 20;
}

/**
 * A generic function to sort an array of items by proximity and take the top results.
 */
function sortAndSlice<T>(items: T[], targetLocation: string, locationKey: (item: T) => string | undefined, sliceCount: number) {
  return items
    .map(item => ({
      ...item,
      proximity: getLocationProximity(targetLocation, locationKey(item) || '')
    }))
    .sort((a, b) => b.proximity - a.proximity)
    .slice(0, sliceCount);
}

// --- DATA FETCHING FUNCTIONS ---
// These functions are organized to handle specific database interactions.

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

async function getUserLocation(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('location')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.warn(`Could not fetch user location for user ${userId}: ${error.message}`);
    return null; // Don't throw an error, as a missing location is not critical.
  }
  return data?.location || null;
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

  // More specific error checking
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

// --- AI ANALYSIS & PROMPT ENGINEERING ---

function buildAnalysisPrompt(robot: any, marketData: any, targetLocation: string): string {
    const { sortedSpareParts, sortedServices } = marketData;
    const robotLocation = robot.profiles?.location || 'Not specified';

    // This is the same detailed prompt you created.
    return `Analyze this industrial robot and provide comprehensive market insights:

ROBOT DETAILS:
- Name: ${robot.name}
- Type: ${robot.robot_type}
- Model: ${robot.model || 'Not specified'}
- Price: ${robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Price on request'}
- Location: ${robotLocation}
- Seller: ${robot.profiles?.company_name || 'Not specified'}
- Description: ${robot.description || 'No description provided'}
- Technical Specs: ${robot.technical_specifications ? JSON.stringify(robot.technical_specifications) : 'Not available'}

MARKET ECOSYSTEM:
- Target Location for Analysis: ${targetLocation || 'Not specified'}
- Available Spare Parts Suppliers Nearby: ${sortedSpareParts.length}
- Service Providers Nearby: ${sortedServices.length}

NEARBY RESOURCES:
Spare Parts: ${sortedSpareParts.map((p: any) => `${p.profiles?.company_name} (${p.profiles?.location})`).join(', ') || 'None found'}
Services: ${sortedServices.map((s: any) => `${s.profiles?.company_name} (${s.profiles?.location})`).join(', ') || 'None found'}

Provide detailed analysis covering:
1. Market Position & Value Assessment (Price competitiveness, demand)
2. Industry Applications & ROI (Best use cases, payback period)
3. Technical Assessment (Strengths, limitations, maintenance)
4. Supply Chain Analysis (Parts availability, service network)
5. Implementation Strategy (Installation, training, challenges)
6. Financial Recommendations (Financing options, government schemes like PLI)
7. Risk Assessment (Obsolescence, vendor dependency)
8. Location-Specific Insights (Local market conditions, logistics)

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
        { role: 'system', content: 'You are a senior industrial robotics consultant and market analyst specializing in the Indian robotics market. Provide detailed, actionable insights for robot procurement decisions, considering local market conditions, regulatory environment, and business economics.' },
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

// Helper function to extract sections from AI analysis
function extractSection(analysis: string, sectionType: string): string {
  const patterns = {
    suitability: /(?:suitability|suitable|fit|appropriate|value)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    technical: /(?:technical|specifications|performance|capabilities)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    government: /(?:government|schemes|subsidies|incentives|pli|policy)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i,
    industries: /(?:industries|applications|sectors|use cases)[\s\S]*?(?=\n\n|\n[0-9]|\n#|$)/i
  };
  
  const match = analysis.match(patterns[sectionType as keyof typeof patterns]);
  return match ? match[0].trim() : '';
}

// --- MAIN SERVER LOGIC ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY FIX: Authenticate the user from the Authorization header.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders });
    }
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError) throw new Error(`Authentication failed: ${userError.message}`);
    if (!user) throw new Error('User not found or token is invalid.');

    const { robotId } = await req.json();
    if (!robotId) throw new Error('Robot ID is required in the request body.');

    console.log(`Processing AI analysis for robot: ${robotId}`);

    // Check if analysis already exists in database
    const { data: existingAnalysis, error: fetchError } = await supabaseAdmin
      .from('robot_ai_analysis')
      .select('*')
      .eq('robot_id', robotId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking existing analysis:', fetchError);
    }

    // If analysis exists, return cached result
    if (existingAnalysis) {
      console.log('Returning cached AI analysis for robot:', robotId);
      
      const robot = await getRobotDetails(robotId);
      
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
        marketEcosystem: existingAnalysis.recommendations || {}
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // If no cached analysis, proceed with new AI analysis
    console.log('Generating new AI analysis for robot:', robotId);

    const robot = await getRobotDetails(robotId);
    const [userLocation, marketData] = await Promise.all([
        getUserLocation(user.id),
        getMarketEcosystem(robot.robot_type),
    ]);
    
    const robotLocation = robot.profiles?.location || '';
    const targetLocation = userLocation || robotLocation;

    const sortedSpareParts = sortAndSlice(marketData.spareParts, targetLocation, (i: any) => i.profiles?.location, 5);
    const sortedServices = sortAndSlice(marketData.services, targetLocation, (i: any) => i.profiles?.location, 5);
    const sortedLogistics = sortAndSlice(marketData.logistics, targetLocation, (i: any) => i.location, 3);
    const sortedFinance = sortAndSlice(marketData.finance, targetLocation, (i: any) => i.location, 3);

    const sortedData = { sortedSpareParts, sortedServices, sortedLogistics, sortedFinance };

    const prompt = buildAnalysisPrompt(robot, sortedData, targetLocation);
    const analysisContent = await getAiAnalysis(prompt);

    // Structure the analysis for better UI display
    const structuredAnalysis = {
      summary: analysisContent,
      suitability: extractSection(analysisContent, 'suitability'),
      technicalInsights: extractSection(analysisContent, 'technical'),
      governmentSchemes: extractSection(analysisContent, 'government'),
      suggestedIndustries: extractSection(analysisContent, 'industries'),
      timestamp: new Date().toISOString()
    };

    const marketEcosystem = {
        spareParts: { suppliers: sortedSpareParts.map(p => ({ ...p, profiles: p.profiles, proximity: p.proximity })) },
        services: { providers: sortedServices.map(s => ({ ...s, profiles: s.profiles, proximity: s.proximity })) },
        logistics: { providers: sortedLogistics.map(p => ({ ...p, proximity: p.proximity })) },
        finance: { providers: sortedFinance.map(p => ({ ...p, proximity: p.proximity })) },
    };

    // Store the analysis result in database
    const { error: insertError } = await supabaseAdmin
      .from('robot_ai_analysis')
      .insert({
        robot_id: robotId,
        analysis_data: structuredAnalysis,
        recommendations: marketEcosystem
      });

    if (insertError) {
      console.error('Error storing analysis:', insertError);
      // Continue without storing - don't fail the request
    } else {
      console.log('AI analysis stored successfully for robot:', robotId);
    }

    const finalResponse = {
        success: true,
        cached: false,
        robot: {
            ...robot,
            marketInsights: {
              priceRange: robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Contact for pricing',
              location: robotLocation,
              sellerInfo: robot.profiles
            }
        },
        analysis: structuredAnalysis,
        marketEcosystem: marketEcosystem,
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in roboverse-ai-analyze:', error);
    // Use 4xx for client errors (bad input, auth issues), 5xx for server issues.
    const status = error.message.includes('Authentication') || error.message.includes('required') ? 400 : 500;
    return new Response(JSON.stringify({ error: error.message }), {
      status: status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
