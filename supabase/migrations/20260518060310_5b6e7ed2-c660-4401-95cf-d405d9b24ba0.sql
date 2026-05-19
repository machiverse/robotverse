-- Fix unrestricted Razorpay order policies
DROP POLICY IF EXISTS "Service can insert orders" ON public.razorpay_orders;
DROP POLICY IF EXISTS "Service can update orders" ON public.razorpay_orders;

CREATE POLICY "Users can create their own orders"
ON public.razorpay_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own pending order metadata"
ON public.razorpay_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Remove broad read access to all buyer product requests
DROP POLICY IF EXISTS "Authenticated users can view requests" ON public.user_product_requests;

-- Prevent anonymous notification injection
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can create their own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Remove public all-column profile exposure and provide a safe public read surface
DROP POLICY IF EXISTS "Public can view limited business info only" ON public.profiles;

CREATE OR REPLACE VIEW public.public_business_profiles AS
SELECT
  user_id,
  full_name,
  company_name,
  avatar_url,
  location,
  city,
  user_type,
  primary_user_type,
  account_type,
  company_logo_url,
  completed_sales,
  average_rating,
  total_reviews
FROM public.profiles
WHERE user_id IN (
  SELECT DISTINCT seller_id FROM public.robots WHERE seller_id IS NOT NULL
  UNION
  SELECT DISTINCT seller_id FROM public.spare_parts WHERE seller_id IS NOT NULL
  UNION
  SELECT DISTINCT provider_id FROM public.services WHERE provider_id IS NOT NULL
  UNION
  SELECT DISTINCT provider_id FROM public.logistics_services WHERE provider_id IS NOT NULL
  UNION
  SELECT DISTINCT provider_id FROM public.loan_products WHERE provider_id IS NOT NULL
  UNION
  SELECT DISTINCT provider_id FROM public.loan_schemes WHERE provider_id IS NOT NULL
);

GRANT SELECT ON public.public_business_profiles TO anon, authenticated;

-- Realtime topic authorization for private chat and notification channels
CREATE POLICY "Users can access their own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  topic IN (
    'user-notifications:' || auth.uid()::text,
    'user-messages:' || auth.uid()::text,
    'user-read-messages:' || auth.uid()::text
  )
  OR EXISTS (
    SELECT 1
    FROM public.chat_conversations cc
    WHERE (cc.buyer_id = auth.uid() OR cc.seller_id = auth.uid())
      AND topic IN (
        'chat_conversation:' || cc.id::text,
        'chat:' || cc.id::text,
        'conversation:' || cc.id::text,
        'chat_messages:' || cc.id::text
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE (cs.user1_id = auth.uid() OR cs.user2_id = auth.uid())
      AND topic IN (
        'chat_session:' || cs.id::text,
        'chat:' || cs.id::text,
        'conversation:' || cs.id::text,
        'chat_messages:' || cs.id::text
      )
  )
);

CREATE POLICY "Users can send to their own realtime topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  topic IN (
    'user-notifications:' || auth.uid()::text,
    'user-messages:' || auth.uid()::text,
    'user-read-messages:' || auth.uid()::text
  )
  OR EXISTS (
    SELECT 1
    FROM public.chat_conversations cc
    WHERE (cc.buyer_id = auth.uid() OR cc.seller_id = auth.uid())
      AND topic IN (
        'chat_conversation:' || cc.id::text,
        'chat:' || cc.id::text,
        'conversation:' || cc.id::text,
        'chat_messages:' || cc.id::text
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.chat_sessions cs
    WHERE (cs.user1_id = auth.uid() OR cs.user2_id = auth.uid())
      AND topic IN (
        'chat_session:' || cs.id::text,
        'chat:' || cs.id::text,
        'conversation:' || cs.id::text,
        'chat_messages:' || cs.id::text
      )
  )
);