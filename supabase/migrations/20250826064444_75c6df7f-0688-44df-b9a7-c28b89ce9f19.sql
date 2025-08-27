-- Create robot_reports table to store generated reports
CREATE TABLE public.robot_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  robot_id UUID NOT NULL,
  user_id UUID NOT NULL,
  report_content TEXT NOT NULL,
  robot_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.robot_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for robot_reports
CREATE POLICY "Users can view their own reports" 
ON public.robot_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
ON public.robot_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_robot_reports_updated_at
BEFORE UPDATE ON public.robot_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_robot_reports_robot_user ON public.robot_reports(robot_id, user_id);
CREATE INDEX idx_robot_reports_created_at ON public.robot_reports(created_at DESC);