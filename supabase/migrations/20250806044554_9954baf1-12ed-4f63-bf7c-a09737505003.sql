-- Create table to store AI analysis results
CREATE TABLE public.robot_ai_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id UUID NOT NULL,
  analysis_data JSONB NOT NULL,
  recommendations JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.robot_ai_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for AI analysis results
CREATE POLICY "Anyone can view AI analysis results" 
ON public.robot_ai_analysis 
FOR SELECT 
USING (true);

CREATE POLICY "Only system can create AI analysis results" 
ON public.robot_ai_analysis 
FOR INSERT 
WITH CHECK (false); -- Only edge functions can insert

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_robot_ai_analysis_updated_at
BEFORE UPDATE ON public.robot_ai_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_robot_ai_analysis_robot_id ON public.robot_ai_analysis(robot_id);