-- Add unique constraint on plan_type
ALTER TABLE public.subscription_plans 
ADD CONSTRAINT subscription_plans_plan_type_key UNIQUE (plan_type);

-- Update constraint to allow 'free' plan type
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_plan_type_check;
ALTER TABLE public.subscription_plans ADD CONSTRAINT subscription_plans_plan_type_check 
  CHECK (plan_type IN ('free', 'basic', 'standard', 'premium'));

-- Insert Free plan
INSERT INTO public.subscription_plans (
  plan_name, plan_type, monthly_price, annual_price, monthly_credits, 
  robot_limit, spare_part_limit, service_limit,
  has_lead_manager_access, has_advanced_analytics, support_level,
  features, is_active
) VALUES (
  'Free', 'free', 0, 0, 0,
  2, 5, 1,
  false, false, 'none',
  '["2 Robot listings", "5 Spare Parts listings", "1 Service listing", "View partial buyer info", "Basic marketplace access"]'::jsonb,
  true
);

-- Update Basic plan limits
UPDATE public.subscription_plans SET
  robot_limit = 7,
  spare_part_limit = 15,
  service_limit = 2,
  has_lead_manager_access = true,
  has_advanced_analytics = false,
  support_level = 'email',
  features = '["7 Robot listings", "15 Spare Parts listings", "2 Service listings", "500 monthly credits", "Lead Manager (CRM) access", "Basic analytics", "Email support"]'::jsonb
WHERE plan_type = 'basic';

-- Update Standard plan limits
UPDATE public.subscription_plans SET
  robot_limit = 15,
  spare_part_limit = 30,
  service_limit = 5,
  has_lead_manager_access = true,
  has_advanced_analytics = true,
  support_level = 'priority_email',
  features = '["15 Robot listings", "30 Spare Parts listings", "5 Service listings", "1500 monthly credits", "Lead Manager (CRM) access", "Advanced analytics", "Priority email support"]'::jsonb
WHERE plan_type = 'standard';

-- Update Premium plan limits (unlimited = -1)
UPDATE public.subscription_plans SET
  robot_limit = -1,
  spare_part_limit = -1,
  service_limit = -1,
  has_lead_manager_access = true,
  has_advanced_analytics = true,
  support_level = 'priority_whatsapp',
  features = '["Unlimited Robot listings", "Unlimited Spare Parts listings", "Unlimited Service listings", "3000 monthly credits", "Lead Manager (CRM) access", "Full analytics dashboard", "Priority WhatsApp & Call support"]'::jsonb
WHERE plan_type = 'premium';