import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateSubscriptionRequest {
  plan_id: string;
  plan_type: string;
  billing_cycle: 'monthly' | 'annual';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { plan_id, plan_type, billing_cycle }: CreateSubscriptionRequest = await req.json();

    if (!plan_id || !plan_type) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      console.error('Plan not found:', planError);
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle free plan - no payment needed
    if (plan_type === 'free' || plan.monthly_price === 0) {
      // Cancel any existing subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .neq('status', 'cancelled');

      // Create free subscription
      const { error: insertError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan_id: plan.id,
          plan_name: 'free',
          status: 'active',
          amount: 0,
          billing_cycle: 'lifetime',
          start_date: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (insertError) {
        console.error('Failed to create subscription:', insertError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Free plan activated',
        requires_payment: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Razorpay credentials
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      console.error('Razorpay credentials not configured');
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get or create Razorpay plan
    let razorpayPlanId = plan.razorpay_plan_id;
    
    if (!razorpayPlanId) {
      // Create plan in Razorpay
      const amount = billing_cycle === 'annual' ? plan.annual_price : plan.monthly_price;
      const period = billing_cycle === 'annual' ? 'yearly' : 'monthly';
      
      const planResponse = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
        },
        body: JSON.stringify({
          period: period,
          interval: 1,
          item: {
            name: `RobotVerse ${plan.plan_name} Plan`,
            amount: amount * 100, // In paise
            currency: 'INR',
            description: `${plan.plan_name} subscription - ${plan.monthly_credits} credits per month`,
          },
        }),
      });

      if (!planResponse.ok) {
        const errorText = await planResponse.text();
        console.error('Failed to create Razorpay plan:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to create subscription plan' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const razorpayPlan = await planResponse.json();
      razorpayPlanId = razorpayPlan.id;

      // Store plan ID for future use
      await supabase
        .from('subscription_plans')
        .update({ razorpay_plan_id: razorpayPlanId })
        .eq('id', plan.id);
    }

    // Create subscription in Razorpay
    const subscriptionResponse = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        plan_id: razorpayPlanId,
        total_count: billing_cycle === 'annual' ? 1 : 12, // 12 months or 1 year
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: user.id,
          plan_id: plan.id,
          plan_type: plan_type,
        },
      }),
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      console.error('Failed to create Razorpay subscription:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpaySubscription = await subscriptionResponse.json();
    console.log('Created Razorpay subscription:', razorpaySubscription.id);

    // Store subscription in pending state
    const amount = billing_cycle === 'annual' ? plan.annual_price : plan.monthly_price;
    
    await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.id,
        plan_name: plan_type,
        razorpay_subscription_id: razorpaySubscription.id,
        status: 'pending',
        amount: amount,
        billing_cycle: billing_cycle,
        start_date: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    return new Response(JSON.stringify({
      subscription_id: razorpaySubscription.id,
      key_id: razorpayKeyId,
      amount: amount,
      plan_name: plan.plan_name,
      requires_payment: true,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
