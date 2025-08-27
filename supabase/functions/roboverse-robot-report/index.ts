import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { robotId } = await req.json();

    if (!robotId) {
      return new Response(
        JSON.stringify({ error: 'Robot ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch robot details with seller information
    const { data: robot, error: robotError } = await supabaseClient
      .from('robots')
      .select(`
        *,
        profiles!seller_id (
          full_name,
          company_name,
          phone,
          mobile_number,
          email,
          location
        )
      `)
      .eq('id', robotId)
      .single();

    if (robotError || !robot) {
      return new Response(
        JSON.stringify({ error: 'Robot not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch custom fields
    const { data: customFields } = await supabaseClient
      .from('robot_custom_fields')
      .select('field_name, field_value')
      .eq('robot_id', robotId);

    // Fetch AI analysis if available
    const { data: aiAnalysis } = await supabaseClient
      .from('robot_ai_analysis')
      .select('*')
      .eq('robot_id', robotId)
      .single();

    // Build comprehensive robot data for the report
    const robotData = {
      name: robot.name,
      model: robot.model,
      type: robot.robot_type,
      brand: robot.brand,
      price: robot.price,
      currency: robot.currency,
      description: robot.description,
      location: robot.location,
      state: robot.state,
      availability: robot.availability,
      condition: robot.condition,
      yearManufactured: robot.year_manufactured,
      specifications: {
        payloadCapacity: robot.payload_capacity,
        reach: robot.reach,
        repeatability: robot.repeatability,
        powerConsumption: robot.power_consumption,
        operatingEnvironment: robot.operating_environment,
        controllerType: robot.controller_type,
        ...robot.technical_specifications
      },
      warranty: robot.warranty_info,
      certifications: robot.certification_standards,
      applications: robot.applications,
      accessories: robot.included_accessories,
      brochureUrl: robot.brochure_url,
      videoUrl: robot.video_url,
      customFields: customFields || [],
      seller: {
        name: robot.profiles?.full_name,
        company: robot.profiles?.company_name,
        location: robot.profiles?.location,
        contact: robot.profiles?.phone || robot.profiles?.mobile_number
      },
      aiInsights: aiAnalysis ? {
        summary: aiAnalysis.summary,
        suitability: aiAnalysis.suitability_analysis,
        technicalInsights: aiAnalysis.technical_insights,
        governmentSchemes: aiAnalysis.government_schemes,
        suggestedIndustries: aiAnalysis.suggested_industries
      } : null
    };

    // Build the Gemini prompt
    const prompt = `Generate a comprehensive analysis report for the following industrial robot:

ROBOT DETAILS:
- Name: ${robotData.name}
- Model: ${robotData.model}
- Type: ${robotData.type}
- Brand: ${robotData.brand || 'Not specified'}
- Price: ${robotData.price ? `${robotData.currency} ${robotData.price}` : 'Price on request'}
- Condition: ${robotData.condition || 'Not specified'}
- Year: ${robotData.yearManufactured || 'Not specified'}
- Location: ${robotData.location}${robotData.state ? `, ${robotData.state}` : ''}

DESCRIPTION:
${robotData.description}

TECHNICAL SPECIFICATIONS:
${Object.entries(robotData.specifications)
  .filter(([_, value]) => value !== null && value !== undefined && value !== '')
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}

${robotData.customFields.length > 0 ? `
CUSTOM SPECIFICATIONS:
${robotData.customFields.map(field => `- ${field.field_name}: ${field.field_value}`).join('\n')}
` : ''}

${robotData.applications?.length ? `
APPLICATIONS:
${robotData.applications.map(app => `- ${app}`).join('\n')}
` : ''}

${robotData.certifications?.length ? `
CERTIFICATIONS:
${robotData.certifications.map(cert => `- ${cert}`).join('\n')}
` : ''}

${robotData.warranty ? `WARRANTY: ${robotData.warranty}` : ''}

${robotData.brochureUrl ? `BROCHURE: ${robotData.brochureUrl}` : ''}
${robotData.videoUrl ? `VIDEO: ${robotData.videoUrl}` : ''}

SELLER INFORMATION:
- Company: ${robotData.seller.company || robotData.seller.name}
- Location: ${robotData.seller.location}
- Contact: ${robotData.seller.contact}

${robotData.aiInsights ? `
EXISTING AI ANALYSIS:
- Summary: ${robotData.aiInsights.summary}
- Suitability: ${robotData.aiInsights.suitability || 'Not available'}
- Technical Insights: ${robotData.aiInsights.technicalInsights || 'Not available'}
- Government Schemes: ${robotData.aiInsights.governmentSchemes || 'Not available'}
- Industry Applications: ${robotData.aiInsights.suggestedIndustries || 'Not available'}
` : ''}

Please generate a structured analysis report that includes:

1. **EXECUTIVE SUMMARY**
   - Brief overview of the robot and its key features
   - Value proposition and competitive advantages

2. **TECHNICAL ANALYSIS**
   - Detailed technical specifications review
   - Performance capabilities and limitations
   - Suitability for different industrial applications

3. **MARKET POSITIONING**
   - Price analysis and market competitiveness
   - Target industries and use cases
   - ROI potential and payback period estimation

4. **OPERATIONAL CONSIDERATIONS**
   - Installation requirements
   - Maintenance and support needs
   - Training requirements for operators

5. **RISK ASSESSMENT**
   - Technical risks and mitigation strategies
   - Warranty and support coverage
   - Compatibility considerations

6. **RECOMMENDATIONS**
   - Who should consider this robot
   - Best use case scenarios
   - Factors to consider before purchase

Please format the report in a professional, structured manner suitable for business decision-making.`;

    // Call Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const reportContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reportContent) {
      return new Response(
        JSON.stringify({ error: 'No report content generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the report in database for future reference
    try {
      await supabaseClient
        .from('robot_reports')
        .insert({
          robot_id: robotId,
          user_id: user.id,
          report_content: reportContent,
          robot_data: robotData,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('Error saving report to database:', dbError);
      // Continue anyway - the report was generated successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: reportContent,
        robotData: robotData,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in robot report function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});