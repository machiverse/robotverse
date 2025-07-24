import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { robotId, userId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch robot details
    const { data: robot, error: robotError } = await supabaseClient
      .from('robots')
      .select(`
        *,
        profiles!robots_seller_id_fkey (
          location,
          company_name
        )
      `)
      .eq('id', robotId)
      .single();

    if (robotError) throw robotError;

    // Fetch nearby services, parts, logistics, and finance providers
    const [spareParts, services, logistics, finance] = await Promise.all([
      supabaseClient
        .from('spare_parts')
        .select('*, profiles!spare_parts_seller_id_fkey(location, company_name)')
        .limit(5),
      supabaseClient
        .from('services')
        .select('*, profiles!services_provider_id_fkey(location, company_name)')
        .limit(5),
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('account_type', 'logistics')
        .limit(3),
      supabaseClient
        .from('profiles')
        .select('*')
        .eq('account_type', 'finance')
        .limit(3)
    ]);

    // Create analysis prompt
    const prompt = `Analyze this industrial robot and provide recommendations:

Robot Details:
- Name: ${robot.name}
- Type: ${robot.robot_type}
- Model: ${robot.model}
- Location: ${robot.profiles?.location || 'Not specified'}
- Price: ${robot.price ? `${robot.currency} ${robot.price}` : 'Price on request'}
- Description: ${robot.description || 'No description'}

Available Resources:
- Spare Parts: ${spareParts.data?.length || 0} suppliers
- Service Providers: ${services.data?.length || 0} providers  
- Logistics Partners: ${logistics.data?.length || 0} partners
- Finance Providers: ${finance.data?.length || 0} providers

Provide a comprehensive analysis including:
1. Robot suitability for different industries
2. Maintenance recommendations
3. Compatible spare parts to consider
4. Service requirements
5. Logistics considerations for this robot type
6. Financing options available
7. Relevant government schemes for robotics adoption in India

Keep response concise but informative, focusing on actionable insights.`;

    // Call DeepSeek API
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
            content: 'You are an industrial robotics expert providing analysis and recommendations for robot procurement and deployment.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    const aiAnalysis = await deepseekResponse.json();

    return new Response(JSON.stringify({
      robot,
      analysis: aiAnalysis.choices[0].message.content,
      recommendations: {
        spareParts: spareParts.data?.slice(0, 3) || [],
        services: services.data?.slice(0, 3) || [],
        logistics: logistics.data?.slice(0, 2) || [],
        finance: finance.data?.slice(0, 2) || []
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in roboverse-ai-analyze:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});