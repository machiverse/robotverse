import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Robot {
  id: string;
  name: string;
  model?: string;
  brand?: string;
  robot_type: string;
  price?: number;
  currency?: string;
  payload_capacity?: number;
  reach?: number;
  repeatability?: number;
  applications?: string[];
  technical_specifications?: Record<string, unknown>;
  condition?: string;
  location?: string;
}

function buildComparisonPrompt(robots: Robot[]): string {
  const robotDetails = robots.map((robot, index) => `
Robot ${index + 1}: ${robot.name}
- ID: ${robot.id}
- Brand: ${robot.brand || 'Not specified'}
- Model: ${robot.model || 'Not specified'}
- Type: ${robot.robot_type}
- Price: ${robot.price ? `${robot.currency || 'INR'} ${robot.price}` : 'Price on request'}
- Payload Capacity: ${robot.payload_capacity ? `${robot.payload_capacity} kg` : 'Not specified'}
- Reach: ${robot.reach ? `${robot.reach} mm` : 'Not specified'}
- Repeatability: ${robot.repeatability ? `±${robot.repeatability} mm` : 'Not specified'}
- Condition: ${robot.condition || 'Not specified'}
- Location: ${robot.location || 'Not specified'}
- Applications: ${robot.applications?.join(', ') || 'Not specified'}
- Technical Specs: ${robot.technical_specifications ? JSON.stringify(robot.technical_specifications) : 'Not available'}
`).join('\n');

  return `You are an expert industrial robotics consultant. Compare the following ${robots.length} industrial robots and provide a comprehensive analysis.

${robotDetails}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no additional text):
{
  "comparison_summary": "A 2-3 sentence overview comparing these robots highlighting the key takeaways for an industrial buyer.",
  "individual_analysis": [
    {
      "robot_id": "robot-uuid-here",
      "strengths": ["strength 1", "strength 2", "strength 3"],
      "weaknesses": ["weakness 1", "weakness 2"],
      "best_use_cases": ["use case 1", "use case 2", "use case 3"]
    }
  ],
  "key_differences": [
    "Difference 1 between the robots",
    "Difference 2 between the robots",
    "Difference 3 between the robots"
  ],
  "recommendation": "Based on the comparison, provide a clear recommendation on which robot is best suited for different scenarios. Be specific about which robot to choose for precision work vs heavy payload vs value for money.",
  "winner_for_precision": "Robot name for best precision (if applicable)",
  "winner_for_payload": "Robot name for best payload capacity (if applicable)",
  "winner_for_value": "Robot name for best value for money (if applicable)"
}

Important:
- For each robot in the input, include an analysis in individual_analysis with matching robot_id
- Be specific and technical in your analysis
- Consider Indian market conditions and industrial applications
- Provide actionable insights for procurement decisions`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { robots } = await req.json();

    if (!robots || !Array.isArray(robots) || robots.length < 2) {
      throw new Error('At least 2 robots are required for comparison');
    }

    if (robots.length > 3) {
      throw new Error('Maximum 3 robots can be compared at once');
    }

    const prompt = buildComparisonPrompt(robots);

    // Use Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Calling Lovable AI Gateway for robot comparison...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a senior industrial robotics consultant specializing in comparing industrial robots for procurement decisions. Always respond with valid JSON only.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('AI API error:', response.status, errorBody);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a few moments.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API failed with status ${response.status}`);
    }

    const result = await response.json();
    const analysisContent = result.choices?.[0]?.message?.content;
    
    if (!analysisContent) {
      console.error('No content in AI response:', JSON.stringify(result));
      throw new Error('No content in AI response');
    }

    console.log('AI response received successfully');

    // Parse the JSON response
    let parsedAnalysis;
    try {
      // Remove markdown code blocks if present
      let cleanContent = analysisContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      parsedAnalysis = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', analysisContent);
      // Provide a fallback response
      parsedAnalysis = {
        comparison_summary: "Unable to parse AI analysis. Please try again.",
        individual_analysis: robots.map(r => ({
          robot_id: r.id,
          strengths: ["Analysis unavailable"],
          weaknesses: ["Analysis unavailable"],
          best_use_cases: ["Analysis unavailable"]
        })),
        key_differences: ["Analysis unavailable"],
        recommendation: "Please retry the comparison for detailed analysis."
      };
    }

    return new Response(JSON.stringify(parsedAnalysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    console.error('Error in robot-comparison-ai:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
