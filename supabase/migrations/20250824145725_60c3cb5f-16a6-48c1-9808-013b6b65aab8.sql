-- Create button_interactions table for tracking all button clicks
CREATE TABLE public.button_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT,
  seller_id UUID,
  seller_name TEXT,
  button_name TEXT NOT NULL,
  button_type TEXT NOT NULL,
  page_url TEXT,
  item_id UUID,
  item_type TEXT,
  additional_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.button_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own interactions" 
ON public.button_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interactions" 
ON public.button_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interactions" 
ON public.button_interactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND (user_roles @> ARRAY['admin'] OR account_type = 'admin')
  )
);

-- Create indexes for better performance
CREATE INDEX idx_button_interactions_user_id ON public.button_interactions(user_id);
CREATE INDEX idx_button_interactions_seller_id ON public.button_interactions(seller_id);
CREATE INDEX idx_button_interactions_button_type ON public.button_interactions(button_type);
CREATE INDEX idx_button_interactions_created_at ON public.button_interactions(created_at);
CREATE INDEX idx_button_interactions_item_id ON public.button_interactions(item_id, item_type);