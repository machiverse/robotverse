-- Create robot view counts table for global tracking
CREATE TABLE IF NOT EXISTS public.robot_view_counts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id UUID NOT NULL,
  total_views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint to ensure one row per robot
ALTER TABLE public.robot_view_counts 
ADD CONSTRAINT robot_view_counts_robot_id_unique UNIQUE (robot_id);

-- Enable RLS
ALTER TABLE public.robot_view_counts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view robot counts
CREATE POLICY "Anyone can view robot view counts" 
ON public.robot_view_counts 
FOR SELECT 
USING (true);

-- Create policy to allow system to update counts
CREATE POLICY "System can manage view counts" 
ON public.robot_view_counts 
FOR ALL 
USING (true);

-- Create function to increment robot view count
CREATE OR REPLACE FUNCTION public.increment_robot_view_count(p_robot_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Insert or update the view count
  INSERT INTO public.robot_view_counts (robot_id, total_views)
  VALUES (p_robot_id, 1)
  ON CONFLICT (robot_id)
  DO UPDATE SET 
    total_views = robot_view_counts.total_views + 1,
    updated_at = now()
  RETURNING total_views INTO current_count;
  
  RETURN current_count;
END;
$$;

-- Create function to get robot view count
CREATE OR REPLACE FUNCTION public.get_robot_view_count(p_robot_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  view_count INTEGER;
BEGIN
  SELECT total_views INTO view_count
  FROM public.robot_view_counts
  WHERE robot_id = p_robot_id;
  
  RETURN COALESCE(view_count, 0);
END;
$$;