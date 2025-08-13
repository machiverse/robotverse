-- Create table to track user interactions (contacts and applications)
CREATE TABLE public.user_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('robots', 'spare_parts', 'services', 'logistics_services', 'loan_products', 'loan_schemes')),
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('contact', 'application_submit')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own interactions" 
ON public.user_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions" 
ON public.user_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_user_interactions_user_id ON public.user_interactions (user_id);
CREATE INDEX idx_user_interactions_target ON public.user_interactions (target_id, target_type);
CREATE INDEX idx_user_interactions_created_at ON public.user_interactions (created_at);