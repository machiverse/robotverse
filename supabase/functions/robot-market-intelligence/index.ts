import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { robotId, action } = await req.json();

    if (action === 'getInsights') {
      // Fetch robot data and analytics
      const { data: robot, error: robotError } = await supabase
        .from('robots')
        .select(`
          *,
          robot_custom_fields(field_name, field_value)
        `)
        .eq('id', robotId)
        .single();

      if (robotError) throw robotError;

      // Get view count for this robot
      const { data: interactions } = await supabase
        .from('user_interactions')
        .select('*')
        .eq('target_type', 'robots')
        .eq('target_id', robotId)
        .eq('interaction_type', 'view');

      const viewCount = interactions?.length || 0;

      // Get similar robots count
      const { data: similarRobots } = await supabase
        .from('robots')
        .select('id')
        .eq('robot_type', robot.robot_type)
        .neq('id', robotId);

      const marketInsights = {
        viewCount,
        similarRobotsCount: similarRobots?.length || 0,
        demandTrend: viewCount > 50 ? 'High' : viewCount > 20 ? 'Medium' : 'Low',
        pricePosition: robot.price ? 
          (robot.price > 100000 ? 'Premium' : robot.price > 50000 ? 'Mid-range' : 'Budget') : 
          'Not specified',
        marketCategory: robot.robot_type,
        recommendations: [
          viewCount > 30 ? 'High interest product' : 'Consider marketing boost',
          robot.price ? 'Competitively priced' : 'Add pricing information',
          robot.images?.length > 3 ? 'Well documented' : 'Add more images'
        ]
      };

      return new Response(JSON.stringify({ insights: marketInsights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'generateReport') {
      const { robotData, insights } = await req.json();

      if (!geminiApiKey) {
        throw new Error('Gemini API key not configured');
      }

      const prompt = `Generate a comprehensive market intelligence report for this industrial robot:

ROBOT DETAILS:
- Name: ${robotData.name}
- Type: ${robotData.robot_type}
- Brand: ${robotData.brand || 'Not specified'}
- Model: ${robotData.model || 'Not specified'}
- Price: ${robotData.price ? `${robotData.currency} ${robotData.price}` : 'Not specified'}
- Description: ${robotData.description || 'Not provided'}

SPECIFICATIONS:
${robotData.custom_fields?.map((field: any) => `- ${field.field_name}: ${field.field_value}`).join('\n') || 'No custom specifications'}

MARKET INSIGHTS:
- View Count: ${insights.viewCount}
- Market Demand: ${insights.demandTrend}
- Price Position: ${insights.pricePosition}
- Similar Products: ${insights.similarRobotsCount}

Please generate a structured report with the following sections:
1. Executive Summary
2. Product Overview
3. Technical Specifications Analysis
4. Market Position & Demand Analysis
5. Competitive Landscape
6. Investment Recommendations
7. Risk Assessment
8. Conclusion

Make it professional, data-driven, and actionable for business decision-making.`;

      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': geminiApiKey,
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
              maxOutputTokens: 2048,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API error:', errorData);
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const report = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!report) {
        throw new Error('No report generated from Gemini API');
      }

      return new Response(JSON.stringify({ report }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action specified');

  } catch (error) {
    console.error('Error in robot-market-intelligence function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});