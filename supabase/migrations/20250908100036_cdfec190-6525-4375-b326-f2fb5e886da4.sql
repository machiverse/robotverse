-- Create watchlist table for users to save robots, spare parts, and services
CREATE TABLE public.watchlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('robot', 'spare_part', 'service', 'logistics_service', 'loan_product')),
  item_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for watchlists
CREATE POLICY "Users can view their own watchlist items" 
ON public.watchlists 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add items to their own watchlist" 
ON public.watchlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlist items" 
ON public.watchlists 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove items from their own watchlist" 
ON public.watchlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_watchlists_updated_at
BEFORE UPDATE ON public.watchlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get watchlist count for a user
CREATE OR REPLACE FUNCTION public.get_user_watchlist_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COUNT(*)::INTEGER 
  FROM watchlists 
  WHERE user_id = p_user_id;
$$;

-- Create function to check if item is in user's watchlist
CREATE OR REPLACE FUNCTION public.is_item_in_watchlist(p_user_id UUID, p_item_type TEXT, p_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM watchlists 
    WHERE user_id = p_user_id 
    AND item_type = p_item_type 
    AND item_id = p_item_id
  );
$$;