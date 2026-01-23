import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpaySignature = req.headers.get('x-razorpay-signature');
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET');
    
    const body = await req.text();
    
    // Verify webhook signature if secret is configured
    if (webhookSecret && razorpaySignature) {
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');
      
      if (expectedSignature !== razorpaySignature) {
        console.error('Webhook signature verification failed');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    const eventId = payload.payload?.payment?.entity?.id || payload.payload?.subscription?.entity?.id || `event_${Date.now()}`;
    
    console.log('Received webhook event:', event, 'Event ID:', eventId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if event already processed
    const { data: existingEvent } = await supabase
      .from('razorpay_webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      console.log('Event already processed:', eventId);
      return new Response(JSON.stringify({ status: 'already_processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Store event
    await supabase.from('razorpay_webhook_events').insert({
      event_id: eventId,
      event_type: event,
      payload: payload,
      processed: false,
    });

    // Process based on event type
    switch (event) {
      case 'subscription.activated': {
        const subscription = payload.payload.subscription.entity;
        const userId = subscription.notes?.user_id;
        const planId = subscription.notes?.plan_id;
        
        if (userId) {
          // Get plan details for credits
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('monthly_credits, plan_name')
            .eq('id', planId)
            .single();

          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              razorpay_subscription_id: subscription.id,
              start_date: new Date(subscription.current_start * 1000).toISOString(),
              next_billing_date: new Date(subscription.current_end * 1000).toISOString(),
            })
            .eq('user_id', userId);

          // Add monthly credits
          if (plan) {
            const { data: existingCredits } = await supabase
              .from('seller_credits')
              .select('current_balance')
              .eq('seller_id', userId)
              .single();

            await supabase
              .from('seller_credits')
              .upsert({
                seller_id: userId,
                current_balance: (existingCredits?.current_balance || 0) + plan.monthly_credits,
              }, { onConflict: 'seller_id' });

            // Record transaction
            await supabase.from('credit_transactions').insert({
              seller_id: userId,
              transaction_type: 'subscription_credit',
              credits_amount: plan.monthly_credits,
              description: `Monthly credits for ${plan.plan_name} subscription`,
              balance_after: (existingCredits?.current_balance || 0) + plan.monthly_credits,
            });
          }

          console.log('Subscription activated for user:', userId);
        }
        break;
      }

      case 'subscription.charged': {
        const subscription = payload.payload.subscription.entity;
        const payment = payload.payload.payment.entity;
        const userId = subscription.notes?.user_id;
        const planId = subscription.notes?.plan_id;
        
        if (userId) {
          // Get plan details
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('monthly_credits, plan_name')
            .eq('id', planId)
            .single();

          // Update subscription
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              next_billing_date: new Date(subscription.current_end * 1000).toISOString(),
            })
            .eq('user_id', userId);

          // Add monthly credits (renewal)
          if (plan) {
            const { data: existingCredits } = await supabase
              .from('seller_credits')
              .select('current_balance')
              .eq('seller_id', userId)
              .single();

            await supabase
              .from('seller_credits')
              .update({
                current_balance: (existingCredits?.current_balance || 0) + plan.monthly_credits,
              })
              .eq('seller_id', userId);

            // Record transaction
            await supabase.from('credit_transactions').insert({
              seller_id: userId,
              transaction_type: 'subscription_renewal',
              credits_amount: plan.monthly_credits,
              amount: payment.amount / 100,
              payment_id: payment.id,
              description: `Subscription renewal - ${plan.plan_name}`,
              balance_after: (existingCredits?.current_balance || 0) + plan.monthly_credits,
            });
          }

          console.log('Subscription renewed for user:', userId);
        }
        break;
      }

      case 'subscription.cancelled': {
        const subscription = payload.payload.subscription.entity;
        const userId = subscription.notes?.user_id;
        
        if (userId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          console.log('Subscription cancelled for user:', userId);
        }
        break;
      }

      case 'subscription.pending':
      case 'subscription.halted': {
        const subscription = payload.payload.subscription.entity;
        const userId = subscription.notes?.user_id;
        
        if (userId) {
          await supabase
            .from('subscriptions')
            .update({
              status: event === 'subscription.pending' ? 'pending' : 'past_due',
            })
            .eq('user_id', userId);

          console.log('Subscription status updated:', event, 'for user:', userId);
        }
        break;
      }

      case 'payment.captured': {
        const payment = payload.payload.payment.entity;
        const orderId = payment.order_id;
        
        if (orderId) {
          // Check if this is a credit purchase order
          const { data: order } = await supabase
            .from('razorpay_orders')
            .select('*')
            .eq('razorpay_order_id', orderId)
            .single();

          if (order && order.status !== 'paid') {
            // Update order
            await supabase
              .from('razorpay_orders')
              .update({
                status: 'paid',
                razorpay_payment_id: payment.id,
                verified_at: new Date().toISOString(),
              })
              .eq('id', order.id);

            // Add credits
            const { data: existingCredits } = await supabase
              .from('seller_credits')
              .select('current_balance')
              .eq('seller_id', order.user_id)
              .single();

            await supabase
              .from('seller_credits')
              .upsert({
                seller_id: order.user_id,
                current_balance: (existingCredits?.current_balance || 0) + order.credits,
                total_purchased: order.credits,
              }, { onConflict: 'seller_id' });

            // Record transaction
            await supabase.from('credit_transactions').insert({
              seller_id: order.user_id,
              transaction_type: 'purchase',
              credits_amount: order.credits,
              amount: order.amount,
              payment_id: payment.id,
              order_id: orderId,
              description: `Purchased ${order.credits} credits`,
              balance_after: (existingCredits?.current_balance || 0) + order.credits,
            });

            console.log('Payment captured, credits added for order:', orderId);
          }
        }
        break;
      }

      case 'payment.failed': {
        const payment = payload.payload.payment.entity;
        const orderId = payment.order_id;
        
        if (orderId) {
          await supabase
            .from('razorpay_orders')
            .update({ status: 'failed' })
            .eq('razorpay_order_id', orderId);

          console.log('Payment failed for order:', orderId);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event);
    }

    // Mark event as processed
    await supabase
      .from('razorpay_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('event_id', eventId);

    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
