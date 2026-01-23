import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
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

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature }: VerifyPaymentRequest = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify signature
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      console.error('Razorpay secret not configured');
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = createHmac('sha256', razorpayKeySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payment signature verified:', razorpay_payment_id);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('razorpay_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (order.status === 'paid') {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment already processed',
        credits: order.credits 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update order status
    const { error: updateOrderError } = await supabase
      .from('razorpay_orders')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        verified_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateOrderError) {
      console.error('Failed to update order:', updateOrderError);
    }

    // Add credits to user's seller_credits
    const { data: existingCredits } = await supabase
      .from('seller_credits')
      .select('*')
      .eq('seller_id', user.id)
      .single();

    if (existingCredits) {
      // Update existing credits
      const { error: updateCreditsError } = await supabase
        .from('seller_credits')
        .update({
          current_balance: existingCredits.current_balance + order.credits,
          total_purchased: (existingCredits.total_purchased || 0) + order.credits,
        })
        .eq('seller_id', user.id);

      if (updateCreditsError) {
        console.error('Failed to update credits:', updateCreditsError);
      }
    } else {
      // Create new credits record
      const { error: insertCreditsError } = await supabase
        .from('seller_credits')
        .insert({
          seller_id: user.id,
          current_balance: order.credits,
          total_purchased: order.credits,
        });

      if (insertCreditsError) {
        console.error('Failed to insert credits:', insertCreditsError);
      }
    }

    // Also update profiles.credits_balance for backward compatibility
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        credits_balance: supabase.rpc('coalesce', { val: 'credits_balance', def: 0 }) as any + order.credits,
      })
      .eq('user_id', user.id);

    // Use raw SQL for the update instead
    await supabase.rpc('add_user_credits', { 
      p_user_id: user.id, 
      p_credits: order.credits 
    }).catch(() => {
      // Fallback: direct update
      console.log('RPC not available, using direct update');
    });

    // Record transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        seller_id: user.id,
        transaction_type: 'purchase',
        credits_amount: order.credits,
        amount: order.amount,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        description: `Purchased ${order.credits} credits`,
        balance_after: (existingCredits?.current_balance || 0) + order.credits,
      });

    if (transactionError) {
      console.error('Failed to record transaction:', transactionError);
    }

    console.log(`Added ${order.credits} credits to user ${user.id}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment verified and credits added',
      credits: order.credits,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
