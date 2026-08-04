CREATE TABLE public.whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  user_name text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  message_count integer NOT NULL DEFAULT 0,
  current_intent text,
  human_mode boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_sessions TO authenticated;
GRANT ALL ON public.whatsapp_sessions TO service_role;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wa sessions" ON public.whatsapp_sessions FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE,
  phone text NOT NULL,
  direction text NOT NULL DEFAULT 'in',
  body text,
  msg_type text NOT NULL DEFAULT 'text',
  intent text,
  wa_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX whatsapp_messages_phone_idx ON public.whatsapp_messages(phone, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wa messages" ON public.whatsapp_messages FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE TABLE public.whatsapp_kb (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_key text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  content text NOT NULL,
  keywords text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_kb TO authenticated;
GRANT ALL ON public.whatsapp_kb TO service_role;
ALTER TABLE public.whatsapp_kb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wa kb" ON public.whatsapp_kb FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE TABLE public.whatsapp_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  payload jsonb,
  recipients text[] NOT NULL DEFAULT '{}',
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_broadcasts TO authenticated;
GRANT ALL ON public.whatsapp_broadcasts TO service_role;
ALTER TABLE public.whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wa broadcasts" ON public.whatsapp_broadcasts FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

CREATE TABLE public.whatsapp_settings (
  id boolean PRIMARY KEY DEFAULT true,
  phone_number text NOT NULL DEFAULT '917639841220',
  phone_number_id text NOT NULL DEFAULT '1147700928426110',
  model text NOT NULL DEFAULT 'google/gemini-3.6-flash',
  temperature numeric NOT NULL DEFAULT 0.7,
  max_tokens integer NOT NULL DEFAULT 800,
  welcome_message text NOT NULL DEFAULT '👋 Welcome to RobotVerse! I''m your AI assistant — the same one that powers our website chatbot, now on WhatsApp!',
  fallback_message text NOT NULL DEFAULT 'Thanks for your message! 😊 I can help with robots, spare parts, services, auctions, pricing and demos. What would you like to explore?',
  auto_reply boolean NOT NULL DEFAULT true,
  handoff_trigger text NOT NULL DEFAULT 'negative_sentiment',
  rate_limit integer NOT NULL DEFAULT 20,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_settings_single_row CHECK (id)
);
GRANT SELECT, INSERT, UPDATE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage wa settings" ON public.whatsapp_settings FOR ALL TO authenticated
  USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
INSERT INTO public.whatsapp_settings (id) VALUES (true);

CREATE TRIGGER whatsapp_kb_updated_at BEFORE UPDATE ON public.whatsapp_kb
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.whatsapp_kb (entry_key, category, title, content, keywords) VALUES
('overview','general','What is RobotVerse','RobotVerse (robotverse.in) is India''s industrial robotics marketplace. Buy and sell new and used industrial robots, cobots, spare parts and EOAT, book integration and maintenance services, join live robot auctions, arrange logistics and equipment financing, and read RoboBook industry content. The same AI assistant powers our website chatbot and this WhatsApp bot.',ARRAY['robotverse','platform','about','what is','overview','company','marketplace']),
('robots','product','Industrial Robots & Cobots','Thousands of listings: articulated 6-axis, SCARA, delta, cartesian/gantry, collaborative cobots, AGV/AMR. Brands include FANUC, ABB, KUKA, Yaskawa, Universal Robots, Mitsubishi, Epson, Kawasaki, Doosan. Filter by payload, reach, application (welding, palletizing, pick & place, painting, assembly, machine tending), condition (new/used), city and budget. Browse at robotverse.in/robots',ARRAY['robot','cobot','fanuc','abb','kuka','yaskawa','used robot','payload','reach','buy robot','welding','palletizing']),
('spare_parts','product','Spare Parts & EOAT','Grippers, sensors, servo motors, controllers, teach pendants, cables, reducers, vision kits and full EOAT. Cross-brand compatibility matching helps you find parts that fit your robot model. Browse at robotverse.in/parts',ARRAY['spare','part','parts','eoat','gripper','sensor','controller','teach pendant','servo','component']),
('services','product','Services & System Integrators','Verified system integrators, robot programming, installation & commissioning, AMC and breakdown maintenance, simulation and training providers across India. Browse at robotverse.in/services',ARRAY['service','integrator','maintenance','amc','programming','installation','commissioning','training','repair']),
('auctions','product','Robot Auctions','Live robot auctions with open and sealed bidding, anti-sniping extensions, automatic outbid email alerts, and batch/multi-unit lots. Winners are confirmed by our team with a full invoice (platform fee + GST). Browse at robotverse.in/auctions',ARRAY['auction','bid','bidding','outbid','lot','sealed bid','live auction']),
('robobook','product','RoboBook','RoboBook is the RobotVerse knowledge hub — industry articles, buyer guides, technical posts and community discussions. Members can publish, schedule and share posts. Read at robotverse.in/robobook',ARRAY['robobook','blog','article','guide','community','post','knowledge']),
('logistics_finance','product','Logistics & Financing','Robot-grade logistics partners for pan-India transport with insurance and tracking, plus equipment financing — loans, EMI, leasing and government subsidy schemes for robot purchases. See robotverse.in/logistics and robotverse.in/financing',ARRAY['logistics','shipping','transport','freight','finance','loan','emi','leasing','subsidy','scheme']),
('talent','product','Robot Talent','Robot Talent connects robotics employers with engineers and trainers — post jobs, list training programmes, and build a seeker profile. Visit robotverse.in/robot-talent',ARRAY['talent','job','hiring','career','engineer','training','recruit']),
('quotes_credits','how_to','Quotes, Credits & Contact Unlock','Seller and provider contact details are hidden by default. Use the Get Quote flow to reach a seller through the platform, or spend credits to unlock contact details (10 credits for robots, 5 for spare parts). Buy credits from your dashboard at robotverse.in/dashboard/credits',ARRAY['quote','quotation','credit','unlock','contact','phone','email','seller contact']),
('how_it_works','how_to','How RobotVerse Works','Step 1: Create a free account at robotverse.in/auth. Step 2: Search or ask the AI assistant for robots, parts or services. Step 3: Request a quote or unlock contact with credits. Step 4: Arrange logistics and financing from the same platform. Step 5: Sellers list items from their dashboard and manage leads in the built-in CRM.',ARRAY['how','works','setup','process','start','begin','steps','getting started','sell','list']),
('selling','how_to','Selling on RobotVerse','Sellers register as robot sellers, spare parts sellers, service providers, logistics or finance partners. List items with photos and specs, receive quote requests and leads, manage them in the CRM, and run auctions. Subscription tiers set listing limits; commission-based selling (6%) is also available.',ARRAY['sell','seller','list','listing','dashboard','crm','lead','commission','subscription']),
('pricing','pricing','Plans & Pricing','RobotVerse is free to browse and free to request quotes. Sellers choose a subscription tier for listing limits and features, or a 6% commission model. Credits are used to unlock hidden contact details (10 for robots, 5 for spare parts). See current plans at robotverse.in/pricing',ARRAY['price','pricing','cost','plan','plans','subscription','fee','rate','credits','budget']),
('ai_assistant','feature','RobotVerse AI Assistant','The AI assistant searches live RobotVerse data — robots, spare parts, services, logistics, financing and RoboBook — and returns the best matches with prices, locations and links, plus a best-match analysis. Available on the website and on WhatsApp at +91 7639 841 220.',ARRAY['ai','assistant','chatbot','bot','search','brain','nlp','recommend']),
('whatsapp_bot','feature','WhatsApp Bot','The RobotVerse WhatsApp bot runs on the official WhatsApp Business Cloud API with the same AI brain as the website chatbot. Supports text, interactive buttons and list menus. Message us on +91 7639 841 220.',ARRAY['whatsapp','wa','business api','messaging','7639','bot']),
('multichannel','feature','Multi-Channel & Languages','The same assistant answers on the RobotVerse website widget and on WhatsApp, with unified conversation history. It understands English, Hindi and Hinglish and auto-detects the user''s language.',ARRAY['channel','multi','language','hindi','english','hinglish','website','omnichannel']),
('api','integration','REST API & Webhooks','RobotVerse offers a REST API with admin-approved API keys so external sites, ERP/CRM systems, AI apps and automation tools can access marketplace data. Webhooks are available for events. Docs at robotverse.in/api-docs',ARRAY['api','webhook','rest','integration','erp','crm','developer','key','automation','zapier']),
('demo','company','Book a Demo / Talk to Us','Want a walkthrough of RobotVerse for your plant or dealership? Share your name, company and what you want to automate and our team will set up a personalised session. Mon-Sat, 10am-7pm IST.',ARRAY['demo','book','schedule','walkthrough','call','meeting','trial','try']),
('support','company','Support','Our team typically replies within a couple of hours. Email hello@robotverse.in or support@robotverse.in, or use the Contact page at robotverse.in/contact. Key Account Manager: +91 86109 25352',ARRAY['support','help','issue','problem','error','not working','assist','contact us']),
('contact','company','Contact','WhatsApp: +91 7639 841 220 | Email: hello@robotverse.in | Support: support@robotverse.in | Key Account Manager: +91 86109 25352 | Website: robotverse.in',ARRAY['contact','email','phone','reach','call','number','7639','address']);