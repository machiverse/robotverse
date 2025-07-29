import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate location proximity (simple text matching)
function getLocationProximity(location1: string, location2: string): number {
  if (!location1 || !location2) return 0;
  
  const loc1 = location1.toLowerCase();
  const loc2 = location2.toLowerCase();
  
  // Exact match
  if (loc1 === loc2) return 100;
  
  // State/city matching logic
  const commonWords = loc1.split(' ').filter(word => loc2.includes(word));
  return commonWords.length > 0 ? 80 : 20;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { robotId, userId } = await req.json();
    
    if (!robotId) {
      throw new Error('Robot ID is required');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch robot details with seller information
    const { data: robot, error: robotError } = await supabaseClient
      .from('robots')
      .select(`
        *,
        profiles!robots_seller_id_fkey (
          location,
          company_name,
          full_name,
          mobile_number,
          email
        )
      `)
      .eq('id', robotId)
      .single();

    if (robotError) throw robotError;

    // Get user location if userId provided
    let userLocation = '';
    if (userId) {
      const { data: userData } = await supabaseClient
        .from('profiles')
        .select('location')
        .eq('user_id', userId)
        .single();
      
      userLocation = userData?.location || '';
    }

    // Enhanced queries with better filtering
    const [sparePartsData, servicesData, logisticsData, financeData] = await Promise.all([
      // Spare parts - filter by robot compatibility and location
      supabaseClient
        .from('spare_parts')
        .select(`
          *,
          profiles!spare_parts_seller_id_fkey (
            location,
            company_name,
            full_name,
            mobile_number,
            email,
            seller_roles
          )
        `)
        .or(`compatible_robots.cs.{${robot.robot_type}},compatible_robots.is.null`)
        .limit(10),

      // Services - filter by robot type and service specializations
      supabaseClient
        .from('services')
        .select(`
          *,
          profiles!services_provider_id_fkey (
            location,
            company_name,
            full_name,
            mobile_number,
            email,
            seller_roles
          )
        `)
        .or(`specializations.cs.{${robot.robot_type}},specializations.is.null,service_type.eq.maintenance,service_type.eq.installation`)
        .limit(10),

      // Logistics providers with transport capabilities
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('account_type', 'logistics')
        .not('logistics_type', 'is', null)
        .limit(8),

      // Finance providers
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('account_type', 'finance')
        .contains('financing_for', ['robots'])
        .limit(8)
    ]);

    // Sort by location proximity if user location is available
    const robotLocation = robot.profiles?.location || '';
    const targetLocation = userLocation || robotLocation;

    // Sort spare parts by location proximity
    const sortedSpareParts = (sparePartsData.data || [])
      .map(part => ({
        ...part,
        proximity: getLocationProximity(targetLocation, part.profiles?.location || '')
      }))
      .sort((a, b) => b.proximity - a.proximity)
      .slice(0, 5);

    // Sort services by location proximity
    const sortedServices = (servicesData.data || [])
      .map(service => ({
        ...service,
        proximity: getLocationProximity(targetLocation, service.profiles?.location || '')
      }))
      .sort((a, b) => b.proximity - a.proximity)
      .slice(0, 5);

    // Sort logistics by location and capabilities
    const sortedLogistics = (logisticsData.data || [])
      .map(provider => ({
        ...provider,
        proximity: getLocationProximity(targetLocation, provider.location || '')
      }))
      .sort((a, b) => b.proximity - a.proximity)
      .slice(0, 3);

    // Sort finance providers by target audience and location
    const sortedFinance = (financeData.data || [])
      .map(provider => ({
        ...provider,
        proximity: getLocationProximity(targetLocation, provider.location || '')
      }))
      .sort((a, b) => b.proximity - a.proximity)
      .slice(0, 3);

    // Enhanced analysis prompt with market insights
    const prompt = `Analyze this industrial robot and provide comprehensive market insights:

ROBOT DETAILS:
- Name: ${robot.name}
- Type: ${robot.robot_type}
- Model: ${robot.model || 'Not specified'}
- Price: ${robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Price on request'}
- Location: ${robotLocation || 'Not specified'}
- Seller: ${robot.profiles?.company_name || 'Not specified'}
- Description: ${robot.description || 'No description provided'}
- Technical Specs: ${robot.technical_specifications ? JSON.stringify(robot.technical_specifications) : 'Not available'}

MARKET ECOSYSTEM:
- Available Spare Parts Suppliers: ${sortedSpareParts.length}
- Service Providers: ${sortedServices.length}
- Logistics Partners: ${sortedLogistics.length}
- Finance Providers: ${sortedFinance.length}
- Target Location: ${targetLocation || 'Not specified'}

NEARBY RESOURCES:
Spare Parts: ${sortedSpareParts.map(p => `${p.profiles?.company_name} (${p.profiles?.location})`).join(', ')}
Services: ${sortedServices.map(s => `${s.profiles?.company_name} (${s.profiles?.location})`).join(', ')}

Provide detailed analysis covering:

1. **Market Position & Value Assessment**
   - Price competitiveness in current market
   - Value proposition for buyers
   - Market demand for this robot type

2. **Industry Applications & ROI**
   - Best-suited industries and use cases
   - Expected ROI and payback period
   - Productivity improvements

3. **Technical Assessment**
   - Key technical strengths and limitations
   - Maintenance requirements and costs
   - Upgrade potential

4. **Supply Chain Analysis**
   - Spare parts availability and costs
   - Service network strength
   - Critical components to stock

5. **Implementation Strategy**
   - Installation requirements
   - Training needs
   - Integration challenges

6. **Financial Recommendations**
   - Financing options analysis
   - Government schemes (PLI, MSME benefits)
   - Tax benefits and subsidies

7. **Risk Assessment**
   - Technology obsolescence risk
   - Vendor dependency
   - Market competition

8. **Location-Specific Insights**
   - Local market conditions
   - Regional industry clusters
   - Transportation and logistics considerations

Format as structured, actionable insights for decision-making.`;

    // Call DeepSeek API with enhanced prompt
    const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('DEEPSEEK_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a senior industrial robotics consultant and market analyst specializing in the Indian robotics market. Provide detailed, actionable insights for robot procurement decisions, considering local market conditions, regulatory environment, and business economics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2500
      }),
    });

    if (!deepseekResponse.ok) {
      throw new Error(`DeepSeek API error: ${deepseekResponse.status}`);
    }

    const aiAnalysis = await deepseekResponse.json();

    // Prepare comprehensive response
    const response = {
      robot: {
        ...robot,
        marketInsights: {
          priceRange: robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Contact for pricing',
          location: robotLocation,
          sellerInfo: robot.profiles
        }
      },
      analysis: aiAnalysis.choices[0].message.content,
      marketEcosystem: {
        spareParts: {
          total: sortedSpareParts.length,
          nearby: sortedSpareParts.filter(p => p.proximity > 50).length,
          suppliers: sortedSpareParts.map(part => ({
            id: part.id,
            name: part.name,
            company: part.profiles?.company_name,
            location: part.profiles?.location,
            proximity: part.proximity,
            price: part.price ? `${part.currency || 'INR'} ${part.price}` : 'Contact for price',
            partNumber: part.part_number,
            specifications: part.specifications
          }))
        },
        services: {
          total: sortedServices.length,
          nearby: sortedServices.filter(s => s.proximity > 50).length,
          providers: sortedServices.map(service => ({
            id: service.id,
            name: service.name,
            company: service.profiles?.company_name,
            location: service.profiles?.location,
            proximity: service.proximity,
            serviceType: service.service_type,
            priceRange: service.price_range,
            specializations: service.specializations
          }))
        },
        logistics: {
          total: sortedLogistics.length,
          providers: sortedLogistics.map(provider => ({
            id: provider.id,
            company: provider.company_name,
            location: provider.location,
            proximity: provider.proximity,
            logisticsType: provider.logistics_type,
            transportModes: provider.transport_modes,
            warehouseStorage: provider.warehouse_storage,
            serviceRegion: provider.logistics_region
          }))
        },
        finance: {
          total: sortedFinance.length,
          providers: sortedFinance.map(provider => ({
            id: provider.id,
            company: provider.company_name,
            location: provider.location,
            proximity: provider.proximity,
            financeTypes: provider.finance_type,
            financingFor: provider.financing_for,
            targetAudience: provider.target_audience,
            governmentSchemeSupport: provider.government_scheme_support
          }))
        }
      },
      locationInsights: {
        userLocation: userLocation,
        robotLocation: robotLocation,
        proximityFactors: {
          nearbySuppliers: sortedSpareParts.filter(p => p.proximity > 70).length,
          nearbyServices: sortedServices.filter(s => s.proximity > 70).length,
          logisticsAvailability: sortedLogistics.filter(l => l.proximity > 50).length
        }
      },
      actionableRecommendations: {
        immediateActions: [
          sortedSpareParts.length > 0 ? 'Contact nearby spare parts suppliers for quotes' : 'Identify spare parts sources',
          sortedServices.length > 0 ? 'Schedule installation and maintenance services' : 'Find qualified service providers',
          'Explore financing options with government scheme benefits'
        ],
        costOptimization: [
          'Compare pricing with multiple suppliers',
          'Negotiate bulk purchase discounts',
          'Consider local vs imported alternatives'
        ],
        riskMitigation: [
          'Establish redundant supplier relationships',
          'Plan preventive maintenance schedules',
          'Evaluate service response times'
        ]
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in roboverse-ai-analyze:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to analyze robot and market insights'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
