-- Create unified view counts table for all item types
CREATE TABLE IF NOT EXISTS public.item_view_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('robots', 'spare_parts', 'services', 'logistics_services', 'loan_products')),
  total_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(item_id, item_type)
);

-- Enable RLS
ALTER TABLE public.item_view_counts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view item view counts" 
ON public.item_view_counts 
FOR SELECT 
USING (true);

CREATE POLICY "System can manage view counts" 
ON public.item_view_counts 
FOR ALL 
USING (true);

-- Create function to increment view count for any item type
CREATE OR REPLACE FUNCTION public.increment_item_view_count(p_item_id uuid, p_item_type text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update the view count
  INSERT INTO public.item_view_counts (item_id, item_type, total_views)
  VALUES (p_item_id, p_item_type, 1)
  ON CONFLICT (item_id, item_type)
  DO UPDATE SET 
    total_views = item_view_counts.total_views + 1,
    updated_at = now()
  RETURNING total_views INTO current_count;
  
  RETURN current_count;
END;
$function$;

-- Create function to get view count for any item type
CREATE OR REPLACE FUNCTION public.get_item_view_count(p_item_id uuid, p_item_type text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  view_count INTEGER;
BEGIN
  SELECT total_views INTO view_count
  FROM public.item_view_counts
  WHERE item_id = p_item_id AND item_type = p_item_type;
  
  RETURN COALESCE(view_count, 0);
END;
$function$;

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_item_view_counts_updated_at
BEFORE UPDATE ON public.item_view_counts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();